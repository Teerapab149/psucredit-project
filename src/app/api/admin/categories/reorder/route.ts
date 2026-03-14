import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
    try {
        const body = await request.json();
        const updates: { id: string; sortOrder: number }[] = body;

        if (!Array.isArray(updates) || updates.length === 0) {
            return NextResponse.json({ error: "Expected a non-empty array of { id, sortOrder }" }, { status: 400 });
        }

        await prisma.$transaction(
            updates.map(({ id, sortOrder }) =>
                prisma.curriculumCategory.update({
                    where: { id },
                    data: { sortOrder },
                })
            )
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Reorder error:", error);
        return NextResponse.json({ error: "Failed to reorder categories" }, { status: 500 });
    }
}
