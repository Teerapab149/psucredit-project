"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
    Tooltip,
} from "recharts";
import {
    CheckCircle2,
    XCircle,
    Clock,
    ArrowLeft,
    GraduationCap,
    TrendingUp,
    AlertCircle,
    ChevronDown,
    ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useCreditStore } from "@/store/credit-store";
import type { MatchResult, CategoryMatch } from "@/types";

const CHART_COLORS = ["#10b981", "#3b82f6", "#ef4444", "#94a3b8"];

function CategoryCard({
    category,
    depth = 0,
}: {
    category: CategoryMatch;
    depth?: number;
}) {
    const [expanded, setExpanded] = useState(depth < 2);
    const percentage = category.requiredCredits > 0
        ? Math.min(
            100,
            Math.round(
                (category.completedCredits / category.requiredCredits) * 100
            )
        )
        : 0;

    const hasChildren = category.children.length > 0;
    const hasSubjects =
        category.matchedSubjects.length > 0 ||
        category.missingSubjects.length > 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: depth * 0.1 }}
            className={depth > 0 ? "ml-4 mt-3" : ""}
        >
            <Card
                className={`border-0 shadow-md transition-all hover:shadow-lg ${percentage >= 100
                    ? "bg-emerald-50/50 border-l-4 border-l-emerald-500"
                    : "bg-white"
                    }`}
            >
                <CardHeader
                    className="cursor-pointer pb-3"
                    onClick={() => setExpanded(!expanded)}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {(hasChildren || hasSubjects) &&
                                (expanded ? (
                                    <ChevronDown className="h-4 w-4 text-slate-400" />
                                ) : (
                                    <ChevronRight className="h-4 w-4 text-slate-400" />
                                ))}
                            <CardTitle className="text-base font-semibold">
                                {category.categoryName}
                            </CardTitle>
                            {category.isElective && (
                                <Badge
                                    variant="outline"
                                    className="text-xs bg-violet-50 text-violet-700 border-violet-200"
                                >
                                    Elective
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <span className="font-mono font-semibold text-slate-700">
                                {category.completedCredits}
                                {category.inProgressCredits > 0 && (
                                    <span className="text-blue-500">
                                        +{category.inProgressCredits}
                                    </span>
                                )}
                                /{category.requiredCredits}
                            </span>
                            <span className="text-slate-400">credits</span>
                        </div>
                    </div>
                    <Progress
                        value={percentage}
                        className="mt-2 h-2"
                    />
                </CardHeader>

                {expanded && (
                    <CardContent className="pt-0">
                        {/* Matched subjects */}
                        {category.matchedSubjects.length > 0 && (
                            <div className="mb-3">
                                {category.matchedSubjects.map((s) => (
                                    <div
                                        key={s.code}
                                        className="flex items-center justify-between py-1.5 text-sm border-b border-slate-50 last:border-0"
                                    >
                                        <div className="flex items-center gap-2">
                                            {s.status === "COMPLETED" ? (
                                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                            ) : s.status === "IN_PROGRESS" ? (
                                                <Clock className="h-4 w-4 text-blue-500" />
                                            ) : (
                                                <XCircle className="h-4 w-4 text-red-500" />
                                            )}
                                            <span className="font-mono text-xs text-slate-400">
                                                {s.code}
                                            </span>
                                            <span className="text-slate-700">{s.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge
                                                variant="outline"
                                                className="text-xs"
                                            >
                                                {s.credits} cr.
                                            </Badge>
                                            {s.grade && (
                                                <Badge
                                                    className={`text-xs ${s.grade === "A"
                                                        ? "bg-emerald-100 text-emerald-700"
                                                        : s.grade.startsWith("B")
                                                            ? "bg-blue-100 text-blue-700"
                                                            : s.grade.startsWith("C")
                                                                ? "bg-amber-100 text-amber-700"
                                                                : "bg-red-100 text-red-700"
                                                        }`}
                                                >
                                                    {s.grade}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Missing subjects */}
                        {category.missingSubjects.length > 0 && (
                            <div className="mt-2 rounded-lg bg-red-50/50 p-3">
                                <p className="mb-2 text-xs font-medium uppercase text-red-600">
                                    Missing Required
                                </p>
                                {category.missingSubjects.map((s) => (
                                    <div
                                        key={s.code}
                                        className="flex items-center justify-between py-1 text-sm"
                                    >
                                        <div className="flex items-center gap-2">
                                            <XCircle className="h-3.5 w-3.5 text-red-400" />
                                            <span className="font-mono text-xs text-slate-400">
                                                {s.code}
                                            </span>
                                            <span className="text-red-700">{s.name}</span>
                                        </div>
                                        <span className="text-xs text-slate-400">
                                            {s.credits} cr.
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Child categories */}
                        {category.children.map((child) => (
                            <CategoryCard
                                key={child.categoryId}
                                category={child}
                                depth={depth + 1}
                            />
                        ))}
                    </CardContent>
                )}
            </Card>
        </motion.div>
    );
}

export default function ResultsPage() {
    const router = useRouter();
    const { verifiedSubjects, studentId, studentInfo, matchResult, setMatchResult } =
        useCreditStore();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (matchResult) return; // Already have results
        if (verifiedSubjects.length === 0) return;

        const fetchResults = async () => {
            setLoading(true);
            try {
                const res = await fetch("/api/match", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        subjects: verifiedSubjects,
                        studentInfo: studentInfo
                    }),
                });
                const data: MatchResult = await res.json();
                setMatchResult(data);
            } catch {
                setError("Failed to match curriculum. Please try again.");
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, [verifiedSubjects, matchResult, setMatchResult]);

    if (verifiedSubjects.length === 0 && !matchResult) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
                <Card className="max-w-md p-8 text-center border-0 shadow-lg">
                    <AlertCircle className="mx-auto mb-4 h-12 w-12 text-amber-500" />
                    <h2 className="text-xl font-bold text-slate-900">No Data Found</h2>
                    <p className="mt-2 text-slate-600">
                        Please upload and verify your subjects first.
                    </p>
                    <Button
                        className="mt-4 bg-blue-600 hover:bg-blue-700"
                        onClick={() => router.push("/upload")}
                    >
                        Go to Upload
                    </Button>
                </Card>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center"
                >
                    <div className="mx-auto mb-4 h-12 w-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
                    <p className="text-lg font-medium text-slate-700">
                        Matching your subjects with curriculum...
                    </p>
                </motion.div>
            </div>
        );
    }

    const data = matchResult;
    if (!data) return null;

    if (data.curriculumName === "No curriculum found") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
                <Card className="max-w-md p-8 text-center border-0 shadow-lg">
                    <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
                    <h2 className="text-xl font-bold text-slate-900">ไม่พบข้อมูลหลักสูตร</h2>
                    <p className="mt-2 text-slate-600 mb-6 font-medium">
                        ยังไม่มีข้อมูลหลักสูตรนี้ใน database
                    </p>
                    <div className="text-sm text-slate-500 text-left bg-slate-50 p-4 rounded-lg">
                        <p className="font-semibold mb-2 text-slate-700">ข้อมูลที่ระบบตรวจพบ:</p>
                        <ul className="list-disc pl-5 space-y-1">
                            <li>คณะ: {studentInfo?.faculty || "-"}</li>
                            <li>สาขาวิชา: {studentInfo?.major || "-"}</li>
                            <li>วิชาเอก/วงเล็บ: {studentInfo?.track || "-"}</li>
                            <li>ปีที่เข้าศึกษา: {studentInfo?.admissionYear || "-"}</li>
                        </ul>
                    </div>
                    <Button
                        className="mt-6 bg-slate-800 hover:bg-slate-900 w-full"
                        onClick={() => router.push("/verify")}
                    >
                        Go back
                    </Button>
                </Card>
            </div>
        );
    }

    const chartData = [
        { name: "Completed", value: data.totalCompleted, color: CHART_COLORS[0] },
        {
            name: "In Progress",
            value: data.totalInProgress,
            color: CHART_COLORS[1],
        },
        {
            name: "Missing",
            value: Math.max(0, data.totalRequired - data.totalCompleted - data.totalInProgress),
            color: CHART_COLORS[2],
        },
    ].filter((d) => d.value > 0);

    const overallPercentage =
        data.totalRequired > 0
            ? Math.round((data.totalCompleted / data.totalRequired) * 100)
            : 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            <div className="mx-auto max-w-5xl px-4 py-8">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    {/* Header */}
                    <div className="mb-8 flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">
                                Graduation Progress
                            </h1>
                            <p className="mt-1 text-slate-600">
                                {data.curriculumName}
                                {studentId && (
                                    <span className="ml-2 font-mono text-sm text-slate-400">
                                        ({studentId})
                                    </span>
                                )}
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => router.push("/verify")}
                            className="gap-2"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Edit Subjects
                        </Button>
                    </div>

                    {/* Summary Cards */}
                    <div className="mb-8 grid gap-4 md:grid-cols-4">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1 }}
                        >
                            <Card className="border-0 shadow-md bg-gradient-to-br from-emerald-500 to-emerald-600 text-white">
                                <CardContent className="p-5">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-emerald-100">Completed</p>
                                            <p className="text-3xl font-bold">
                                                {data.totalCompleted}
                                            </p>
                                            <p className="text-xs text-emerald-200">credits</p>
                                        </div>
                                        <CheckCircle2 className="h-10 w-10 text-emerald-200" />
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <Card className="border-0 shadow-md bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                                <CardContent className="p-5">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-blue-100">In Progress</p>
                                            <p className="text-3xl font-bold">
                                                {data.totalInProgress}
                                            </p>
                                            <p className="text-xs text-blue-200">credits</p>
                                        </div>
                                        <Clock className="h-10 w-10 text-blue-200" />
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                        >
                            <Card className="border-0 shadow-md bg-gradient-to-br from-amber-500 to-orange-500 text-white">
                                <CardContent className="p-5">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-amber-100">Required</p>
                                            <p className="text-3xl font-bold">
                                                {data.totalRequired}
                                            </p>
                                            <p className="text-xs text-amber-200">total credits</p>
                                        </div>
                                        <GraduationCap className="h-10 w-10 text-amber-200" />
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <Card className="border-0 shadow-md bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                                <CardContent className="p-5">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm text-violet-100">Progress</p>
                                            <p className="text-3xl font-bold">{overallPercentage}%</p>
                                            <p className="text-xs text-violet-200">complete</p>
                                        </div>
                                        <TrendingUp className="h-10 w-10 text-violet-200" />
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>

                    {/* Chart + Graduation Summary */}
                    <div className="mb-8 grid gap-6 md:grid-cols-2">
                        <Card className="border-0 shadow-md">
                            <CardHeader>
                                <CardTitle className="text-lg">Overall Progress</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="h-64">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={chartData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={90}
                                                paddingAngle={3}
                                                dataKey="value"
                                            >
                                                {chartData.map((entry, i) => (
                                                    <Cell key={i} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="mt-4 flex justify-center gap-4">
                                    {chartData.map((entry) => (
                                        <div
                                            key={entry.name}
                                            className="flex items-center gap-2 text-sm"
                                        >
                                            <div
                                                className="h-3 w-3 rounded-full"
                                                style={{ backgroundColor: entry.color }}
                                            />
                                            <span className="text-slate-600">{entry.name}</span>
                                            <span className="font-mono font-semibold">
                                                {entry.value}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-0 shadow-md">
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <GraduationCap className="h-5 w-5" />
                                    What You Still Need
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {data.totalMissing <= 0 ? (
                                    <div className="flex flex-col items-center py-8 text-center">
                                        <CheckCircle2 className="mb-3 h-16 w-16 text-emerald-500" />
                                        <p className="text-xl font-bold text-emerald-700">
                                            Congratulations! 🎉
                                        </p>
                                        <p className="mt-1 text-slate-600">
                                            You have completed all required credits.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        <p className="text-sm text-slate-600">
                                            You still need{" "}
                                            <span className="font-bold text-red-600">
                                                {Math.max(
                                                    0,
                                                    data.totalRequired - data.totalCompleted
                                                )}{" "}
                                                credits
                                            </span>{" "}
                                            to complete your degree
                                            {data.totalInProgress > 0 && (
                                                <span>
                                                    {" "}
                                                    ({data.totalInProgress} credits are in progress)
                                                </span>
                                            )}
                                            .
                                        </p>
                                        {data.categories
                                            .filter(
                                                (c) => c.completedCredits < c.requiredCredits
                                            )
                                            .map((c) => (
                                                <div
                                                    key={c.categoryId}
                                                    className="flex items-center justify-between rounded-lg bg-slate-50 p-3"
                                                >
                                                    <span className="text-sm font-medium text-slate-700">
                                                        {c.categoryName}
                                                    </span>
                                                    <Badge variant="outline" className="font-mono">
                                                        {c.requiredCredits - c.completedCredits} cr.
                                                        remaining
                                                    </Badge>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Category Breakdown */}
                    <h2 className="mb-4 text-xl font-bold text-slate-900">
                        Category Breakdown
                    </h2>
                    <div className="space-y-4">
                        {data.categories.map((category) => (
                            <CategoryCard
                                key={category.categoryId}
                                category={category}
                            />
                        ))}
                    </div>

                    {/* Unmatched subjects */}
                    {data.unmatchedSubjects.length > 0 && (
                        <Card className="mt-6 border-0 shadow-md">
                            <CardHeader>
                                <CardTitle className="text-lg">
                                    Unmatched Subjects ({data.unmatchedSubjects.length})
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="mb-3 text-sm text-slate-500">
                                    These subjects were not found in the curriculum. They may
                                    count as free electives or may need manual categorization.
                                </p>
                                {data.unmatchedSubjects.map((s) => (
                                    <div
                                        key={s.code}
                                        className="flex items-center justify-between border-b border-slate-100 py-2 text-sm last:border-0"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-slate-400">
                                                {s.code}
                                            </span>
                                            <span>{s.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline">{s.credits} cr.</Badge>
                                            <Badge
                                                variant="outline"
                                                className={
                                                    s.status === "COMPLETED"
                                                        ? "bg-emerald-50 text-emerald-700"
                                                        : "bg-blue-50 text-blue-700"
                                                }
                                            >
                                                {s.grade || "In Progress"}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    )}

                    {error && (
                        <div className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-600">
                            {error}
                        </div>
                    )}
                </motion.div>
            </div>
        </div>
    );
}
