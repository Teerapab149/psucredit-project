import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// PUT /api/admin/master-subjects/[id]
// Updates the MasterSubject AND propagates name/credits/subjectGroup to every
// cloned Subject row that carries this masterSubjectId — Single Source of Truth.
export async function PUT(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { code, name, credits, subjectGroup, tags } = body;

        const masterData: Record<string, any> = {};
        if (code         !== undefined) masterData.code         = code;
        if (name         !== undefined) masterData.name         = name;
        if (credits      !== undefined) masterData.credits      = Number(credits);
        if (subjectGroup !== undefined) masterData.subjectGroup = subjectGroup;
        if (tags         !== undefined) masterData.tags         = tags;

        // Run both writes in a transaction so they are atomic
        const [updatedMaster] = await prisma.$transaction([
            // 1. Update the master record
            prisma.masterSubject.update({
                where: { id },
                data: masterData,
            }),
            // 2. Propagate mutable fields to every linked curriculum Subject
            //    (code is intentionally NOT propagated — changing a code is
            //     a new subject, not an update to an existing one)
            prisma.subject.updateMany({
                where: { masterSubjectId: id },
                data: {
                    ...(name         !== undefined && { name }),
                    ...(credits      !== undefined && { credits: Number(credits) }),
                    ...(subjectGroup !== undefined && { subjectGroup }),
                },
            }),
        ]);

        return NextResponse.json(updatedMaster);
    } catch (error: any) {
        if (error?.code === "P2025") {
            return NextResponse.json({ error: "Master subject not found" }, { status: 404 });
        }
        if (error?.code === "P2002") {
            return NextResponse.json({ error: "Subject code already exists" }, { status: 409 });
        }
        console.error("Failed to update master subject:", error);
        return NextResponse.json({ error: "Failed to update master subject" }, { status: 500 });
    }
}

// DELETE /api/admin/master-subjects/[id]
// Deletes the master record. Linked Subject rows have masterSubjectId set to NULL
// (onDelete: SetNull in schema) — they are NOT deleted.
export async function DELETE(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        await prisma.masterSubject.delete({ where: { id } });

        return NextResponse.json({ message: "Deleted successfully" });
    } catch (error: any) {
        if (error?.code === "P2025") {
            return NextResponse.json({ error: "Master subject not found" }, { status: 404 });
        }
        console.error("Failed to delete master subject:", error);
        return NextResponse.json({ error: "Failed to delete master subject" }, { status: 500 });
    }
}
