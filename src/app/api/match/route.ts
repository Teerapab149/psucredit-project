import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ParsedSubject, CategoryMatch, MatchResult } from "@/types";

export const dynamic = "force-dynamic";
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const {
            subjects,
            curriculumYearId,
            studentInfo,
            track,
        }: { subjects: ParsedSubject[]; curriculumYearId?: string; studentInfo?: any; track?: string } = body;

        const requestedTrack = track || "แผนปกติ";

        if (!subjects || !Array.isArray(subjects)) {
            return NextResponse.json(
                { error: "Subjects array is required" },
                { status: 400 }
            );
        }

        // Get curriculum year (use provided or default active)
        let curriculumYear;
        if (curriculumYearId) {
            curriculumYear = await prisma.curriculumYear.findUnique({
                where: { id: curriculumYearId },
            });
        }

        if (!curriculumYear && studentInfo) {
            // Find all active curriculums up to the student's admission year
            const matchingCurriculums = await prisma.curriculumYear.findMany({
                where: {
                    isActive: true,
                    startYear: { lte: studentInfo.admissionYear > 0 ? studentInfo.admissionYear : 9999 },
                },
                orderBy: { startYear: "desc" },
            });

            // Find the best match
            for (const curr of matchingCurriculums) {
                const facultyMatch = !curr.faculty || curr.faculty === studentInfo.faculty;
                const majorMatch = !curr.major || curr.major === studentInfo.major;
                const trackMatch = !curr.track || curr.track === studentInfo.track;

                if (facultyMatch && majorMatch && trackMatch) {
                    curriculumYear = curr;
                    break;
                }
            }
        }

        // Fallback if no specific match
        if (!curriculumYear) {
            curriculumYear = await prisma.curriculumYear.findFirst({
                where: { isActive: true },
                orderBy: { startYear: "desc" }, // Fixed to startYear instead of year since schema updated
            }) as any;
        }

        if (!curriculumYear) {
            // Return empty result if no curriculum set up yet or matched
            return NextResponse.json({
                curriculumYear: 0,
                curriculumName: "No curriculum found",
                categories: [],
                totalRequired: 0,
                totalCompleted: subjects
                    .filter((s) => s.status === "COMPLETED")
                    .reduce((sum, s) => sum + s.credits, 0),
                totalInProgress: subjects
                    .filter((s) => s.status === "IN_PROGRESS")
                    .reduce((sum, s) => sum + s.credits, 0),
                totalMissing: 0,
                unmatchedSubjects: subjects,
            } as MatchResult);
        }

        // Fetch full curriculum tree
        let categories = await prisma.curriculumCategory.findMany({
            where: { curriculumYearId: curriculumYear.id },
            include: { subjects: true },
            orderBy: { sortOrder: "asc" },
        });

        // No need to merge Base Template Categories
        // Categories from the base template are now physically cloned 
        // into the Faculty Curriculum via the Clone step.
        // We strictly match against the active faculty tree.

        // Build tree structure
        const categoryMap = new Map<string, (typeof categories)[0]>();
        const rootCategories: (typeof categories)[0][] = [];

        for (const cat of categories) {
            categoryMap.set(cat.id, cat);
            if (!cat.parentId) {
                rootCategories.push(cat);
            }
        }

        // Track which subjects are matched
        const matchedCodes = new Set<string>();

        // Recursive match function
        function matchCategory(
            cat: (typeof categories)[0]
        ): CategoryMatch | null {
            // Pruning Logic: Skip category if it explicitly belongs to another track
            const catNameLower = cat.name.toLowerCase();
            const isNormalPlanCat = catNameLower.includes("แผนปกติ") || catNameLower.includes("normal plan");
            const isCoopPlanCat = catNameLower.includes("แผนสหกิจ") || catNameLower.includes("co-op") || catNameLower.includes("coop");

            const isRequestedNormal = requestedTrack.includes("แผนปกติ") || requestedTrack.toLowerCase().includes("normal");
            const isRequestedCoop = requestedTrack.includes("แผนสหกิจ") || requestedTrack.toLowerCase().includes("co-op") || requestedTrack.toLowerCase().includes("coop");

            if (isNormalPlanCat && !isRequestedNormal) return null;
            if (isCoopPlanCat && !isRequestedCoop) return null;

            const children = categories.filter((c: (typeof categories)[0]) => c.parentId === cat.id);
            const childMatches = children.map(matchCategory).filter(Boolean) as CategoryMatch[];

            // Match subjects at this leaf level
            const matchedSubjects = [];
            const missingSubjects = [];

            for (const dbSubject of cat.subjects) {
                const found = subjects.find(
                    (s) =>
                        s.code === dbSubject.code &&
                        !matchedCodes.has(`${s.code}-${cat.id}`)
                );
                if (found) {
                    matchedCodes.add(`${found.code}-${cat.id}`);
                    matchedSubjects.push({
                        code: found.code,
                        name: found.name,
                        credits: found.credits,
                        grade: found.grade,
                        status: found.status,
                    });
                } else {
                    missingSubjects.push({
                        code: dbSubject.code,
                        name: dbSubject.name,
                        credits: dbSubject.credits,
                    });
                }
            }

            // Calculate credits (own + children)
            const ownCompleted = matchedSubjects
                .filter((s) => s.status === "COMPLETED")
                .reduce((sum, s) => sum + s.credits, 0);
            const ownInProgress = matchedSubjects
                .filter((s) => s.status === "IN_PROGRESS")
                .reduce((sum, s) => sum + s.credits, 0);

            const childCompleted = childMatches.reduce(
                (sum: number, c: CategoryMatch) => sum + c.completedCredits,
                0
            );
            const childInProgress = childMatches.reduce(
                (sum: number, c: CategoryMatch) => sum + c.inProgressCredits,
                0
            );

            return {
                categoryId: cat.id,
                categoryName: cat.name,
                parentName: cat.parentId
                    ? categoryMap.get(cat.parentId)?.name || null
                    : null,
                requiredCredits: cat.requiredCredits,
                completedCredits: ownCompleted + childCompleted,
                inProgressCredits: ownInProgress + childInProgress,
                isElective: cat.isElective,
                matchedSubjects,
                missingSubjects,
                children: childMatches,
            };
        }

        const result: CategoryMatch[] = rootCategories.map(matchCategory).filter(Boolean) as CategoryMatch[];

        // --- Phase 2: Waterfall Spillover Logic ---
        // 1. Find all explicit unmatched subjects 
        const allMatchedCodes = new Set(
            Array.from(matchedCodes).map((key) => key.split("-")[0])
        );
        let currentUnmatchedSubjects = subjects.filter(
            (s) => !allMatchedCodes.has(s.code)
        );

        // Calculate credits for a given category (own + children)
        const recalculateCategoryCredits = (catMatch: CategoryMatch) => {
            const ownCompleted = catMatch.matchedSubjects
                .filter((s) => s.status === "COMPLETED")
                .reduce((sum, s) => sum + s.credits, 0);
            const ownInProgress = catMatch.matchedSubjects
                .filter((s) => s.status === "IN_PROGRESS")
                .reduce((sum, s) => sum + s.credits, 0);

            let childCompleted = 0;
            let childInProgress = 0;

            if (catMatch.children && catMatch.children.length > 0) {
                catMatch.children.forEach(child => {
                    recalculateCategoryCredits(child);
                    childCompleted += child.completedCredits;
                    childInProgress += child.inProgressCredits;
                });
            }

            catMatch.completedCredits = ownCompleted + childCompleted;
            catMatch.inProgressCredits = ownInProgress + childInProgress;
        };

        // Helper to spillover subjects into a specific category type
        const processSpillover = (spilloverType: string) => {
            // Find all categories configured for this spillover type
            const targetCategories: CategoryMatch[] = [];
            
            const findTargets = (node: CategoryMatch) => {
                const dbCat = categoryMap.get(node.categoryId);
                if (dbCat && (dbCat as any).spilloverType === spilloverType) {
                    targetCategories.push(node);
                }
                if (node.children) {
                    node.children.forEach(findTargets);
                }
            };
            
            result.forEach(findTargets);

            for (const targetCat of targetCategories) {
                // If there are no unmatched subjects left, stop
                if (currentUnmatchedSubjects.length === 0) break;

                const dbCat = categoryMap.get(targetCat.categoryId);
                if (!dbCat) continue;
                
                // Keep filling until maxCredits is reached, or required if max is not set
                const limit = dbCat.maxCredits || dbCat.requiredCredits;

                // How much more can we fit?
                let spaceLeft = limit - targetCat.completedCredits - targetCat.inProgressCredits;

                if (spaceLeft > 0) {
                    const remainingForNextBucket = [];
                    for (const subject of currentUnmatchedSubjects) {
                        if (spaceLeft >= subject.credits) {
                            // Fits entirely! Consume it
                            targetCat.matchedSubjects.push({
                                code: subject.code,
                                name: subject.name,
                                credits: subject.credits,
                                grade: subject.grade,
                                status: subject.status,
                            });
                            spaceLeft -= subject.credits;
                        } else if (spaceLeft > 0 && spaceLeft < subject.credits) {
                            // Partially fits - we consume what we can to fill the bucket
                            // But keeping it simple for now, we just don't split courses. 
                            // We only take full courses that fit.
                            // If a university policy splits a 3-credit course into 1 Cr + 2 Cr, 
                            // that would require fractional subject tracking.
                            remainingForNextBucket.push(subject);
                        } else {
                            // No space left
                            remainingForNextBucket.push(subject);
                        }
                    }
                    currentUnmatchedSubjects = remainingForNextBucket;
                }
            }
            
            // Recalculate everything after spillover
            result.forEach(recalculateCategoryCredits);
        };

        // Run the Waterfall!
        // 1. Minor Subjects first
        processSpillover("MINOR");
        // 2. Free Electives get whatever is left
        processSpillover("FREE_ELECTIVE");

        const unmatchedSubjects = currentUnmatchedSubjects;

        const totalRequired = result.reduce(
            (sum, c) => sum + c.requiredCredits,
            0
        );
        const totalCompleted = result.reduce(
            (sum, c) => sum + c.completedCredits,
            0
        );
        const totalInProgress = result.reduce(
            (sum, c) => sum + c.inProgressCredits,
            0
        );

        const matchResult: MatchResult = {
            curriculumYear: (curriculumYear as any).startYear || 0,
            curriculumName: curriculumYear.name,
            categories: result,
            totalRequired,
            totalCompleted,
            totalInProgress,
            totalMissing: totalRequired - totalCompleted,
            unmatchedSubjects,
        };

        return NextResponse.json(matchResult);
    } catch (error) {
        console.error("Match error:", error);
        return NextResponse.json(
            { error: "Failed to match curriculum" },
            { status: 500 }
        );
    }
}
