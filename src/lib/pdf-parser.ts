import type { ParsedSubject, StudentInfo } from "@/types";

/** Maps English academic terms (case-insensitive) to their standard Thai equivalents. */
const ACADEMIC_TERMS_TH: Record<string, string> = {
    "management sciences":         "วิทยาการจัดการ",
    "business administration":     "บริหารธุรกิจ",
    "business information system": "สารสนเทศทางธุรกิจ",
    "hat yai":                     "หาดใหญ่",
};

/**
 * If `text` contains any English key from ACADEMIC_TERMS_TH (case-insensitive),
 * return the mapped Thai term. Otherwise return the original text unchanged.
 * Longer keys are checked first so more-specific terms win over sub-strings.
 */
function translateTerm(text: string): string {
    const lower = text.toLowerCase();
    const entries = Object.entries(ACADEMIC_TERMS_TH).sort((a, b) => b[0].length - a[0].length);
    for (const [en, th] of entries) {
        if (lower.includes(en)) return th;
    }
    return text;
}

/**
 * PSU SIS PDF Formats (based on actual extracted text):
 *
 * Grade Report:
 *   Subject Code  Subject Name              Section  Credit  Grade
 *   145-101       COMPANION ANIMALS         02       3       A
 *   200-104G4     THAI FOR COMMUNICATION    01       3       B+
 *   388-100       HEALTH FOR ALL            01       1       P
 *
 * Registration Report:
 *   Subject Code  Subject Name              Section  Type  Credit
 *   145-101       COMPANION ANIMALS         02       C     3.0
 *   895-880G8     EXERCISE FOR HEALTH       01       C     -2.0
 *
 * Subject codes can contain letters after digits: B03-001G4, 315-202G2B, etc.
 */

/** Grade report: CODE NAME SECTION CREDITS GRADE */
const GRADE_REPORT_PATTERNS = [
    // PSU SIS format: "CODE Subject Name  SEC  Credits  Grade"
    { regex: /([A-Z0-9]{3}-[A-Z0-9]+)\s+(.+?)\s+(\d{2})\s+(\d+)\s+(A|B\+?|C\+?|D\+?|S|U|F|W|P|G)\s*$/gm, creditIdx: 4, gradeIdx: 5 },
    // Fallback: without section number
    { regex: /([A-Z0-9]{3}-[A-Z0-9]+)\s+(.+?)\s+(\d+)\s+(A|B\+?|C\+?|D\+?|S|U|F|W|P|G)\s*$/gm, creditIdx: 3, gradeIdx: 4 },
    // Tab-separated
    { regex: /([A-Z0-9]{3}-[A-Z0-9]+)\t+(.+?)\t+(\d+)\t+(A|B\+?|C\+?|D\+?|S|U|F|W|P|G)/gm, creditIdx: 3, gradeIdx: 4 },
];

/** Registration report: CODE NAME SECTION TYPE CREDITS(decimal, possibly negative) */
const REGISTRATION_PATTERNS = [
    // PSU SIS format: "CODE Subject Name  SEC  TYPE  Credits"
    { regex: /([A-Z0-9]{3}-[A-Z0-9]+)\s+(.+?)\s+(\d{2})\s+([A-Z])\s+(-?\d+(?:\.\d+)?)\s*$/gm, creditIdx: 5 },
    // Without type column: "CODE Subject Name  SEC  Credits"
    { regex: /([A-Z0-9]{3}-[A-Z0-9]+)\s+(.+?)\s+(\d{2})\s+(-?\d+(?:\.\d+)?)\s*$/gm, creditIdx: 4 },
    // Fallback: just CODE NAME CREDITS
    { regex: /([A-Z0-9]{3}-[A-Z0-9]+)\s+(.+?)\s+(-?\d+(?:\.\d+)?)\s*$/gm, creditIdx: 3 },
];

/**
 * Clean extracted text: normalize whitespace, fix broken lines
 */
function cleanText(text: string): string {
    return text
        .replace(/\r\n/g, "\n")
        .replace(/\r/g, "\n")
        // Fix common PDF extraction issues: reconnect split lines
        .replace(/([A-Z0-9]{3}-[A-Z0-9]+)\n\s+/g, "$1 ")
        // Normalize multiple spaces
        .replace(/ {3,}/g, "  ")
        .trim();
}

/**
 * Parse grade report PDF text
 * Format: CODE NAME SECTION CREDITS GRADE
 */
export function parseGradeReport(rawText: string): ParsedSubject[] {
    const text = cleanText(rawText);
    const subjects: ParsedSubject[] = [];
    const seen = new Set<string>();

    for (const pattern of GRADE_REPORT_PATTERNS) {
        const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
        let match;

        while ((match = regex.exec(text)) !== null) {
            const code = match[1].trim();
            if (seen.has(code)) continue;
            seen.add(code);

            const credits = parseInt(match[pattern.creditIdx]);
            const grade = match[pattern.gradeIdx].trim();

            subjects.push({
                code,
                name: match[2].trim(),
                credits,
                grade,
                status:
                    grade === "F"
                        ? "FAILED"
                        : grade === "W"
                            ? "WITHDRAWN"
                            : "COMPLETED",
            });
        }
        if (subjects.length > 0) break; // Use first successful pattern
    }

    return subjects;
}

/**
 * Parse registration report PDF text (no grades — all In Progress)
 * Format: CODE NAME SECTION TYPE CREDITS
 */
export function parseRegistrationReport(rawText: string): ParsedSubject[] {
    const text = cleanText(rawText);
    const subjects: ParsedSubject[] = [];
    const seen = new Set<string>();

    for (const pattern of REGISTRATION_PATTERNS) {
        const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
        let match;

        while ((match = regex.exec(text)) !== null) {
            const code = match[1].trim();
            if (seen.has(code)) continue;
            seen.add(code);

            const creditStr = match[pattern.creditIdx];
            const credits = Math.round(parseFloat(creditStr)); // 3.0 → 3, -2.0 → -2

            subjects.push({
                code,
                name: match[2].trim(),
                credits: Math.abs(credits), // Use absolute value for negative credits
                grade: null,
                status: "IN_PROGRESS",
            });
        }
        if (subjects.length > 0) break;
    }

    return subjects;
}

/**
 * Merge grade report subjects with registration subjects.
 * Registration subjects that already appear in grade report are skipped
 * (they already have grades — no need to show as "in progress").
 */
export function mergeSubjects(
    gradeSubjects: ParsedSubject[],
    registrationSubjects: ParsedSubject[]
): ParsedSubject[] {
    const merged = [...gradeSubjects];
    const existingCodes = new Set(gradeSubjects.map((s) => s.code));

    for (const regSubject of registrationSubjects) {
        if (!existingCodes.has(regSubject.code)) {
            merged.push(regSubject);
        }
    }

    return merged;
}

/**
 * Calculate parsing confidence based on how many subjects were extracted
 * and whether they look valid (proper code format, non-empty name, valid credits)
 */
export function calculateConfidence(subjects: ParsedSubject[]): number {
    if (subjects.length === 0) return 0;

    let validCount = 0;
    for (const s of subjects) {
        const codeValid = /^[A-Z0-9]{3}-[A-Z0-9]+$/.test(s.code);
        const nameValid = s.name.length > 2;
        const creditsValid = s.credits >= -5 && s.credits <= 12;

        if (codeValid && nameValid && creditsValid) validCount++;
    }

    return Math.round((validCount / subjects.length) * 100);
}

/**
 * Extract student information from the PDF text.
 * Supports both Thai PSU SIS PDFs and English PSU SIS Grade Reports.
 */
export function parseStudentInfo(rawText: string): StudentInfo | null {
    const text = cleanText(rawText);

    // ── Name & Student ID ──────────────────────────────────────────────────────
    // Thai format:  นาย/นาง/นางสาว <Name>  รหัสนักศึกษา <10-digit ID>
    // English format: Mister/Miss <NAME>  Student Id <10-digit ID>
    const nameIdMatch =
        text.match(/(?:นาย|นาง|นางสาว|Mr\.|Ms\.)\s*([ก-๙a-zA-Z]+(?:\s+[ก-๙a-zA-Z]+)+)\s+รหัสนักศึกษา\s+(\d{10})/) ||
        text.match(/(?:Mister|Miss)\s+([A-Z][A-Z\s]+?)\s+Student\s+Id\s+(\d{10})/i);

    const altNameIdMatch =
        text.match(/([ก-๙a-zA-Z]+\s+[ก-๙a-zA-Z]+)\s+รหัสนักศึกษา\s+(\d{10})/) ||
        text.match(/([A-Z][A-Z\s]+?)\s+Student\s+Id\s+(\d{10})/i);

    let name = "Unknown";
    let studentId = "";

    if (nameIdMatch) {
        name = nameIdMatch[1].trim();
        studentId = nameIdMatch[2];
    } else if (altNameIdMatch) {
        name = altNameIdMatch[1].trim();
        studentId = altNameIdMatch[2];
    } else {
        // Last resort: bare ID with either Thai or English label
        const idOnly =
            text.match(/รหัสนักศึกษา\s+(\d{10})/) ||
            text.match(/Student\s+Id\s+(\d{10})/i);
        if (idOnly) studentId = idOnly[1];
        else return null; // ID is essential
    }

    const admissionYear = studentId.length >= 2 ? parseInt("25" + studentId.substring(0, 2)) : 0;

    // ── Campus ─────────────────────────────────────────────────────────────────
    // Thai:    วิทยาเขต<term>
    // English: <term> Campus  (e.g. "Hat Yai Campus")
    const campusMatchTh = text.match(/วิทยาเขต([^\s]+)/);
    const campusMatchEn = text.match(/([A-Za-zก-๙\s]+?)\s+Campus/i);
    const rawCampus = campusMatchTh
        ? campusMatchTh[1]
        : campusMatchEn
            ? campusMatchEn[1].trim()
            : "";
    const campus = rawCampus ? "วิทยาเขต" + translateTerm(rawCampus) : "";

    // ── Faculty ────────────────────────────────────────────────────────────────
    // Thai:    คณะ<term>
    // English: Faculty of <term>
    const facultyMatchTh = text.match(/คณะ([^\s]+)/);
    const facultyMatchEn = text.match(/Faculty\s+of\s+([^\n\r(]+?)(?:\s*\n|\s{2,}|$)/i);
    const rawFaculty = facultyMatchTh
        ? facultyMatchTh[1]
        : facultyMatchEn
            ? facultyMatchEn[1].trim()
            : "";
    const faculty = rawFaculty ? "คณะ" + translateTerm(rawFaculty) : "";

    // ── Department ─────────────────────────────────────────────────────────────
    // Thai:    ภาควิชา<term>
    // English: Department of <term>
    const deptMatchTh = text.match(/ภาควิชา([^\s]+)/);
    const deptMatchEn = text.match(/Department\s+of\s+([^\n\r(]+?)(?:\s*\n|\s{2,}|$)/i);
    const rawDept = deptMatchTh
        ? deptMatchTh[1]
        : deptMatchEn
            ? deptMatchEn[1].trim()
            : "";
    const department = rawDept ? "ภาควิชา" + translateTerm(rawDept) : "";

    // ── Major & Track ──────────────────────────────────────────────────────────
    // Thai PDF format examples:
    //   "สาขาบริหารธุรกิจ (ระบบสารสนเทศทางธุรกิจ)"  → major = ระบบสารสนเทศทางธุรกิจ
    //   "สาขาวิชาการบัญชี"                            → major = การบัญชี
    //   "สาขารัฐประศาสนศาสตร์"                        → major = รัฐประศาสนศาสตร์
    // English:
    //   "Business Administration (Business Information System)" → major = สารสนเทศทางธุรกิจ

    // Thai: capture the base term and optional parenthesized sub-major
    // Handles both normal () and full-width （）parentheses from PDF
    const majorMatchTh = text.match(/(?:สาขาวิชา|สาขา)([^\s(\uff08]+)/);
    const parenMatchTh = text.match(/(?:สาขาวิชา|สาขา)[^\s(\uff08]+\s*[(\uff08]([^)\uff09]+)[)\uff09]/);

    // English: a known academic term optionally followed by (another term).
    const majorMatchEn = text.match(
        /(?<! of )\b(Management Sciences|Business Administration|Business Information System)\s*(?:\(([^)]+)\))?/i
    );

    let rawMajor = "";
    let rawTrack: string | undefined;

    if (majorMatchTh) {
        const baseTerm = majorMatchTh[1].replace(/^วิชา/, "");
        const parenTerm = parenMatchTh ? parenMatchTh[1].trim() : undefined;

        // If there's a parenthesized sub-major, that IS the actual major
        // (e.g. "สาขาบริหารธุรกิจ (ระบบสารสนเทศทางธุรกิจ)" → major is ระบบสารสนเทศทางธุรกิจ)
        if (parenTerm) {
            rawMajor = parenTerm;
        } else {
            rawMajor = baseTerm;
        }
    } else if (majorMatchEn) {
        const baseEn = majorMatchEn[1].trim();
        const parenEn = majorMatchEn[2] ? majorMatchEn[2].trim() : undefined;

        // Same logic: parenthesized term is the specific major
        if (parenEn) {
            rawMajor = parenEn;
        } else {
            rawMajor = baseEn;
        }
    }

    const major = rawMajor ? translateTerm(rawMajor) : "";
    const track = rawTrack ? translateTerm(rawTrack) : undefined;

    return {
        name,
        studentId,
        admissionYear,
        campus,
        faculty,
        department,
        major,
        track,
    };
}
