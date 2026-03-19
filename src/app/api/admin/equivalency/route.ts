import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const equivalencies = await prisma.subjectEquivalency.findMany({
            orderBy: { createdAt: "desc" }
        });

        // Collect all codes and look up names from MasterSubject
        const allCodes = new Set<string>();
        for (const eq of equivalencies) {
            allCodes.add(eq.newCode);
            allCodes.add(eq.baseCode);
        }

        const masters = await prisma.masterSubject.findMany({
            where: { code: { in: Array.from(allCodes) } },
            select: { code: true, name: true },
        });
        const nameMap = new Map(masters.map(m => [m.code, m.name]));

        const enriched = equivalencies.map(eq => ({
            ...eq,
            newName: nameMap.get(eq.newCode) || null,
            baseName: nameMap.get(eq.baseCode) || null,
        }));

        return NextResponse.json(enriched);
    } catch (error) {
        console.error("Failed to fetch equivalencies:", error);
        return NextResponse.json([], { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { newCode, baseCode } = body;

        if (!newCode || !baseCode) {
            return NextResponse.json({ error: "newCode and baseCode are required" }, { status: 400 });
        }

        const equivalency = await prisma.subjectEquivalency.create({
            data: {
                newCode,
                baseCode,
            },
        });
        return NextResponse.json(equivalency);
    } catch (error) {
        console.error("Failed to create equivalency:", error);
        return NextResponse.json({ error: "Failed to create" }, { status: 500 });
    }
}
