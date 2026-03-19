/**
 * Maps both Thai partial names and English variants to the canonical
 * Thai major name stored in CurriculumYear.major.
 *
 * Returns the canonical name, or null if no mapping is found.
 */

const MAJOR_ALIASES: [RegExp, string][] = [
    // BIS — ระบบสารสนเทศทางธุรกิจ
    [/สารสนเทศ(ทาง)?ธุรกิจ/i, "ระบบสารสนเทศทางธุรกิจ"],
    [/Business\s*Information/i, "ระบบสารสนเทศทางธุรกิจ"],
    [/^BIS$/i, "ระบบสารสนเทศทางธุรกิจ"],

    // LOG — การจัดการโลจิสติกส์และโซ่อุปทาน
    [/โลจิสติกส์/i, "การจัดการโลจิสติกส์และโซ่อุปทาน"],
    [/Logistics/i, "การจัดการโลจิสติกส์และโซ่อุปทาน"],
    [/^LOG$/i, "การจัดการโลจิสติกส์และโซ่อุปทาน"],

    // HRM — การจัดการทรัพยากรมนุษย์
    [/ทรัพยากรมนุษย์/i, "การจัดการทรัพยากรมนุษย์"],
    [/Human\s*Resource/i, "การจัดการทรัพยากรมนุษย์"],
    [/^HRM$/i, "การจัดการทรัพยากรมนุษย์"],

    // MKT — การตลาด
    [/การตลาด/i, "การตลาด"],
    [/Marketing/i, "การตลาด"],
    [/^MKT$/i, "การตลาด"],

    // MICE — การจัดการไมซ์
    [/ไมซ์/i, "การจัดการไมซ์"],
    [/MICE\s*Management/i, "การจัดการไมซ์"],
    [/^MICE$/i, "การจัดการไมซ์"],

    // FIN — การเงินและการลงทุน
    [/การเงิน/i, "การเงินและการลงทุน"],
    [/Finance/i, "การเงินและการลงทุน"],
    [/^FIN$/i, "การเงินและการลงทุน"],

    // ACC — การบัญชี
    [/การบัญชี/i, "การบัญชี"],
    [/Account(ancy|ing)/i, "การบัญชี"],
    [/^ACC$/i, "การบัญชี"],

    // PA — รัฐประศาสนศาสตร์
    [/รัฐประศาสนศาสตร์/i, "รัฐประศาสนศาสตร์"],
    [/Public\s*Administration/i, "รัฐประศาสนศาสตร์"],
    [/^PA$/i, "รัฐประศาสนศาสตร์"],
];

export function normalizeMajor(raw: string | null | undefined): string | null {
    if (!raw) return null;
    const trimmed = raw.trim();
    if (!trimmed) return null;

    for (const [pattern, canonical] of MAJOR_ALIASES) {
        if (pattern.test(trimmed)) return canonical;
    }
    return null;
}
