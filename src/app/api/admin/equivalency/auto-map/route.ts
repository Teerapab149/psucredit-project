import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
    try {
        // 1. Fetch all unique subject codes from the database
        const subjects = await prisma.subject.findMany({
            select: { code: true }
        });
        
        const allCodes = new Set(subjects.map(s => s.code));
        const mappingsCreated = [];

        // 2. Find codes that have suffixes (length > 7)
        for (const code of allCodes) {
            if (code.length > 7) {
                // 3. Extract the first 7 characters (base code)
                const baseCode = code.substring(0, 7);

                // 4. Check if this base code also exists in the database
                if (allCodes.has(baseCode)) {
                    // 5. Automatically create a SubjectEquivalency record if it doesn't already exist
                    const existing = await prisma.subjectEquivalency.findUnique({
                        where: { newCode: code }
                    });

                    if (!existing) {
                        const newEquivalency = await prisma.subjectEquivalency.create({
                            data: {
                                newCode: code,
                                baseCode: baseCode,
                            }
                        });
                        mappingsCreated.push(newEquivalency);
                    }
                }
            }
        }

        return NextResponse.json({
            message: `Successfully created ${mappingsCreated.length} mappings`,
            count: mappingsCreated.length,
            mappings: mappingsCreated
        });
    } catch (error) {
        console.error("Auto-map failed:", error);
        return NextResponse.json(
            { error: "Failed to perform auto-mapping" },
            { status: 500 }
        );
    }
}
