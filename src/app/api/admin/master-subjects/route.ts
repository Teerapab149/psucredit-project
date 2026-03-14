import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/admin/master-subjects — list all master subjects, optional ?group= filter
export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const group = searchParams.get("group");

        const subjects = await prisma.masterSubject.findMany({
            where: group ? { subjectGroup: group } : undefined,
            orderBy: { code: "asc" },
        });

        return NextResponse.json(subjects);
    } catch (error) {
        console.error("Failed to fetch master subjects:", error);
        return NextResponse.json({ error: "Failed to fetch master subjects" }, { status: 500 });
    }
}

// POST /api/admin/master-subjects — create a new master subject
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { code, name, credits, subjectGroup, tags } = body;

        if (!code || !name || credits == null) {
            return NextResponse.json(
                { error: "code, name, and credits are required" },
                { status: 400 }
            );
        }

        const subject = await prisma.masterSubject.create({
            data: {
                code,
                name,
                credits: Number(credits),
                subjectGroup: subjectGroup ?? null,
                tags: tags ?? [],
            },
        });

        return NextResponse.json(subject, { status: 201 });
    } catch (error: any) {
        if (error?.code === "P2002") {
            return NextResponse.json({ error: "Subject code already exists" }, { status: 409 });
        }
        console.error("Failed to create master subject:", error);
        return NextResponse.json({ error: "Failed to create master subject" }, { status: 500 });
    }
}
