import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
    try {
        const [curriculumsCount, categoriesCount, subjectsCount, usersCount] = await Promise.all([
            prisma.curriculumYear.count(),
            prisma.curriculumCategory.count(),
            prisma.subject.count(),
            prisma.user.count({ where: { role: "STUDENT" } }),
        ]);

        return NextResponse.json({
            curriculums: curriculumsCount,
            categories: categoriesCount,
            subjects: subjectsCount,
            students: usersCount,
        });
    } catch (error) {
        console.error("Dashboard stats error:", error);
        return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
    }
}
