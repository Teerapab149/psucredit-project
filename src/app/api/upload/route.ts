import { NextResponse } from "next/server";
import { PDFParse } from "pdf-parse";
import {
    parseGradeReport,
    parseRegistrationReport,
    mergeSubjects,
    calculateConfidence,
    parseStudentInfo,
} from "@/lib/pdf-parser";

export async function POST(request: Request) {
    try {
        const formData = await request.formData();
        const gradeFile = formData.get("gradeReport") as File | null;
        const regFile = formData.get("registrationReport") as File | null;

        if (!gradeFile && !regFile) {
            return NextResponse.json(
                { error: "At least one PDF file is required" },
                { status: 400 }
            );
        }

        let gradeSubjects: Awaited<ReturnType<typeof parseGradeReport>> = [];
        let regSubjects: Awaited<ReturnType<typeof parseRegistrationReport>> = [];
        let studentInfo = null;

        // Parse grade report
        if (gradeFile) {
            console.log("[upload] Parsing grade report:", gradeFile.name, gradeFile.size, "bytes");
            try {
                const arrayBuffer = await gradeFile.arrayBuffer();
                const data = new Uint8Array(arrayBuffer);
                console.log("[upload] Grade file buffer length:", data.length);
                const parser = new PDFParse({ data });
                const result = await parser.getText();
                console.log("[upload] Grade text extracted, length:", result.text.length);
                console.log("[upload] Grade text preview:", result.text.substring(0, 500));
                gradeSubjects = parseGradeReport(result.text);
                studentInfo = parseStudentInfo(result.text) || studentInfo;
                console.log("[upload] Grade subjects found:", gradeSubjects.length);
                await parser.destroy();
            } catch (err) {
                console.error("[upload] Grade report parsing error:", err);
                throw err;
            }
        }

        // Parse registration report
        if (regFile) {
            console.log("[upload] Parsing registration report:", regFile.name, regFile.size, "bytes");
            try {
                const arrayBuffer = await regFile.arrayBuffer();
                const data = new Uint8Array(arrayBuffer);
                console.log("[upload] Reg file buffer length:", data.length);
                const parser = new PDFParse({ data });
                const result = await parser.getText();
                console.log("[upload] Reg text extracted, length:", result.text.length);
                console.log("[upload] Reg text preview:", result.text.substring(0, 500));
                regSubjects = parseRegistrationReport(result.text);
                studentInfo = parseStudentInfo(result.text) || studentInfo;
                console.log("[upload] Reg subjects found:", regSubjects.length);
                await parser.destroy();
            } catch (err) {
                console.error("[upload] Registration report parsing error:", err);
                throw err;
            }
        }

        // Merge subjects
        const merged = mergeSubjects(gradeSubjects, regSubjects);
        const confidence = calculateConfidence(merged);

        console.log("[upload] Final result:", merged.length, "subjects, confidence:", confidence);

        return NextResponse.json({
            subjects: merged,
            studentInfo,
            confidence,
            gradeCount: gradeSubjects.length,
            registrationCount: regSubjects.length,
            totalCount: merged.length,
        });
    } catch (error) {
        console.error("[upload] PDF parsing error:", error);
        const message = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            { error: `Failed to parse PDF: ${message}` },
            { status: 500 }
        );
    }
}
