import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { sourceCurriculumId, newDetails } = body;

        if (!sourceCurriculumId || !newDetails || !newDetails.name) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const sourceCurriculum = await prisma.curriculumYear.findUnique({
            where: { id: sourceCurriculumId },
        });

        if (!sourceCurriculum) {
            return NextResponse.json({ error: "Source curriculum not found" }, { status: 404 });
        }

        // Perform the deep clone in a transaction to ensure atomicity
        const newCurriculum = await prisma.$transaction(async (tx) => {
            // 1. Create the new CurriculumYear
            const createdYear = await tx.curriculumYear.create({
                data: {
                    name: newDetails.name,
                    startYear: newDetails.startYear ? Number(newDetails.startYear) : null,
                    endYear: newDetails.endYear ? Number(newDetails.endYear) : null,
                    faculty: newDetails.faculty || null,
                    department: newDetails.department || null,
                    major: newDetails.major || null,
                    track: newDetails.track || null,
                    isActive: newDetails.isActive ?? true,
                    baseTemplateId: newDetails.baseTemplateId !== undefined ? newDetails.baseTemplateId : (sourceCurriculum as any).baseTemplateId,
                } as any, // Schema workaround
            });

            // 2. Fetch the entire category tree from the source
            const sourceCategories = await tx.curriculumCategory.findMany({
                where: { curriculumYearId: sourceCurriculumId },
                include: { subjects: true },
                orderBy: { sortOrder: 'asc' }
            });

            // 3. Rebuild the tree iteratively to map old IDs to new IDs
            // We need multiple passes since categories depend on their parents
            const idMap = new Map<string, string>(); // oldId -> newId

            // Separate roots from children recursively or just order by dependency
            // Fortunately, sorting order or basic iterative parent tracking usually suffices if we insert roots first.
            // Let's do it level by level.
            let remaining = [...sourceCategories];
            let level = 0;
            
            while (remaining.length > 0 && level < 10) { // Safety ceiling of 10 nested levels
                const currentLevelCats = remaining.filter(c => !c.parentId || idMap.has(c.parentId));
                
                if (currentLevelCats.length === 0) {
                    console.warn("Orphaned categories found during clone or circular dependency.");
                    break; 
                }

                for (const oldCat of currentLevelCats) {
                    // Create the new category
                    const newCat = await tx.curriculumCategory.create({
                        data: {
                            name: oldCat.name,
                            requiredCredits: oldCat.requiredCredits,
                            minCredits: oldCat.minCredits,
                            maxCredits: oldCat.maxCredits,
                            isElective: oldCat.isElective,
                            sortOrder: oldCat.sortOrder,
                            curriculumYearId: createdYear.id,
                            parentId: oldCat.parentId ? idMap.get(oldCat.parentId) : null,
                        }
                    });

                    // Map the ID
                    idMap.set(oldCat.id, newCat.id);

                    // Re-link the subjects for this category
                    if (oldCat.subjects && oldCat.subjects.length > 0) {
                        for (const subject of oldCat.subjects) {
                            await tx.subject.create({
                                data: {
                                    code: subject.code,
                                    name: subject.name,
                                    credits: subject.credits,
                                    categoryId: newCat.id
                                }
                            });
                        }
                    }
                }

                // Remove processed categories from remaining list
                remaining = remaining.filter(c => !currentLevelCats.find(proc => proc.id === c.id));
                level++;
            }

            return createdYear;
        });

        return NextResponse.json(newCurriculum);
    } catch (error: any) {
        console.error("Deep Clone Error:", error);
        return NextResponse.json(
            { error: "Failed to clone curriculum. " + (error?.message || "") },
            { status: 500 }
        );
    }
}
