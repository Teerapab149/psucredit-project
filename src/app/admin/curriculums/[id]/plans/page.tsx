"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Plus, Settings2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface CurriculumPlan {
    id: string;
    name: string;
    planType: string;
    trackType: string | null;
    curriculumYearId: string;
}

export default function PlansPage() {
    const params = useParams();
    const curriculumId = params.id as string;

    const [plans, setPlans] = useState<CurriculumPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [formName, setFormName] = useState("");
    const [formPlanType, setFormPlanType] = useState<string>("REGULAR");
    const [formTrackType, setFormTrackType] = useState<string>("");
    const [saving, setSaving] = useState(false);

    const fetchPlans = useCallback(async () => {
        try {
            const res = await fetch(`/api/admin/curriculum-plans?curriculumYearId=${curriculumId}`);
            if (res.ok) {
                setPlans(await res.json());
            }
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    }, [curriculumId]);

    useEffect(() => { fetchPlans(); }, [fetchPlans]);

    const handleCreate = async () => {
        setSaving(true);
        try {
            const res = await fetch("/api/admin/curriculum-plans", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: formName,
                    planType: formPlanType,
                    trackType: formTrackType || null,
                    curriculumYearId: curriculumId,
                }),
            });
            if (res.ok) {
                setFormName("");
                setFormPlanType("REGULAR");
                setFormTrackType("");
                setShowForm(false);
                fetchPlans();
            }
        } catch {
            // ignore
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (planId: string) => {
        if (!confirm("ลบแผนการเรียนนี้?")) return;
        try {
            await fetch(`/api/admin/curriculum-plans/${planId}`, { method: "DELETE" });
            fetchPlans();
        } catch {
            // ignore
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading...</div>;
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold">Manage Plans</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Curriculum plans with per-category credit overrides
                    </p>
                </div>
                <Button onClick={() => setShowForm(!showForm)} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Plan
                </Button>
            </div>

            {showForm && (
                <Card className="mb-6">
                    <CardContent className="p-4 space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <Label>Plan Name</Label>
                                <Input
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder="e.g. แผนปกติ เดี่ยว"
                                />
                            </div>
                            <div>
                                <Label>Plan Type</Label>
                                <Select value={formPlanType} onValueChange={setFormPlanType}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="REGULAR">REGULAR (แผนปกติ)</SelectItem>
                                        <SelectItem value="COOP">COOP (แผนสหกิจ)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Track Type (optional)</Label>
                                <Select value={formTrackType} onValueChange={setFormTrackType}>
                                    <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">None</SelectItem>
                                        <SelectItem value="SINGLE">SINGLE (เอกเดี่ยว)</SelectItem>
                                        <SelectItem value="DUAL">DUAL (เอกคู่)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={handleCreate} disabled={!formName || saving}>
                                {saving ? "Saving..." : "Create"}
                            </Button>
                            <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2">
                {plans.map((plan) => (
                    <Card key={plan.id} className="relative">
                        <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                                <CardTitle className="text-lg">{plan.name}</CardTitle>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-500 hover:text-red-700"
                                    onClick={() => handleDelete(plan.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="pt-0">
                            <div className="flex gap-2 mb-4">
                                <Badge variant="outline">
                                    {plan.planType === "REGULAR" ? "แผนปกติ" : "แผนสหกิจ"}
                                </Badge>
                                {plan.trackType && (
                                    <Badge variant="outline">
                                        {plan.trackType === "SINGLE" ? "เอกเดี่ยว" : "เอกคู่"}
                                    </Badge>
                                )}
                            </div>
                            <Link href={`/admin/curriculums/${curriculumId}/plans/${plan.id}`}>
                                <Button variant="outline" size="sm" className="gap-2 w-full">
                                    <Settings2 className="h-4 w-4" />
                                    Manage Credits
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {plans.length === 0 && !showForm && (
                <div className="text-center py-12 text-slate-400">
                    No plans yet. Click &quot;Add Plan&quot; to create one.
                </div>
            )}
        </div>
    );
}
