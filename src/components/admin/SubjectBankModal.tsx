"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Check, Loader2, Download } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SubjectBankItem {
    id: string;
    code: string;
    name: string;
    credits: number;
    subjectGroup?: string | null;
    tags: string[];
}

interface SubjectBankModalProps {
    isOpen: boolean;
    onClose: () => void;
    categoryId: string;
    onSuccess: () => void;
}

export function SubjectBankModal({
    isOpen,
    onClose,
    categoryId,
    onSuccess,
}: SubjectBankModalProps) {
    const [catalog, setCatalog] = useState<SubjectBankItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedGroup, setSelectedGroup] = useState<string>("all");
    const [selectedCodes, setSelectedCodes] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch catalog when modal opens
    useEffect(() => {
        if (isOpen) {
            const fetchCatalog = async () => {
                setIsLoading(true);
                try {
                    const res = await fetch("/api/admin/master-subjects");
                    if (res.ok) {
                        const data = await res.json();
                        setCatalog(data);
                    } else {
                        toast.error("Failed to load subject catalog");
                    }
                } catch (error) {
                    console.error("Catalog fetch error:", error);
                    toast.error("An error occurred while loading catalog");
                } finally {
                    setIsLoading(false);
                }
            };
            fetchCatalog();
            // Reset selection and search on open
            setSelectedCodes(new Set());
            setSearchQuery("");
            setSelectedGroup("all");
        }
    }, [isOpen]);

    const groups = useMemo(() => {
        const uniqueGroups = new Set<string>();
        catalog.forEach(s => {
            if (s.subjectGroup) uniqueGroups.add(s.subjectGroup);
        });
        return Array.from(uniqueGroups).sort();
    }, [catalog]);

    const filteredCatalog = useMemo(() => {
        let filtered = catalog;
        
        if (selectedGroup !== "all") {
            filtered = filtered.filter(s => s.subjectGroup === selectedGroup);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (s) =>
                    s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
            );
        }
        
        return filtered;
    }, [catalog, searchQuery, selectedGroup]);

    const toggleSelectAllFiltered = () => {
        const allVisibleCodes = filteredCatalog.map((s) => s.code);
        const allSelected = allVisibleCodes.every((code) =>
            selectedCodes.has(code)
        );

        const newSelection = new Set(selectedCodes);
        if (allSelected) {
            allVisibleCodes.forEach((code) => newSelection.delete(code));
        } else {
            allVisibleCodes.forEach((code) => newSelection.add(code));
        }
        setSelectedCodes(newSelection);
    };

    const toggleSubject = (code: string) => {
        const newSelection = new Set(selectedCodes);
        if (newSelection.has(code)) {
            newSelection.delete(code);
        } else {
            newSelection.add(code);
        }
        setSelectedCodes(newSelection);
    };

    const handleImport = async () => {
        if (selectedCodes.size === 0) return;

        setIsSubmitting(true);
        try {
            const subjectsToImport = catalog.filter((s) =>
                selectedCodes.has(s.code)
            );

            const res = await fetch(
                `/api/admin/categories/${categoryId}/import-subjects`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(subjectsToImport),
                }
            );

            if (res.ok) {
                const data = await res.json();
                toast.success(
                    `Successfully imported ${data.count} subjects`
                );
                onSuccess();
                onClose();
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to import subjects");
            }
        } catch (error) {
            toast.error("An error occurred during import");
        } finally {
            setIsSubmitting(false);
        }
    };

    const isAllSelected =
        filteredCatalog.length > 0 &&
        filteredCatalog.every((s) => selectedCodes.has(s.code));

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] flex flex-col max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="text-xl flex items-center gap-2">
                        <Download className="h-5 w-5 text-blue-600" />
                        Import from Subject Bank
                    </DialogTitle>
                    <DialogDescription>
                        Select existing subjects from the global database to clone into this category.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex flex-col sm:flex-row items-center gap-3 py-2">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Search by code or name..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <select 
                            className="flex h-9 w-full sm:w-[180px] rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
                            value={selectedGroup}
                            onChange={(e) => setSelectedGroup(e.target.value)}
                        >
                            <option value="all">All Groups</option>
                            {groups.map(g => (
                                <option key={g} value={g}>{g}</option>
                            ))}
                            <option value="">(No Group)</option>
                        </select>
                        <Badge variant="outline" className="h-9 px-3 font-normal shrink-0">
                            Selected: <strong className="ml-1 text-blue-600">{selectedCodes.size}</strong>
                        </Badge>
                    </div>
                </div>

                <div className="flex-1 overflow-auto border rounded-md mt-2">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center h-64 gap-2 text-slate-400">
                            <Loader2 className="h-8 w-8 animate-spin" />
                            <span>Loading subject bank...</span>
                        </div>
                    ) : filteredCatalog.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                            <p>No subjects found.</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 sticky top-0 z-10">
                                <tr className="border-b">
                                    <th className="w-10 px-4 py-2 text-left">
                                        <Checkbox
                                            checked={isAllSelected}
                                            onCheckedChange={toggleSelectAllFiltered}
                                        />
                                    </th>
                                    <th className="px-4 py-2 text-left font-medium text-slate-500">Code</th>
                                    <th className="px-4 py-2 text-left font-medium text-slate-500">Name</th>
                                    <th className="px-4 py-2 text-left font-medium text-slate-500">Group</th>
                                    <th className="px-4 py-2 text-center font-medium text-slate-500">Credits</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCatalog.map((subject) => (
                                    <tr
                                        key={subject.code}
                                        className={cn(
                                            "border-b hover:bg-slate-50 cursor-pointer",
                                            selectedCodes.has(subject.code) && "bg-blue-50/50"
                                        )}
                                        onClick={() => toggleSubject(subject.code)}
                                    >
                                        <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                                            <Checkbox
                                                checked={selectedCodes.has(subject.code)}
                                                onCheckedChange={() => toggleSubject(subject.code)}
                                            />
                                        </td>
                                        <td className="px-4 py-2 font-mono font-bold text-slate-700">
                                            {subject.code}
                                        </td>
                                        <td className="px-4 py-2 text-slate-600">
                                            {subject.name}
                                        </td>
                                        <td className="px-4 py-2 text-slate-500 text-xs text-left">
                                            {subject.subjectGroup || <span className="text-slate-300">-</span>}
                                        </td>
                                        <td className="px-4 py-2 text-center text-slate-500">
                                            {subject.credits}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                <DialogFooter className="pt-4 border-t mt-4 flex justify-between items-center sm:justify-between">
                    <p className="text-xs text-slate-500 px-1">
                        Subjects that already exist in this category will be skipped.
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleImport}
                            disabled={selectedCodes.size === 0 || isSubmitting}
                            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[100px]"
                        >
                            {isSubmitting ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                `Import (${selectedCodes.size})`
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
