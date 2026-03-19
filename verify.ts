// eslint-disable-next-line @typescript-eslint/no-require-imports
const dotenv = require("dotenv");
dotenv.config({ path: ".env" });

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
    console.log("Checking DB...");

    // 1. Master Templates
    const templates = await prisma.curriculumYear.findMany({
        where: { isTemplate: true },
        include: { categories: { include: { subjects: true } } }
    });
    for (const t of templates) {
        const subCount = t.categories.reduce((acc, c) => acc + c.subjects.length, 0);
        console.log(`\n📋 ${t.name} — ${t.categories.length} categories, ${subCount} subjects`);
        for (const c of t.categories) {
            console.log(`   └─ ${c.name} (${c.subjects.length} subjects)`);
        }
    }

    // 2. Check a curriculum clone
    const fin = await prisma.curriculumYear.findFirst({
        where: { name: 'FIN (2567)' },
        include: {
            categories: {
                where: { inheritedFromCategoryId: { not: null } },
                include: { subjects: true }
            }
        }
    });
    const finSubCount = fin?.categories.reduce((acc, c) => acc + c.subjects.length, 0) ?? 0;
    console.log(`\n🔗 FIN (2567) — ${fin?.categories.length} inherited GE categories, ${finSubCount} subjects`);

    // 3. baseTemplateId check
    const linked = await prisma.curriculumYear.findMany({
        where: { baseTemplateId: { not: null }, isTemplate: false },
        select: { name: true, baseTemplateId: true }
    });
    console.log(`\n✅ ${linked.length} curriculums linked to a Master Template:`);
    for (const l of linked) {
        console.log(`   └─ ${l.name}`);
    }
}

main().catch(console.error).finally(async () => { await pool.end(); });
