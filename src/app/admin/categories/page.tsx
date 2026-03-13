"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, FolderTree, ArrowDownRight, Layers, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Dialog,
    DialogContent,
    DialogDescription,
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
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";

interface Category {
    id: string;
    name: string;
    requiredCredits: number;
    minCredits: number | null;
    maxCredits: number | null;
    isElective: boolean;
    sortOrder: number;
    inheritedFromCategoryId: string | null;
    spilloverType: string | null;
    children?: Category[];
}

interface CurriculumYear {
    id: string;
    startYear: number | null;
    endYear: number | null;
    name: string;
    isTemplate: boolean;
    baseTemplateId: string | null;
    baseTemplate?: {
        name: string;
    };
    categories: Category[];
}

export default function CategoriesPage() {
    const [years, setYears] = useState<CurriculumYear[]>([]);
    const [selectedYearId, setSelectedYearId] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const initialCategoryState = {
        name: "",
        requiredCredits: 0,
        minCredits: 0,
        maxCredits: 0,
        isElective: false,
        parentId: null,
        sortOrder: 0,
        spilloverType: "none",
    };

    const [categoryForm, setCategoryForm] = useState<{
        id?: string;
        name: string;
        requiredCredits: number;
        minCredits: number;
        maxCredits: number;
        isElective: boolean;
        parentId: string | null;
        sortOrder: number;
        spilloverType: string;
    }>(initialCategoryState);

    const fetchYears = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/curriculum");
            if (res.ok) {
                const data = await res.json();
                setYears(data);
                if (data.length > 0 && !selectedYearId) {
                    setSelectedYearId(data[0].id);
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, [selectedYearId]);

    useEffect(() => {
        fetchYears();
    }, [fetchYears]);

    const handleDialogClose = (open: boolean) => {
        setIsDialogOpen(open);
        if (!open) {
            setCategoryForm(initialCategoryState); // Prevent stale data
        }
    };

    const openEditDialog = (category: Category) => {
        setCategoryForm({
            id: category.id,
            name: category.name,
            requiredCredits: category.requiredCredits || 0,
            minCredits: category.minCredits || 0,
            maxCredits: category.maxCredits || 0,
            isElective: category.isElective || false,
            sortOrder: category.sortOrder || 0,
            spilloverType: category.spilloverType || "none",
            parentId: null, // Will figure out later if user changes it
        });
        
        // Find parent ID logic
        const parentNode = flatCategoriesList.find(c => {
            const split = c.label.split(" / ");
            return split[split.length - 1] === category.name; // Approximation
        });
        
        // Accurate Parent Mapping:
        let parentId: string | null = null;
        if (selectedYear) {
            const findParent = (nodes: Category[], targetId: string, currentParentId: string | null = null): string | null => {
                for (let node of nodes) {
                    if (node.id === targetId) return currentParentId;
                    if (node.children) {
                        const found = findParent(node.children, targetId, node.id);
                        if (found) return found;
                    }
                }
                return null;
            };
            parentId = findParent(selectedYear.categories, category.id);
        }
        setCategoryForm((prev) => ({ ...prev, parentId }));
        setIsDialogOpen(true);
    };

    const submitCategory = async () => {
        if (!selectedYearId) return;

        const isEditing = !!categoryForm.id;
        const method = isEditing ? "PUT" : "POST";

        await fetch("/api/admin/categories", {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
                ...categoryForm, 
                curriculumYearId: selectedYearId,
                spilloverType: categoryForm.spilloverType === "none" ? null : categoryForm.spilloverType 
            }),
        });

        handleDialogClose(false);
        fetchYears();
    };

    const selectedYear = useMemo(() => years.find((y) => y.id === selectedYearId), [years, selectedYearId]);

    // Flatten logic strictly for the Parent Dropdown Selection
    const flattenCategories = useCallback((cats: Category[], prefix = ""): { id: string; label: string }[] => {
        let result: { id: string; label: string }[] = [];
        cats.forEach((c) => {
            const currentLabel = prefix ? `${prefix} / ${c.name}` : c.name;
            result.push({ id: c.id, label: currentLabel });
            if (c.children && c.children.length > 0) {
                result = result.concat(flattenCategories(c.children, currentLabel));
            }
        });
        return result;
    }, []);

    const flatCategoriesList = useMemo(() => {
        if (!selectedYear) return [];
        // Only allow parenting to faculty-owned categories (not inherited ones)
        const facultyCategories = selectedYear.categories.filter(c => !c.inheritedFromCategoryId);
        return flattenCategories(facultyCategories);
    }, [selectedYear, flattenCategories]);

    const { mergedCategories, totalCredits, totalInheritedCredits } = useMemo(() => {
        if (!selectedYear) return { mergedCategories: [], totalCredits: 0, totalInheritedCredits: 0 };
        
        const allCategories = selectedYear.categories;
        
        const total = allCategories.reduce((acc, cat) => acc + (cat.requiredCredits || 0), 0);
        const inherited = allCategories
            .filter(c => c.inheritedFromCategoryId !== null)
            .reduce((acc, cat) => acc + (cat.requiredCredits || 0), 0);
        
        return { 
            mergedCategories: allCategories, 
            totalCredits: total, 
            totalInheritedCredits: inherited 
        };
    }, [selectedYear]);

    const [isLinkedTemplateModalOpen, setIsLinkedTemplateModalOpen] = useState(false);

    // Recursive component to render the category tree beautifully
    const CategoryNode = ({ category, level = 0 }: { category: Category, level?: number }) => {
        const hasChildren = category.children && category.children.length > 0;
        
        return (
            <div className={`my-2 ${level > 0 ? "ml-6 pl-4 border-l-2 border-slate-100" : ""}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white rounded-lg border border-slate-200 shadow-sm hover:border-blue-300 transition-colors gap-3">
                    <div className="flex items-center gap-3">
                        {level > 0 && <ArrowDownRight className="h-4 w-4 text-slate-300" />}
                        {level === 0 && <Layers className="h-5 w-5 text-indigo-500" />}
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-800">{category.name}</span>
                                {category.inheritedFromCategoryId && (
                                    <Badge variant="outline" className="text-[10px] bg-slate-50 text-slate-600 border-slate-200">
                                        Inherited
                                    </Badge>
                                )}
                            </div>
                            {category.isElective && (
                                <Badge variant="secondary" className="ml-2 mt-1 text-[10px] bg-yellow-50 text-yellow-700 hover:bg-yellow-100 border-none">
                                    Elective Pool {category.spilloverType && `(${category.spilloverType})`}
                                </Badge>
                            )}
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2">
                        {category.minCredits !== null && category.minCredits > 0 && (
                            <Badge variant="outline" className="text-slate-500 bg-slate-50">Min: {category.minCredits}</Badge>
                        )}
                        {category.maxCredits !== null && category.maxCredits > 0 && (
                            <Badge variant="outline" className="text-slate-500 bg-slate-50">Max: {category.maxCredits}</Badge>
                        )}
                        {category.requiredCredits > 0 && (
                            <Badge className="bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-600/20 shadow-none hover:bg-blue-100">
                                Required: {category.requiredCredits} Cr.
                            </Badge>
                        )}
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-7 w-7 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 ml-2"
                            onClick={() => openEditDialog(category)}
                        >
                            <Pencil className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>

                {hasChildren && (
                    <div className="mt-2">
                        {category.children!.map((child) => (
                            <CategoryNode key={child.id} category={child} level={level + 1} />
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Categories Structure</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Build hierarchical course outlines like General Education, Core Subjects, and Electives.
                    </p>
                </div>
                
                <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
                    <DialogTrigger asChild>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm" disabled={!selectedYearId}>
                            <Plus className="mr-2 h-4 w-4" /> Add Node
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader className="mb-6">
                            <DialogTitle className="text-xl">
                                {categoryForm.id ? "Edit Category Node" : "Add Category Node"}
                            </DialogTitle>
                            <DialogDescription>
                                {categoryForm.id ? "Update the details for this category." : "Create a section or sub-section for the selected curriculum."}
                            </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <Label className="text-slate-700">Category Name <span className="text-red-500">*</span></Label>
                                <Input
                                    placeholder='e.g. "หมวดวิชาศึกษาทั่วไป"'
                                    value={categoryForm.name}
                                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-slate-700">Parent Category (Optional)</Label>
                                <Select
                                    value={categoryForm.parentId || "root"}
                                    onValueChange={(val) => setCategoryForm({ ...categoryForm, parentId: val === "root" ? null : val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Root Level (No Parent)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="root">-- Root Level (Top) --</SelectItem>
                                        {flatCategoriesList.map((cat) => (
                                            <SelectItem key={cat.id} value={cat.id}>
                                                {cat.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-slate-700 text-xs">Required Cr.</Label>
                                    <Input
                                        type="number"
                                        value={categoryForm.requiredCredits === 0 ? "" : categoryForm.requiredCredits}
                                        onChange={(e) => setCategoryForm({ ...categoryForm, requiredCredits: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-700 text-xs">Min Cr. (Opt.)</Label>
                                    <Input
                                        type="number"
                                        value={categoryForm.minCredits === 0 ? "" : categoryForm.minCredits}
                                        onChange={(e) => setCategoryForm({ ...categoryForm, minCredits: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-700 text-xs">Max Cr. (Opt.)</Label>
                                    <Input
                                        type="number"
                                        value={categoryForm.maxCredits === 0 ? "" : categoryForm.maxCredits}
                                        onChange={(e) => setCategoryForm({ ...categoryForm, maxCredits: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-row items-center justify-between rounded-lg border border-slate-200 p-4 bg-slate-50">
                                <div className="space-y-0.5">
                                    <Label className="text-slate-800">Elective Pool</Label>
                                    <p className="text-xs text-slate-500">
                                        Students choose subjects to fulfill credits here.
                                    </p>
                                </div>
                                <Switch
                                    checked={categoryForm.isElective}
                                    onCheckedChange={(checked) => setCategoryForm({ ...categoryForm, isElective: checked })}
                                />
                            </div>

                            {categoryForm.isElective && (
                                <div className="space-y-2 pt-2 pb-2">
                                    <Label className="text-slate-700">Credit Spillover Strategy (Match Engine)</Label>
                                    <Select
                                        value={categoryForm.spilloverType}
                                        onValueChange={(val) => setCategoryForm({ ...categoryForm, spilloverType: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="No Spillover" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">No Spillover (Explicit Match Only)</SelectItem>
                                            <SelectItem value="MINOR">Minor Subject Pool Spillover</SelectItem>
                                            <SelectItem value="FREE_ELECTIVE">Free Elective Pool Spillover (Final Bucket)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="pt-4 border-t border-slate-100">
                                <Button 
                                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm" 
                                    onClick={submitCategory} 
                                    disabled={!categoryForm.name || !selectedYearId}
                                >
                                    {categoryForm.id ? "Update Category Node" : "Save Category Node"}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {loading ? (
                <div className="flex h-48 items-center justify-center border border-slate-200 rounded-lg bg-white shadow-sm">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                        <div className="h-6 w-6 rounded-full border-2 border-slate-200 border-t-indigo-500 animate-spin" />
                        <span className="text-sm">Loading structures...</span>
                    </div>
                </div>
            ) : years.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg border border-slate-200 border-dashed shadow-sm">
                    <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <FolderTree className="h-8 w-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">No curriculums available</h3>
                    <p className="mt-1 text-sm text-slate-500 max-w-sm text-center">
                        You must create a curriculum year first before you can construct its categories.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="w-full sm:max-w-xs">
                        <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 block">
                            Target Curriculum
                        </Label>
                        <Select value={selectedYearId} onValueChange={setSelectedYearId}>
                            <SelectTrigger className="bg-white border-slate-200 font-medium">
                                <SelectValue placeholder="Select a curriculum" />
                            </SelectTrigger>
                            <SelectContent>
                                {years.map((y) => (
                                    <SelectItem key={y.id} value={y.id}>
                                        {y.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {selectedYear?.baseTemplateId && (
                        <div className="flex items-center justify-between p-4 bg-indigo-50/50 border border-indigo-100 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 rounded-md text-indigo-700">
                                    <Layers className="h-5 w-5" />
                                </div>
                                <div>
                                    <h4 className="text-sm font-semibold text-indigo-900">
                                        🔗 Linked Master Template
                                    </h4>
                                    <p className="text-xs text-indigo-700/80">
                                        This curriculum inherits GE structures ({totalInheritedCredits} Cr.)
                                    </p>
                                </div>
                            </div>
                            <div className="text-xs font-medium text-indigo-600 bg-indigo-100/50 px-2 py-1 rounded">
                                Inherited nodes are marked below
                            </div>
                        </div>
                    )}

                    <div className="bg-slate-50/50 rounded-xl border border-slate-200 p-4 sm:p-6 min-h-[400px]">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                                <FolderTree className="h-4 w-4 text-slate-400" />
                                Curriculum Canvas 
                                <span className="text-xs font-normal text-slate-400 ml-2">Total: {totalCredits} Credits</span>
                            </h3>
                        </div>

                        {mergedCategories.length > 0 ? (
                            <div className="space-y-2">
                                {mergedCategories.map((cat) => (
                                    <CategoryNode key={cat.id} category={cat} />
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
                                <Layers className="h-12 w-12 text-slate-200 mb-3" />
                                <h3 className="text-slate-500 font-medium">Tree is empty</h3>
                                <p className="text-slate-400 text-sm mt-1">Click "Add Node" to start building courses.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
