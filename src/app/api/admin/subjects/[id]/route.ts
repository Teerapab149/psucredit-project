import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const body = await request.json();
        const { id } = await params;

        const subject = await prisma.subject.update({
            where: { id },
            data: {
                code: body.code,
                name: body.name,
                credits: Number(body.credits),
                categoryId: body.categoryId,
                subjectGroup: body.subjectGroup,
            },
        });

        return NextResponse.json(subject);
    } catch (error: any) {
        console.error("Failed to update subject:", error);
        
        // Handle Prisma unique constraint error (P2002)
        if (error.code === "P2002") {
            return NextResponse.json(
                { error: "A subject with this code already exists in this category." },
                { status: 400 }
            );
        }

        return NextResponse.json(
            { error: "Failed to update subject" },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        await prisma.subject.delete({
            where: { id },
        });

        return NextResponse.json({ message: "Subject deleted successfully" });
    } catch (error) {
        console.error("Failed to delete subject:", error);
        return NextResponse.json(
            { error: "Failed to delete subject" },
            { status: 500 }
        );
    }
}
