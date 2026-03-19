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
        console.error("Failed to fetch plans:", error);
        return NextResponse.json([], { status: 500 });
    }
}

// Majors that support SINGLE/DUAL track types
const TRACK_ENABLED_MAJORS = [
    "การจัดการโลจิสติกส์และโซ่อุปทาน", // LOG
    "การบัญชี",                         // ACC
];

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { name, planType, trackType, curriculumYearId } = body;

        if (!name || !planType || !curriculumYearId) {
            return NextResponse.json(
                { error: "name, planType, curriculumYearId are required" },
                { status: 400 }
            );
        }

        // Guard: reject trackType for majors that don't support it
        const resolvedTrack = trackType === "none" ? null : trackType || null;
        if (resolvedTrack) {
            const cy = await prisma.curriculumYear.findUnique({
                where: { id: curriculumYearId },
                include: { department: true },
            });
            const majorOrDept = cy?.major || cy?.department?.name || "";
            if (!TRACK_ENABLED_MAJORS.some((m) => majorOrDept.includes(m))) {
                return NextResponse.json(
                    { error: `trackType (${resolvedTrack}) is not allowed for "${majorOrDept}". Only LOG and ACC support SINGLE/DUAL tracks.` },
                    { status: 400 }
                );
            }
        }

        const plan = await prisma.curriculumPlan.create({
            data: {
                name,
                planType,
                trackType: resolvedTrack,
                curriculumYearId,
            },
        });

        return NextResponse.json(plan, { status: 201 });
    } catch (error) {
        console.error("Failed to create plan:", error);
        return NextResponse.json(
            { error: "Failed to create plan" },
            { status: 500 }
        );
    }
}
