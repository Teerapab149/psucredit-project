import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        // Fetch all subjects, but return only unique ones based on the code
        const subjects = await prisma.subject.findMany({
            distinct: ['code'],
            select: {
                code: true,
                name: true,
                credits: true,
            },
            orderBy: {
                code: 'asc',
            },
        });

        return NextResponse.json(subjects);
    } catch (error) {
        console.error("Failed to fetch subject bank:", error);
        return NextResponse.json({ error: "Failed to fetch subjects" }, { status: 500 });
    }
}
