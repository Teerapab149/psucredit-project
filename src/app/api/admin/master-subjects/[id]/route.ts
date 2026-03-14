import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PUT /api/admin/master-subjects/[id] — update a master subject
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { code, name, credits, subjectGroup, tags } = body;

        const subject = await prisma.masterSubject.update({
            where: { id },
            data: {
                ...(code !== undefined && { code }),
                ...(name !== undefined && { name }),
                ...(credits !== undefined && { credits: Number(credits) }),
                ...(subjectGroup !== undefined && { subjectGroup }),
                ...(tags !== undefined && { tags }),
            },
        });

        return NextResponse.json(subject);
    } catch (error: any) {
        if (error?.code === "P2025") {
            return NextResponse.json({ error: "Master subject not found" }, { status: 404 });
        }
        if (error?.code === "P2002") {
            return NextResponse.json({ error: "Subject code already exists" }, { status: 409 });
        }
        console.error("Failed to update master subject:", error);
        return NextResponse.json({ error: "Failed to update master subject" }, { status: 500 });
    }
}

// DELETE /api/admin/master-subjects/[id] — remove a master subject
export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        await prisma.masterSubject.delete({ where: { id } });

        return NextResponse.json({ message: "Deleted successfully" });
    } catch (error: any) {
        if (error?.code === "P2025") {
            return NextResponse.json({ error: "Master subject not found" }, { status: 404 });
        }
        console.error("Failed to delete master subject:", error);
        return NextResponse.json({ error: "Failed to delete master subject" }, { status: 500 });
    }
}
