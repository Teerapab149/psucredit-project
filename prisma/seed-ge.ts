import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import fs from "fs";
import path from "path";

// ── Types ──
interface CourseRow {
    code: string;
    name: string;
    credits: number;
    categoryName: string;
    tags: string[]; // Start years, e.g. ["2561", "2567"]
}

// ── Parser ──
function parseCsv(filePath: string): CourseRow[] {
    const raw = fs.readFileSync(filePath, "utf-8");
    const lines = raw.split(/\r?\n/).filter((l) => l.trim());
    const rows: CourseRow[] = [];
    
    // Skip header line (e.g., code,name,credits,categoryName,tags)
    for (let i = 1; i < lines.length; i++) {
        // Simple comma split since this CSV doesn't seem to have quoted commas
        const parts = lines[i].split(",");
        if (parts.length < 5) continue;
        
        // Handle format like "3(3-0-6)" safely returning 3
        const rawCredits = parts[2].trim();
        const credits = parseInt(rawCredits, 10);
        
        const rawTags = parts[4].trim();
        // Support tags delimited by '|' or ','
        const tags = rawTags.split(/[|,]/).map((t) => t.trim()).filter(Boolean);

        rows.push({
            code: parts[0].trim(),
            name: parts[1].trim(),
            credits: isNaN(credits) ? 0 : credits,
            categoryName: parts[3].trim(),
            tags,
        });
    }
    return rows;
}

// ── Mapper: Thai string to Code ──
function getTargetCategoryCode(categoryName: string): string {
    const cName = categoryName.trim();
    
    // Rules for old structure (2561-2566)
    if (cName.includes("สาระที่ 1")) return "GE1";
    if (cName.includes("สาระที่ 2")) return "GE2";
    if (cName.includes("สาระที่ 3")) return "GE3";
    if (cName.includes("สาระที่ 4")) return "GE4";
    if (cName.includes("สาระที่ 5")) return "GE5";
    if (cName.includes("สาระที่ 6")) return "GE6";
    if (cName.includes("สาระที่ 7")) return "GE7";
    
    // Check if the "รายวิชาเลือก" is strictly the old elective category or part of GE 8
    if (cName.includes("รายวิชาเลือก") && !cName.includes("GE 8")) return "GE_ELEC";

    // Rules for new structure (2567+)
    if (cName.includes("GE 1")) return "GE1";
    if (cName.includes("GE 2")) return "GE2";
    if (cName.includes("GE 3")) return "GE3";
    if (cName.includes("GE 4")) return "GE4";
    if (cName.includes("GE 5")) return "GE5";
    if (cName.includes("GE 6")) return "GE6";
    if (cName.includes("GE 7")) return "GE7";
    if (cName.includes("GE 8")) return "GE_ELEC";

    // Fallback if not matching above
    return "UNKNOWN";
}

// ── Main logic ──
async function main() {
    console.log("Starting GE Courses Seed process...");
    
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    // 1. Read the CSV data
    const dataDir = path.join(__dirname, "seed-data");
    const csvPath = path.join(dataDir, "ge_courses_all_update.csv");
    if (!fs.existsSync(csvPath)) {
        console.error(`❌ CSV File not found at ${csvPath}`);
        process.exit(1);
    }
    const courseRows = parseCsv(csvPath);
    console.log(`Read ${courseRows.length} GE course rows from CSV.`);

    // 2. Load Existing Curriculums and Categories
    // Prerequisite Check: Ensure structures exist
    const allCurriculums = await prisma.curriculumYear.findMany({
        include: {
            categories: true,
        }
    });

    if (allCurriculums.length === 0) {
        console.error("❌ No CurriculumYear found in the database. Please run 'npm run seed' first to build the structure.");
        process.exit(1);
    }

    let masterSubjectCount = 0;
    let subjectLinkCount = 0;
    let missingCategoryCount = 0;

    // 3. Process each GE course
    for (const row of courseRows) {
        // a. Upsert MasterSubject
        const master = await prisma.masterSubject.upsert({
            where: { code: row.code },
            update: { 
                name: row.name, 
                credits: row.credits, 
                // Using categoryName as subjectGroup for clarity in Master table
                subjectGroup: row.categoryName, 
            },
            create: {
                code: row.code,
                name: row.name,
                credits: row.credits,
                subjectGroup: row.categoryName,
                tags: row.tags,
            },
        });
        masterSubjectCount++;

        // b. Derive internal code
        const targetCategoryCode = getTargetCategoryCode(row.categoryName);
        if (targetCategoryCode === "UNKNOWN") {
            console.warn(`⚠️ Warning: Could not map category '${row.categoryName}' for Code ${row.code}`);
            continue;
        }

        // c. Link to matching CurriculumYears based on tags (years)
        for (const yearTag of row.tags) {
            const yearNum = parseInt(yearTag, 10);
            if (isNaN(yearNum)) continue;

            // Map cohort tags to the actual startYear limits in the active curriculums.
            // Tag '2561' covers 2561-2566. Tag '2567' covers 2567+.
            const matchingCYs = allCurriculums.filter(cy => {
                if (cy.startYear === null) return false;
                if (yearNum === 2561) {
                    return cy.startYear >= 2561 && cy.startYear < 2567;
                } else if (yearNum === 2567) {
                    return cy.startYear >= 2567;
                }
                return cy.startYear === yearNum;
            });

            for (const cy of matchingCYs) {
                // Find the specific category in this CurriculumYear, usually matching by 'code' mapping 
                // Wait.. Currently, curriculumCategory doesn't have a strict unique 'code' column in DB,
                // but we know its name from the tree construction... wait, how did we link in seed.ts?
                // seed.ts built a local map.
                // Alternatively, we can just find the category by scanning cy.categories for names that map to the same `targetCategoryCode`.
                
                const targetCat = cy.categories.find(c => {
                    const code = getTargetCategoryCode(c.name);
                    return code === targetCategoryCode;
                });

                if (!targetCat) {
                    missingCategoryCount++;
                    // Optional warning for missing cat:
                    // console.warn(`⚠️ Category '${targetCategoryCode}' missing in Curriculum '${cy.name}'`);
                    continue;
                }

                // Upsert Subject linked to this category
                await prisma.subject.upsert({
                    where: {
                        code_categoryId: { 
                            code: row.code, 
                            categoryId: targetCat.id 
                        },
                    },
                    update: {
                        name: row.name,
                        credits: row.credits,
                        subjectGroup: targetCategoryCode,
                        masterSubjectId: master.id,
                    },
                    create: {
                        code: row.code,
                        name: row.name,
                        credits: row.credits,
                        categoryId: targetCat.id,
                        subjectGroup: targetCategoryCode,
                        masterSubjectId: master.id,
                    },
                });
                subjectLinkCount++;
            }
        }
    }

    console.log(`\n✅ GE Seed Complete!`);
    console.log(`   - Master Subjects Processed: ${masterSubjectCount}`);
    console.log(`   - Curriculum Subject Links Created: ${subjectLinkCount}`);
    if (missingCategoryCount > 0) {
        console.log(`   - Skipped ${missingCategoryCount} links because the target GE category was missing in the corresponding CurriculumYear.`);
    }

    await prisma.$disconnect();
    await pool.end();
}

main().catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
});
