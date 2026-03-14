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

        const result = await prisma.$transaction(async (tx) => {
            // ── Load master categories + their subjects ──────────────────────
            const masterCategories = await tx.curriculumCategory.findMany({
                where: { curriculumYearId: baseTemplateId },
                include: { subjects: true },
            });

            // ── Load faculty inherited categories + their subjects ────────────
            const facultyCategories = await tx.curriculumCategory.findMany({
                where: {
                    curriculumYearId: facultyCurriculumId,
                    inheritedFromCategoryId: { not: null },
                } as any,
                include: { subjects: true },
            });

            // masterCategoryId → faculty category
            const inheritedMap = new Map(
                facultyCategories
                    .filter(c => (c as any).inheritedFromCategoryId)
                    .map(c => [(c as any).inheritedFromCategoryId as string, c])
            );

            // masterCategoryId → master category (for phase-2 lookups)
            const masterMap = new Map(masterCategories.map(c => [c.id, c]));

            // masterCategoryId → faculty category id (for parentId resolution)
            const idMap = new Map(
                facultyCategories
                    .filter(c => (c as any).inheritedFromCategoryId)
                    .map(c => [(c as any).inheritedFromCategoryId as string, c.id])
            );

            let addedCategories = 0;
            let addedSubjects = 0;
            let updatedCategories = 0;

            // ── Phase 1: Add brand-new categories missing from faculty ────────
            const missingCategories = masterCategories.filter(c => !inheritedMap.has(c.id));

            let remaining = [...missingCategories];
            let depth = 0;
            while (remaining.length > 0 && depth < 10) {
                const thisLevel = remaining.filter(
                    c => !c.parentId || idMap.has(c.parentId)
                );
                if (thisLevel.length === 0) {
                    console.warn("Sync: orphaned/circular categories detected, stopping.");
                    break;
                }

                for (const masterCat of thisLevel) {
                    const newCat = await tx.curriculumCategory.create({
                        data: {
                            name: masterCat.name,
                            requiredCredits: masterCat.requiredCredits,
                            minCredits: masterCat.minCredits,
                            maxCredits: masterCat.maxCredits,
                            isElective: masterCat.isElective,
                            sortOrder: masterCat.sortOrder,
                            spilloverType: (masterCat as any).spilloverType ?? null,
                            curriculumYearId: facultyCurriculumId,
                            inheritedFromCategoryId: masterCat.id,
                            parentId: masterCat.parentId ? (idMap.get(masterCat.parentId) ?? null) : null,
                        } as any,
                    });

                    idMap.set(masterCat.id, newCat.id);
                    addedCategories++;

                    // Clone subjects for the newly added category
                    for (const sub of masterCat.subjects) {
                        await tx.subject.create({
                            data: {
                                code: sub.code,
                                name: sub.name,
                                credits: sub.credits,
                                subjectGroup: (sub as any).subjectGroup ?? null,
                                categoryId: newCat.id,
                                masterSubjectId: (sub as any).masterSubjectId ?? null,
                            } as any,
                        });
                        addedSubjects++;
                    }
                }

                remaining = remaining.filter(
                    c => !thisLevel.find(tl => tl.id === c.id)
                );
                depth++;
            }

            // ── Phase 2: Sync subjects inside existing inherited categories ───
            // For every inherited category that already existed in faculty,
            // find subjects present in master but absent in faculty (by code).
            for (const [masterCatId, facultyCat] of inheritedMap.entries()) {
                const masterCat = masterMap.get(masterCatId);
                if (!masterCat) continue;

                // 2a. Add missing subjects
                const existingCodes = new Set(
                    (facultyCat as any).subjects.map((s: any) => s.code)
                );
                const missingSubjects = masterCat.subjects.filter(
                    s => !existingCodes.has(s.code)
                );

                for (const sub of missingSubjects) {
                    await tx.subject.create({
                        data: {
                            code: sub.code,
                            name: sub.name,
                            credits: sub.credits,
                            subjectGroup: (sub as any).subjectGroup ?? null,
                            categoryId: facultyCat.id,
                            masterSubjectId: (sub as any).masterSubjectId ?? null,
                        } as any,
                    });
                    addedSubjects++;
                }

                // 2b. Update inherited category metadata if master changed
                const fc = facultyCat as any;
                const mc = masterCat as any;
                if (
                    fc.name !== mc.name ||
                    fc.requiredCredits !== mc.requiredCredits ||
                    fc.minCredits !== mc.minCredits ||
                    fc.maxCredits !== mc.maxCredits ||
                    fc.isElective !== mc.isElective ||
                    fc.spilloverType !== mc.spilloverType
                ) {
                    await tx.curriculumCategory.update({
                        where: { id: facultyCat.id },
                        data: {
                            name: mc.name,
                            requiredCredits: mc.requiredCredits,
                            minCredits: mc.minCredits,
                            maxCredits: mc.maxCredits,
                            isElective: mc.isElective,
                            spilloverType: mc.spilloverType ?? null,
                        } as any,
                    });
                    updatedCategories++;
                }
            }

            return { success: true, addedCategories, addedSubjects, updatedCategories };
        });

        // Build a human-readable summary
        const parts: string[] = [];
        if (result.addedCategories > 0)
            parts.push(`${result.addedCategories} new categor${result.addedCategories > 1 ? "ies" : "y"} added`);
        if (result.addedSubjects > 0)
            parts.push(`${result.addedSubjects} subject${result.addedSubjects > 1 ? "s" : ""} synced`);
        if (result.updatedCategories > 0)
            parts.push(`${result.updatedCategories} categor${result.updatedCategories > 1 ? "ies" : "y"} updated`);

        const message = parts.length > 0
            ? `Sync complete: ${parts.join(", ")}.`
            : "Already up to date with Master Template.";

        return NextResponse.json({ ...result, message });
    } catch (error: any) {
        console.error("Sync API Error:", error);
        return NextResponse.json(
            { error: "Failed to sync template. " + (error?.message || "") },
            { status: 500 }
        );
    }
}
