import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET subjects (optionally filtered by categoryId)
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const categoryId = searchParams.get("categoryId");

    const subjects = await prisma.subject.findMany({
        where: categoryId ? { categoryId } : undefined,
        include: { category: true },
        orderBy: { code: "asc" },
    });

    return NextResponse.json(subjects);
}

// POST create subject
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const subject = await prisma.subject.create({
            data: {
                code: body.code,
                name: body.name,
                credits: body.credits,
                categoryId: body.categoryId,
            },
        });
        return NextResponse.json(subject);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to create" }, { status: 500 });
    }
}

// PUT update subject
export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const subject = await prisma.subject.update({
            where: { id: body.id },
            data: {
                code: body.code,
                name: body.name,
                credits: body.credits,
                categoryId: body.categoryId,
            },
        });
        return NextResponse.json(subject);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to update" }, { status: 500 });
    }
}

// DELETE subject
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

        await prisma.subject.delete({ where: { id } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
    }
}
