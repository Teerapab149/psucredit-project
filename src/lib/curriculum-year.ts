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

    // Try exact match first
    let curriculum = await prisma.curriculumYear.findUnique({
        where: { year: buddhistYear },
    });

    if (!curriculum) {
        // Fallback: closest active curriculum year ≤ entry year
        curriculum = await prisma.curriculumYear.findFirst({
            where: { year: { lte: buddhistYear }, isActive: true },
            orderBy: { year: "desc" },
        });
    }

    return curriculum;
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
