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
            orderBy: { startYear: "desc" },
        });
        return NextResponse.json(years);
    } catch (error: any) {
        console.error("Failed to fetch curriculum years:", error?.message || error);
        return NextResponse.json([], { status: 500 });
    }
}

// POST create curriculum year
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const curriculum = await prisma.curriculumYear.create({
            data: {
                startYear: body.startYear ? Number(body.startYear) : null,
                endYear: body.endYear ? Number(body.endYear) : null,
                name: body.name,
                faculty: body.faculty || null,
                department: body.department || null,
                major: body.major || null,
                track: body.track || null,
                baseTemplateId: body.baseTemplateId || null,
            } as any, // Bypass TS Error due to Prisma client mis-sync
        });
        return NextResponse.json(curriculum);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to create" }, { status: 500 });
    }
}

// PUT update curriculum year
export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, name, startYear, endYear, faculty, department, major, track, isActive, baseTemplateId } = body;

        if (!id) {
            return NextResponse.json({ error: "Missing curriculum ID" }, { status: 400 });
        }

        const updatedCurriculum = await prisma.curriculumYear.update({
            where: { id },
            data: {
                name,
                startYear: startYear ? Number(startYear) : null,
                endYear: endYear ? Number(endYear) : null,
                faculty: faculty || null,
                department: department || null,
                major: major || null,
                track: track || null,
                isActive: isActive !== undefined ? isActive : undefined,
                baseTemplateId: baseTemplateId !== undefined ? (baseTemplateId || null) : undefined,
            } as any,
        });

        return NextResponse.json(updatedCurriculum);
    } catch (error: any) {
        console.error("PUT /api/admin/curriculum Error:", error?.message || error);
        if (error.code === 'P2025') { // Prisma Record Not Found
             return NextResponse.json({ error: "Curriculum not found" }, { status: 404 });
        }
        return NextResponse.json({ error: "Failed to update curriculum" }, { status: 500 });
    }
}
