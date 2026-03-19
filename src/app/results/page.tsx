"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
    BookOpen,
    ListChecks,
    RefreshCw,
    Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useCreditStore } from "@/store/credit-store";
import type { MatchResult, CategoryMatch } from "@/types";

interface CurriculumPlan {
    id: string;
    name: string;
    planType: string;
    trackType: string | null;
    curriculumYearId: string;
}

const CHART_COLORS = ["#10b981", "#3b82f6", "#ef4444", "#cbd5e1"];

function CategoryCard({
    category,
    depth = 0,
}: {
    category: CategoryMatch;
    depth?: number;
}) {
    const [expanded, setExpanded] = useState(depth < 2);
    const [matchedOpen, setMatchedOpen] = useState(false);
    const [missingOpen, setMissingOpen] = useState(false);

    const percentage = category.requiredCredits > 0
        ? Math.min(100, Math.round((category.completedCredits / category.requiredCredits) * 100))
        : 0;

    const isPassed = category.requiredCredits > 0 && category.completedCredits >= category.requiredCredits;
    const hasChildren = category.children.length > 0;
    const hasContent = category.matchedSubjects.length > 0 || category.missingSubjects.length > 0 || hasChildren;
    const remainingCredits = Math.max(0, category.requiredCredits - category.completedCredits - category.inProgressCredits);

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: depth * 0.05 }}
            className={depth > 0 ? "ml-3 md:ml-6 mt-4" : "mt-4"}
        >
            <Card className={`overflow-hidden transition-all duration-300 w-full py-0 gap-0 border-white/60 backdrop-blur-xl shadow-lg ${
                isPassed
                    ? "bg-emerald-50/70 border-l-4 border-l-emerald-500 shadow-emerald-500/10"
                    : depth === 0 
                        ? "bg-white/80 shadow-slate-200/40" 
                        : "bg-white/50 shadow-sm"
                } ${depth === 0 ? "rounded-[2rem]" : "rounded-2xl"}`}
            >
                <CardHeader
                    className="cursor-pointer pb-4 pt-5 px-5 md:px-6 hover:bg-slate-50/30 transition-colors"
                    onClick={() => setExpanded(!expanded)}
                >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex items-start md:items-center gap-3 min-w-0 w-full">
                            <div className="mt-1 md:mt-0 shrink-0 flex items-center justify-center bg-white rounded-full p-1 shadow-sm">
                                {hasContent ? (
                                    expanded ? (
                                        <ChevronDown className="h-4 w-4 text-blue-600" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4 text-slate-400" />
                                    )
                                ) : (
                                    <div className="w-4" />
                                )}
                            </div>
                            <CardTitle className="text-base md:text-lg font-bold leading-snug text-slate-800 break-words">
                                {category.categoryName}
                            </CardTitle>
                        </div>

                        <div className="flex items-center flex-wrap gap-2 shrink-0 pl-8 md:pl-0">
                            {isPassed && (
                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none text-xs font-bold gap-1 px-2.5 py-1 rounded-lg">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> PASS
                                </Badge>
                            )}

                            {!isPassed && category.requiredCredits > 0 && remainingCredits > 0 && (
                                <Badge variant="outline" className="text-xs bg-red-50 text-red-600 border-red-100 font-bold px-2.5 py-1 rounded-lg">
                                    ขาด {remainingCredits} นก.
                                </Badge>
                            )}

                            {category.isElective && (
                                <Badge variant="outline" className="text-xs bg-violet-50 text-violet-700 border-violet-100 font-bold px-2.5 py-1 rounded-lg">
                                    Elective
                                </Badge>
                            )}

                            <div className="bg-white border border-slate-100 px-3 py-1 rounded-xl shadow-sm flex items-center gap-1">
                                <span className="font-mono text-sm font-black text-slate-800 whitespace-nowrap">
                                    {category.completedCredits}
                                    {category.inProgressCredits > 0 && (
                                        <span className="text-blue-500">+{category.inProgressCredits}</span>
                                    )}
                                    <span className="text-slate-400 font-semibold">/{category.requiredCredits}</span>
                                </span>
                            </div>
                        </div>
                    </div>

                    <Progress 
                        value={percentage} 
                        className={`mt-4 h-2 ${isPassed ? "[&>div]:bg-emerald-500 bg-emerald-200/50" : "[&>div]:bg-blue-500 bg-slate-200"}`} 
                    />
                </CardHeader>

                <AnimatePresence>
                    {expanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                        >
                            <CardContent className="pt-0 px-5 md:px-6 pb-5 space-y-4">
                                {category.matchedSubjects.length > 0 && (
                                    <div className="rounded-2xl border border-slate-100/80 overflow-hidden bg-white/60 shadow-sm">
                                        <button
                                            className="w-full flex items-center justify-between px-5 py-3.5 bg-slate-50/80 hover:bg-blue-50/50 transition-colors text-left"
                                            onClick={(e) => { e.stopPropagation(); setMatchedOpen(!matchedOpen); }}
                                        >
                                            <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-600">
                                                <ListChecks className="h-4 w-4 text-blue-500" />
                                                Enrolled subjects ({category.matchedSubjects.length})
                                            </span>
                                            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-300 ${matchedOpen ? "rotate-180" : ""}`} />
                                        </button>

                                        <AnimatePresence>
                                            {matchedOpen && (
                                                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="divide-y divide-slate-100/50 overflow-hidden">
                                                    {category.matchedSubjects.map((s) => (
                                                        <div key={s.code} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:px-5 text-sm hover:bg-white transition-colors gap-3">
                                                            <div className="flex items-start sm:items-center gap-3 min-w-0">
                                                                <div className="mt-0.5 sm:mt-0 shrink-0">
                                                                    {s.status === "COMPLETED" ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                                                        : s.status === "IN_PROGRESS" ? <Clock className="h-5 w-5 text-blue-500" />
                                                                        : <XCircle className="h-5 w-5 text-red-500" />}
                                                                </div>
                                                                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 min-w-0">
                                                                    <span className="font-mono text-xs font-bold text-slate-500 shrink-0 bg-slate-100/80 px-2 py-1 rounded-lg">{s.code}</span>
                                                                    <span className="text-slate-700 font-bold sm:truncate">{s.name}</span>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2 shrink-0 ml-8 sm:ml-0">
                                                                <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-600 font-bold rounded-lg">{s.credits} cr.</Badge>
                                                                {s.grade && (
                                                                    <Badge className={`text-xs px-2.5 py-0.5 rounded-lg shadow-sm font-bold ${
                                                                        s.grade === "A" ? "bg-emerald-100 text-emerald-700"
                                                                        : s.grade.startsWith("B") ? "bg-blue-100 text-blue-700"
                                                                        : s.grade.startsWith("C") ? "bg-amber-100 text-amber-700"
                                                                        : "bg-red-100 text-red-700"
                                                                    }`}>
                                                                        {s.grade}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}

                                {category.missingSubjects.length > 0 && (
                                    <div className={`rounded-2xl border overflow-hidden shadow-sm ${isPassed ? "border-slate-100/80 bg-white/60" : "border-red-100/80 bg-red-50/30"}`}>
                                        <button
                                            className={`w-full flex items-center justify-between px-5 py-3.5 transition-colors text-left ${isPassed ? "bg-slate-50/80 hover:bg-slate-100/50" : "bg-red-50/80 hover:bg-red-100/50"}`}
                                            onClick={(e) => { e.stopPropagation(); setMissingOpen(!missingOpen); }}
                                        >
                                            <span className={`flex items-center gap-2 text-xs font-black uppercase tracking-wider ${isPassed ? "text-slate-600" : "text-red-600"}`}>
                                                <BookOpen className={`h-4 w-4 ${isPassed ? "text-slate-400" : "text-red-500"}`} />
                                                {isPassed ? `Course catalogue (${category.missingSubjects.length})` : `Still required (${category.missingSubjects.length})`}
                                            </span>
                                            <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isPassed ? "text-slate-400" : "text-red-400"} ${missingOpen ? "rotate-180" : ""}`} />
                                        </button>

                                        <AnimatePresence>
                                            {missingOpen && (
                                                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="divide-y divide-slate-100/50 overflow-hidden">
                                                    {category.missingSubjects.map((s) => (
                                                        <div key={s.code} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:px-5 text-sm hover:bg-white/80 transition-colors gap-3">
                                                            <div className="flex items-start sm:items-center gap-3 min-w-0">
                                                                <div className="mt-0.5 sm:mt-0 shrink-0">
                                                                    {isPassed ? <BookOpen className="h-5 w-5 text-slate-300" /> : <XCircle className="h-5 w-5 text-red-400" />}
                                                                </div>
                                                                <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 min-w-0">
                                                                    <span className="font-mono text-xs font-bold text-slate-500 shrink-0 bg-slate-100/80 px-2 py-1 rounded-lg">{s.code}</span>
                                                                    <span className={`font-bold sm:truncate ${isPassed ? "text-slate-600" : "text-red-700"}`}>
                                                                        {s.name}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <span className="text-xs font-bold text-slate-500 shrink-0 ml-8 sm:ml-0 bg-slate-100 px-2.5 py-1 rounded-lg">
                                                                {s.credits} cr.
                                                            </span>
                                                        </div>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}

                                {category.children.length > 0 && (
                                    <div className="pt-2">
                                        {category.children.map((child) => (
                                            <CategoryCard key={child.categoryId} category={child} depth={depth + 1} />
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </motion.div>
                    )}
                </AnimatePresence>
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
    const [plans, setPlans] = useState<CurriculumPlan[]>([]);
    const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
    const [selectedPlanName, setSelectedPlanName] = useState<string | null>(null);
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [plansLoaded, setPlansLoaded] = useState(false);

    useEffect(() => {
        if (!matchResult || plansLoaded) return;

        const fetchPlans = async () => {
            try {
                const res = await fetch("/api/curriculum-plans?curriculumYearId=" + encodeURIComponent(
                    (matchResult as any).curriculumYearId || ""
                ));
                if (!res.ok) return;
                const data: CurriculumPlan[] = await res.json();
                setPlans(data);

                const storedPlanId = localStorage.getItem("selectedPlanId");

                if (data.length === 1) {
                    setSelectedPlanId(data[0].id);
                    setSelectedPlanName(data[0].name);
                } else if (data.length > 1) {
                    if (storedPlanId && data.find(p => p.id === storedPlanId)) {
                        setSelectedPlanId(storedPlanId);
                        setSelectedPlanName(data.find(p => p.id === storedPlanId)!.name);
                    } else {
                        setShowPlanModal(true);
                    }
                }
                setPlansLoaded(true);
            } catch { }
        };

        fetchPlans();
    }, [matchResult, plansLoaded]);

    useEffect(() => {
        if (verifiedSubjects.length === 0) return;

        const fetchResults = async () => {
            setLoading(true);
            try {
                const res = await fetch("/api/match", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        subjects: verifiedSubjects,
                        studentInfo: studentInfo,
                        planId: selectedPlanId,
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
    }, [verifiedSubjects, studentInfo, selectedPlanId, setMatchResult]);

    const handleSelectPlan = (plan: CurriculumPlan) => {
        setSelectedPlanId(plan.id);
        setSelectedPlanName(plan.name);
        localStorage.setItem("selectedPlanId", plan.id);
        setShowPlanModal(false);
    };

    if (verifiedSubjects.length === 0 && !matchResult) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100">
                <Card className="max-w-md p-8 text-center border-0 shadow-xl rounded-[2rem]">
                    <AlertCircle className="mx-auto mb-4 h-16 w-16 text-amber-500" />
                    <h2 className="text-2xl font-bold text-slate-900">No Data Found</h2>
                    <p className="mt-2 text-slate-600 font-medium">
                        Please upload and verify your subjects first.
                    </p>
                    <Button
                        size="lg"
                        className="mt-6 rounded-2xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20"
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
            <div className="min-h-screen flex items-center justify-center bg-slate-100">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                    <div className="mx-auto mb-6 h-16 w-16 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
                    <p className="text-xl font-bold text-slate-700">
                        Analyzing curriculum...
                    </p>
                </motion.div>
            </div>
        );
    }

    const data = matchResult;
    if (!data || !data.categories) return null;

    if (data.curriculumName === "No curriculum found") {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100">
                <Card className="max-w-md p-8 border-0 shadow-xl rounded-[2rem]">
                    <AlertCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
                    <h2 className="text-2xl font-bold text-center text-slate-900">ไม่พบข้อมูลหลักสูตร</h2>
                    <p className="mt-2 text-center text-slate-600 mb-6 font-medium">
                        ยังไม่มีข้อมูลหลักสูตรนี้ในระบบ
                    </p>
                    <div className="text-sm text-slate-600 text-left bg-slate-50 border border-slate-200 p-5 rounded-2xl">
                        <p className="font-bold mb-3 text-slate-800">ข้อมูลที่ระบบตรวจพบ:</p>
                        <ul className="space-y-2 font-medium">
                            <li className="flex justify-between border-b border-slate-200/50 pb-2">
                                <span className="text-slate-500">คณะ</span> <span>{studentInfo?.faculty || "-"}</span>
                            </li>
                            <li className="flex justify-between border-b border-slate-200/50 pb-2">
                                <span className="text-slate-500">สาขาวิชา</span> <span>{studentInfo?.major || "-"}</span>
                            </li>
                            <li className="flex justify-between border-b border-slate-200/50 pb-2">
                                <span className="text-slate-500">วิชาเอก</span> <span>{studentInfo?.track || "-"}</span>
                            </li>
                            <li className="flex justify-between">
                                <span className="text-slate-500">ปีที่เข้าศึกษา</span> <span>{studentInfo?.admissionYear || "-"}</span>
                            </li>
                        </ul>
                    </div>
                    <Button
                        size="lg"
                        className="mt-8 bg-slate-900 hover:bg-slate-800 w-full rounded-2xl shadow-lg shadow-slate-900/20"
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
        { name: "In Progress", value: data.totalInProgress, color: CHART_COLORS[1] },
        { name: "Missing", value: Math.max(0, data.totalRequired - data.totalCompleted - data.totalInProgress), color: CHART_COLORS[2] },
    ].filter((d) => d.value > 0);

    const overallPercentage = data.totalRequired > 0 ? Math.round((data.totalCompleted / data.totalRequired) * 100) : 0;

    return (
        <div className="min-h-screen bg-slate-100 selection:bg-blue-200 font-sans text-slate-900 overflow-hidden relative pb-24">
            
            {/* ═══════ LIGHT BACKGROUND EFFECTS (DARKER TONE) ═══════ */}
            <div className="fixed inset-0 pointer-events-none flex justify-center overflow-hidden z-0">
                <motion.div
                    animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[-10%] -left-[10%] w-[500px] h-[500px] rounded-full bg-blue-300/20 blur-[120px]"
                />
                <motion.div
                    animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute top-[20%] -right-[10%] w-[600px] h-[600px] rounded-full bg-indigo-300/20 blur-[120px]"
                />
                <div
                    className="absolute inset-0 opacity-[0.6]"
                    style={{
                        backgroundImage: "radial-gradient(circle, #cbd5e1 1px, transparent 1px)",
                        backgroundSize: "32px 32px",
                        maskImage: "linear-gradient(to bottom, black 80%, transparent 100%)",
                        WebkitMaskImage: "linear-gradient(to bottom, black 80%, transparent 100%)",
                    }}
                />
            </div>

            <div className="relative z-10 mx-auto max-w-6xl px-4 py-12 pt-24">
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    
                    {/* ═══════ HEADER ═══════ */}
                    <div className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-2">
                                <h1 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-900">
                                    Graduation Progress
                                </h1>
                            </div>
                            <p className="text-slate-600 font-bold text-lg flex items-center flex-wrap gap-2">
                                {data.curriculumName}
                                {studentId && (
                                    <Badge variant="secondary" className="font-mono bg-white/80 text-slate-700 border-slate-200 px-2 rounded-md shadow-sm">
                                        ID: {studentId}
                                    </Badge>
                                )}
                            </p>
                        </div>
                        
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            {plans.length > 0 && selectedPlanName && (
                                <div className="flex items-center gap-3 bg-white/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-white shadow-sm flex-1 md:flex-none">
                                    <span className="text-sm font-bold text-slate-700 line-clamp-1">{selectedPlanName}</span>
                                    {plans.length > 1 && (
                                        <Button variant="ghost" size="icon" className="h-8 w-8 bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 rounded-xl" onClick={() => setShowPlanModal(true)}>
                                            <RefreshCw className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                            )}
                            <Button
                                variant="outline"
                                onClick={() => router.push("/verify")}
                                className="gap-2 h-12 rounded-2xl bg-white/80 backdrop-blur-md border-white shadow-sm font-bold text-slate-700 hover:text-blue-600 hover:bg-white"
                            >
                                <ArrowLeft className="h-4 w-4" />
                                <span className="hidden sm:inline">Edit Subjects</span>
                            </Button>
                        </div>
                    </div>

                    {/* ═══════ REMINDER ALERT ═══════ */}
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }} 
                        animate={{ opacity: 1, y: 0 }} 
                        transition={{ delay: 0.1 }}
                        className="mb-8 flex items-start sm:items-center gap-4 rounded-[1.5rem] border border-amber-200/80 bg-amber-50/90 backdrop-blur-md p-4 sm:p-5 shadow-sm"
                    >
                        <div className="p-2.5 bg-amber-100 rounded-xl shrink-0 mt-0.5 sm:mt-0 shadow-sm border border-amber-200/50">
                            <AlertCircle className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                            <p className="text-sm md:text-base font-bold text-amber-900 leading-snug">
                                ข้อมูลอาจไม่ถูกต้อง 100% แต่ใช้อ้างอิงโครงสร้างหลักสูตรได้
                            </p>
                            <p className="text-xs md:text-sm font-semibold text-amber-700/90 mt-1">
                                โปรดตรวจสอบความถูกต้องของวิชาอีกครั้ง โดยเฉพาะ <span className="font-bold underline decoration-amber-400/60 underline-offset-2">วิชาเลือกทั่วไป</span> และ <span className="font-bold underline decoration-amber-400/60 underline-offset-2">วิชาเลือกเสรี</span>
                            </p>
                        </div>
                    </motion.div>

                    {/* ═══════ TOP STAT CARDS ═══════ */}
                    <div className="mb-10 grid gap-4 grid-cols-2 lg:grid-cols-4">
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}>
                            <Card className="border-0 shadow-[0_8px_30px_rgba(16,185,129,0.15)] bg-gradient-to-br from-emerald-400 to-emerald-600 text-white rounded-[2rem] overflow-hidden relative group">
                                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>
                                <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform duration-500">
                                    <CheckCircle2 className="h-24 w-24 -mr-4 -mt-4" />
                                </div>
                                <CardContent className="p-6 relative z-10">
                                    <p className="text-sm font-bold text-emerald-100 uppercase tracking-widest mb-1">Completed</p>
                                    <div className="flex items-baseline gap-2">
                                        <p className="text-5xl font-black">{data.totalCompleted}</p>
                                        <p className="text-sm font-bold text-emerald-100">credits</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
                            <Card className="border-0 shadow-[0_8px_30px_rgba(59,130,246,0.15)] bg-gradient-to-br from-blue-400 to-blue-600 text-white rounded-[2rem] overflow-hidden relative group">
                                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>
                                <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform duration-500">
                                    <Clock className="h-24 w-24 -mr-4 -mt-4" />
                                </div>
                                <CardContent className="p-6 relative z-10">
                                    <p className="text-sm font-bold text-blue-100 uppercase tracking-widest mb-1">In Progress</p>
                                    <div className="flex items-baseline gap-2">
                                        <p className="text-5xl font-black">{data.totalInProgress}</p>
                                        <p className="text-sm font-bold text-blue-100">credits</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.25 }}>
                            <Card className="border-0 shadow-[0_8px_30px_rgba(245,158,11,0.15)] bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-[2rem] overflow-hidden relative group">
                                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>
                                <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform duration-500">
                                    <GraduationCap className="h-24 w-24 -mr-4 -mt-4" />
                                </div>
                                <CardContent className="p-6 relative z-10">
                                    <p className="text-sm font-bold text-orange-100 uppercase tracking-widest mb-1">Required</p>
                                    <div className="flex items-baseline gap-2">
                                        <p className="text-5xl font-black">{data.totalRequired}</p>
                                        <p className="text-sm font-bold text-orange-100">credits</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>

                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
                            <Card className="border-0 shadow-[0_8px_30px_rgba(139,92,246,0.15)] bg-gradient-to-br from-violet-500 to-purple-600 text-white rounded-[2rem] overflow-hidden relative group">
                                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay"></div>
                                <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform duration-500">
                                    <TrendingUp className="h-24 w-24 -mr-4 -mt-4" />
                                </div>
                                <CardContent className="p-6 relative z-10">
                                    <p className="text-sm font-bold text-purple-100 uppercase tracking-widest mb-1">Progress</p>
                                    <div className="flex items-baseline gap-2">
                                        <p className="text-5xl font-black">{overallPercentage}%</p>
                                        <p className="text-sm font-bold text-purple-100">complete</p>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </div>

                    {/* ═══════ CHART & SUMMARY ═══════ */}
                    <div className="mb-10 grid gap-6 md:grid-cols-2">
                        <Card className="border border-white/60 bg-white/70 backdrop-blur-xl shadow-xl shadow-slate-200/40 rounded-[2rem] overflow-hidden">
                            <CardHeader className="bg-white/50 border-b border-slate-100/50">
                                <CardTitle className="text-xl font-bold flex items-center gap-2">
                                    <PieChart className="h-5 w-5 text-blue-500" />
                                    สรุปผลการเรียน
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6">
                                <div className="h-64 relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={chartData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={70}
                                                outerRadius={100}
                                                paddingAngle={5}
                                                dataKey="value"
                                                stroke="none"
                                            >
                                                {chartData.map((entry, i) => (
                                                    <Cell key={i} fill={entry.color} className="drop-shadow-sm" />
                                                ))}
                                            </Pie>
                                            <Tooltip 
                                                contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                                                itemStyle={{ fontWeight: 'bold' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                    {/* Center Text */}
                                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                        <span className="text-3xl font-black text-slate-800">{overallPercentage}%</span>
                                    </div>
                                </div>
                                <div className="mt-6 flex flex-wrap justify-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                    {chartData.map((entry) => (
                                        <div key={entry.name} className="flex items-center gap-2 text-sm">
                                            <div className="h-3 w-3 rounded-full shadow-sm" style={{ backgroundColor: entry.color }} />
                                            <span className="text-slate-600 font-bold">{entry.name}</span>
                                            <span className="font-mono font-black text-slate-800 bg-white px-2 py-0.5 rounded-md shadow-sm border border-slate-100">{entry.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border border-white/60 bg-white/70 backdrop-blur-xl shadow-xl shadow-slate-200/40 rounded-[2rem] overflow-hidden flex flex-col">
                            <CardHeader className="bg-white/50 border-b border-slate-100/50">
                                <CardTitle className="text-xl font-bold flex items-center gap-2">
                                    <GraduationCap className="h-5 w-5 text-indigo-500" />
                                    วิชาที่ต้องเรียนเพิ่ม
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 flex-1 flex flex-col">
                                {data.totalMissing <= 0 ? (
                                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                                        <div className="relative mb-4">
                                            <div className="absolute inset-0 bg-emerald-400 blur-xl opacity-30 rounded-full animate-pulse"></div>
                                            <CheckCircle2 className="h-20 w-20 text-emerald-500 relative z-10" />
                                        </div>
                                        <p className="text-2xl font-black text-slate-800 mb-2">Congratulations! 🎉</p>
                                        <p className="text-slate-500 font-medium">คุณเก็บหน่วยกิตครบตามหลักสูตรแล้ว</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="bg-red-50/80 border border-red-100 p-4 rounded-2xl text-slate-700 font-medium">
                                            คุณต้องเรียนเพิ่มอีก <span className="font-black text-red-600 text-lg mx-1">{Math.max(0, data.totalRequired - data.totalCompleted)}</span> หน่วยกิต
                                            {data.totalInProgress > 0 && (
                                                <div className="mt-2 flex items-center gap-2 text-sm text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-xl w-fit">
                                                    <Clock className="h-4 w-4" /> กำลังเรียน {data.totalInProgress} หน่วยกิต
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-2 overflow-y-auto max-h-[220px] pr-2 custom-scrollbar">
                                            {data.categories.filter((c) => c.completedCredits < c.requiredCredits).map((c) => (
                                                <div key={c.categoryId} className="flex items-center justify-between rounded-xl bg-white border border-slate-100 shadow-sm p-3.5 hover:shadow-md transition-shadow">
                                                    <span className="text-sm font-bold text-slate-700">{c.categoryName}</span>
                                                    <Badge variant="outline" className="font-mono bg-red-50 text-red-600 border-none font-bold">
                                                        ขาด {c.requiredCredits - c.completedCredits}
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* ═══════ CATEGORY BREAKDOWN ═══════ */}
                    <div className="flex items-center gap-3 mb-6 mt-12">
                        <Sparkles className="h-6 w-6 text-blue-500" />
                        <h2 className="text-2xl font-black text-slate-900">
                            หมวดรายวิชาในหลักสูตร
                        </h2>
                    </div>
                    
                    <div className="space-y-6">
                        {data.categories.map((category) => (
                            <CategoryCard key={category.categoryId} category={category} />
                        ))}
                    </div>

                    {/* ═══════ UNMATCHED SUBJECTS ═══════ */}
                    {data.unmatchedSubjects.length > 0 && (
                        <Card className="mt-12 border border-white/60 bg-white/70 backdrop-blur-xl shadow-xl shadow-slate-200/40 rounded-[2rem] overflow-hidden">
                            <CardHeader className="bg-slate-50/80 border-b border-slate-100/80">
                                <CardTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
                                    <AlertCircle className="h-5 w-5 text-amber-500" />
                                    รายวิชาที่ไม่ได้อยู่ในโครงสร้างหลักสูตร
                                    <Badge className="ml-2 bg-amber-100 text-amber-700 hover:bg-amber-100 border-none px-2 rounded-lg font-bold shadow-sm">
                                        {data.unmatchedSubjects.length} วิชา
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
                                <p className="mb-4 text-sm font-medium text-slate-500 bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                    💡 รายวิชาเหล่านี้อาจเป็นวิชาเลือกเสรี วิชาโท กลุ่มสาระที่เกินออกมา หรือระบบอาจจัดหมวดหมู่ไม่ได้ คุณสามารถนำไปใช้วางแผนต่อได้
                                </p>
                                <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                                    {data.unmatchedSubjects.map((s) => (
                                        <div key={s.code} className="flex flex-col justify-between bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-blue-100 transition-all">
                                            <div className="flex flex-col gap-1 mb-3">
                                                <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 w-fit px-2 py-0.5 rounded-md">{s.code}</span>
                                                <span className="font-bold text-slate-800 line-clamp-2">{s.name}</span>
                                            </div>
                                            <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                                                <Badge variant="outline" className="text-xs font-bold border-slate-200 text-slate-600 bg-slate-50">{s.credits} cr.</Badge>
                                                <Badge variant="outline" className={`text-xs font-bold border-none px-2.5 py-0.5 rounded-lg shadow-sm ${
                                                    s.status === "COMPLETED" ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-blue-700"
                                                }`}>
                                                    {s.grade || "In Progress"}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {error && (
                        <div className="mt-8 rounded-2xl bg-red-50 border border-red-100 p-5 text-sm font-bold text-red-600 shadow-sm flex items-center gap-3">
                            <AlertCircle className="h-5 w-5" />
                            {error}
                        </div>
                    )}
                </motion.div>
            </div>

            {/* ═══════ PLAN SELECTION MODAL ═══════ */}
            <Dialog open={showPlanModal} onOpenChange={setShowPlanModal}>
                <DialogContent className="sm:max-w-md rounded-[2rem] border-white/60 bg-white/90 backdrop-blur-xl shadow-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black text-slate-800">เลือกแผนการเรียนของคุณ</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-3 py-2">
                        {plans.map((plan) => (
                            <Button
                                key={plan.id}
                                variant={selectedPlanId === plan.id ? "default" : "outline"}
                                className={`justify-start h-auto py-4 px-5 rounded-2xl transition-all ${
                                    selectedPlanId === plan.id 
                                        ? "bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20" 
                                        : "hover:bg-blue-50 hover:border-blue-200 border-slate-200 bg-white"
                                }`}
                                onClick={() => handleSelectPlan(plan)}
                            >
                                <div className="text-left">
                                    <div className={`font-bold text-base ${selectedPlanId === plan.id ? "text-white" : "text-slate-800"}`}>
                                        {plan.name}
                                    </div>
                                    <div className={`text-sm font-medium mt-1 ${selectedPlanId === plan.id ? "text-blue-100" : "text-slate-500"}`}>
                                        {plan.planType === "REGULAR" ? "แผนปกติ" : "แผนสหกิจ"}
                                        {plan.trackType && (
                                            <span> • {plan.trackType === "SINGLE" ? "เอกเดี่ยว" : "เอกคู่"}</span>
                                        )}
                                    </div>
                                </div>
                            </Button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}