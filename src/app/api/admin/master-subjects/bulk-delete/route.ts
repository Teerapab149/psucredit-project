import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { ids } = body;

        if (!Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: "Invalid or empty IDs list" }, { status: 400 });
        }

        const result = await prisma.masterSubject.deleteMany({
            where: {
                id: { in: ids },
            },
        });

        return NextResponse.json({ success: true, count: result.count });
    } catch (error: any) {
        console.error("POST /api/admin/master-subjects/bulk-delete Error:", error?.message || error);
        return NextResponse.json({ error: "Failed to bulk delete subjects" }, { status: 500 });
    }
}
