// prisma/seed-bba.ts — Data-driven BBA curriculum seed
// Reads: prisma/seed-data/curriculums.json + prisma/seed-data/courses.csv
// Run:   npx ts-node prisma/seed-bba.ts

import "dotenv/config";
import { PrismaClient, SpilloverType, PlanType, TrackType } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import fs from "fs";
import path from "path";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ═══ Types ═══

interface CourseRow {
  code: string; name: string; credits: number;
  subjectGroup: string; tags: string[]; type: string;
}

interface CatDef {
  name: string; code: string; sortOrder: number; defaultCredits: number;
  isElective?: boolean; children?: CatDef[];
  planOverrides?: { planType: string; trackType: string | null; requiredCredits: number }[];
}

interface MajorDef {
  name: string; shortName: string;
  plans?: { name: string; planType: string; trackType: string | null }[];
  categories?: CatDef[]; categoriesRef?: string;
}

interface CurrDef {
  name: string; startYear: number; endYear: number | null;
  totalCredits: number; majors: MajorDef[] | string;
}

// ═══ CSV Parser ═══

function parseCsv(filePath: string): CourseRow[] {
  const raw = fs.readFileSync(filePath, "utf-8").replace(/^\uFEFF/, "");
  const lines = raw.split(/\r?\n/).filter(l => l.trim());
  const rows: CourseRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const p = lines[i].split(",");
    if (p.length < 6) continue;
    rows.push({
      code: p[0].trim(), name: p[1].trim(),
      credits: parseInt(p[2].trim(), 10) || 0,
      subjectGroup: p[3].trim(),
      tags: p[4].trim().split("|").map(t => t.trim()).filter(Boolean),
      type: p[5].trim(),
    });
  }
  return rows;
}

// ═══ subjectGroup → major shortName ═══

const GROUP_TO_MAJOR: Record<string, string> = {
  "วิชาแกนธุรกิจ": "CORE",
  "การเงิน": "FIN", "การเงินและการลงทุน": "FIN",
  "การตลาด": "MKT", "การตลาดและการสื่อสาร": "MKT",
  "การจัดการทรัพยากรมนุษย์": "HRM",
  "การจัดการโลจิสติกส์และโซ่อุปทาน": "LOG",
  "ระบบสารสนเทศทางธุรกิจ": "BIS",
  "การจัดการไมซ์": "MICE",
};

// ═══ DB Helpers ═══

async function upsertMaster(code: string, name: string, credits: number, group: string) {
  return prisma.masterSubject.upsert({
    where: { code },
    update: { name, credits, subjectGroup: group },
    create: { code, name, credits, subjectGroup: group, tags: [] },
  });
}

async function linkSubject(code: string, name: string, credits: number, catId: string, masterId: string) {
  return prisma.subject.upsert({
    where: { code_categoryId: { code, categoryId: catId } },
    update: { name, credits, masterSubjectId: masterId },
    create: { code, name, credits, categoryId: catId, masterSubjectId: masterId },
  });
}

function getSpillover(code: string): SpilloverType | undefined {
  if (code === "GE_ELEC") return "GE_ELECTIVE" as SpilloverType;
  if (code === "MINOR") return "MINOR" as SpilloverType;
  if (code === "FREE_ELEC") return "FREE_ELECTIVE" as SpilloverType;
  return undefined;
}

async function mkCat(
  name: string, credits: number, cyId: string, parentId: string | null, sort: number,
  opts: { isElective?: boolean; spilloverType?: SpilloverType } = {}
) {
  return prisma.curriculumCategory.create({
    data: {
      name, requiredCredits: credits, curriculumYearId: cyId, parentId, sortOrder: sort,
      isElective: opts.isElective ?? false,
      spilloverType: opts.spilloverType ?? null,
    },
  });
}

// ═══ Recursive category tree builder → returns code→id map ═══

async function buildTree(cats: CatDef[], cyId: string, parentId: string | null): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  for (const c of cats) {
    const spill = getSpillover(c.code);
    const row = await mkCat(c.name, c.defaultCredits, cyId, parentId, c.sortOrder, {
      isElective: c.isElective, spilloverType: spill,
    });
    map[c.code] = row.id;
    if (c.children) Object.assign(map, await buildTree(c.children, cyId, row.id));
  }
  return map;
}

// ═══ Collect planOverrides recursively from category tree ═══

function collectOverrides(cats: CatDef[]): { code: string; planType: string; trackType: string | null; requiredCredits: number }[] {
  const result: { code: string; planType: string; trackType: string | null; requiredCredits: number }[] = [];
  for (const c of cats) {
    for (const po of c.planOverrides || []) {
      result.push({ code: c.code, planType: po.planType, trackType: po.trackType, requiredCredits: po.requiredCredits });
    }
    if (c.children) result.push(...collectOverrides(c.children));
  }
  return result;
}

// ═══════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════

async function main() {
  console.log("🌱 Starting BBA data-driven seed...\n");

  const dataDir = path.join(__dirname, "seed-data");
  const currPath = path.join(dataDir, "curriculums.json");
  const coursePath = path.join(dataDir, "courses.csv");

  if (!fs.existsSync(currPath)) { console.error(`❌ ${currPath} not found`); process.exit(1); }
  if (!fs.existsSync(coursePath)) { console.error(`❌ ${coursePath} not found`); process.exit(1); }

  const allData = JSON.parse(fs.readFileSync(currPath, "utf-8"));
  const courseRows = parseCsv(coursePath);
  console.log(`📄 ${courseRows.length} course rows loaded`);

  // ── Faculty ──
  const fac = await prisma.faculty.upsert({
    where: { name: "คณะวิทยาการจัดการ" },
    update: { shortName: "FMS" },
    create: { name: "คณะวิทยาการจัดการ", shortName: "FMS" },
  });

  // ── Master subjects ──
  console.log("📚 Upserting master subjects...");
  const masterMap: Record<string, string> = {};
  for (const r of courseRows) {
    const ms = await upsertMaster(r.code, r.name, r.credits, r.subjectGroup);
    masterMap[r.code] = ms.id;
  }
  console.log(`✅ ${Object.keys(masterMap).length} master subjects\n`);

  // ── Process BBA department ──
  for (const facData of allData) {
    for (const deptData of facData.departments) {
      if (deptData.shortName !== "BBA") continue;

      const dept = await prisma.department.upsert({
        where: { name_facultyId: { name: deptData.name, facultyId: fac.id } },
        update: { shortName: deptData.shortName },
        create: { name: deptData.name, shortName: deptData.shortName, facultyId: fac.id },
      });

      for (const curr of deptData.curriculums as CurrDef[]) {
        if (typeof curr.majors === "string") {
          console.log(`⏭️  Skip ${curr.startYear} (${curr.majors})`);
          continue;
        }

        // Resolve categoriesRef
        const majors: MajorDef[] = curr.majors.map((m: any) => {
          if (m.categoriesRef) {
            const ref = curr.majors.find((r: any) => r.shortName === m.categoriesRef && r.categories);
            return ref ? { ...m, categories: (ref as MajorDef).categories } : m;
          }
          return m;
        });

        for (const major of majors) {
          if (!major.categories || !major.plans) continue;

          const year = String(curr.startYear);
          const display = `${major.shortName === "LOG" ? "LSM" : major.shortName} (${year})`;
          console.log(`📋 ${display}: ${major.name}`);

          // ── CurriculumYear ──
          const cy = await prisma.curriculumYear.create({
            data: {
              name: display, startYear: curr.startYear, endYear: curr.endYear,
              departmentId: dept.id, major: major.name, isActive: true, isTemplate: false,
            },
          });

          // ── Category tree ──
          const catMap = await buildTree(major.categories, cy.id, null);

          // ── Link subjects from CSV ──
          const yearCourses = courseRows.filter(r => r.tags.includes(year));

          // Core
          const cores = yearCourses.filter(r => GROUP_TO_MAJOR[r.subjectGroup] === "CORE");
          if (catMap.CORE) {
            for (const s of cores)
              if (masterMap[s.code]) await linkSubject(s.code, s.name, s.credits, catMap.CORE, masterMap[s.code]);
          }

          // Major REQ → PROF_REQ
          const mCourses = yearCourses.filter(r => GROUP_TO_MAJOR[r.subjectGroup] === major.shortName);
          const reqs = mCourses.filter(r => r.type === "req");
          const elecs = mCourses.filter(r => r.type === "elec");

          if (catMap.PROF_REQ) {
            for (const s of reqs)
              if (masterMap[s.code]) await linkSubject(s.code, s.name, s.credits, catMap.PROF_REQ, masterMap[s.code]);
          }

          // Major ELEC → PROF_ELEC
          if (catMap.PROF_ELEC) {
            for (const s of elecs)
              if (masterMap[s.code]) await linkSubject(s.code, s.name, s.credits, catMap.PROF_ELEC, masterMap[s.code]);
          }

          // วิชาโท → MINOR (all subjects from OTHER majors)
          if (catMap.MINOR) {
            const otherCodes = Object.values(GROUP_TO_MAJOR).filter(m => m !== "CORE" && m !== major.shortName);
            const minors = yearCourses.filter(r => otherCodes.includes(GROUP_TO_MAJOR[r.subjectGroup] || ""));
            let mc = 0;
            for (const s of minors) {
              if (!masterMap[s.code]) continue;
              try { await linkSubject(s.code, s.name, s.credits, catMap.MINOR, masterMap[s.code]); mc++; } catch { /* dup */ }
            }
            console.log(`     วิชาโท: ${mc} linked`);
          }

          // ── Plans + PlanCategoryRequirements ──
          const allOverrides = collectOverrides(major.categories);

          for (const pd of major.plans) {
            const plan = await prisma.curriculumPlan.create({
              data: {
                name: pd.name, planType: pd.planType as PlanType,
                trackType: (pd.trackType as TrackType) || null, curriculumYearId: cy.id,
              },
            });

            // Match overrides for this plan
            const matching = allOverrides.filter(o => o.planType === pd.planType && o.trackType === pd.trackType);
            for (const o of matching) {
              if (catMap[o.code]) {
                await prisma.planCategoryRequirement.create({
                  data: { planId: plan.id, categoryId: catMap[o.code], requiredCredits: o.requiredCredits },
                }).catch(() => {}); // ignore dupes
              }
            }
          }

          console.log(`  ✅ ${display} done (core=${cores.length} req=${reqs.length} elec=${elecs.length})`);
        }
      }
    }
  }

  console.log("\n🎉 BBA seed complete!");
  await prisma.$disconnect();
  await pool.end();
}

main().catch(e => { console.error("❌", e); process.exit(1); });
