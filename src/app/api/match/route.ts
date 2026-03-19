import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRequiredCredits } from "@/lib/credit-utils";
import { normalizeMajor } from "@/lib/normalize-major";
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
            planId,
        }: { subjects: ParsedSubject[]; curriculumYearId?: string; studentInfo?: any; track?: string; planId?: string } = body;

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
            // ─── Structured curriculum matching ───
            // Match by faculty + department + major + year range using a direct
            // Prisma WHERE clause instead of fuzzy in-memory matching.

            const admYear = studentInfo.admissionYear > 0 ? studentInfo.admissionYear : 9999;
            const normalizedMajor = normalizeMajor(studentInfo.major);
            const majorToMatch = normalizedMajor ?? studentInfo.major ?? null;

            // Step 1: Try exact match — faculty + major + year range
            if (majorToMatch) {
                curriculumYear = await prisma.curriculumYear.findFirst({
                    where: {
                        isActive: true,
                        isTemplate: false,
                        major: majorToMatch,
                        startYear: { lte: admYear },
                        OR: [
                            { endYear: null },
                            { endYear: { gte: admYear } },
                        ],
                    },
                    orderBy: { startYear: "desc" },
                }) as any;
            }

            // Step 2: Fallback — major match without endYear constraint
            if (!curriculumYear && majorToMatch) {
                curriculumYear = await prisma.curriculumYear.findFirst({
                    where: {
                        isActive: true,
                        isTemplate: false,
                        major: majorToMatch,
                        startYear: { lte: admYear },
                    },
                    orderBy: { startYear: "desc" },
                }) as any;
            }

            // Step 3: Fallback — match by department name (for non-BBA departments
            // like การบัญชี or รัฐประศาสนศาสตร์ where major is NULL in DB)
            // IMPORTANT: Do NOT auto-select for BBA ("บริหารธุรกิจ") when major
            // is unknown — BBA has 6 sub-majors, guessing would be wrong.
            if (!curriculumYear && studentInfo.major) {
                const deptName = normalizedMajor ?? studentInfo.major;
                const isBBA = /บริหารธุรกิจ/i.test(deptName);

                if (!isBBA) {
                    curriculumYear = await prisma.curriculumYear.findFirst({
                        where: {
                            isActive: true,
                            isTemplate: false,
                            major: null,
                            department: { name: { contains: deptName } },
                            startYear: { lte: admYear },
                        },
                        orderBy: { startYear: "desc" },
                    }) as any;
                }
            }

            // Step 4: Last resort — only pick a generic curriculum if there is
            // exactly one non-template match (avoids ambiguous BBA selections)
            if (!curriculumYear) {
                const candidates = await prisma.curriculumYear.findMany({
                    where: {
                        isActive: true,
                        isTemplate: false,
                        startYear: { lte: admYear },
                    },
                    orderBy: { startYear: "desc" },
                    take: 2,
                });
                if (candidates.length === 1) {
                    curriculumYear = candidates[0] as any;
                }
                // If multiple candidates, leave curriculumYear null —
                // the user will need to select manually on the verify page
            }

            console.log(
                "[match] auto-select →",
                "admissionYear:", admYear,
                "| major (raw):", studentInfo.major,
                "| major (normalized):", normalizedMajor,
                "| selected:", curriculumYear?.name ?? "none",
                "| startYear:", (curriculumYear as any)?.startYear ?? "N/A"
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
        const matchedCodes = new Set<string>();

        // Recursive match function
        async function matchCategory(
            cat: (typeof categories)[0]
        ): Promise<CategoryMatch | null> {
            // Pruning Logic: Skip category if it explicitly belongs to another track
            const catNameLower = cat.name.toLowerCase();
            const isNormalPlanCat = catNameLower.includes("แผนปกติ") || catNameLower.includes("normal plan");
            const isCoopPlanCat = catNameLower.includes("แผนสหกิจ") || catNameLower.includes("co-op") || catNameLower.includes("coop");

            const isRequestedNormal = requestedTrack.includes("แผนปกติ") || requestedTrack.toLowerCase().includes("normal");
            const isRequestedCoop = requestedTrack.includes("แผนสหกิจ") || requestedTrack.toLowerCase().includes("co-op") || requestedTrack.toLowerCase().includes("coop");

            if (isNormalPlanCat && !isRequestedNormal) return null;
            if (isCoopPlanCat && !isRequestedCoop) return null;

            const children = categories.filter((c: (typeof categories)[0]) => c.parentId === cat.id);
            const childResults = await Promise.all(children.map(matchCategory));
            const childMatches = childResults.filter(Boolean) as CategoryMatch[];

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
                        const dbBase = equivalencyMap.get(cleanDbCode);
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

            const resolvedRequired = await getRequiredCredits(cat.id, planId);

            return {
                categoryId: cat.id,
                categoryName: cat.name,
                parentName: cat.parentId
                    ? categoryMap.get(cat.parentId)?.name || null
                    : null,
                requiredCredits: resolvedRequired,
                completedCredits: ownCompleted + childCompleted,
                inProgressCredits: ownInProgress + childInProgress,
                isElective: cat.isElective,
                matchedSubjects,
                missingSubjects,
                children: childMatches,
            };
        }

        const rootResults = await Promise.all(rootCategories.map(matchCategory));
        const result: CategoryMatch[] = rootResults.filter(Boolean) as CategoryMatch[];

        // --- Phase 2: Waterfall Spillover Logic ---
        let currentUnmatchedSubjects = subjects.filter(
            (s) => !matchedCodes.has(s.code)
        );

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

        // --- Phase 1.5: Within-Category Overflow Extraction ---
        // For any leaf category where matched credits exceed the required credits,
        // extract the excess subjects to the unmatched pool so they can spill over.
        const extractExcessSubjects = (catMatch: CategoryMatch) => {
            if (!catMatch.children || catMatch.children.length === 0) {
                if (catMatch.requiredCredits > 0 && catMatch.completedCredits + catMatch.inProgressCredits > catMatch.requiredCredits) {
                    console.log(`[extractExcessSubjects] HIT: ${catMatch.categoryName}. Credits: ${catMatch.completedCredits + catMatch.inProgressCredits}/${catMatch.requiredCredits}`);
                    let total = 0;
                    const keptSubjects = [];
                    
                    const sortedSubjects = [...catMatch.matchedSubjects].sort((a, b) => {
                        if (a.status === b.status) return 0;
                        return a.status === "COMPLETED" ? -1 : 1;
                    });

                    for (const sub of sortedSubjects) {
                        if (total + sub.credits <= catMatch.requiredCredits) {
                            keptSubjects.push(sub);
                            total += sub.credits;
                        } else {
                            // Look up original subject for full payload
                            const originalSub = subjects.find(s => s.code === sub.code);
                            if (originalSub) {
                                currentUnmatchedSubjects.push(originalSub);
                                matchedCodes.delete(sub.code);
                            }
                        }
                    }
                    
                    catMatch.matchedSubjects = keptSubjects;
                }
            } else {
                catMatch.children.forEach(extractExcessSubjects);
            }
        };

        result.forEach(extractExcessSubjects);
        result.forEach(recalculateCategoryCredits);

        const processSpillover = (spilloverType: string) => {
            console.log(`[processSpillover] START: ${spilloverType}. Unmatched count: ${currentUnmatchedSubjects.length}`);
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
                if (currentUnmatchedSubjects.length === 0) break;

                const dbCat = categoryMap.get(targetCat.categoryId);
                if (!dbCat) continue;

                const limit = dbCat.maxCredits || dbCat.requiredCredits;
                let spaceLeft = limit - targetCat.completedCredits - targetCat.inProgressCredits;

                if (spaceLeft > 0) {
                    const remainingForNextBucket = [];
                    for (const subject of currentUnmatchedSubjects) {
                        if (spaceLeft > 0) {
                            targetCat.matchedSubjects.push({
                                code: subject.code,
                                name: subject.name,
                                credits: subject.credits,
                                grade: subject.grade,
                                status: subject.status,
                            });
                            spaceLeft -= subject.credits;
                        } else {
                            remainingForNextBucket.push(subject);
                        }
                    }
                    currentUnmatchedSubjects = remainingForNextBucket;
                }
            }

            result.forEach(recalculateCategoryCredits);
        };

        // Run the Waterfall!
        processSpillover("GE_ELECTIVE");
        processSpillover("MINOR");
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
            curriculumYearId: curriculumYear.id,
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