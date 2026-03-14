import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/admin/categories/[categoryId]/import-subjects
// Returns the subject codes that already exist in this category.
// Used by the SubjectBankModal to disable already-imported checkboxes.
export async function GET(
    _request: Request,
    { params }: { params: Promise<{ categoryId: string }> }
) {
    try {
        const { categoryId } = await params;

        const existing = await prisma.subject.findMany({
            where: { categoryId },
            select: { code: true },
        });

        return NextResponse.json(existing.map((s) => s.code));
    } catch (error) {
        console.error("Failed to fetch existing subject codes:", error);
        return NextResponse.json([], { status: 500 });
    }
}

// POST /api/admin/categories/[categoryId]/import-subjects
// Body: string[]  — array of masterSubjectIds
export async function POST(
    request: Request,
    { params }: { params: Promise<{ categoryId: string }> }
) {
    try {
        const { categoryId } = await params;

        const body = await request.json();
        const masterSubjectIds: string[] = Array.isArray(body) ? body : [];

        if (masterSubjectIds.length === 0) {
            return NextResponse.json({ error: "No subject IDs provided" }, { status: 400 });
        }

        // Validate target category exists
        const category = await prisma.curriculumCategory.findUnique({
            where: { id: categoryId },
        });
        if (!category) {
            return NextResponse.json({ error: "Target category not found" }, { status: 404 });
        }

        // Fetch authoritative data from the master bank
        const masterSubjects = await prisma.masterSubject.findMany({
            where: { id: { in: masterSubjectIds } },
        });

        if (masterSubjects.length === 0) {
            return NextResponse.json(
                { error: "None of the provided IDs exist in the master bank" },
                { status: 404 }
            );
        }

        // Find which codes already exist in this category so we can report accurately
        const incomingCodes = masterSubjects.map((ms) => ms.code);
        const alreadyPresent = await prisma.subject.findMany({
            where: { categoryId, code: { in: incomingCodes } },
            select: { code: true },
        });
        const alreadyPresentCodes = new Set(alreadyPresent.map((s) => s.code));

        const toInsert = masterSubjects.filter(
            (ms) => !alreadyPresentCodes.has(ms.code)
        );

        let created = 0;
        if (toInsert.length > 0) {
            const result = await prisma.subject.createMany({
                data: toInsert.map((ms) => ({
                    code: ms.code,
                    name: ms.name,
                    credits: ms.credits,
                    subjectGroup: ms.subjectGroup ?? null,
                    categoryId,
                    masterSubjectId: ms.id,
                })),
                skipDuplicates: true, // safety net for race conditions
            });
            created = result.count;
        }

        const skipped = alreadyPresentCodes.size;

        return NextResponse.json({
            message:
                created > 0
                    ? `Imported ${created} subject${created > 1 ? "s" : ""}${skipped > 0 ? `, ${skipped} already existed` : ""}`
                    : `All ${skipped} subject${skipped > 1 ? "s" : ""} already exist in this category`,
            count: created,
            skipped,
        });
    } catch (error) {
        console.error("Failed to import subjects:", error);
        return NextResponse.json({ error: "Failed to import subjects" }, { status: 500 });
    }
}
