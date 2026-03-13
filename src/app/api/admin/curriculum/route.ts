import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET all curriculum years
export async function GET() {
    try {
        const years = await prisma.curriculumYear.findMany({
            include: {
                categories: {
                    where: { parentId: null },
                    include: {
                        children: {
                            include: { subjects: true, children: { include: { subjects: true } } },
                            orderBy: { sortOrder: "asc" },
                        },
                        subjects: true,
                    },
                    orderBy: { sortOrder: "asc" },
                },
            },
            orderBy: { startYear: "desc" },
        });
        return NextResponse.json(years);
    } catch (error: any) {
        console.error("Failed to fetch curriculum years:", error?.message || error);
        return NextResponse.json([], { status: 500 });
    }
}

// POST create curriculum year
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const baseTemplateId = body.baseTemplateId || null;

        const curriculum = await prisma.curriculumYear.create({
            data: {
                startYear: body.startYear ? Number(body.startYear) : null,
                endYear: body.endYear ? Number(body.endYear) : null,
                name: body.name,
                faculty: body.faculty || null,
                department: body.department || null,
                major: body.major || null,
                track: body.track || null,
                isTemplate: body.isTemplate || false,
                baseTemplateId: baseTemplateId,
            } as any, // Bypass TS Error due to Prisma client mis-sync
        });

        // Clone base template categories if specified
        if (baseTemplateId) {
            const baseCategories = await prisma.curriculumCategory.findMany({
                where: { curriculumYearId: baseTemplateId },
                orderBy: { sortOrder: 'asc' },
            });

            if (baseCategories.length > 0) {
                // We must map old ID -> new ID to maintain correct parent-child relationships
                const idMap = new Map<string, string>();

                // First pass: Filter for root categories and recursively create them
                const createCategoryRecursive = async (oldCategory: any, newParentId: string | null = null) => {
                    const newCat = await prisma.curriculumCategory.create({
                        data: {
                            name: oldCategory.name,
                            requiredCredits: oldCategory.requiredCredits,
                            minCredits: oldCategory.minCredits,
                            maxCredits: oldCategory.maxCredits,
                            isElective: oldCategory.isElective,
                            sortOrder: oldCategory.sortOrder,
                            curriculumYearId: curriculum.id,
                            parentId: newParentId,
                            inheritedFromCategoryId: oldCategory.id,
                            spilloverType: oldCategory.spilloverType,
                        } as any
                    });

                    idMap.set(oldCategory.id, newCat.id);

                    // Find and create children
                    const children = baseCategories.filter((c: any) => c.parentId === oldCategory.id);
                    for (const child of children) {
                        await createCategoryRecursive(child, newCat.id);
                    }
                };

                const rootCategories = baseCategories.filter(c => c.parentId === null);
                for (const rootCat of rootCategories) {
                    await createCategoryRecursive(rootCat, null);
                }
            }
        }

        return NextResponse.json(curriculum);
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to create" }, { status: 500 });
    }
}

// PUT update curriculum year
export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const { id, name, startYear, endYear, faculty, department, major, track, isActive, baseTemplateId } = body;

        if (!id) {
            return NextResponse.json({ error: "Missing curriculum ID" }, { status: 400 });
        }

        const updatedCurriculum = await prisma.curriculumYear.update({
            where: { id },
            data: {
                name,
                startYear: startYear ? Number(startYear) : null,
                endYear: endYear ? Number(endYear) : null,
                faculty: faculty || null,
                department: department || null,
                major: major || null,
                track: track || null,
                isActive: isActive !== undefined ? isActive : undefined,
                baseTemplateId: baseTemplateId !== undefined ? (baseTemplateId || null) : undefined,
            } as any,
        });

        return NextResponse.json(updatedCurriculum);
    } catch (error: any) {
        console.error("PUT /api/admin/curriculum Error:", error?.message || error);
        if (error.code === 'P2025') { // Prisma Record Not Found
             return NextResponse.json({ error: "Curriculum not found" }, { status: 404 });
        }
        return NextResponse.json({ error: "Failed to update curriculum" }, { status: 500 });
    }
}

// DELETE curriculum year
export async function DELETE(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Missing curriculum ID" }, { status: 400 });
        }

        await prisma.curriculumYear.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("DELETE /api/admin/curriculum Error:", error?.message || error);
        return NextResponse.json({ error: "Failed to delete curriculum" }, { status: 500 });
    }
}
