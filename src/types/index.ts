/** Shared types for the application */

export interface ParsedSubject {
    code: string;
    name: string;
    credits: number;
    grade: string | null;
    status: "COMPLETED" | "IN_PROGRESS" | "FAILED" | "WITHDRAWN";
}

export interface VerifiedSubject extends ParsedSubject {
    id: string; // client-side temp ID
}

export interface StudentInfo {
    name: string;
    studentId: string;
    admissionYear: number;
    campus: string;
    faculty: string;
    department: string;
    major: string;
    track?: string;
}

export interface CategoryMatch {
    categoryId: string;
    categoryName: string;
    parentName: string | null;
    requiredCredits: number;
    completedCredits: number;
    inProgressCredits: number;
    isElective: boolean;
    matchedSubjects: MatchedSubject[];
    missingSubjects: MissingSubject[];
    children: CategoryMatch[];
}

export interface MatchedSubject {
    code: string;
    name: string;
    credits: number;
    grade: string | null;
    status: "COMPLETED" | "IN_PROGRESS" | "FAILED" | "WITHDRAWN";
}

export interface MissingSubject {
    code: string;
    name: string;
    credits: number;
}

export interface MatchResult {
    curriculumYearId?: string;
    curriculumYear: number;
    curriculumName: string;
    categories: CategoryMatch[];
    totalRequired: number;
    totalCompleted: number;
    totalInProgress: number;
    totalMissing: number;
    unmatchedSubjects: ParsedSubject[];
}

export const GRADE_OPTIONS = [
    "A",
    "B+",
    "B",
    "C+",
    "C",
    "D+",
    "D",
    "F",
    "G",
    "W",
    "P",
    "In Progress",
] as const;

export type Grade = (typeof GRADE_OPTIONS)[number];
