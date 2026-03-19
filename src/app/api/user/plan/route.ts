import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export async function PATCH(request: Request) {
    const session = await auth();
    if (!session?.user?.id) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { planId } = await request.json();

        if (planId) {
            const plan = await prisma.curriculumPlan.findUnique({
                where: { id: planId },
            });
            if (!plan) {
                return NextResponse.json(
                    { error: "Plan not found" },
                    { status: 404 }
                );
            }
        }

        const user = await prisma.user.update({
            where: { id: session.user.id },
            data: { planId: planId || null },
        });

        return NextResponse.json({ planId: user.planId });
    } catch (error) {
        console.error("Failed to update user plan:", error);
        return NextResponse.json(
            { error: "Failed to update plan" },
            { status: 500 }
        );
    }
}
