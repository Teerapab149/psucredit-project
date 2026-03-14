import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function DELETE(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        await prisma.subjectEquivalency.delete({
            where: { id },
        });

        return NextResponse.json({ message: "Equivalency deleted successfully" });
    } catch (error) {
        console.error("Failed to delete equivalency:", error);
        return NextResponse.json(
            { error: "Failed to delete equivalency" },
            { status: 500 }
        );
    }
}
