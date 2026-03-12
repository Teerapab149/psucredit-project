import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const subjects = await prisma.subject.findMany({
            include: {
                category: {
                    include: {
                        curriculumYear: true
                    }
                }
            },
            orderBy: { code: "asc" }
        });
        return NextResponse.json(subjects);
    } catch (error) {
        console.error("Failed to fetch subjects:", error);
        return NextResponse.json([], { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const subject = await prisma.subject.create({
            data: {
                code: body.code,
                name: body.name,
                credits: Number(body.credits),
                categoryId: body.categoryId,
            },
        });
        return NextResponse.json(subject);
    } catch (error) {
        console.error("Failed to create subject:", error);
        return NextResponse.json({ error: "Failed to create" }, { status: 500 });
    }
}
