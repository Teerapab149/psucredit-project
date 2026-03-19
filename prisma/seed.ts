import "dotenv/config";
import { PrismaClient, type PlanType, type TrackType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

// ── Types mirroring curriculums.json ──

interface PlanOverrideJson {
    planType: string;
    trackType: string | null;
    requiredCredits: number;
}

interface CategoryJson {
    name: string;
    code: string;
    sortOrder: number;
    defaultCredits: number;
    isElective?: boolean;
    children?: CategoryJson[];
    planOverrides?: PlanOverrideJson[];
}

interface PlanJson {
    name: string;
    planType: string;
    trackType: string | null;
}

interface MajorJson {
    name: string;
    shortName: string;
    plans: PlanJson[];
    categories?: CategoryJson[];
    categoriesRef?: string; // shortName of the major to copy from
}

interface CurriculumJson {
    name: string;
    startYear: number;
    endYear: number | null;
    totalCredits: number;
    note?: string;
    majors: MajorJson[] | string; // "same_structure_as_2563" shorthand
}

interface DepartmentJson {
    name: string;
    shortName: string;
    curriculums: CurriculumJson[];
}

interface FacultyJson {
    faculty: string;
    facultyShort: string;
    departments: DepartmentJson[];
}

// ── CSV parser (simple, no library needed) ──

interface CourseRow {
    code: string;
    name: string;
    credits: number;
    subjectGroup: string;
    tags: string[]; // years as strings e.g. ["2563", "2567"]
}

function parseCsv(filePath: string): CourseRow[] {
    const raw = fs.readFileSync(filePath, "utf-8");
    const lines = raw.split(/\r?\n/).filter((l) => l.trim());
    const rows: CourseRow[] = [];
    // Skip header
    for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(",");
        if (parts.length < 5) continue;
        rows.push({
            code: parts[0].trim(),
            name: parts[1].trim(),
            credits: parseInt(parts[2].trim(), 10),
            subjectGroup: parts[3].trim(),
            tags: parts[4].trim().split("|").filter(Boolean),
        });
    }
    return rows;
}

// ── Helpers ──

/** findFirst-based upsert for models without a compound unique constraint */
async function findOrCreate<T extends { id: string }>(
    findFn: () => Promise<T | null>,
    createFn: () => Promise<T>,
    updateFn?: (existing: T) => Promise<T>,
): Promise<T> {
    const existing = await findFn();
    if (existing) {
        return updateFn ? updateFn(existing) : existing;
    }
    return createFn();
}

// ── Main ──

async function main() {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    // ──────────────────────────────────────
    // 0. Admin user
    // ──────────────────────────────────────
    const passwordHash = await bcrypt.hash("admin1234", 12);
    await prisma.user.upsert({
        where: { email: "admin@psu.ac.th" },
        update: {},
        create: {
            email: "admin@psu.ac.th",
            name: "Admin",
            passwordHash,
            role: "ADMIN",
        },
    });
    console.log("✅ Seeded admin user");

    // ──────────────────────────────────────
    // 1. Read seed data
    // ──────────────────────────────────────
    const dataDir = path.join(__dirname, "seed-data");
    const curriculumsJson: FacultyJson[] = JSON.parse(
        fs.readFileSync(path.join(dataDir, "curriculums.json"), "utf-8"),
    );
    const courseRows = parseCsv(path.join(dataDir, "courses.csv"));

    console.log(`Read ${curriculumsJson.length} faculties, ${courseRows.length} course rows`);

    // ──────────────────────────────────────
    // 2. Seed curriculums.json
    // ──────────────────────────────────────

    // Global map: subjectGroup name -> list of categoryIds per CurriculumYear
    // key = `${curriculumYearId}::${majorName}`, value = Map<categoryCode, categoryId>
    const categoryCodeMap = new Map<string, Map<string, string>>();

    for (const facEntry of curriculumsJson) {
        console.log(`\nSeeding faculty: ${facEntry.faculty}`);

        // Upsert Faculty
        const faculty = await prisma.faculty.upsert({
            where: { name: facEntry.faculty },
            update: { shortName: facEntry.facultyShort },
            create: { name: facEntry.faculty, shortName: facEntry.facultyShort },
        });

        for (const deptEntry of facEntry.departments) {
            // Upsert Department
            const dept = await findOrCreate(
                () =>
                    prisma.department.findUnique({
                        where: { name_facultyId: { name: deptEntry.name, facultyId: faculty.id } },
                    }),
                () =>
                    prisma.department.create({
                        data: { name: deptEntry.name, shortName: deptEntry.shortName, facultyId: faculty.id },
                    }),
                (existing) =>
                    prisma.department.update({
                        where: { id: existing.id },
                        data: { shortName: deptEntry.shortName },
                    }),
            );

            console.log(`  Department: ${deptEntry.name}`);

            // Resolve majors for curriculums that use "same_structure_as_2563" shorthand
            // We need to find the first curriculum (2563) and reuse its majors list
            const firstCurr = deptEntry.curriculums.find((c) => Array.isArray(c.majors));
            const firstMajors = firstCurr && Array.isArray(firstCurr.majors)
                ? (firstCurr.majors as MajorJson[])
                : [];

            for (const currEntry of deptEntry.curriculums) {
                const resolvedMajors: MajorJson[] =
                    typeof currEntry.majors === "string"
                        ? firstMajors // "same_structure_as_2563" → copy from first
                        : currEntry.majors;

                if (resolvedMajors.length === 0) {
                    console.log(`    Skipping curriculum "${currEntry.name}" (${currEntry.startYear}) — no majors`);
                    continue;
                }

                // Each major gets its own CurriculumYear
                // The CurriculumYear.name combines the curriculum name + major for uniqueness
                // But from the JSON, multiple majors share the same curriculum metadata

                for (const majorEntry of resolvedMajors) {
                    const cyName = `${majorEntry.shortName} (${currEntry.startYear})`;

                    // Upsert CurriculumYear
                    const cy = await findOrCreate(
                        () =>
                            prisma.curriculumYear.findFirst({
                                where: { name: cyName, startYear: currEntry.startYear, departmentId: dept.id },
                            }),
                        () =>
                            prisma.curriculumYear.create({
                                data: {
                                    name: cyName,
                                    startYear: currEntry.startYear,
                                    endYear: currEntry.endYear,
                                    departmentId: dept.id,
                                    major: majorEntry.name,
                                },
                            }),
                        (existing) =>
                            prisma.curriculumYear.update({
                                where: { id: existing.id },
                                data: { endYear: currEntry.endYear, major: majorEntry.name },
                            }),
                    );

                    console.log(`    CurriculumYear: ${cyName} (${cy.id})`);

                    // Upsert plans & delete stale ones not in JSON
                    const planIdMap = new Map<string, string>(); // "REGULAR::null" -> planId
                    const seededPlanIds = new Set<string>();
                    for (const planDef of majorEntry.plans) {
                        const planKey = `${planDef.planType}::${planDef.trackType ?? "null"}`;
                        const plan = await findOrCreate(
                            () =>
                                prisma.curriculumPlan.findFirst({
                                    where: {
                                        name: planDef.name,
                                        curriculumYearId: cy.id,
                                    },
                                }),
                            () =>
                                prisma.curriculumPlan.create({
                                    data: {
                                        name: planDef.name,
                                        planType: planDef.planType as PlanType,
                                        trackType: (planDef.trackType as TrackType) || null,
                                        curriculumYearId: cy.id,
                                    },
                                }),
                            (existing) =>
                                prisma.curriculumPlan.update({
                                    where: { id: existing.id },
                                    data: {
                                        planType: planDef.planType as PlanType,
                                        trackType: (planDef.trackType as TrackType) || null,
                                    },
                                }),
                        );
                        planIdMap.set(planKey, plan.id);
                        seededPlanIds.add(plan.id);
                    }

                    // Delete stale plans that exist in DB but not in JSON
                    const existingPlans = await prisma.curriculumPlan.findMany({
                        where: { curriculumYearId: cy.id },
                    });
                    for (const ep of existingPlans) {
                        if (!seededPlanIds.has(ep.id)) {
                            await prisma.curriculumPlan.delete({ where: { id: ep.id } });
                            console.log(`      🗑️ Deleted stale plan: ${ep.name} (${ep.planType}/${ep.trackType})`);
                        }
                    }

                    // Resolve categories — either inline or from categoriesRef
                    let categories: CategoryJson[];
                    if (majorEntry.categories) {
                        categories = majorEntry.categories;
                    } else if (majorEntry.categoriesRef) {
                        // Find the referenced major in the same curriculum
                        const refMajor = resolvedMajors.find(
                            (m) => m.shortName === majorEntry.categoriesRef,
                        );
                        categories = refMajor?.categories ?? [];
                    } else {
                        categories = [];
                    }

                    // Local code map for this CurriculumYear
                    const localCodeMap = new Map<string, string>();

                    // Recursive category seeder
                    let categoryCount = 0;
                    const seedCategory = async (
                        cat: CategoryJson,
                        parentId: string | null,
                    ): Promise<void> => {
                        const dbCat = await findOrCreate(
                            () =>
                                prisma.curriculumCategory.findFirst({
                                    where: {
                                        name: cat.name,
                                        curriculumYearId: cy.id,
                                        parentId: parentId,
                                    },
                                }),
                            () =>
                                prisma.curriculumCategory.create({
                                    data: {
                                        name: cat.name,
                                        requiredCredits: cat.defaultCredits,
                                        isElective: cat.isElective ?? false,
                                        sortOrder: cat.sortOrder,
                                        curriculumYearId: cy.id,
                                        parentId,
                                    },
                                }),
                            (existing) =>
                                prisma.curriculumCategory.update({
                                    where: { id: existing.id },
                                    data: {
                                        requiredCredits: cat.defaultCredits,
                                        isElective: cat.isElective ?? false,
                                        sortOrder: cat.sortOrder,
                                    },
                                }),
                        );
                        categoryCount++;
                        localCodeMap.set(cat.code, dbCat.id);

                        // Upsert planOverrides
                        if (cat.planOverrides) {
                            for (const ov of cat.planOverrides) {
                                const planKey = `${ov.planType}::${ov.trackType ?? "null"}`;
                                const planId = planIdMap.get(planKey);
                                if (!planId) continue;

                                await prisma.planCategoryRequirement.upsert({
                                    where: {
                                        planId_categoryId: { planId, categoryId: dbCat.id },
                                    },
                                    update: { requiredCredits: ov.requiredCredits },
                                    create: {
                                        planId,
                                        categoryId: dbCat.id,
                                        requiredCredits: ov.requiredCredits,
                                    },
                                });
                            }
                        }

                        // Recurse children
                        if (cat.children) {
                            for (const child of cat.children) {
                                await seedCategory(child, dbCat.id);
                            }
                        }
                    };

                    for (const rootCat of categories) {
                        await seedCategory(rootCat, null);
                    }

                    categoryCodeMap.set(`${cy.id}::${majorEntry.name}`, localCodeMap);
                    console.log(`      Seeded ${categoryCount} categories, ${planIdMap.size} plans`);
                }
            }
        }
    }

    // ──────────────────────────────────────
    // 3. Seed courses.csv
    // ──────────────────────────────────────
    console.log("\nSeeding courses...");

    // Build lookup: for each CurriculumYear, map majorName/subjectGroup to the correct categoryId
    // We need to know which subjectGroup maps to which category code.
    // The subjectGroup in CSV is the major name (e.g. "ระบบสารสนเทศทางธุรกิจ") or "วิชาแกนธุรกิจ"
    // "วิชาแกนธุรกิจ" → CORE category
    // Major-specific subjects → PROF_REQ or the first professional required category

    // Build a map: CurriculumYear.id → { subjectGroup → categoryId }
    // We need to relate the CSV subjectGroup to the category code system:
    //   "วิชาแกนธุรกิจ" → "CORE"
    //   <major name> → "PROF_REQ" (professional required subjects)

    // First, collect all CurriculumYears with their linked major info
    const allCYs = await prisma.curriculumYear.findMany({
        include: { department: true },
    });

    // Map: majorShortName -> majorName (from JSON)
    const shortToFullName = new Map<string, string>();
    for (const facEntry of curriculumsJson) {
        for (const dept of facEntry.departments) {
            for (const curr of dept.curriculums) {
                if (typeof curr.majors === "string") continue;
                for (const m of curr.majors) {
                    shortToFullName.set(m.shortName, m.name);
                }
            }
        }
    }

    // Inverse: fullName -> shortName
    const fullToShort = new Map<string, string>();
    for (const [short, full] of shortToFullName) {
        fullToShort.set(full, short);
    }

    let masterSubjectCount = 0;
    let subjectCount = 0;

    for (const row of courseRows) {
        // Upsert MasterSubject (by code — same code with different names = different year versions)
        // Since MasterSubject.code is @unique, we upsert based on code.
        // If multiple CSV rows have the same code but different names (different years),
        // the MasterSubject gets the latest name. Each row still creates a separate Subject.
        const master = await prisma.masterSubject.upsert({
            where: { code: row.code },
            update: { name: row.name, credits: row.credits, subjectGroup: row.subjectGroup },
            create: {
                code: row.code,
                name: row.name,
                credits: row.credits,
                subjectGroup: row.subjectGroup,
                tags: row.tags,
            },
        });
        masterSubjectCount++;

        // For each year tag, find matching CurriculumYears and place the Subject
        for (const yearTag of row.tags) {
            const yearNum = parseInt(yearTag, 10);

            // Determine which category code to use based on subjectGroup
            let targetCategoryCode: string;
            if (row.subjectGroup === "วิชาแกนธุรกิจ") {
                targetCategoryCode = "CORE";
            } else {
                // Major-specific subject → goes into PROF_REQ
                targetCategoryCode = "PROF_REQ";
            }

            // Find all CurriculumYears for this startYear
            const matchingCYs = allCYs.filter((cy) => cy.startYear === yearNum);

            for (const cy of matchingCYs) {
                // Extract the major shortName from cy.name (format: "SHORT (YEAR)")
                const shortMatch = cy.name.match(/^(\w+)\s*\(/);
                const majorShort = shortMatch?.[1];
                const majorFull = majorShort ? shortToFullName.get(majorShort) : null;

                // For "วิชาแกนธุรกิจ", link to ALL matching CurriculumYears
                // For major-specific subjects, only link if the subjectGroup matches the major name
                if (row.subjectGroup !== "วิชาแกนธุรกิจ" && majorFull !== row.subjectGroup) {
                    continue;
                }

                // Look up the category code map for this CurriculumYear
                // Try all keys that match this cy.id
                let categoryId: string | undefined;
                for (const [key, codeMap] of categoryCodeMap) {
                    if (key.startsWith(`${cy.id}::`)) {
                        categoryId = codeMap.get(targetCategoryCode);
                        if (categoryId) break;
                    }
                }

                if (!categoryId) continue;

                // Upsert Subject (by code + categoryId unique constraint)
                await prisma.subject.upsert({
                    where: {
                        code_categoryId: { code: row.code, categoryId },
                    },
                    update: {
                        name: row.name,
                        credits: row.credits,
                        subjectGroup: row.subjectGroup,
                        masterSubjectId: master.id,
                    },
                    create: {
                        code: row.code,
                        name: row.name,
                        credits: row.credits,
                        categoryId,
                        subjectGroup: row.subjectGroup,
                        masterSubjectId: master.id,
                    },
                });
                subjectCount++;
            }
        }
    }

    console.log(`✅ Seeded ${masterSubjectCount} master subjects, ${subjectCount} curriculum subjects`);

    // ──────────────────────────────────────
    // Done
    // ──────────────────────────────────────
    console.log("\n✅ Seed complete!");

    await prisma.$disconnect();
    await pool.end();
}

main().catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
});
