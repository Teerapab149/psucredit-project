import { prisma } from "@/lib/prisma";

export async function getRequiredCredits(
    categoryId: string,
    planId?: string | null
): Promise<number> {
    if (planId) {
        const override = await prisma.planCategoryRequirement.findUnique({
            where: { planId_categoryId: { planId, categoryId } },
        });
        if (override) return override.requiredCredits;
    }
    const category = await prisma.curriculumCategory.findUnique({
        where: { id: categoryId },
    });
    return category?.requiredCredits ?? 0;
}
