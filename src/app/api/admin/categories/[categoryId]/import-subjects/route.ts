import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ categoryId: string }> }
) {
    try {
        const { categoryId } = await params;
        const subjects: { code: string; name: string; credits: number }[] = await request.json();

        if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
            return NextResponse.json({ error: "No subjects provided" }, { status: 400 });
        }

        // Validate target category exists
        const category = await prisma.curriculumCategory.findUnique({
            where: { id: categoryId }
        });

        if (!category) {
            return NextResponse.json({ error: "Target category not found" }, { status: 404 });
        }

        // Use createMany to insert subjects, skipping duplicates based on unique constraint (code + categoryId)
        const result = await prisma.subject.createMany({
            data: subjects.map(s => ({
                code: s.code,
                name: s.name,
                credits: Number(s.credits),
                categoryId: categoryId,
            })),
            skipDuplicates: true,
        });

        return NextResponse.json({
            message: `Successfully imported ${result.count} subjects`,
            count: result.count
        });
    } catch (error) {
        console.error("Failed to import subjects:", error);
        return NextResponse.json({ error: "Failed to import subjects" }, { status: 500 });
    }
}
