import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/admin/master-subjects/migrate
//
// One-time migration: scans all Subject rows that have no masterSubjectId,
// creates a MasterSubject for each unique code (skipping codes that already
// exist in the bank), then links every Subject row to its master via
// masterSubjectId — all inside a single transaction.
export async function POST() {
    try {
        // 1. Fetch all unlinked subjects
        const unlinked = await prisma.subject.findMany({
            where: { masterSubjectId: null },
            select: { id: true, code: true, name: true, credits: true, subjectGroup: true },
        });

        if (unlinked.length === 0) {
            return NextResponse.json({ message: "Nothing to migrate — all subjects are already linked.", created: 0, linked: 0 });
        }

        // 2. Deduplicate by code — keep the first occurrence as the master record
        const seen = new Map<string, typeof unlinked[0]>();
        for (const s of unlinked) {
            if (!seen.has(s.code)) seen.set(s.code, s);
        }
        const uniqueSubjects = Array.from(seen.values());

        // 3. Find which codes already exist in the bank so we don't duplicate them
        const existingMasters = await prisma.masterSubject.findMany({
            where: { code: { in: uniqueSubjects.map((s) => s.code) } },
            select: { id: true, code: true },
        });
        const existingCodeMap = new Map(existingMasters.map((m) => [m.code, m.id]));

        // 4. Determine what needs to be created
        const toCreate = uniqueSubjects.filter((s) => !existingCodeMap.has(s.code));

        // 5. Run everything in a transaction
        let created = 0;
        let linked = 0;

        await prisma.$transaction(async (tx) => {
            // 5a. Create missing MasterSubject rows
            for (const s of toCreate) {
                const master = await tx.masterSubject.create({
                    data: {
                        code: s.code,
                        name: s.name.trim(),
                        credits: s.credits,
                        subjectGroup: s.subjectGroup ?? null,
                        tags: [],
                    },
                });
                existingCodeMap.set(master.code, master.id);
                created++;
            }

            // 5b. Link every unlinked Subject to its MasterSubject
            for (const s of unlinked) {
                const masterId = existingCodeMap.get(s.code);
                if (!masterId) continue;
                await tx.subject.update({
                    where: { id: s.id },
                    data: { masterSubjectId: masterId },
                });
                linked++;
            }
        });

        return NextResponse.json({
            message: `Migration complete: ${created} master subjects created, ${linked} curriculum subjects linked.`,
            created,
            linked,
        });
    } catch (error) {
        console.error("Migration failed:", error);
        return NextResponse.json({ error: "Migration failed" }, { status: 500 });
    }
}
