import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { detectCurriculumYear } from "@/lib/curriculum-year";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    try {
        const { email, password, name, studentId } = await request.json();

        if (!email || !password) {
            return NextResponse.json(
                { error: "Email and password are required" },
                { status: 400 }
            );
        }

        // Check if user exists
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return NextResponse.json(
                { error: "Email already registered" },
                { status: 409 }
            );
        }

        const passwordHash = await bcrypt.hash(password, 12);

        // Auto-detect curriculum year from student ID
        let curriculumYearId: string | undefined;
        if (studentId) {
            const curriculum = await detectCurriculumYear(studentId);
            if (curriculum) curriculumYearId = curriculum.id;
        }

        const user = await prisma.user.create({
            data: {
                email,
                passwordHash,
                name: name || null,
                studentId: studentId || null,
                curriculumYearId: curriculumYearId || null,
            },
        });

        return NextResponse.json({
            id: user.id,
            email: user.email,
            name: user.name,
        });
    } catch (error) {
        console.error("Registration error:", error);
        return NextResponse.json(
            { error: "Registration failed" },
            { status: 500 }
        );
    }
}
