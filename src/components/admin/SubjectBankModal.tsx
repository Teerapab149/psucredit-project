"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Loader2, Download } from "lucide-react";
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

interface MasterSubjectItem {
    id: string;
    code: string;
    name: string;
    credits: number;
    subjectGroup: string | null;
    tags: string[];
}

interface SubjectBankModalProps {
    isOpen: boolean;
    onClose: () => void;
    categoryId: string;
    /** Codes already present in this category — these rows will be shown as disabled */
    existingCodes?: string[];
    onSuccess: () => void;
}

export function SubjectBankModal({
    isOpen,
    onClose,
    categoryId,
    existingCodes = [],
    onSuccess,
}: SubjectBankModalProps) {
    const [catalog, setCatalog] = useState<MasterSubjectItem[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedGroup, setSelectedGroup] = useState<string>("all");
    // Selection stored by masterSubject.id (not code)
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [existingCodesInCategory, setExistingCodesInCategory] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ── Fetch catalog + existing codes when modal opens ───────────────────────
    useEffect(() => {
        if (!isOpen || !categoryId) return;

        const fetchData = async () => {
            setIsLoading(true);
            try {
                const [catalogRes, existingRes] = await Promise.all([
                    fetch("/api/admin/master-subjects"),
                    fetch(`/api/admin/categories/${categoryId}/import-subjects`),
                ]);

                if (catalogRes.ok) setCatalog(await catalogRes.json());
                else toast.error("Failed to load subject catalog");

                if (existingRes.ok) {
                    const codes: string[] = await existingRes.json();
                    setExistingCodesInCategory(new Set(codes));
                }
            } catch {
                toast.error("An error occurred while loading catalog");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
        setSelectedIds(new Set());
        setSearchQuery("");
        setSelectedGroup("all");
    }, [isOpen, categoryId]);

    // ── Derived data ─────────────────────────────────────────────────────────

    const groups = useMemo(() => {
        const seen = new Set<string>();
        catalog.forEach(s => { if (s.subjectGroup) seen.add(s.subjectGroup); });
        return Array.from(seen).sort();
    }, [catalog]);

    // Merge the prop (optional, for SSR pre-fill) with live-fetched codes
    const existingCodeSet = useMemo(
        () => new Set([...existingCodes, ...existingCodesInCategory]),
        [existingCodes, existingCodesInCategory]
    );

    const filteredCatalog = useMemo(() => {
        let list = catalog;

        if (selectedGroup !== "all") {
            list = list.filter(s =>
                selectedGroup === "__none"
                    ? !s.subjectGroup
                    : s.subjectGroup === selectedGroup
            );
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(
                s => s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q)
            );
        }

        return list;
    }, [catalog, searchQuery, selectedGroup]);

    // Only importable (not already in category)
    const importableCatalog = useMemo(
        () => filteredCatalog.filter(s => !existingCodeSet.has(s.code)),
        [filteredCatalog, existingCodeSet]
    );

    // ── Selection helpers ─────────────────────────────────────────────────────

    const toggleSelectAllFiltered = () => {
        const importableIds = importableCatalog.map(s => s.id);
        const allSelected = importableIds.every(id => selectedIds.has(id));

        const next = new Set(selectedIds);
        if (allSelected) {
            importableIds.forEach(id => next.delete(id));
        } else {
            importableIds.forEach(id => next.add(id));
        }
        setSelectedIds(next);
    };

    const toggleSubject = (id: string) => {
        const next = new Set(selectedIds);
        next.has(id) ? next.delete(id) : next.add(id);
        setSelectedIds(next);
    };

    const isAllSelected =
        importableCatalog.length > 0 &&
        importableCatalog.every(s => selectedIds.has(s.id));

    // ── Import ────────────────────────────────────────────────────────────────

    const handleImport = async () => {
        if (selectedIds.size === 0) return;

        setIsSubmitting(true);
        try {
            // Send only the IDs — the backend resolves authoritative data from the bank
            const res = await fetch(
                `/api/admin/categories/${categoryId}/import-subjects`,
                {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(Array.from(selectedIds)),
                }
            );

            if (res.ok) {
                const data = await res.json();
                if (data.count > 0) {
                    toast.success(data.message);
                } else {
                    toast.info(data.message); // all already existed — not an error
                }
                onSuccess();
                onClose();
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to import subjects");
            }
        } catch {
            toast.error("An error occurred during import");
        } finally {
            setIsSubmitting(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[700px] flex flex-col max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="text-xl flex items-center gap-2">
                        <Download className="h-5 w-5 text-blue-600" />
                        Import from Subject Bank
                    </DialogTitle>
                    <DialogDescription>
                        Select subjects from the global master catalog to clone into this category.
                        Subjects already in this category are shown as disabled.
                    </DialogDescription>
                </DialogHeader>

                {/* Filters */}
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
                            className="flex h-9 w-full sm:w-[180px] rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950"
                            value={selectedGroup}
                            onChange={(e) => setSelectedGroup(e.target.value)}
                        >
                            <option value="all">All Groups</option>
                            {groups.map(g => (
                                <option key={g} value={g}>{g}</option>
                            ))}
                            <option value="__none">(No Group)</option>
                        </select>
                        <Badge variant="outline" className="h-9 px-3 font-normal shrink-0">
                            Selected: <strong className="ml-1 text-blue-600">{selectedIds.size}</strong>
                        </Badge>
                    </div>
                </div>

                {/* Table */}
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
                                            disabled={importableCatalog.length === 0}
                                            title="Select all importable subjects"
                                        />
                                    </th>
                                    <th className="px-4 py-2 text-left font-medium text-slate-500">Code</th>
                                    <th className="px-4 py-2 text-left font-medium text-slate-500">Name</th>
                                    <th className="px-4 py-2 text-left font-medium text-slate-500">Group</th>
                                    <th className="px-4 py-2 text-center font-medium text-slate-500">Credits</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCatalog.map((subject) => {
                                    const alreadyImported = existingCodeSet.has(subject.code);
                                    const isSelected = selectedIds.has(subject.id);

                                    return (
                                        <tr
                                            key={subject.id}
                                            className={cn(
                                                "border-b transition-colors",
                                                alreadyImported
                                                    ? "opacity-40 cursor-not-allowed bg-slate-50"
                                                    : "hover:bg-slate-50 cursor-pointer",
                                                isSelected && !alreadyImported && "bg-blue-50/50"
                                            )}
                                            onClick={() => !alreadyImported && toggleSubject(subject.id)}
                                        >
                                            <td className="px-4 py-2" onClick={(e) => e.stopPropagation()}>
                                                <Checkbox
                                                    checked={isSelected}
                                                    onCheckedChange={() => !alreadyImported && toggleSubject(subject.id)}
                                                    disabled={alreadyImported}
                                                />
                                            </td>
                                            <td className="px-4 py-2 font-mono font-bold text-slate-700">
                                                {subject.code}
                                            </td>
                                            <td className="px-4 py-2 text-slate-600">
                                                {subject.name}
                                                {alreadyImported && (
                                                    <span className="ml-2 text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                                        Already in category
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-2 text-slate-500 text-xs">
                                                {subject.subjectGroup || <span className="text-slate-300">—</span>}
                                            </td>
                                            <td className="px-4 py-2 text-center text-slate-500">
                                                {subject.credits}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                <DialogFooter className="pt-4 border-t mt-4 flex justify-between items-center sm:justify-between">
                    <p className="text-xs text-slate-500 px-1">
                        Greyed-out subjects are already in this category and will not be re-imported.
                    </p>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleImport}
                            disabled={selectedIds.size === 0 || isSubmitting}
                            className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px]"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Importing...
                                </>
                            ) : (
                                `Import (${selectedIds.size})`
                            )}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
