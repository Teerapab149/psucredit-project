"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Upload, AlertCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Category {
    id: string;
    name: string;
    children?: Category[];
}

interface CurriculumYear {
    id: string;
    startYear: number | null;
    name: string;
    categories: Category[];
}

export default function BulkImportPage() {
    const [years, setYears] = useState<CurriculumYear[]>([]);
    const [rawText, setRawText] = useState("");
    const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
    const [importStatus, setImportStatus] = useState<string | null>(null);
    const [isImporting, setIsImporting] = useState(false);

    const fetchYears = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/curriculum");
            if (res.ok) {
                setYears(await res.json());
            }
        } catch (err) {
            console.error(err);
        }
    }, []);

    useEffect(() => {
        fetchYears();
    }, [fetchYears]);

    // Flatten logic for the category dropdown
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

    const allCategoriesFlat = useMemo(() => {
        let all: { id: string; label: string, yearName: string }[] = [];
        years.forEach(year => {
            const yearLabel = `${year.name} ${year.startYear ? `(${year.startYear})` : ''}`;
            const flatCats = flattenCategories(year.categories);
            all = all.concat(flatCats.map(c => ({ ...c, yearName: yearLabel })));
        });
        return all;
    }, [years, flattenCategories]);

    const handleBulkImport = async () => {
        if (!selectedCategoryId || !rawText.trim()) return;
        
        setIsImporting(true);
        setImportStatus(null);
        
        try {
            const res = await fetch("/api/admin/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    categoryId: selectedCategoryId,
                    rawText: rawText,
                }),
            });

            const data = await res.json();
            
            if (res.ok) {
                setImportStatus(`Successfully imported ${data.count} subjects.`);
                setRawText("");
            } else {
                setImportStatus(`Error: ${data.error || "Failed to import subjects"}`);
            }
        } catch (err) {
            console.error(err);
            setImportStatus("A network error occurred during import.");
        } finally {
            setIsImporting(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-4xl mx-auto">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Bulk Import Subjects</h1>
                <p className="text-sm text-slate-500 mt-1">
                    Paste text copied directly from a PDF curriculum document to automatically parse and import course data.
                </p>
            </div>

            <Card className="border-0 shadow-sm ring-1 ring-slate-200">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                        <FileText className="h-5 w-5 text-indigo-500" />
                        PDF Data Extraction
                    </CardTitle>
                    <CardDescription>
                        The intelligent parser looks for the standard university format: <code className="bg-slate-100 text-slate-700 px-1 py-0.5 rounded text-xs">[CODE] [NAME] [CREDITS]</code>.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-6">
                    <div className="space-y-3">
                        <Label className="text-slate-700 text-base font-medium">1. Select Target Category <span className="text-red-500">*</span></Label>
                        <p className="text-sm text-slate-500">Choose where these imported subjects should be mapped.</p>
                        <Select
                            value={selectedCategoryId}
                            onValueChange={setSelectedCategoryId}
                        >
                            <SelectTrigger className="w-full sm:max-w-md bg-white border-slate-200">
                                <SelectValue placeholder="Select a category..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-[300px]">
                                {allCategoriesFlat.length === 0 ? (
                                    <div className="p-2 text-sm text-slate-500 text-center">No categories exist yet.</div>
                                ) : (
                                    allCategoriesFlat.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id} className="py-2 inline-flex flex-col items-start gap-1">
                                            <span className="font-medium">{cat.label}</span>
                                            <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                {cat.yearName}
                                            </span>
                                        </SelectItem>
                                    ))
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-slate-100">
                        <Label className="text-slate-700 text-base font-medium">2. Paste Curriculum Text <span className="text-red-500">*</span></Label>
                        <div className="bg-amber-50 rounded-md p-3 border border-amber-200 flex items-start gap-3">
                            <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                            <div className="text-sm text-amber-800">
                                <p className="font-medium mb-1">Supported Format Example:</p>
                                <p className="font-mono text-xs opacity-80">315-101 Business Programming 3(2-2-5)<br/>315-102 Introduction to Business 3(3-0-6)</p>
                            </div>
                        </div>
                        <Textarea
                            placeholder="Paste your PDF text here..."
                            className="min-h-[250px] font-mono text-sm bg-white border-slate-200 focus-visible:ring-indigo-500"
                            value={rawText}
                            onChange={(e) => setRawText(e.target.value)}
                        />
                    </div>

                    {importStatus && (
                        <Alert className={importStatus.includes("Error") ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}>
                            <AlertTitle>{importStatus.includes("Error") ? "Import Failed" : "Success"}</AlertTitle>
                            <AlertDescription>{importStatus}</AlertDescription>
                        </Alert>
                    )}

                    <div className="pt-2 flex justify-end">
                        <Button 
                            className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[200px]" 
                            onClick={handleBulkImport}
                            disabled={!selectedCategoryId || !rawText.trim() || isImporting}
                        >
                            {isImporting ? (
                                <>
                                    <div className="h-4 w-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    <Upload className="mr-2 h-4 w-4" /> Run Bulk Import
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
