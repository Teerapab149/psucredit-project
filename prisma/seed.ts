import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

async function main() {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    const passwordHash = await bcrypt.hash("admin1234", 12);

    const admin = await prisma.user.upsert({
        where: { email: "admin@psu.ac.th" },
        update: {},
        create: {
            email: "admin@psu.ac.th",
            name: "Admin",
            passwordHash,
            role: "ADMIN",
        },
    });

    console.log("✅ Seeded admin user:", admin.email);

    await prisma.$disconnect();
    await pool.end();
}

main().catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
});
