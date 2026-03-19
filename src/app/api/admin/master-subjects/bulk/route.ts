import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { subjects } = body;

        if (!Array.isArray(subjects) || subjects.length === 0) {
            return NextResponse.json(
                { error: "A non-empty 'subjects' array is required" },
                { status: 400 }
            );
        }

        // Validate each row
        for (let i = 0; i < subjects.length; i++) {
            const s = subjects[i];
            if (!s.code || typeof s.code !== "string" || !s.code.trim()) {
                return NextResponse.json(
                    { error: `Row ${i + 1}: 'code' is required` },
                    { status: 400 }
                );
            }
            if (!s.name || typeof s.name !== "string" || !s.name.trim()) {
                return NextResponse.json(
                    { error: `Row ${i + 1}: 'name' is required` },
                    { status: 400 }
                );
            }
            if (s.credits == null || isNaN(Number(s.credits))) {
                return NextResponse.json(
                    { error: `Row ${i + 1}: 'credits' must be a number` },
                    { status: 400 }
                );
            }
        }

        const data = subjects.map((s: any) => ({
            code: s.code.trim().toUpperCase(),
            name: s.name.trim(),
            credits: parseInt(String(s.credits), 10),
            subjectGroup: s.subjectGroup?.trim() || null,
            tags: Array.isArray(s.tags) ? s.tags : [],
        }));

        const result = await prisma.masterSubject.createMany({
            data,
            skipDuplicates: true,
        });

        return NextResponse.json(
            { count: result.count, message: `${result.count} subject(s) imported successfully` },
            { status: 201 }
        );
    } catch (error) {
        console.error("Bulk import failed:", error);
        return NextResponse.json(
            { error: "Bulk import failed" },
            { status: 500 }
        );
    }
}
