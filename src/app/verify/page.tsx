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
    AlertTriangle,
    CheckCircle2,
    User,
    GraduationCap,
    School,
    BookOpen,
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
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
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            <div className="mx-auto max-w-6xl px-4 py-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {/* Header */}
                    <div className="mb-6 flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">
                                Verify Your Subjects
                            </h1>
                            <p className="mt-1 text-slate-600">
                                Review and correct the parsed data before comparing with the
                                curriculum
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <Badge
                                variant="outline"
                                className="bg-white px-3 py-1 text-sm font-mono"
                            >
                                {fields.length} subjects · {totalCredits} credits
                            </Badge>
                        </div>
                    </div>

                    {/* Student Info Card */}
                    {studentInfo && (
                        <Card className="mb-6 border-0 shadow-md shadow-slate-200/50">
                            <CardHeader className="bg-slate-50/50 border-b pb-4">
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <User className="h-5 w-5 text-blue-600" />
                                    Student Information
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-y-4 gap-x-6">
                                    <div>
                                        <p className="text-sm text-slate-500 mb-1 flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Name</p>
                                        <p className="font-medium text-slate-800">{studentInfo.name}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500 mb-1 flex items-center gap-1.5"><Badge variant="outline" className="px-1 text-[10px] h-4">ID</Badge> Student ID</p>
                                        <p className="font-medium text-slate-800 font-mono tracking-tight">{studentInfo.studentId}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500 mb-1 flex items-center gap-1.5"><School className="h-3.5 w-3.5" /> Campus</p>
                                        <p className="font-medium text-slate-800">{studentInfo.campus || "-"}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500 mb-1 flex items-center gap-1.5"><GraduationCap className="h-3.5 w-3.5" /> Faculty</p>
                                        <p className="font-medium text-slate-800">{studentInfo.faculty || "-"}</p>
                                    </div>
                                    <div className="lg:col-span-2">
                                        <p className="text-sm text-slate-500 mb-1 flex items-center gap-1.5"><BookOpen className="h-3.5 w-3.5" /> Major / Track</p>
                                        <p className="font-medium text-slate-800">
                                            {studentInfo.major || "-"} {studentInfo.track ? <span className="text-blue-600 ml-1">({studentInfo.track})</span> : ""}
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Parse Confidence Warning */}
                    {parseConfidence > 0 && parseConfidence < 80 && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="mb-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4"
                        >
                            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
                            <div>
                                <p className="font-medium text-amber-800">
                                    Low parsing confidence: {parseConfidence}%
                                </p>
                                <p className="text-sm text-amber-700">
                                    Some subjects may not have been parsed correctly. Please
                                    review each row carefully.
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {parseConfidence >= 80 && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="mb-4 flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4"
                        >
                            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                            <p className="text-sm text-emerald-700">
                                Parsing confidence: <strong>{parseConfidence}%</strong> — Data
                                looks good! Still, please review before proceeding.
                            </p>
                        </motion.div>
                    )}

                    {/* Editable Table */}
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <Card className="mb-6 border-0 shadow-lg shadow-slate-200/50 overflow-hidden">
                            <CardHeader className="bg-white border-b">
                                <CardTitle className="text-lg">Subject List</CardTitle>
                            </CardHeader>
                            <CardContent className="p-0">
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-slate-50">
                                                <TableHead className="w-12 text-center">#</TableHead>
                                                <TableHead className="w-36">Code</TableHead>
                                                <TableHead className="min-w-[250px]">
                                                    Subject Name
                                                </TableHead>
                                                <TableHead className="w-24 text-center">
                                                    Credits
                                                </TableHead>
                                                <TableHead className="w-36">Grade</TableHead>
                                                <TableHead className="w-28">Status</TableHead>
                                                <TableHead className="w-16"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            <AnimatePresence>
                                                {fields.map((field, index) => (
                                                    <motion.tr
                                                        key={field.id}
                                                        initial={{ opacity: 0, x: -20 }}
                                                        animate={{
                                                            opacity: deletingIds.has(field.id) ? 0 : 1,
                                                            x: deletingIds.has(field.id) ? 100 : 0,
                                                            height: deletingIds.has(field.id) ? 0 : "auto",
                                                        }}
                                                        transition={{ duration: 0.3 }}
                                                        className="group border-b hover:bg-blue-50/30"
                                                    >
                                                        <TableCell className="text-center text-sm text-slate-400">
                                                            {index + 1}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                {...register(`subjects.${index}.code`)}
                                                                placeholder="XXX-XXX"
                                                                className={`font-mono text-sm ${errors.subjects?.[index]?.code
                                                                    ? "border-red-300 focus:ring-red-500"
                                                                    : ""
                                                                    }`}
                                                            />
                                                            {errors.subjects?.[index]?.code && (
                                                                <p className="mt-1 text-xs text-red-500">
                                                                    {errors.subjects[index].code?.message}
                                                                </p>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                {...register(`subjects.${index}.name`)}
                                                                placeholder="Subject name"
                                                                className={`text-sm ${errors.subjects?.[index]?.name
                                                                    ? "border-red-300 focus:ring-red-500"
                                                                    : ""
                                                                    }`}
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                {...register(`subjects.${index}.credits`, { valueAsNumber: true })}
                                                                type="number"
                                                                min={1}
                                                                max={12}
                                                                className="text-center text-sm w-20"
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Select
                                                                value={
                                                                    watchedSubjects?.[index]?.grade ??
                                                                    (watchedSubjects?.[index]?.status ===
                                                                        "IN_PROGRESS"
                                                                        ? "In Progress"
                                                                        : "")
                                                                }
                                                                onValueChange={(val) =>
                                                                    handleGradeChange(index, val)
                                                                }
                                                            >
                                                                <SelectTrigger className="text-sm">
                                                                    <SelectValue placeholder="Select" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {GRADE_OPTIONS.map((g) => (
                                                                        <SelectItem key={g} value={g}>
                                                                            {g}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge
                                                                variant="outline"
                                                                className={`text-xs ${watchedSubjects?.[index]?.status ===
                                                                    "COMPLETED"
                                                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                    : watchedSubjects?.[index]?.status ===
                                                                        "IN_PROGRESS"
                                                                        ? "bg-blue-50 text-blue-700 border-blue-200"
                                                                        : watchedSubjects?.[index]?.status ===
                                                                            "WITHDRAWN"
                                                                            ? "bg-orange-50 text-orange-700 border-orange-200"
                                                                            : "bg-red-50 text-red-700 border-red-200"
                                                                    }`}
                                                            >
                                                                {watchedSubjects?.[index]?.status ===
                                                                    "COMPLETED"
                                                                    ? "Completed"
                                                                    : watchedSubjects?.[index]?.status ===
                                                                        "IN_PROGRESS"
                                                                        ? "In Progress"
                                                                        : watchedSubjects?.[index]?.status ===
                                                                            "WITHDRAWN"
                                                                            ? "Withdrawn"
                                                                            : "Failed"}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Button
                                                                type="button"
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => deleteRow(index, field.id)}
                                                                className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 hover:bg-red-50 transition-opacity"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </motion.tr>
                                                ))}
                                            </AnimatePresence>
                                        </TableBody>
                                    </Table>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Actions */}
                        <div className="flex items-center justify-between">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={addRow}
                                className="gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Add Subject
                            </Button>

                            <Button
                                type="submit"
                                size="lg"
                                className="gap-2 bg-blue-600 text-lg font-semibold shadow-lg shadow-blue-600/25 hover:bg-blue-700"
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
