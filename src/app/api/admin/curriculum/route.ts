import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET all curriculum years
export async function GET() {
    try {
        const years = await prisma.curriculumYear.findMany({
            include: {
                categories: {
                    where: { parentId: null },
                    include: {
                        children: {
                            include: { subjects: true, children: { include: { subjects: true } } },
                            orderBy: { sortOrder: "asc" },
                        },
                        subjects: true,
                    },
                    orderBy: { sortOrder: "asc" },
                },
            },
            orderBy: { year: "desc" },
        });
        return NextResponse.json(years);
    } catch (error) {
        console.error("Failed to fetch curriculum years:", error);
        return NextResponse.json([], { status: 200 });
    }
}

// POST create curriculum year
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const curriculum = await prisma.curriculumYear.create({
            data: {
                year: Number(body.year),
                name: body.name,
                faculty: body.faculty || null,
                department: body.department || null,
                major: body.major || null,
                track: body.track || null,
            } as any, // Bypass TS Error due to Prisma client mis-sync
        });
        return NextResponse.json(curriculum);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to create" }, { status: 500 });
    }
}
