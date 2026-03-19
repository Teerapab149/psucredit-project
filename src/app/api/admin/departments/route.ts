import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET all departments grouped by faculty
export async function GET() {
    try {
        const faculties = await prisma.faculty.findMany({
            include: {
                departments: {
                    orderBy: { name: "asc" },
                },
            },
            orderBy: { name: "asc" },
        });
        return NextResponse.json(faculties);
    } catch (error: any) {
        console.error("Failed to fetch departments:", error?.message || error);
        return NextResponse.json([], { status: 500 });
    }
}
