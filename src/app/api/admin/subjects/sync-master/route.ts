import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/admin/subjects/sync-master
// Body: { subjectId: string }
//
// Pulls the latest name, credits, and subjectGroup from the linked MasterSubject
// and writes them onto the local Subject row. Useful for a one-off "re-sync"
// button in the UI when auto-propagation was not in effect at import time.
export async function POST(request: Request) {
    try {
        const { subjectId } = await request.json();

        if (!subjectId) {
            return NextResponse.json({ error: "subjectId is required" }, { status: 400 });
        }

        // Fetch the subject and its linked master in a single query
        const subject = await prisma.subject.findUnique({
            where: { id: subjectId },
            include: { masterSubject: true },
        });

        if (!subject) {
            return NextResponse.json({ error: "Subject not found" }, { status: 404 });
        }

        if (!subject.masterSubject) {
            return NextResponse.json(
                { error: "This subject has no link to the master bank (masterSubjectId is null)" },
                { status: 422 }
            );
        }

        const ms = subject.masterSubject;

        // Only sync the fields that MasterSubject owns.
        // 'code' is intentionally excluded — a code change is a new subject, not an update.
        const updated = await prisma.subject.update({
            where: { id: subjectId },
            data: {
                name:         ms.name,
                credits:      ms.credits,
                subjectGroup: ms.subjectGroup ?? null,
            },
        });

        return NextResponse.json({
            message: "Subject synced with master bank",
            subject: updated,
        });
    } catch (error) {
        console.error("Failed to sync subject with master:", error);
        return NextResponse.json({ error: "Failed to sync subject" }, { status: 500 });
    }
}
