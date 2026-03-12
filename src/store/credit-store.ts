"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ParsedSubject, VerifiedSubject, MatchResult, StudentInfo } from "@/types";

interface CreditStore {
    // Student info
    studentId: string;
    setStudentId: (id: string) => void;

    studentInfo: StudentInfo | null;
    setStudentInfo: (info: StudentInfo | null) => void;

    // Parsed subjects from PDF
    parsedSubjects: ParsedSubject[];
    setParsedSubjects: (subjects: ParsedSubject[]) => void;

    // Confidence from parsing
    parseConfidence: number;
    setParseConfidence: (confidence: number) => void;

    // Verified/edited subjects
    verifiedSubjects: VerifiedSubject[];
    setVerifiedSubjects: (subjects: VerifiedSubject[]) => void;

    // Curriculum match results
    matchResult: MatchResult | null;
    setMatchResult: (result: MatchResult | null) => void;

    // Reset everything
    reset: () => void;
}

export const useCreditStore = create<CreditStore>()(
    persist(
        (set) => ({
            studentId: "",
            setStudentId: (id) => set({ studentId: id }),

            studentInfo: null,
            setStudentInfo: (info) => set({ studentInfo: info }),

            parsedSubjects: [],
            setParsedSubjects: (subjects) => set({ parsedSubjects: subjects }),

            parseConfidence: 0,
            setParseConfidence: (confidence) => set({ parseConfidence: confidence }),

            verifiedSubjects: [],
            setVerifiedSubjects: (subjects) => set({ verifiedSubjects: subjects }),

            matchResult: null,
            setMatchResult: (result) => set({ matchResult: result }),

            reset: () =>
                set({
                    studentId: "",
                    studentInfo: null,
                    parsedSubjects: [],
                    parseConfidence: 0,
                    verifiedSubjects: [],
                    matchResult: null,
                }),
        }),
        {
            name: "psu-credit-store",
            storage: createJSONStorage(() => sessionStorage),
        }
    )
);
