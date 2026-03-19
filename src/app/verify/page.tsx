"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
    Plus,
    Trash2,
    ArrowRight,
    ArrowLeft,
    AlertTriangle,
    CheckCircle2,
    User,
    GraduationCap,
    School,
    BookOpen,
    FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { useCreditStore } from "@/store/credit-store";
import { GRADE_OPTIONS } from "@/types";

const subjectSchema = z.object({
    id: z.string(),
    code: z
        .string()
        .min(1, "Required")
        .regex(/^[a-zA-Z0-9]{3}-[a-zA-Z0-9]+$/, "Invalid Format"),
    name: z.string().min(1, "Subject name is required"),
    credits: z.number().min(1, "Min 1").max(12, "Max 12"),
    grade: z.string().nullable(),
    status: z.enum(["COMPLETED", "IN_PROGRESS", "FAILED", "WITHDRAWN"]),
});

const formSchema = z.object({
    subjects: z.array(subjectSchema),
});

type FormData = z.infer<typeof formSchema>;

export default function VerifyPage() {
    const router = useRouter();
    const { verifiedSubjects, setVerifiedSubjects, parseConfidence, studentId, studentInfo } =
        useCreditStore();
    const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

    const {
        register,
        control,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            subjects:
                verifiedSubjects.length > 0
                    ? verifiedSubjects
                    : [
                        {
                            id: `new-${Date.now()}`,
                            code: "",
                            name: "",
                            credits: 3,
                            grade: null,
                            status: "COMPLETED" as const,
                        },
                    ],
        },
    });

    const { fields, append, remove } = useFieldArray({
        control,
        name: "subjects",
    });

    const watchedSubjects = watch("subjects");

    const addRow = useCallback(() => {
        append({
            id: `new-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            code: "",
            name: "",
            credits: 3,
            grade: null,
            status: "COMPLETED",
        });
    }, [append]);

    const deleteRow = useCallback(
        (index: number, id: string) => {
            setDeletingIds((prev) => new Set(prev).add(id));
            setTimeout(() => {
                remove(index);
                setDeletingIds((prev) => {
                    const next = new Set(prev);
                    next.delete(id);
                    return next;
                });
            }, 300);
        },
        [remove]
    );

    const handleGradeChange = (index: number, value: string) => {
        const grade = value === "In Progress" ? null : value;
        setValue(`subjects.${index}.grade`, grade);
        setValue(
            `subjects.${index}.status`,
            value === "In Progress"
                ? "IN_PROGRESS"
                : value === "U" || value === "F"
                    ? "FAILED"
                    : "COMPLETED"
        );
    };

    const onSubmit = (data: FormData) => {
        const subjects = data.subjects.map((s) => ({
            id: s.id,
            code: s.code,
            name: s.name,
            credits: Number(s.credits),
            grade: s.grade,
            status: s.status as "COMPLETED" | "IN_PROGRESS" | "FAILED" | "WITHDRAWN",
        }));
        setVerifiedSubjects(subjects);
        router.push("/results");
    };

    const totalCredits = watchedSubjects?.reduce(
        (sum, s) => sum + (Number(s.credits) || 0),
        0
    );

    return (
        <div className="min-h-screen bg-slate-50/50 selection:bg-blue-200 font-sans text-slate-900 overflow-hidden relative pb-24">
            
            {/* ═══════ DYNAMIC LIGHT BACKGROUND ═══════ */}
            <div className="fixed inset-0 pointer-events-none flex justify-center overflow-hidden z-0">
                <div className="absolute top-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/40 via-transparent to-transparent"></div>
                <div className="absolute bottom-0 w-full h-full bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-indigo-100/40 via-transparent to-transparent"></div>
                <div
                    className="absolute inset-0 opacity-[0.3]"
                    style={{
                        backgroundImage: "linear-gradient(to right, #e2e8f0 1px, transparent 1px), linear-gradient(to bottom, #e2e8f0 1px, transparent 1px)",
                        backgroundSize: "4rem 4rem",
                        maskImage: "radial-gradient(circle at center, black, transparent 80%)",
                        WebkitMaskImage: "radial-gradient(circle at center, black, transparent 80%)",
                    }}
                />
            </div>

            <div className="relative z-10 mx-auto max-w-6xl px-4 py-12 pt-24">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    {/* ═══════ BACK BUTTON ═══════ */}
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => router.back()}
                        className="mb-6 gap-2 text-slate-500 hover:text-blue-600 px-0 hover:bg-transparent transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                        <span className="font-semibold text-base">Back to Upload</span>
                    </Button>

                    {/* ═══════ HEADER ═══════ */}
                    <div className="relative mb-10 group">
                        {/* Glow Effect */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-200 via-indigo-200 to-purple-200 rounded-[2.5rem] blur-xl opacity-50 group-hover:opacity-70 transition duration-500"></div>
                        
                        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 bg-white/90 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] border border-white/50 shadow-sm overflow-hidden">
                            {/* Top accent line */}
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500"></div>
                            
                            <div>
                                <div className="flex items-center gap-4 mb-3">
                                    <div className="p-3.5 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl shadow-lg shadow-blue-500/30 text-white">
                                        <FileText className="h-7 w-7" />
                                    </div>
                                    <h1 className="text-3xl md:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-900">
                                        Verify Subjects
                                    </h1>
                                </div>
                                <p className="text-slate-500 font-medium text-base md:text-lg">
                                    ตรวจสอบและแก้ไขข้อมูลให้ถูกต้องก่อนนำไปเปรียบเทียบกับหลักสูตร
                                </p>
                            </div>
                            
                            <div className="flex gap-4 w-full sm:w-auto">
                                <div className="flex-1 sm:flex-none flex flex-col items-center justify-center bg-blue-50/80 border border-blue-100 rounded-2xl p-4 min-w-[110px] shadow-sm">
                                    <span className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-br from-blue-600 to-blue-800">{fields.length}</span>
                                    <span className="text-xs font-bold text-blue-600/70 uppercase tracking-widest mt-1">Subjects</span>
                                </div>
                                <div className="flex-1 sm:flex-none flex flex-col items-center justify-center bg-indigo-50/80 border border-indigo-100 rounded-2xl p-4 min-w-[110px] shadow-sm">
                                    <span className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-br from-indigo-600 to-purple-600">{totalCredits}</span>
                                    <span className="text-xs font-bold text-indigo-600/70 uppercase tracking-widest mt-1">Credits</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ═══════ STUDENT INFO CARDS ═══════ */}
                    {studentInfo && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                            <Card className="border-0 bg-white/80 backdrop-blur-lg shadow-sm hover:shadow-md transition-shadow rounded-3xl">
                                <CardContent className="p-6 flex items-start gap-4">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                                        <User className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-400 mb-1">Name</p>
                                        <p className="font-bold text-slate-800 line-clamp-2">{studentInfo.name}</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-0 bg-white/80 backdrop-blur-lg shadow-sm hover:shadow-md transition-shadow rounded-3xl">
                                <CardContent className="p-6 flex items-start gap-4">
                                    <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                                        <Badge variant="outline" className="px-1 text-[10px] h-6 border-indigo-200 bg-white">ID</Badge>
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-400 mb-1">Student ID</p>
                                        <p className="font-bold text-slate-800 font-mono text-lg">{studentInfo.studentId}</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-0 bg-white/80 backdrop-blur-lg shadow-sm hover:shadow-md transition-shadow rounded-3xl">
                                <CardContent className="p-6 flex items-start gap-4">
                                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                                        <School className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-400 mb-1">Campus</p>
                                        <p className="font-bold text-slate-800">{studentInfo.campus || "-"}</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="border-0 bg-white/80 backdrop-blur-lg shadow-sm hover:shadow-md transition-shadow rounded-3xl">
                                <CardContent className="p-6 flex items-start gap-4">
                                    <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                                        <GraduationCap className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-400 mb-1">Faculty</p>
                                        <p className="font-bold text-slate-800 line-clamp-2">{studentInfo.faculty || "-"}</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="lg:col-span-4 border-0 bg-gradient-to-r from-blue-50 to-indigo-50/50 backdrop-blur-lg shadow-sm rounded-3xl">
                                <CardContent className="p-6 flex items-center gap-4">
                                    <div className="p-3 bg-white text-blue-600 shadow-sm rounded-2xl">
                                        <BookOpen className="h-6 w-6" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-slate-500 mb-1">Major / Track</p>
                                        <p className="font-bold text-slate-900 text-lg flex flex-wrap items-center gap-2">
                                            {studentInfo.major || "-"} 
                                            {studentInfo.track && (
                                                <span className="bg-indigo-600 text-white px-3 py-1 rounded-xl text-sm shadow-sm">
                                                    {studentInfo.track}
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {/* ═══════ CONFIDENCE ALERT ═══════ */}
                    <AnimatePresence>
                        {parseConfidence > 0 && parseConfidence < 80 && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                className="mb-8 flex items-center gap-4 rounded-[2rem] border-2 border-amber-200 bg-amber-50 p-6 shadow-sm"
                            >
                                <div className="p-3 bg-amber-100 rounded-2xl">
                                    <AlertTriangle className="h-6 w-6 text-amber-600" />
                                </div>
                                <div>
                                    <p className="font-bold text-amber-900 text-lg">
                                        Low parsing confidence: {parseConfidence}%
                                    </p>
                                    <p className="text-sm font-medium text-amber-700 mt-1">
                                        ข้อมูลบางส่วนอาจไม่ถูกต้อง โปรดตรวจสอบรหัสวิชาและเกรดแต่ละแถวอย่างละเอียด
                                    </p>
                                </div>
                            </motion.div>
                        )}

                        {parseConfidence >= 80 && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                className="mb-8 flex items-center gap-4 rounded-[2rem] border-2 border-emerald-100 bg-emerald-50/50 p-6 shadow-sm"
                            >
                                <div className="p-3 bg-emerald-100 rounded-2xl">
                                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                                </div>
                                <div>
                                    <p className="font-bold text-emerald-900 text-lg">
                                        Parsing confidence: {parseConfidence}%
                                    </p>
                                    <p className="text-sm font-medium text-emerald-700 mt-1">
                                        ดึงข้อมูลสำเร็จ! โปรดตรวจสอบความถูกต้องอีกครั้งก่อนไปต่อ
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* ═══════ EDITABLE LIST ═══════ */}
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <Card className="mb-8 border-0 bg-white/80 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] rounded-[2rem] overflow-hidden relative">
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <div className="min-w-[800px] w-full p-6">
                                        {/* Table Header Custom */}
                                        <div className="grid grid-cols-[3rem_10rem_1fr_6rem_8rem_8rem_4rem] gap-4 mb-4 px-4 py-3 bg-slate-100/50 rounded-2xl border border-slate-100 text-sm font-bold text-slate-500">
                                            <div className="text-center">#</div>
                                            <div>Code</div>
                                            <div>Subject Name</div>
                                            <div className="text-center">Credits</div>
                                            <div>Grade</div>
                                            <div>Status</div>
                                            <div></div>
                                        </div>

                                        {/* Table Rows */}
                                        <div className="space-y-3">
                                            <AnimatePresence>
                                                {fields.map((field, index) => (
                                                    <motion.div
                                                        key={field.id}
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{
                                                            opacity: deletingIds.has(field.id) ? 0 : 1,
                                                            scale: deletingIds.has(field.id) ? 0.95 : 1,
                                                        }}
                                                        transition={{ duration: 0.2 }}
                                                        className="grid grid-cols-[3rem_10rem_1fr_6rem_8rem_8rem_4rem] gap-4 items-center px-4 py-3 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 hover:bg-blue-50/30 transition-all group"
                                                    >
                                                        <div className="text-center font-bold text-slate-300 group-hover:text-blue-400">
                                                            {index + 1}
                                                        </div>
                                                        <div>
                                                            <Input
                                                                {...register(`subjects.${index}.code`)}
                                                                placeholder="XXX-XXX"
                                                                className={`font-mono font-semibold text-sm h-11 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${
                                                                    errors.subjects?.[index]?.code ? "border-red-300 focus:ring-red-500 bg-red-50 text-red-600" : ""
                                                                }`}
                                                            />
                                                        </div>
                                                        <div>
                                                            <Input
                                                                {...register(`subjects.${index}.name`)}
                                                                placeholder="Subject name"
                                                                className={`text-sm font-semibold h-11 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all ${
                                                                    errors.subjects?.[index]?.name ? "border-red-300 focus:ring-red-500 bg-red-50 text-red-600" : ""
                                                                }`}
                                                            />
                                                        </div>
                                                        <div>
                                                            <Input
                                                                {...register(`subjects.${index}.credits`, { valueAsNumber: true })}
                                                                type="number"
                                                                min={1}
                                                                max={12}
                                                                className="text-center font-bold text-sm h-11 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all w-full"
                                                            />
                                                        </div>
                                                        <div>
                                                            <Select
                                                                value={
                                                                    watchedSubjects?.[index]?.grade ??
                                                                    (watchedSubjects?.[index]?.status === "IN_PROGRESS" ? "In Progress" : "")
                                                                }
                                                                onValueChange={(val) => handleGradeChange(index, val)}
                                                            >
                                                                <SelectTrigger className="text-sm font-bold h-11 rounded-xl bg-slate-50 border-transparent focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all">
                                                                    <SelectValue placeholder="-" />
                                                                </SelectTrigger>
                                                                <SelectContent className="rounded-xl border-slate-200 shadow-xl font-medium">
                                                                    {GRADE_OPTIONS.map((g) => (
                                                                        <SelectItem key={g} value={g} className="rounded-lg">
                                                                            {g}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                        <div>
                                                            <Badge
                                                                variant="outline"
                                                                className={`w-full justify-center h-8 text-xs font-bold rounded-lg border-transparent shadow-sm ${
                                                                    watchedSubjects?.[index]?.status === "COMPLETED"
                                                                        ? "bg-emerald-100 text-emerald-700"
                                                                        : watchedSubjects?.[index]?.status === "IN_PROGRESS"
                                                                            ? "bg-blue-100 text-blue-700"
                                                                            : watchedSubjects?.[index]?.status === "WITHDRAWN"
                                                                                ? "bg-amber-100 text-amber-700"
                                                                                : "bg-red-100 text-red-700"
                                                                }`}
                                                            >
                                                                {watchedSubjects?.[index]?.status === "COMPLETED"
                                                                    ? "Completed"
                                                                    : watchedSubjects?.[index]?.status === "IN_PROGRESS"
                                                                        ? "In Progress"
                                                                        : watchedSubjects?.[index]?.status === "WITHDRAWN"
                                                                            ? "Withdrawn"
                                                                            : "Failed"}
                                                            </Badge>
                                                        </div>
                                                        <div className="flex justify-end">
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => deleteRow(index, field.id)}
                                                                className="h-11 w-11 rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all group-hover:text-red-400"
                                                            >
                                                                <Trash2 className="h-5 w-5" />
                                                            </Button>
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* ═══════ ACTIONS ═══════ */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={addRow}
                                className="w-full sm:w-auto h-14 px-6 gap-2 rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 text-blue-600 hover:bg-blue-100 hover:border-blue-300 font-bold shadow-sm transition-all"
                            >
                                <Plus className="h-5 w-5" />
                                Add Subject manually
                            </Button>

                            <Button
                                type="submit"
                                size="lg"
                                className="w-full sm:w-auto h-14 px-8 gap-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-lg font-bold shadow-[0_0_30px_rgba(79,70,229,0.3)] hover:shadow-[0_0_40px_rgba(79,70,229,0.5)] rounded-2xl transition-all hover:-translate-y-1 border border-white/20"
                            >
                                Compare Curriculum
                                <ArrowRight className="h-5 w-5" />
                            </Button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </div>
    );
}