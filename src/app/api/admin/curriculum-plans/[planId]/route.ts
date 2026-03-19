import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ planId: string }> }
) {
    const { planId } = await params;
    try {
        const plan = await prisma.curriculumPlan.findUnique({
            where: { id: planId },
        });
        if (!plan) {
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }
        return NextResponse.json(plan);
    } catch (error) {
        console.error("Failed to fetch plan:", error);
        return NextResponse.json({ error: "Failed to fetch plan" }, { status: 500 });
    }
}

export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ planId: string }> }
) {
    const { planId } = await params;
    try {
        await prisma.curriculumPlan.delete({ where: { id: planId } });
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to delete plan:", error);
        return NextResponse.json({ error: "Failed to delete plan" }, { status: 500 });
    }
}
