"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Upload, FileText, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useCreditStore } from "@/store/credit-store";
import type { ParsedSubject, VerifiedSubject } from "@/types";

export default function UploadPage() {
    const router = useRouter();
    const {
        studentId,
        setStudentId,
        setStudentInfo,
        setParsedSubjects,
        setParseConfidence,
        setVerifiedSubjects,
    } = useCreditStore();

    const [gradeFile, setGradeFile] = useState<File | null>(null);
    const [regFile, setRegFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleUpload = async () => {
        if (!gradeFile && !regFile) {
            setError("Please upload at least one PDF file.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const formData = new FormData();
            if (gradeFile) formData.append("gradeReport", gradeFile);
            if (regFile) formData.append("registrationReport", regFile);

            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                let errorMsg = "Upload failed";
                try {
                    const data = await res.json();
                    errorMsg = data.error || errorMsg;
                } catch {
                    // Response wasn't JSON (e.g. HTML error page)
                }
                throw new Error(errorMsg);
            }

            const data = await res.json();
            const subjects: ParsedSubject[] = data.subjects;

            if (data.studentInfo) {
                setStudentInfo(data.studentInfo);
                // Auto-fill student ID if not entered manually or to correct it
                setStudentId(data.studentInfo.studentId);
            }

            setParsedSubjects(subjects);
            setParseConfidence(data.confidence);

            // Convert to verified subjects with temp IDs
            const verified: VerifiedSubject[] = subjects.map((s, i) => ({
                ...s,
                id: `temp-${Date.now()}-${i}`,
            }));
            setVerifiedSubjects(verified);

            router.push("/verify");
        } catch (err) {
            setError(
                err instanceof Error ? err.message : "An unexpected error occurred"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            <div className="mx-auto max-w-3xl px-4 py-12">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <div className="mb-8 text-center">
                        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
                            PSU Credit Tracker
                        </h1>
                        <p className="mt-2 text-lg text-slate-600">
                            Upload your academic reports to track graduation progress
                        </p>
                    </div>

                    {/* Student ID Input */}
                    <Card className="mb-6 border-0 shadow-lg shadow-slate-200/50 backdrop-blur">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Badge
                                    variant="outline"
                                    className="bg-blue-50 text-blue-700 border-blue-200"
                                >
                                    Step 1
                                </Badge>
                                Enter Your Student ID
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <Label htmlFor="studentId">PSU Student ID</Label>
                                <Input
                                    id="studentId"
                                    placeholder="e.g. 6610510149"
                                    value={studentId}
                                    onChange={(e) => setStudentId(e.target.value)}
                                    className="font-mono text-lg tracking-wider"
                                    maxLength={13}
                                />
                                {studentId.length >= 2 && (
                                    <motion.p
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="text-sm text-slate-500"
                                    >
                                        Detected entry year:{" "}
                                        <span className="font-semibold text-blue-600">
                                            {2500 + parseInt(studentId.substring(0, 2))} (
                                            {parseInt(studentId.substring(0, 2)) + 1957})
                                        </span>
                                    </motion.p>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* File Upload Areas */}
                    <Card className="mb-6 border-0 shadow-lg shadow-slate-200/50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Badge
                                    variant="outline"
                                    className="bg-blue-50 text-blue-700 border-blue-200"
                                >
                                    Step 2
                                </Badge>
                                Upload PDF Reports
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Grade Report */}
                            <div>
                                <Label className="mb-2 block text-sm font-medium">
                                    Cumulative Grade Report
                                </Label>
                                <label
                                    htmlFor="grade-upload"
                                    className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all hover:border-blue-400 hover:bg-blue-50/50 ${gradeFile
                                        ? "border-emerald-300 bg-emerald-50/50"
                                        : "border-slate-200 bg-white"
                                        }`}
                                >
                                    {gradeFile ? (
                                        <motion.div
                                            initial={{ scale: 0.9 }}
                                            animate={{ scale: 1 }}
                                            className="flex items-center gap-3 text-emerald-700"
                                        >
                                            <FileText className="h-8 w-8" />
                                            <div>
                                                <p className="font-medium">{gradeFile.name}</p>
                                                <p className="text-sm text-emerald-600">
                                                    {(gradeFile.size / 1024).toFixed(1)} KB
                                                </p>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <div className="flex flex-col items-center text-slate-400">
                                            <Upload className="mb-2 h-8 w-8" />
                                            <p className="font-medium">
                                                Drop grade report here or click to browse
                                            </p>
                                            <p className="text-sm">PDF only, max 10MB</p>
                                        </div>
                                    )}
                                    <input
                                        id="grade-upload"
                                        type="file"
                                        accept=".pdf"
                                        className="hidden"
                                        onChange={(e) => setGradeFile(e.target.files?.[0] || null)}
                                    />
                                </label>
                            </div>

                            {/* Registration Report */}
                            <div>
                                <Label className="mb-2 block text-sm font-medium">
                                    Latest Registration Report
                                </Label>
                                <label
                                    htmlFor="reg-upload"
                                    className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition-all hover:border-blue-400 hover:bg-blue-50/50 ${regFile
                                        ? "border-emerald-300 bg-emerald-50/50"
                                        : "border-slate-200 bg-white"
                                        }`}
                                >
                                    {regFile ? (
                                        <motion.div
                                            initial={{ scale: 0.9 }}
                                            animate={{ scale: 1 }}
                                            className="flex items-center gap-3 text-emerald-700"
                                        >
                                            <FileText className="h-8 w-8" />
                                            <div>
                                                <p className="font-medium">{regFile.name}</p>
                                                <p className="text-sm text-emerald-600">
                                                    {(regFile.size / 1024).toFixed(1)} KB
                                                </p>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <div className="flex flex-col items-center text-slate-400">
                                            <Upload className="mb-2 h-8 w-8" />
                                            <p className="font-medium">
                                                Drop registration report here or click to browse
                                            </p>
                                            <p className="text-sm">PDF only, max 10MB</p>
                                        </div>
                                    )}
                                    <input
                                        id="reg-upload"
                                        type="file"
                                        accept=".pdf"
                                        className="hidden"
                                        onChange={(e) => setRegFile(e.target.files?.[0] || null)}
                                    />
                                </label>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Error display */}
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-6 flex items-center gap-2 rounded-lg bg-red-50 p-4 text-red-700"
                        >
                            <AlertCircle className="h-5 w-5 shrink-0" />
                            <p className="text-sm">{error}</p>
                        </motion.div>
                    )}

                    {/* Upload Button */}
                    <Button
                        onClick={handleUpload}
                        disabled={loading || (!gradeFile && !regFile)}
                        size="lg"
                        className="w-full bg-blue-600 text-lg font-semibold shadow-lg shadow-blue-600/25 hover:bg-blue-700"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                Parsing PDFs...
                            </>
                        ) : (
                            <>
                                <Upload className="mr-2 h-5 w-5" />
                                Upload & Parse
                            </>
                        )}
                    </Button>
                </motion.div>
            </div>
        </div>
    );
}
