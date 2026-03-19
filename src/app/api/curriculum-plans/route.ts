import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const curriculumYearId = searchParams.get("curriculumYearId");

    if (!curriculumYearId) {
        return NextResponse.json(
            { error: "curriculumYearId is required" },
            { status: 400 }
        );
    }

    try {
        const plans = await prisma.curriculumPlan.findMany({
            where: { curriculumYearId },
            orderBy: { name: "asc" },
        });
        return NextResponse.json(plans);
    } catch (error) {
        console.error("Failed to fetch curriculum plans:", error);
        return NextResponse.json(
            { error: "Failed to fetch plans" },
            { status: 500 }
        );
    }
}
