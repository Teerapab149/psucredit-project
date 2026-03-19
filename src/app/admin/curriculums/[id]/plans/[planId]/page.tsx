"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface Category {
    id: string;
    name: string;
    requiredCredits: number;
    parentId: string | null;
}

interface PlanRequirement {
    categoryId: string;
    requiredCredits: number;
}

export default function PlanCreditsPage() {
    const params = useParams();
    const router = useRouter();
    const curriculumId = params.id as string;
    const planId = params.planId as string;

    const [categories, setCategories] = useState<Category[]>([]);
    const [requirements, setRequirements] = useState<Map<string, number>>(new Map());
    const [overrides, setOverrides] = useState<Map<string, string>>(new Map());
    const [planName, setPlanName] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            const [catRes, reqRes, planRes] = await Promise.all([
                fetch(`/api/admin/categories?yearId=${curriculumId}`),
                fetch(`/api/admin/curriculum-plans/${planId}/requirements`),
                fetch(`/api/admin/curriculum-plans/${planId}`),
            ]);

            if (catRes.ok) {
                const cats: Category[] = await catRes.json();
                setCategories(cats);
            }

            if (reqRes.ok) {
                const reqs: PlanRequirement[] = await reqRes.json();
                const reqMap = new Map<string, number>();
                const overrideMap = new Map<string, string>();
                for (const r of reqs) {
                    reqMap.set(r.categoryId, r.requiredCredits);
                    overrideMap.set(r.categoryId, String(r.requiredCredits));
                }
                setRequirements(reqMap);
                setOverrides(overrideMap);
            }

            if (planRes.ok) {
                const plan = await planRes.json();
                setPlanName(plan.name);
            }
        } catch {
            // ignore
        } finally {
            setLoading(false);
        }
    }, [curriculumId, planId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handleOverrideChange = (categoryId: string, value: string) => {
        setOverrides((prev) => {
            const next = new Map(prev);
            if (value === "") {
                next.delete(categoryId);
            } else {
                next.set(categoryId, value);
            }
            return next;
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const entries: { categoryId: string; requiredCredits: number }[] = [];
            for (const [categoryId, value] of overrides) {
                const credits = parseInt(value, 10);
                if (!isNaN(credits)) {
                    entries.push({ categoryId, requiredCredits: credits });
                }
            }

            const res = await fetch(`/api/admin/curriculum-plans/${planId}/requirements`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ requirements: entries }),
            });

            if (res.ok) {
                toast.success("Plan credit overrides saved successfully");
                fetchData();
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to save overrides");
            }
        } catch (err) {
            console.error("Save error:", err);
            toast.error("An error occurred while saving");
        } finally {
            setSaving(false);
        }
    };

    // Build indented category list
    const rootCategories = categories.filter((c) => !c.parentId);
    const getChildren = (parentId: string): Category[] =>
        categories.filter((c) => c.parentId === parentId);

    const renderRow = (cat: Category, depth: number): React.ReactNode[] => {
        const hasOverride = overrides.has(cat.id);
        const overrideValue = overrides.get(cat.id);
        const effectiveCredits = hasOverride ? parseInt(overrideValue!, 10) : cat.requiredCredits;
        const isChanged = hasOverride && effectiveCredits !== cat.requiredCredits;
        const children = getChildren(cat.id);

        return [
            <TableRow key={cat.id}>
                <TableCell>
                    <span style={{ paddingLeft: depth * 20 }} className="flex items-center gap-2">
                        {cat.name}
                        {isChanged && (
                            <Badge className="text-xs bg-amber-100 text-amber-700 border-amber-200">
                                override
                            </Badge>
                        )}
                    </span>
                </TableCell>
                <TableCell className="text-center font-mono text-sm">
                    {isChanged ? (
                        <span className="flex items-center justify-center gap-1.5">
                            <span className="text-slate-300 line-through">{cat.requiredCredits}</span>
                            <span className="text-amber-700 font-bold">{effectiveCredits}</span>
                        </span>
                    ) : (
                        <span className="text-slate-500">{cat.requiredCredits}</span>
                    )}
                </TableCell>
                <TableCell className="w-32">
                    <Input
                        type="number"
                        min={0}
                        placeholder={String(cat.requiredCredits)}
                        value={overrides.get(cat.id) ?? ""}
                        onChange={(e) => handleOverrideChange(cat.id, e.target.value)}
                        className={`h-8 text-center font-mono ${hasOverride ? "border-amber-300 bg-amber-50" : ""}`}
                    />
                </TableCell>
            </TableRow>,
            ...children.flatMap((child) => renderRow(child, depth + 1)),
        ];
    };

    if (loading) {
        return <div className="p-8 text-center text-slate-500">Loading...</div>;
    }

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push(`/admin/curriculums/${curriculumId}/plans`)}
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">{planName}</h1>
                    <p className="text-sm text-slate-500">
                        Set credit requirements per category. Leave blank to use the default.
                    </p>
                </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-center w-24">Credits</TableHead>
                            <TableHead className="text-center w-32">Override</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {rootCategories.flatMap((cat) => renderRow(cat, 0))}
                    </TableBody>
                </Table>
            </div>

            <div className="mt-4 flex justify-end">
                <Button onClick={handleSave} disabled={saving} className="gap-2">
                    <Save className="h-4 w-4" />
                    {saving ? "Saving..." : "Save Changes"}
                </Button>
            </div>
        </div>
    );
}
