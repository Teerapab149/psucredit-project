import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
interface ParsedImportSubject {
    code: string;
    name: string;
    credits: number;
}

/**
 * POST - Parse raw text and optionally save to database
 * Expects: { text: string, categoryId?: string, save?: boolean }
 */
export async function POST(request: Request) {
    try {
        const { text, categoryId, save } = await request.json();

        if (!text) {
            return NextResponse.json(
                { error: "Text is required" },
                { status: 400 }
            );
        }

        // Parse text: each line should be something like "XXX-XXX Subject Name Credits"
        const lines = text.split("\n").filter((l: string) => l.trim());
        const subjects: ParsedImportSubject[] = [];

        for (const line of lines) {
            // Try to extract: code (XXX-XXX), then name, then credits
            const match = line.match(
                /([A-Za-z0-9]{3}-[A-Za-z0-9]+)\s+(.+?)\s+(\d+)\s*$/
            );
            if (match) {
                subjects.push({
                    code: match[1],
                    name: match[2].trim(),
                    credits: parseInt(match[3]),
                });
            } else {
                // Try alternative: just "XXX-XXX Name" (credits might be missing)
                const altMatch = line.match(/([A-Za-z0-9]{3}-[A-Za-z0-9]+)\s+(.+)/);
                if (altMatch) {
                    subjects.push({
                        code: altMatch[1],
                        name: altMatch[2].trim(),
                        credits: 3, // default
                    });
                }
            }
        }

        // If save is requested and categoryId is provided, save to database
        if (save && categoryId) {
            for (const s of subjects) {
                await prisma.subject.upsert({
                    where: {
                        code_categoryId: {
                            code: s.code,
                            categoryId,
                        },
                    },
                    update: { name: s.name, credits: s.credits },
                    create: {
                        code: s.code,
                        name: s.name,
                        credits: s.credits,
                        categoryId,
                    },
                });
            }
        }

        return NextResponse.json({
            subjects,
            count: subjects.length,
            saved: save && categoryId ? true : false,
        });
    } catch (error) {
        console.error("Import error:", error);
        return NextResponse.json(
            { error: "Failed to import" },
            { status: 500 }
        );
    }
}
