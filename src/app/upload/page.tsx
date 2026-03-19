"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, AlertCircle, Loader2, FileUp, Sparkles, CheckCircle2 } from "lucide-react";
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

    // สร้าง State สำหรับตรวจสอบการ Drag
    const [isDraggingGrade, setIsDraggingGrade] = useState(false);
    const [isDraggingReg, setIsDraggingReg] = useState(false);

    // ฟังก์ชันจัดการ Drag & Drop
    const handleDragOver = (e: React.DragEvent<HTMLLabelElement>, setDragging: (val: boolean) => void) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>, setDragging: (val: boolean) => void) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(false);
    };

    const handleDrop = (
        e: React.DragEvent<HTMLLabelElement>,
        setFile: (file: File | null) => void,
        setDragging: (val: boolean) => void
    ) => {
        e.preventDefault();
        e.stopPropagation();
        setDragging(false);
        const files = e.dataTransfer.files;
        if (files && files.length > 0 && files[0].type === "application/pdf") {
            setFile(files[0]);
        } else {
            setError("Please upload a PDF file.");
        }
    };

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
                } catch { }
                throw new Error(errorMsg);
            }

            const data = await res.json();
            const subjects: ParsedSubject[] = data.subjects;

            if (data.studentInfo) {
                setStudentInfo(data.studentInfo);
                setStudentId(data.studentInfo.studentId);
            }

            setParsedSubjects(subjects);
            setParseConfidence(data.confidence);

            const verified: VerifiedSubject[] = subjects.map((s, i) => ({
                ...s,
                id: `temp-${Date.now()}-${i}`,
            }));
            setVerifiedSubjects(verified);

            router.push("/verify");
        } catch (err) {
            setError(err instanceof Error ? err.message : "An unexpected error occurred");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 selection:bg-blue-200 font-sans text-slate-900 overflow-hidden relative">
            
            {/* ═══════ LIGHT BACKGROUND EFFECTS ═══════ */}
            <div className="absolute inset-0 pointer-events-none flex justify-center overflow-hidden z-0">
                <motion.div
                    animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.6, 0.4] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[-10%] -left-[10%] w-[500px] h-[500px] rounded-full bg-blue-200/50 blur-[100px]"
                />
                <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute top-[20%] -right-[10%] w-[600px] h-[600px] rounded-full bg-indigo-200/50 blur-[120px]"
                />
                <div
                    className="absolute inset-0 opacity-[0.4]"
                    style={{
                        backgroundImage: "radial-gradient(circle, #cbd5e1 1px, transparent 1px)",
                        backgroundSize: "32px 32px",
                        maskImage: "linear-gradient(to bottom, black 50%, transparent 100%)",
                        WebkitMaskImage: "linear-gradient(to bottom, black 50%, transparent 100%)",
                    }}
                />
            </div>

            <div className="relative z-10 mx-auto max-w-3xl px-4 py-12 pt-30">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}
                >
                    <div className="mb-10 text-center relative">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ delay: 0.2 }}
                            className="absolute -top-8 left-1/2 -translate-x-1/2 text-blue-500"
                        >
                        </motion.div>
                        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600 mb-4 drop-shadow-sm">
                            Upload Reports
                        </h1>
                        <p className="text-lg text-slate-600 font-medium">
                            อัปโหลดไฟล์ผลการเรียนเพื่อตรวจสอบโครงสร้างหลักสูตร
                        </p>
                    </div>

                    {/* ═══════ STEP 1: STUDENT ID ═══════ */}
                    <Card className="mb-8 border border-white bg-white/70 backdrop-blur-xl shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden relative transition-all hover:shadow-2xl hover:shadow-slate-200/60">
                        <CardHeader className="bg-white/50 border-b border-slate-100 pb-5">
                            <CardTitle className="flex items-center gap-3 text-lg font-bold text-slate-800">
                                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none px-3 py-1.5 rounded-xl text-sm font-black tracking-widest shadow-sm">
                                    STEP 01
                                </Badge>
                                Enter Your Student ID
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="space-y-4">
                                <Label htmlFor="studentId" className="text-slate-700 font-semibold flex items-center gap-2">
                                    PSU Student ID
                                </Label>
                                <Input
                                    id="studentId"
                                    placeholder="e.g. 6610510149"
                                    value={studentId}
                                    onChange={(e) => setStudentId(e.target.value)}
                                    className="font-mono text-xl tracking-[0.2em] h-16 rounded-2xl border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                                    maxLength={13}
                                />
                                <AnimatePresence>
                                    {studentId.length >= 2 && (
                                        <motion.p
                                            initial={{ opacity: 0, height: 0, y: -10 }}
                                            animate={{ opacity: 1, height: "auto", y: 0 }}
                                            exit={{ opacity: 0, height: 0 }}
                                            className="text-sm text-slate-500 font-medium pl-2 border-l-2 border-blue-400"
                                        >
                                            Detected entry year:{" "}
                                            <span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                                                {2500 + parseInt(studentId.substring(0, 2))} (
                                                {parseInt(studentId.substring(0, 2)) + 1957})
                                            </span>
                                        </motion.p>
                                    )}
                                </AnimatePresence>
                            </div>
                        </CardContent>
                    </Card>

                    {/* ═══════ STEP 2: FILE UPLOAD ═══════ */}
                    <Card className="mb-8 border border-white bg-white/70 backdrop-blur-xl shadow-xl shadow-slate-200/40 rounded-3xl overflow-hidden relative transition-all hover:shadow-2xl hover:shadow-slate-200/60">
                        <CardHeader className="bg-white/50 border-b border-slate-100 pb-5">
                            <CardTitle className="flex items-center gap-3 text-lg font-bold text-slate-800">
                                <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 border-none px-3 py-1.5 rounded-xl text-sm font-black tracking-widest shadow-sm">
                                    STEP 02
                                </Badge>
                                Upload PDF Reports
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            
                            {/* Grade Report Dropzone */}
                            <div className="relative">
                                <Label className="mb-3 block text-sm font-semibold text-slate-700">
                                    Cumulative Grade Report
                                </Label>
                                <label
                                    htmlFor="grade-upload"
                                    onDragOver={(e) => handleDragOver(e, setIsDraggingGrade)}
                                    onDragLeave={(e) => handleDragLeave(e, setIsDraggingGrade)}
                                    onDrop={(e) => handleDrop(e, setGradeFile, setIsDraggingGrade)}
                                    className={`group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 transition-all duration-300 relative overflow-hidden ${
                                        isDraggingGrade 
                                            ? "border-blue-500 bg-blue-50 scale-[1.02] shadow-[0_0_20px_rgba(59,130,246,0.2)]" 
                                            : gradeFile
                                                ? "border-emerald-400 bg-emerald-50 shadow-[0_0_20px_rgba(52,211,153,0.15)]"
                                                : "border-slate-200 bg-slate-50/50 hover:bg-blue-50 hover:border-blue-400"
                                    }`}
                                >
                                    {gradeFile ? (
                                        <motion.div initial={{ scale: 0.9, y: 10 }} animate={{ scale: 1, y: 0 }} className="flex items-center gap-5 relative z-10">
                                            <div className="p-4 bg-white border border-emerald-100 rounded-2xl shadow-sm">
                                                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-lg">{gradeFile.name}</p>
                                                <p className="text-sm font-medium text-emerald-600 mt-1">
                                                    {(gradeFile.size / 1024).toFixed(1)} KB • Ready to parse
                                                </p>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <div className="flex flex-col items-center text-slate-500 relative z-10 transition-colors">
                                            <div className={`p-5 bg-white rounded-full shadow-sm border border-slate-100 mb-4 transition-all duration-300 ${isDraggingGrade ? "scale-110 bg-blue-100 border-blue-200" : "group-hover:scale-110 group-hover:bg-blue-100 group-hover:border-blue-200"}`}>
                                                <FileUp className={`h-8 w-8 ${isDraggingGrade ? "text-blue-600" : "text-slate-400 group-hover:text-blue-600"}`} />
                                            </div>
                                            <p className={`font-bold text-lg ${isDraggingGrade ? "text-blue-700" : "text-slate-700 group-hover:text-blue-700"}`}>
                                                {isDraggingGrade ? "Drop file here" : "Click or drag file to upload"}
                                            </p>
                                            <p className="text-sm mt-2 opacity-70">PDF format, max 10MB</p>
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

                            {/* Registration Report Dropzone */}
                            <div className="relative">
                                <Label className="mb-3 block text-sm font-semibold text-slate-700">
                                    Latest Registration Report
                                </Label>
                                <label
                                    htmlFor="reg-upload"
                                    onDragOver={(e) => handleDragOver(e, setIsDraggingReg)}
                                    onDragLeave={(e) => handleDragLeave(e, setIsDraggingReg)}
                                    onDrop={(e) => handleDrop(e, setRegFile, setIsDraggingReg)}
                                    className={`group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 transition-all duration-300 relative overflow-hidden ${
                                        isDraggingReg
                                            ? "border-indigo-500 bg-indigo-50 scale-[1.02] shadow-[0_0_20px_rgba(99,102,241,0.2)]"
                                            : regFile
                                                ? "border-emerald-400 bg-emerald-50 shadow-[0_0_20px_rgba(52,211,153,0.15)]"
                                                : "border-slate-200 bg-slate-50/50 hover:bg-indigo-50 hover:border-indigo-400"
                                    }`}
                                >
                                    {regFile ? (
                                        <motion.div initial={{ scale: 0.9, y: 10 }} animate={{ scale: 1, y: 0 }} className="flex items-center gap-5 relative z-10">
                                            <div className="p-4 bg-white border border-emerald-100 rounded-2xl shadow-sm">
                                                <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-lg">{regFile.name}</p>
                                                <p className="text-sm font-medium text-emerald-600 mt-1">
                                                    {(regFile.size / 1024).toFixed(1)} KB • Ready to parse
                                                </p>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <div className="flex flex-col items-center text-slate-500 relative z-10 transition-colors">
                                            <div className={`p-5 bg-white rounded-full shadow-sm border border-slate-100 mb-4 transition-all duration-300 ${isDraggingReg ? "scale-110 bg-indigo-100 border-indigo-200" : "group-hover:scale-110 group-hover:bg-indigo-100 group-hover:border-indigo-200"}`}>
                                                <FileUp className={`h-8 w-8 ${isDraggingReg ? "text-indigo-600" : "text-slate-400 group-hover:text-indigo-600"}`} />
                                            </div>
                                            <p className={`font-bold text-lg ${isDraggingReg ? "text-indigo-700" : "text-slate-700 group-hover:text-indigo-700"}`}>
                                                {isDraggingReg ? "Drop file here" : "Click or drag file to upload"}
                                            </p>
                                            <p className="text-sm mt-2 opacity-70">PDF format, max 10MB</p>
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

                    {/* ═══════ ERROR MSG ═══════ */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0, scale: 0.9 }}
                                animate={{ opacity: 1, height: "auto", scale: 1 }}
                                exit={{ opacity: 0, height: 0, scale: 0.9 }}
                                className="mb-6 overflow-hidden"
                            >
                                <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-600 shadow-sm">
                                    <AlertCircle className="h-6 w-6 shrink-0" />
                                    <p className="text-base font-bold tracking-wide">{error}</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ═══════ SUBMIT BUTTON ═══════ */}
                    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button
                            onClick={handleUpload}
                            disabled={loading || (!gradeFile && !regFile)}
                            size="lg"
                            className="w-full h-16 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xl font-bold tracking-wide shadow-xl shadow-blue-500/25 rounded-2xl disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden relative group transition-all"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-3 h-7 w-7 animate-spin" />
                                    Analyzing Data...
                                </>
                            ) : (
                                <>
                                    <Upload className="mr-3 h-6 w-6" />
                                    Upload & Parse
                                </>
                            )}
                        </Button>
                    </motion.div>
                </motion.div>
            </div>
        </div>
    );
}