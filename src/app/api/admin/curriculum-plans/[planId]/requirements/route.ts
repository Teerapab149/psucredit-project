import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ planId: string }> }
) {
    const { planId } = await params;
    try {
        const requirements = await prisma.planCategoryRequirement.findMany({
            where: { planId },
        });
        return NextResponse.json(
            requirements.map((r) => ({
                categoryId: r.categoryId,
                requiredCredits: r.requiredCredits,
            }))
        );
    } catch (error) {
        console.error("Failed to fetch requirements:", error);
        return NextResponse.json([], { status: 500 });
    }
}

export async function PUT(
    request: Request,
    { params }: { params: Promise<{ planId: string }> }
) {
    const { planId } = await params;
    try {
        const { requirements }: { requirements: { categoryId: string; requiredCredits: number }[] } =
            await request.json();

        console.log(`\n📝 PUT /requirements — planId: ${planId}`);
        console.log(`   Incoming overrides (${requirements.length}):`, requirements);

        // Delete all existing requirements for this plan, then re-create
        await prisma.$transaction([
            prisma.planCategoryRequirement.deleteMany({ where: { planId } }),
            ...requirements.map((r) =>
                prisma.planCategoryRequirement.create({
                    data: {
                        planId,
                        categoryId: r.categoryId,
                        requiredCredits: r.requiredCredits,
                    },
                })
            ),
        ]);

        // Verify what was actually saved
        const saved = await prisma.planCategoryRequirement.findMany({ where: { planId } });
        console.log(`   ✅ Saved ${saved.length} overrides:`, saved.map(s => ({ cat: s.categoryId, cr: s.requiredCredits })));

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Failed to update requirements:", error);
        return NextResponse.json(
            { error: "Failed to update requirements" },
            { status: 500 }
        );
    }
}
