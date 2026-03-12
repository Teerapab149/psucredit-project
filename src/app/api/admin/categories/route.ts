import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET categories for a curriculum year
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const yearId = searchParams.get("yearId");

    if (!yearId) {
        return NextResponse.json({ error: "yearId required" }, { status: 400 });
    }

    const categories = await prisma.curriculumCategory.findMany({
        where: { curriculumYearId: yearId },
        include: { subjects: true, children: true },
        orderBy: { sortOrder: "asc" },
    });

    return NextResponse.json(categories);
}

// POST create category
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const category = await prisma.curriculumCategory.create({
            data: {
                name: body.name,
                requiredCredits: body.requiredCredits || 0,
                minCredits: body.minCredits || null,
                maxCredits: body.maxCredits || null,
                isElective: body.isElective || false,
                sortOrder: body.sortOrder || 0,
                parentId: body.parentId || null,
                curriculumYearId: body.curriculumYearId,
            },
        });
        return NextResponse.json(category);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to create" }, { status: 500 });
    }
}

// PUT update category
export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const category = await prisma.curriculumCategory.update({
            where: { id: body.id },
            data: {
                name: body.name,
                requiredCredits: body.requiredCredits,
                minCredits: body.minCredits,
                maxCredits: body.maxCredits,
                isElective: body.isElective,
                sortOrder: body.sortOrder,
                parentId: body.parentId,
            },
        });
        return NextResponse.json(category);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }
}

// DELETE category
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

        await prisma.curriculumCategory.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }
}
