"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
    Plus,
    Trash2,
    Save,
    BookOpen,
    FolderTree,
    FileText,
    Upload,
    ChevronDown,
    ChevronRight,
    Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface CurriculumYear {
    id: string;
    year: number;
    name: string;
    faculty: string | null;
    department: string | null;
    major: string | null;
    track: string | null;
    isActive: boolean;
    categories: Category[];
}

interface Category {
    id: string;
    name: string;
    requiredCredits: number;
    isElective: boolean;
    parentId: string | null;
    sortOrder: number;
    children: Category[];
    subjects: Subject[];
}

interface Subject {
    id: string;
    code: string;
    name: string;
    credits: number;
    categoryId: string;
}

export default function AdminPage() {
    const [years, setYears] = useState<CurriculumYear[]>([]);
    const [selectedYear, setSelectedYear] = useState<string>("");
    const [loading, setLoading] = useState(true);

    // New year form
    const [newYear, setNewYear] = useState({
        year: 2566,
        name: "",
        faculty: "",
        department: "",
        major: "",
        track: "",
    });

    // New category form
    const [newCategory, setNewCategory] = useState({
        name: "",
        requiredCredits: 0,
        isElective: false,
        parentId: "",
    });

    // New subject form
    const [newSubject, setNewSubject] = useState({
        code: "",
        name: "",
        credits: 3,
        categoryId: "",
    });

    // Import
    const [importText, setImportText] = useState("");
    const [importCategoryId, setImportCategoryId] = useState("");
    const [importPreview, setImportPreview] = useState<
        { code: string; name: string; credits: number }[]
    >([]);

    const fetchYears = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/curriculum");
            if (!res.ok) {
                console.error("Failed to fetch curriculum:", res.status, res.statusText);
                setLoading(false);
                return;
            }
            const data = await res.json();
            setYears(data);
        } catch (err) {
            console.error("Error fetching curriculum:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchYears();
    }, [fetchYears]);

    const currentYear = years.find((y) => y.id === selectedYear);

    // Flatten categories for select
    const flattenCategories = (cats: Category[], prefix = ""): { id: string; label: string }[] => {
        const result: { id: string; label: string }[] = [];
        for (const cat of cats) {
            result.push({ id: cat.id, label: prefix + cat.name });
            if (cat.children) {
                result.push(...flattenCategories(cat.children, prefix + "  └ "));
            }
        }
        return result;
    };

    const allCategories = currentYear
        ? flattenCategories(currentYear.categories)
        : [];

    // Create curriculum year
    const createYear = async () => {
        await fetch("/api/admin/curriculum", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newYear),
        });
        setNewYear({ year: 2566, name: "", faculty: "", department: "", major: "", track: "" });
        fetchYears();
    };

    // Create category
    const createCategory = async () => {
        if (!selectedYear) return;
        await fetch("/api/admin/categories", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                ...newCategory,
                curriculumYearId: selectedYear,
                parentId: newCategory.parentId || null,
            }),
        });
        setNewCategory({ name: "", requiredCredits: 0, isElective: false, parentId: "" });
        fetchYears();
    };

    // Create subject
    const createSubject = async () => {
        await fetch("/api/admin/subjects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newSubject),
        });
        setNewSubject({ code: "", name: "", credits: 3, categoryId: "" });
        fetchYears();
    };

    // Delete category
    const deleteCategory = async (id: string) => {
        await fetch(`/api/admin/categories?id=${id}`, { method: "DELETE" });
        fetchYears();
    };

    // Delete subject
    const deleteSubject = async (id: string) => {
        await fetch(`/api/admin/subjects?id=${id}`, { method: "DELETE" });
        fetchYears();
    };

    // Preview import
    const previewImport = async () => {
        try {
            const res = await fetch("/api/admin/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: importText }),
            });
            if (!res.ok) {
                console.error("Import preview failed:", res.status);
                return;
            }
            const data = await res.json();
            setImportPreview(data.subjects || []);
        } catch (err) {
            console.error("Import preview error:", err);
        }
    };

    // Save import
    const saveImport = async () => {
        await fetch("/api/admin/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                text: importText,
                categoryId: importCategoryId,
                save: true,
            }),
        });
        setImportText("");
        setImportPreview([]);
        fetchYears();
    };

    // Recursive category tree component
    const CategoryTree = ({ cats, depth = 0 }: { cats: Category[]; depth?: number }) => (
        <div className={depth > 0 ? "ml-6 border-l-2 border-slate-100 pl-4" : ""}>
            {cats.map((cat) => (
                <div key={cat.id} className="mb-3">
                    <div className="flex items-center justify-between rounded-lg bg-white p-3 shadow-sm hover:shadow-md transition">
                        <div className="flex items-center gap-2">
                            {cat.children?.length > 0 ? (
                                <ChevronDown className="h-4 w-4 text-slate-400" />
                            ) : (
                                <ChevronRight className="h-4 w-4 text-slate-300" />
                            )}
                            <span className="font-medium text-slate-800">{cat.name}</span>
                            <Badge variant="outline" className="text-xs font-mono">
                                {cat.requiredCredits} cr.
                            </Badge>
                            {cat.isElective && (
                                <Badge className="text-xs bg-violet-100 text-violet-700">
                                    Elective
                                </Badge>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-xs text-slate-400 mr-2">
                                {cat.subjects?.length || 0} subjects
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteCategory(cat.id)}
                                className="text-red-400 hover:text-red-600 hover:bg-red-50"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>

                    {/* Subjects in this category */}
                    {cat.subjects?.length > 0 && (
                        <div className="ml-8 mt-1 space-y-1">
                            {cat.subjects.map((s) => (
                                <div
                                    key={s.id}
                                    className="flex items-center justify-between py-1 px-3 text-sm rounded hover:bg-slate-50 group"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono text-slate-400 text-xs">{s.code}</span>
                                        <span className="text-slate-600">{s.name}</span>
                                        <span className="text-xs text-slate-400">({s.credits} cr.)</span>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => deleteSubject(s.id)}
                                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600"
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}

                    {cat.children?.length > 0 && (
                        <CategoryTree cats={cat.children} depth={depth + 1} />
                    )}
                </div>
            ))}
        </div>
    );

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="h-8 w-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
            <div className="mx-auto max-w-6xl px-4 py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-900">
                        Admin Dashboard
                    </h1>
                    <p className="mt-1 text-slate-600">
                        Manage curriculum, categories, and subjects
                    </p>
                </div>

                <Tabs defaultValue="curriculum" className="space-y-6">
                    <TabsList className="bg-white shadow-sm">
                        <TabsTrigger value="curriculum" className="gap-2">
                            <BookOpen className="h-4 w-4" />
                            Curriculum
                        </TabsTrigger>
                        <TabsTrigger value="categories" className="gap-2">
                            <FolderTree className="h-4 w-4" />
                            Categories
                        </TabsTrigger>
                        <TabsTrigger value="subjects" className="gap-2">
                            <FileText className="h-4 w-4" />
                            Subjects
                        </TabsTrigger>
                        <TabsTrigger value="import" className="gap-2">
                            <Upload className="h-4 w-4" />
                            Bulk Import
                        </TabsTrigger>
                    </TabsList>

                    {/* Curriculum Years Tab */}
                    <TabsContent value="curriculum">
                        <div className="grid gap-6 md:grid-cols-2">
                            <Card className="border-0 shadow-md">
                                <CardHeader>
                                    <CardTitle>Add Curriculum Year</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Year (Buddhist Era)</Label>
                                        <Input
                                            type="number"
                                            value={newYear.year}
                                            onChange={(e) =>
                                                setNewYear({ ...newYear, year: parseInt(e.target.value) })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Name</Label>
                                        <Input
                                            placeholder='e.g. "หลักสูตร 2563"'
                                            value={newYear.name}
                                            onChange={(e) =>
                                                setNewYear({ ...newYear, name: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Faculty (Optional)</Label>
                                        <Input
                                            placeholder='e.g. "คณะวิทยาการจัดการ"'
                                            value={newYear.faculty}
                                            onChange={(e) =>
                                                setNewYear({ ...newYear, faculty: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Department (Optional)</Label>
                                        <Input
                                            placeholder='e.g. "ภาควิชาบริหารธุรกิจ"'
                                            value={newYear.department}
                                            onChange={(e) =>
                                                setNewYear({ ...newYear, department: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Major (Optional)</Label>
                                        <Input
                                            placeholder='e.g. "สาขาบริหารธุรกิจ"'
                                            value={newYear.major}
                                            onChange={(e) =>
                                                setNewYear({ ...newYear, major: e.target.value })
                                            }
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Track (Optional)</Label>
                                        <Input
                                            placeholder='e.g. "ระบบสารสนเทศทางธุรกิจ"'
                                            value={newYear.track}
                                            onChange={(e) =>
                                                setNewYear({ ...newYear, track: e.target.value })
                                            }
                                        />
                                    </div>
                                    <Button onClick={createYear} className="w-full bg-blue-600 hover:bg-blue-700">
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Year
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card className="border-0 shadow-md">
                                <CardHeader>
                                    <CardTitle>Existing Years</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {years.length === 0 ? (
                                        <p className="text-sm text-slate-500 text-center py-8">
                                            No curriculum years yet
                                        </p>
                                    ) : (
                                        <div className="space-y-2">
                                            {years.map((y) => (
                                                <div
                                                    key={y.id}
                                                    onClick={() => setSelectedYear(y.id)}
                                                    className={`flex items-center justify-between rounded-lg p-3 cursor-pointer transition ${selectedYear === y.id
                                                        ? "bg-blue-50 border border-blue-200"
                                                        : "bg-slate-50 hover:bg-slate-100"
                                                        }`}
                                                >
                                                    <div>
                                                        <span className="font-semibold">{y.name}</span>
                                                        <span className="ml-2 text-sm text-slate-400">
                                                            ({y.year})
                                                        </span>
                                                        {(y.faculty || y.major) && (
                                                            <div className="text-xs text-slate-500 mt-1">
                                                                {y.faculty} {y.major} {y.track && `(${y.track})`}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <Badge variant="outline">
                                                        {y.categories?.length || 0} categories
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Categories Tab */}
                    <TabsContent value="categories">
                        {!selectedYear ? (
                            <Card className="border-0 shadow-md p-8 text-center">
                                <p className="text-slate-500">
                                    Please select a curriculum year first in the Curriculum tab
                                </p>
                            </Card>
                        ) : (
                            <div className="grid gap-6 md:grid-cols-3">
                                <Card className="border-0 shadow-md md:col-span-1">
                                    <CardHeader>
                                        <CardTitle>Add Category</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Name</Label>
                                            <Input
                                                placeholder="Category name"
                                                value={newCategory.name}
                                                onChange={(e) =>
                                                    setNewCategory({ ...newCategory, name: e.target.value })
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Required Credits</Label>
                                            <Input
                                                type="number"
                                                value={newCategory.requiredCredits}
                                                onChange={(e) =>
                                                    setNewCategory({
                                                        ...newCategory,
                                                        requiredCredits: parseInt(e.target.value) || 0,
                                                    })
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Parent Category (optional)</Label>
                                            <Select
                                                value={newCategory.parentId}
                                                onValueChange={(val) =>
                                                    setNewCategory({ ...newCategory, parentId: val })
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="None (root level)" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">None (root)</SelectItem>
                                                    {allCategories.map((c) => (
                                                        <SelectItem key={c.id} value={c.id}>
                                                            {c.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="checkbox"
                                                id="isElective"
                                                checked={newCategory.isElective}
                                                onChange={(e) =>
                                                    setNewCategory({
                                                        ...newCategory,
                                                        isElective: e.target.checked,
                                                    })
                                                }
                                                className="rounded"
                                            />
                                            <Label htmlFor="isElective">Is Elective Group</Label>
                                        </div>
                                        <Button onClick={createCategory} className="w-full bg-blue-600 hover:bg-blue-700">
                                            <Plus className="mr-2 h-4 w-4" />
                                            Add Category
                                        </Button>
                                    </CardContent>
                                </Card>

                                <Card className="border-0 shadow-md md:col-span-2">
                                    <CardHeader>
                                        <CardTitle>Category Tree</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {currentYear?.categories?.length === 0 ? (
                                            <p className="text-sm text-slate-500 text-center py-8">
                                                No categories yet
                                            </p>
                                        ) : (
                                            <CategoryTree cats={currentYear?.categories || []} />
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </TabsContent>

                    {/* Subjects Tab */}
                    <TabsContent value="subjects">
                        {!selectedYear ? (
                            <Card className="border-0 shadow-md p-8 text-center">
                                <p className="text-slate-500">
                                    Please select a curriculum year first
                                </p>
                            </Card>
                        ) : (
                            <Card className="border-0 shadow-md">
                                <CardHeader>
                                    <CardTitle>Add Subject</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="grid gap-4 md:grid-cols-5">
                                        <div className="space-y-2">
                                            <Label>Code</Label>
                                            <Input
                                                placeholder="XXX-XXX"
                                                value={newSubject.code}
                                                onChange={(e) =>
                                                    setNewSubject({ ...newSubject, code: e.target.value })
                                                }
                                                className="font-mono"
                                            />
                                        </div>
                                        <div className="space-y-2 md:col-span-2">
                                            <Label>Name</Label>
                                            <Input
                                                placeholder="Subject name"
                                                value={newSubject.name}
                                                onChange={(e) =>
                                                    setNewSubject({ ...newSubject, name: e.target.value })
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Credits</Label>
                                            <Input
                                                type="number"
                                                value={newSubject.credits}
                                                onChange={(e) =>
                                                    setNewSubject({
                                                        ...newSubject,
                                                        credits: parseInt(e.target.value) || 3,
                                                    })
                                                }
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Category</Label>
                                            <Select
                                                value={newSubject.categoryId}
                                                onValueChange={(val) =>
                                                    setNewSubject({ ...newSubject, categoryId: val })
                                                }
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {allCategories.map((c) => (
                                                        <SelectItem key={c.id} value={c.id}>
                                                            {c.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    <Button
                                        onClick={createSubject}
                                        className="mt-4 bg-blue-600 hover:bg-blue-700"
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Subject
                                    </Button>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* Bulk Import Tab */}
                    <TabsContent value="import">
                        <div className="grid gap-6 md:grid-cols-2">
                            <Card className="border-0 shadow-md">
                                <CardHeader>
                                    <CardTitle>Paste Curriculum Text</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <Label>Target Category</Label>
                                        <Select
                                            value={importCategoryId}
                                            onValueChange={setImportCategoryId}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select category" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {allCategories.map((c) => (
                                                    <SelectItem key={c.id} value={c.id}>
                                                        {c.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Raw Text</Label>
                                        <Textarea
                                            placeholder={`Paste curriculum text here, one subject per line:\n\n896-101 Introduction to IS 3\n896-102 Database Systems 3\n...`}
                                            value={importText}
                                            onChange={(e) => setImportText(e.target.value)}
                                            rows={12}
                                            className="font-mono text-sm"
                                        />
                                    </div>
                                    <Button onClick={previewImport} variant="outline" className="w-full">
                                        Preview Import
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card className="border-0 shadow-md">
                                <CardHeader>
                                    <CardTitle>
                                        Preview ({importPreview.length} subjects)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {importPreview.length === 0 ? (
                                        <p className="text-sm text-slate-500 text-center py-8">
                                            Paste text and click Preview to see parsed subjects
                                        </p>
                                    ) : (
                                        <>
                                            <div className="max-h-96 overflow-y-auto space-y-1">
                                                {importPreview.map((s, i) => (
                                                    <div
                                                        key={i}
                                                        className="flex items-center justify-between rounded bg-slate-50 px-3 py-2 text-sm"
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-mono text-slate-400">
                                                                {s.code}
                                                            </span>
                                                            <span>{s.name}</span>
                                                        </div>
                                                        <span className="text-xs text-slate-400">
                                                            {s.credits} cr.
                                                        </span>
                                                    </div>
                                                ))}
                                            </div>
                                            <Button
                                                onClick={saveImport}
                                                disabled={!importCategoryId}
                                                className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700"
                                            >
                                                <Save className="mr-2 h-4 w-4" />
                                                Save {importPreview.length} Subjects to Database
                                            </Button>
                                        </>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
