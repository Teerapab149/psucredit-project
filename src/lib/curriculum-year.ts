import { prisma } from "./prisma";

/**
 * Auto-detect curriculum year from PSU Student ID.
 * Student ID format: "6610510149"
 *   - First 2 digits "66" → Entry year 2566 (Buddhist Era)
 *   - Queries CurriculumYear from DB
 *   - Falls back to closest active curriculum year ≤ entry year
 */
export async function detectCurriculumYear(studentId: string) {
    if (!studentId || studentId.length < 2) return null;

    const yearPrefix = parseInt(studentId.substring(0, 2));
    if (isNaN(yearPrefix)) return null;

    const buddhistYear = 2500 + yearPrefix; // e.g., 66 → 2566

    // Try finding an active curriculum where the student's entry year falls within [startYear, endYear]
    // If endYear is null, it means the curriculum is active from startYear onwards.
    let curriculums = await prisma.curriculumYear.findMany({
        where: {
            isActive: true,
            startYear: { lte: buddhistYear },
        },
        orderBy: { startYear: "desc" },
    });

    // Filter by endYear in JS since OR conditions with null can be tricky in older Prisma clients
    let curriculum = curriculums.find(c => c.endYear === null || c.endYear >= buddhistYear);

    if (!curriculum && curriculums.length > 0) {
        // Fallback: Just take the most recent active curriculum that started before or on the entry year
        curriculum = curriculums[0];
    }

    return curriculum || null;
}

/**
 * Extract entry year from student ID without DB query.
 * Returns the Buddhist Era year (e.g., 2566)
 */
export function extractEntryYear(studentId: string): number | null {
    if (!studentId || studentId.length < 2) return null;
    const yearPrefix = parseInt(studentId.substring(0, 2));
    if (isNaN(yearPrefix)) return null;
    return 2500 + yearPrefix;
}
