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
            // Find all active, non-template curriculums up to the student's admission year
            const matchingCurriculums = await prisma.curriculumYear.findMany({
                where: {
                    isActive: true,
                    isTemplate: false,
                    startYear: { lte: studentInfo.admissionYear > 0 ? studentInfo.admissionYear : 9999 },
                },
                orderBy: { startYear: "desc" },
            });

            // Normalise a field value: remove all whitespace and uppercase for
            // flexible matching regardless of spacing or casing differences.
            const norm = (v?: string | null) => (v ?? "").replace(/\s+/g, "").toUpperCase();

            // Find the best match
            for (const curr of matchingCurriculums) {
                const facultyMatch = !curr.faculty || norm(curr.faculty) === norm(studentInfo.faculty);
                const majorMatch   = !curr.major   || norm(curr.major)   === norm(studentInfo.major);
                const trackMatch   = !curr.track   || norm(curr.track)   === norm(studentInfo.track);

                if (facultyMatch && majorMatch && trackMatch) {
                    curriculumYear = curr;
                    break;
                }
            }

            console.log(
                "[match] auto-select →",
                "faculty:", studentInfo.faculty,
                "| major:", studentInfo.major,
                "| selected:", curriculumYear?.name ?? "none"
            );
        }

        // Fallback if no specific match — never pick a master template
        if (!curriculumYear) {
            curriculumYear = await prisma.curriculumYear.findFirst({
                where: { isActive: true, isTemplate: false },
                orderBy: { startYear: "desc" },
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

        // Fetch subject equivalencies for mapping.
        // Sanitize both sides: strip dashes/spaces and uppercase so that
        // minor formatting differences never cause a missed lookup.
        const sanitize = (code: string) => code.replace(/[-\s]/g, "").toUpperCase();
        const equivalencies = await prisma.subjectEquivalency.findMany();
        const equivalencyMap = new Map(
            equivalencies.map((e: { newCode: string; baseCode: string }) => [
                sanitize(e.newCode),
                sanitize(e.baseCode),
            ])
        );

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

        // Tracks every student subject code that has been consumed (globally).
        // A subject is consumed once and cannot match again in any other category
        // or appear in the Phase 2 spillover list.
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
                const cleanDbCode = dbSubject.code.replace(/[-\s]/g, "").toUpperCase();
                const found = subjects.find(
                    (s) => {
                        const cleanUserCode = s.code.replace(/[-\s]/g, "").toUpperCase();

                        // 1. Direct match
                        const isDirectMatch = cleanUserCode === cleanDbCode;
                        // 2. User has new code, DB expects base code
                        const isUserNewDbBase = equivalencyMap.get(cleanUserCode) === cleanDbCode;
                        // 3. User has base code, DB expects new code
                        const isUserBaseDbNew = cleanUserCode === equivalencyMap.get(cleanDbCode);
                        // 4. Sibling match (both are new codes sharing the same base code)
                        const userBase = equivalencyMap.get(cleanUserCode);
                        const dbBase   = equivalencyMap.get(cleanDbCode);
                        const isSiblingMatch = userBase !== undefined && userBase === dbBase;

                        const isMatch = isDirectMatch || isUserNewDbBase || isUserBaseDbNew || isSiblingMatch;
                        return isMatch && !matchedCodes.has(s.code);
                    }
                );
                if (found) {
                    matchedCodes.add(found.code);
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
        // Build the unmatched list directly from matchedCodes — no split() hacks needed.
        let currentUnmatchedSubjects = subjects.filter(
            (s) => !matchedCodes.has(s.code)
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
                        // As long as the bucket still needs credits, consume the next available subject.
                        // It is perfectly fine if spaceLeft becomes negative (Natural Overflow).
                        if (spaceLeft > 0) {
                            targetCat.matchedSubjects.push({
                                code: subject.code,
                                name: subject.name,
                                credits: subject.credits,
                                grade: subject.grade,
                                status: subject.status,
                            });
                            spaceLeft -= subject.credits; // Might become negative, effectively filling the bucket and catching the overflow.
                        } else {
                            // Bucket is full (spaceLeft <= 0)
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
