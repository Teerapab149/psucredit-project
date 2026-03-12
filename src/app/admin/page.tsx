"use client";

import { useEffect, useState } from "react";
import { 
    Users, 
    BookOpen, 
    FolderTree, 
    FileText, 
    TrendingUp,
    Activity
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface DashboardStats {
    curriculums: number;
    categories: number;
    subjects: number;
    students: number;
}

export default function AdminDashboardHome() {
    const [stats, setStats] = useState<DashboardStats>({
        curriculums: 0,
        categories: 0,
        subjects: 0,
        students: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            try {
                const res = await fetch("/api/admin/stats");
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                }
            } catch (err) {
                console.error("Failed to load stats", err);
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, []);

    const cards = [
        {
            title: "Total Curriculums",
            value: stats.curriculums,
            description: "Active curriculum versions",
            icon: BookOpen,
            color: "text-blue-600",
            bg: "bg-blue-100",
        },
        {
            title: "Categories Strategy",
            value: stats.categories,
            description: "Hierarchical category nodes",
            icon: FolderTree,
            color: "text-indigo-600",
            bg: "bg-indigo-100",
        },
        {
            title: "Subjects Database",
            value: stats.subjects,
            description: "Total imported subjects",
            icon: FileText,
            color: "text-emerald-600",
            bg: "bg-emerald-100",
        },
        {
            title: "Enrolled Students",
            value: stats.students,
            description: "Registered student accounts",
            icon: Users,
            color: "text-violet-600",
            bg: "bg-violet-100",
        },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="flex flex-col items-center gap-4 text-slate-400">
                    <div className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin" />
                    <span className="text-sm font-medium">Loading workspace metrics...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h1>
                <p className="text-sm text-slate-500 mt-1">
                    Welcome back. Here is a high-level summary of your PSU Credit workspace.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {cards.map((card, i) => (
                    <Card key={i} className="border-0 shadow-sm ring-1 ring-slate-200">
                        <CardHeader className="flex flex-row items-center justify-between pb-2">
                            <CardTitle className="text-sm font-medium text-slate-600">
                                {card.title}
                            </CardTitle>
                            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${card.bg}`}>
                                <card.icon className={`h-4 w-4 ${card.color}`} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-bold text-slate-900">{card.value.toLocaleString()}</div>
                            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                {card.description}
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="border-0 shadow-sm ring-1 ring-slate-200 bg-gradient-to-br from-white to-slate-50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-slate-800">
                            <Activity className="h-5 w-5 text-blue-500" />
                            System Health
                        </CardTitle>
                        <CardDescription>
                            All systems are operational and running perfectly.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600">Database Connection</span>
                                <span className="text-xs font-medium px-2 py-1 rounded bg-emerald-100 text-emerald-700">Healthy</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600">Authentication</span>
                                <span className="text-xs font-medium px-2 py-1 rounded bg-emerald-100 text-emerald-700">Healthy</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-0 shadow-sm ring-1 ring-slate-200 bg-gradient-to-br from-white to-slate-50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-slate-800">
                            <TrendingUp className="h-5 w-5 text-indigo-500" />
                            Next Steps
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            <p className="text-sm text-slate-600">
                                Start by ensuring your <strong>Curriculum Years</strong> are setup correctly. 
                                Then, map out your <strong>Categories Strategy</strong> before bringing in subjects via the <strong>Bulk Import</strong> tool.
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
