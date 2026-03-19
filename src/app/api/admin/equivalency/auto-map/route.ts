import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
    try {
        const mappingsCreated = [];

        // ── Phase 1: Code-prefix matching ──
        // For codes > 7 chars, check if the 7-char prefix (base code) exists.
        // e.g., "315-202G2B" → baseCode "315-202"
        const subjects = await prisma.subject.findMany({
            select: { code: true },
        });

        const allCodes = new Set(subjects.map((s) => s.code));

        for (const code of allCodes) {
            if (code.length > 7) {
                const baseCode = code.substring(0, 7);

                if (allCodes.has(baseCode)) {
                    const existing =
                        await prisma.subjectEquivalency.findUnique({
                            where: { newCode: code },
                        });

                    if (!existing) {
                        const eq = await prisma.subjectEquivalency.create({
                            data: { newCode: code, baseCode },
                        });
                        mappingsCreated.push(eq);
                    }
                }
            }
        }

        // ── Phase 2: Name-based matching ──
        // Finds courses in MasterSubject with the same name but different codes.
        // Groups by normalized name, then links newer codes → oldest code as base.
        // e.g., "895-023" (กีตาร์, old) ↔ "895-861G8" (กีตาร์, new)
        const masterSubjects = await prisma.masterSubject.findMany({
            select: { code: true, name: true },
        });

        // Normalize name for fuzzy comparison (strip whitespace, asterisks, special chars)
        const normalizeName = (name: string) =>
            name
                .replace(/[\s\u00A0\u200B]+/g, "") // remove all whitespace variants
                .replace(/[*\-–—()（）]/g, "")     // strip common punctuation
                .toLowerCase()
                .trim();

        // Group codes by normalized name
        const nameToCodesMap = new Map<string, string[]>();
        for (const ms of masterSubjects) {
            const normalized = normalizeName(ms.name);
            if (!normalized) continue;
            const codes = nameToCodesMap.get(normalized) || [];
            codes.push(ms.code);
            nameToCodesMap.set(normalized, codes);
        }

        // For each group with multiple codes, pick the shortest code as the "base"
        // (old codes are typically shorter, e.g., "895-023" vs "895-861G8")
        for (const [, codes] of nameToCodesMap) {
            if (codes.length < 2) continue;

            // Sort by length ascending — shortest = most likely old/base code
            codes.sort((a, b) => a.length - b.length);
            const baseCode = codes[0];

            for (let i = 1; i < codes.length; i++) {
                const newCode = codes[i];

                // Skip if this mapping already exists
                const existing = await prisma.subjectEquivalency.findUnique({
                    where: { newCode },
                });

                if (!existing) {
                    const eq = await prisma.subjectEquivalency.create({
                        data: { newCode, baseCode },
                    });
                    mappingsCreated.push(eq);
                }
            }
        }

        return NextResponse.json({
            message: `Successfully created ${mappingsCreated.length} mappings`,
            count: mappingsCreated.length,
            mappings: mappingsCreated,
        });
    } catch (error) {
        console.error("Auto-map failed:", error);
        return NextResponse.json(
            { error: "Failed to perform auto-mapping" },
            { status: 500 }
        );
    }
}
