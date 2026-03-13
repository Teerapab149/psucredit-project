import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { facultyCurriculumId } = body;

        if (!facultyCurriculumId) {
            return NextResponse.json({ error: "Missing Faculty Curriculum ID" }, { status: 400 });
        }

        // 1. Fetch Faculty Curriculum
        const facultyCurriculum = await prisma.curriculumYear.findUnique({
            where: { id: facultyCurriculumId },
        });

        if (!facultyCurriculum) {
            return NextResponse.json({ error: "Faculty curriculum not found" }, { status: 404 });
        }

        const baseTemplateId = (facultyCurriculum as any).baseTemplateId;
        if (!baseTemplateId) {
            return NextResponse.json({ error: "No base template linked to this curriculum" }, { status: 400 });
        }

        // 2. Perform sync in a transaction
        const result = await prisma.$transaction(async (tx) => {
            // Fetch all categories from Master Template
            const masterCategories = await tx.curriculumCategory.findMany({
                where: { curriculumYearId: baseTemplateId },
                include: { subjects: true },
            });

            // Fetch all inherited categories currently in Faculty Curriculum
            const facultyCategories = await tx.curriculumCategory.findMany({
                where: { 
                    curriculumYearId: facultyCurriculumId,
                    inheritedFromCategoryId: { not: null }
                } as any,
            });

            const inheritedIds = new Set(facultyCategories.map(c => (c as any).inheritedFromCategoryId));
            
            // Find delta: categories in master but not yet in faculty
            const missingCategories = masterCategories.filter(c => !inheritedIds.has(c.id));

            if (missingCategories.length === 0) {
                return { success: true, addedCount: 0, message: "Already up to date" };
            }

            // ID Mapping: inheritedFromCategoryId -> localId
            // Initialize with existing categories
            const idMap = new Map<string, string>();
            facultyCategories.forEach(c => {
                if ((c as any).inheritedFromCategoryId) {
                    idMap.set((c as any).inheritedFromCategoryId, c.id);
                }
            });

            let addedCount = 0;
            let remaining = [...missingCategories];
            let level = 0;

            // Iterative clone level by level (similar to clone engine)
            while (remaining.length > 0 && level < 10) {
                // Find categories whose parents are already in faculty (either originally or just added)
                const currentLevel = remaining.filter(c => !c.parentId || idMap.has(c.parentId));

                if (currentLevel.length === 0) {
                    console.warn("Circular or orphaned categories in Master Template during sync.");
                    break;
                }

                for (const masterCat of currentLevel) {
                    // Create local category
                    const newCat = await tx.curriculumCategory.create({
                        data: {
                            name: masterCat.name,
                            requiredCredits: masterCat.requiredCredits,
                            minCredits: masterCat.minCredits,
                            maxCredits: masterCat.maxCredits,
                            isElective: masterCat.isElective,
                            sortOrder: masterCat.sortOrder,
                            spilloverType: (masterCat as any).spilloverType || null,
                            curriculumYearId: facultyCurriculumId,
                            inheritedFromCategoryId: masterCat.id,
                            parentId: masterCat.parentId ? idMap.get(masterCat.parentId) : null,
                        } as any
                    });

                    idMap.set(masterCat.id, newCat.id);
                    addedCount++;

                    // Re-link subjects
                    if (masterCat.subjects && masterCat.subjects.length > 0) {
                        for (const sub of masterCat.subjects) {
                            await tx.subject.create({
                                data: {
                                    code: sub.code,
                                    name: sub.name,
                                    credits: sub.credits,
                                    categoryId: newCat.id
                                }
                            });
                        }
                    }
                }

                remaining = remaining.filter(c => !currentLevel.find(cl => cl.id === c.id));
                level++;
            }

            return { success: true, addedCount };
        });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Sync API Error:", error);
        return NextResponse.json({ error: "Failed to sync template. " + (error?.message || "") }, { status: 500 });
    }
}
