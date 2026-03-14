import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const equivalencies = await prisma.subjectEquivalency.findMany({
            orderBy: { createdAt: "desc" }
        });
        return NextResponse.json(equivalencies);
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
