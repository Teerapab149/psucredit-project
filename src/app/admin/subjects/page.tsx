"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Search, Database, Trash2, Edit, Tag, AlertTriangle, RefreshCw, Check, ChevronsUpDown, X, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { toast } from "sonner";
import { BulkImportModal } from "@/components/admin/BulkImportModal";

interface MasterSubject {
    id: string;
    code: string;
    name: string;
    credits: number;
    subjectGroup: string | null;
    tags: string[];
}

const emptyForm = {
    code: "",
    name: "",
    credits: 3,
    subjectGroup: "",
    tagInput: "",   // raw comma-separated input
    tags: [] as string[],
};

export default function SubjectDatabasePage() {
    const [subjects, setSubjects] = useState<MasterSubject[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [filterGroup, setFilterGroup] = useState<string>("all");

    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);
    const [isBulkOpen, setIsBulkOpen] = useState(false);
    const [unlinkedCount, setUnlinkedCount] = useState<number | null>(null);

    // Bulk Delete State
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isDeletingBulk, setIsDeletingBulk] = useState(false);

    const [form, setForm] = useState(emptyForm);

    // ── Data ──────────────────────────────────────────────────────────────────

    const fetchSubjects = useCallback(async () => {
        setLoading(true);
        try {
            const [masterRes, allSubjectsRes] = await Promise.all([
                fetch("/api/admin/master-subjects"),
                fetch("/api/admin/subjects"),
            ]);
            if (masterRes.ok) setSubjects(await masterRes.json());
            if (allSubjectsRes.ok) {
                const all: { masterSubjectId: string | null }[] = await allSubjectsRes.json();
                setUnlinkedCount(all.filter(s => !s.masterSubjectId).length);
            }
        } catch {
            toast.error("Failed to load subject bank");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchSubjects(); }, [fetchSubjects]);

    const runMigration = async () => {
        setIsMigrating(true);
        try {
            const res = await fetch("/api/admin/master-subjects/migrate", { method: "POST" });
            const data = await res.json();
            if (res.ok) {
                toast.success(data.message);
                fetchSubjects();
            } else {
                toast.error(data.error || "Migration failed");
            }
        } catch {
            toast.error("An error occurred during migration");
        } finally {
            setIsMigrating(false);
        }
    };

    // ── Derived lists ─────────────────────────────────────────────────────────

    const groups = useMemo(() => {
        const seen = new Set<string>();
        subjects.forEach(s => { if (s.subjectGroup) seen.add(s.subjectGroup); });
        return Array.from(seen).sort();
    }, [subjects]);

    const allTags = useMemo(() => {
        const seen = new Set<string>();
        subjects.forEach(s => s.tags.forEach(t => seen.add(t)));
        return Array.from(seen).sort();
    }, [subjects]);

    const [groupOpen, setGroupOpen] = useState(false);
    const [tagOpen, setTagOpen] = useState(false);
    const [tagSearch, setTagSearch] = useState("");

    const filtered = useMemo(() => {
        let list = subjects;
        if (filterGroup !== "all") {
            list = list.filter(s => (s.subjectGroup ?? "") === (filterGroup === "__none" ? "" : filterGroup));
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(s => s.code.toLowerCase().includes(q) || s.name.toLowerCase().includes(q));
        }
        return list;
    }, [subjects, filterGroup, searchQuery]);

    // ── Form helpers ──────────────────────────────────────────────────────────

    const openCreate = () => {
        setEditingId(null);
        setForm(emptyForm);
        setIsDialogOpen(true);
    };

    const openEdit = (s: MasterSubject) => {
        setEditingId(s.id);
        setForm({
            code: s.code,
            name: s.name,
            credits: s.credits,
            subjectGroup: s.subjectGroup ?? "",
            tagInput: s.tags.join(", "),
            tags: s.tags,
        });
        setIsDialogOpen(true);
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
        setEditingId(null);
        setGroupOpen(false);
        setTagOpen(false);
        setTagSearch("");
    };

    // Parse tags from tagInput on save
    const parseTags = (raw: string): string[] =>
        raw.split(",").map(t => t.trim()).filter(Boolean);

    const saveSubject = async () => {
        if (!form.code.trim() || !form.name.trim()) return;
        setIsSaving(true);
        try {
            const payload = {
                code: form.code.trim().toUpperCase(),
                name: form.name.trim(),
                credits: Number(form.credits),
                subjectGroup: form.subjectGroup.trim() || null,
                tags: form.tags,
            };

            const url = editingId
                ? `/api/admin/master-subjects/${editingId}`
                : "/api/admin/master-subjects";
            const method = editingId ? "PUT" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                toast.success(editingId ? "Subject updated" : "Subject added to bank");
                closeDialog();
                fetchSubjects();
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to save");
            }
        } catch {
            toast.error("An error occurred");
        } finally {
            setIsSaving(false);
        }
    };

    const deleteSubject = async (id: string) => {
        try {
            const res = await fetch(`/api/admin/master-subjects/${id}`, { method: "DELETE" });
            if (res.ok) {
                toast.success("Subject removed from bank");
                fetchSubjects();
            } else {
                toast.error("Failed to delete");
            }
        } catch {
            toast.error("An error occurred");
        } finally {
            setDeleteId(null);
        }
    };

    const toggleSelectAll = (ids: string[]) => {
        const allSelected = ids.length > 0 && ids.every(id => selectedIds.includes(id));
        if (allSelected) {
            setSelectedIds(selectedIds.filter(id => !ids.includes(id)));
        } else {
            const newIds = new Set([...selectedIds, ...ids]);
            setSelectedIds(Array.from(newIds));
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) return;
        setIsDeletingBulk(true);
        try {
            const res = await fetch("/api/admin/master-subjects/bulk-delete", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ids: selectedIds }),
            });
            if (res.ok) {
                toast.success(`Removed ${selectedIds.length} subjects from bank`);
                setSelectedIds([]);
                fetchSubjects();
            } else {
                toast.error("Failed to delete subjects");
            }
        } catch (err) {
            console.error(err);
            toast.error("An error occurred during bulk deletion");
        } finally {
            setIsDeletingBulk(false);
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <Database className="h-6 w-6 text-slate-400" />
                        Subject Database
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        The global master bank of all subjects. Import from here into any curriculum category.
                    </p>
                </div>
                <div className="flex gap-2">
                    {selectedIds.length > 0 && (
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="destructive" disabled={isDeletingBulk} className="shadow-sm">
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Selected ({selectedIds.length})
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Remove {selectedIds.length} subjects from Bank?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This will permanently remove the selected subjects from the global master bank. Subjects already imported into curricula will not be affected.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction 
                                        onClick={handleBulkDelete}
                                        className="bg-red-600 hover:bg-red-700 text-white"
                                    >
                                        {isDeletingBulk ? "Removing..." : "Remove All"}
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    )}
                    <Button
                        variant="outline"
                        className="border-emerald-200 text-emerald-700 hover:bg-emerald-50 shadow-sm"
                        onClick={() => setIsBulkOpen(true)}
                    >
                        <FileSpreadsheet className="mr-2 h-4 w-4" /> Bulk Import CSV
                    </Button>
                    <Button
                        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                        onClick={openCreate}
                    >
                        <Plus className="mr-2 h-4 w-4" /> Add to Bank
                    </Button>
                </div>
            </div>

            {/* Migration banner — shown only while unlinked subjects exist */}
            {unlinkedCount !== null && unlinkedCount > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-sm font-semibold text-amber-800">
                                {unlinkedCount} curriculum subject{unlinkedCount > 1 ? "s" : ""} not yet in the bank
                            </p>
                            <p className="text-xs text-amber-600 mt-0.5">
                                These subjects were added before the Master Bank system existed.
                                Run migration to bring them into the bank so they appear here and can be managed.
                            </p>
                        </div>
                    </div>
                    <Button
                        onClick={runMigration}
                        disabled={isMigrating}
                        className="bg-amber-500 hover:bg-amber-600 text-white shrink-0 shadow-sm"
                        size="sm"
                    >
                        {isMigrating ? (
                            <><RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" /> Migrating...</>
                        ) : (
                            <><RefreshCw className="mr-2 h-3.5 w-3.5" /> Migrate to Bank</>
                        )}
                    </Button>
                </div>
            )}

            {/* Table card */}
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                {/* Toolbar */}
                <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                    <div className="flex flex-col sm:flex-row gap-3 flex-1">
                        <div className="relative w-full sm:max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search by code or name..."
                                className="pl-9 bg-white border-slate-200"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Select value={filterGroup} onValueChange={setFilterGroup}>
                            <SelectTrigger className="w-full sm:w-[200px] bg-white border-slate-200">
                                <SelectValue placeholder="All Groups" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Groups</SelectItem>
                                {groups.map(g => (
                                    <SelectItem key={g} value={g}>{g}</SelectItem>
                                ))}
                                <SelectItem value="__none">(No Group)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <Badge variant="outline" className="bg-white px-3 py-1 font-normal text-slate-600 shrink-0">
                        {filtered.length} of <strong className="mx-1 text-slate-900">{subjects.length}</strong> subjects
                    </Badge>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="flex h-64 items-center justify-center">
                        <div className="flex flex-col items-center gap-2 text-slate-400">
                            <div className="h-6 w-6 rounded-full border-2 border-slate-200 border-t-emerald-500 animate-spin" />
                            <span className="text-sm">Loading bank...</span>
                        </div>
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-16 text-center">
                        <Database className="h-10 w-10 text-slate-200 mb-3" />
                        <h3 className="text-slate-700 font-semibold">Bank is empty</h3>
                        <p className="text-slate-400 text-sm mt-1">
                            {searchQuery || filterGroup !== "all"
                                ? "No subjects match your filters."
                                : "Click 'Add to Bank' to populate the global subject catalog."}
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50/50">
                                <TableRow className="hover:bg-transparent border-slate-100">
                                    <TableHead className="w-[40px] pl-4">
                                        <Checkbox 
                                            checked={filtered.length > 0 && filtered.every(s => selectedIds.includes(s.id))}
                                            onCheckedChange={() => toggleSelectAll(filtered.map(s => s.id))}
                                        />
                                    </TableHead>
                                    <TableHead className="h-10 w-[130px] text-xs font-semibold uppercase tracking-wider text-slate-500">Code</TableHead>
                                    <TableHead className="h-10 text-xs font-semibold uppercase tracking-wider text-slate-500">Name</TableHead>
                                    <TableHead className="h-10 w-[160px] text-xs font-semibold uppercase tracking-wider text-slate-500">Group</TableHead>
                                    <TableHead className="h-10 text-xs font-semibold uppercase tracking-wider text-slate-500">Tags</TableHead>
                                    <TableHead className="h-10 w-[80px] text-center text-xs font-semibold uppercase tracking-wider text-slate-500">Cr.</TableHead>
                                    <TableHead className="h-10 w-[90px] text-right pr-6 text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.map((s) => (
                                    <TableRow key={s.id} className={`hover:bg-slate-50/70 transition-colors border-slate-100 ${selectedIds.includes(s.id) ? "bg-slate-50" : ""}`}>
                                        <TableCell className="pl-4">
                                            <Checkbox 
                                                checked={selectedIds.includes(s.id)}
                                                onCheckedChange={() => toggleSelect(s.id)}
                                            />
                                        </TableCell>
                                        <TableCell className="py-3 font-mono text-[12px] font-bold text-slate-600">
                                            {s.code}
                                        </TableCell>
                                        <TableCell className="py-3 text-[13px] font-medium text-slate-800">
                                            {s.name}
                                        </TableCell>
                                        <TableCell className="py-3">
                                            {s.subjectGroup ? (
                                                <Badge variant="outline" className="text-[10px] font-normal border-indigo-100 bg-indigo-50/40 text-indigo-600">
                                                    {s.subjectGroup}
                                                </Badge>
                                            ) : (
                                                <span className="text-slate-300 text-[11px]">—</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="py-3">
                                            <div className="flex flex-wrap gap-1">
                                                {s.tags.length > 0 ? s.tags.map(tag => (
                                                    <span key={tag} className="inline-flex items-center gap-0.5 text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-sm">
                                                        <Tag className="h-2.5 w-2.5" />{tag}
                                                    </span>
                                                )) : (
                                                    <span className="text-slate-300 text-[11px]">—</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-3 text-center">
                                            <span className="font-mono text-[12px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-sm">
                                                {s.credits}
                                            </span>
                                        </TableCell>
                                        <TableCell className="py-3 pr-6 text-right space-x-1">
                                            <Button
                                                variant="ghost" size="icon"
                                                className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                                onClick={() => openEdit(s)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost" size="icon"
                                                className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                onClick={() => setDeleteId(s.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </div>

            {/* ── Create / Edit Dialog ────────────────────────────────────────── */}
            <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader className="mb-2">
                        <DialogTitle className="text-xl">
                            {editingId ? "Edit Subject" : "Add Subject to Bank"}
                        </DialogTitle>
                        <DialogDescription>
                            {editingId
                                ? "Update the master record for this subject."
                                : "Create a new entry in the global subject catalog."}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Code + Credits */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2 space-y-1.5">
                                <Label className="text-slate-700">Subject Code <span className="text-red-500">*</span></Label>
                                <Input
                                    placeholder="e.g. 315-202"
                                    value={form.code}
                                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                                    className="font-mono text-sm uppercase"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-slate-700">Credits <span className="text-red-500">*</span></Label>
                                <Input
                                    type="number"
                                    min={0}
                                    value={form.credits}
                                    onChange={(e) => setForm({ ...form, credits: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>

                        {/* Name */}
                        <div className="space-y-1.5">
                            <Label className="text-slate-700">Subject Name <span className="text-red-500">*</span></Label>
                            <Input
                                placeholder="e.g. Business Programming"
                                value={form.name}
                                onChange={(e) => setForm({ ...form, name: e.target.value })}
                            />
                        </div>

                        {/* Subject Group — creatable combobox */}
                        <div className="space-y-1.5">
                            <Label className="text-slate-700">Subject Group</Label>
                            <Popover open={groupOpen} onOpenChange={setGroupOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={groupOpen}
                                        className="w-full justify-between font-normal text-slate-700 border-slate-200"
                                    >
                                        <span className={form.subjectGroup ? "text-slate-800" : "text-slate-400"}>
                                            {form.subjectGroup || "Select or create a group…"}
                                        </span>
                                        <div className="flex items-center gap-1 ml-2 shrink-0">
                                            {form.subjectGroup && (
                                                <X
                                                    className="h-3.5 w-3.5 text-slate-400 hover:text-slate-700"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setForm({ ...form, subjectGroup: "" });
                                                    }}
                                                />
                                            )}
                                            <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400" />
                                        </div>
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                    <Command>
                                        <CommandInput placeholder="Search or type a new group…" />
                                        <CommandList>
                                            <CommandEmpty>
                                                {/* Show "create" option when input is non-empty */}
                                                <button
                                                    className="w-full text-left px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50"
                                                    onMouseDown={(e) => {
                                                        e.preventDefault();
                                                        const input = e.currentTarget.closest("[cmdk-root]")?.querySelector("input") as HTMLInputElement | null;
                                                        const val = input?.value.trim() ?? "";
                                                        if (val) {
                                                            setForm({ ...form, subjectGroup: val });
                                                            setGroupOpen(false);
                                                        }
                                                    }}
                                                >
                                                    + Create new group
                                                </button>
                                            </CommandEmpty>
                                            <CommandGroup heading="Existing groups">
                                                {groups.map((g) => (
                                                    <CommandItem
                                                        key={g}
                                                        value={g}
                                                        onSelect={() => {
                                                            setForm({ ...form, subjectGroup: g });
                                                            setGroupOpen(false);
                                                        }}
                                                    >
                                                        <Check className={`mr-2 h-3.5 w-3.5 ${form.subjectGroup === g ? "opacity-100" : "opacity-0"}`} />
                                                        {g}
                                                    </CommandItem>
                                                ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            <p className="text-[11px] text-slate-400">Used for bulk import filtering in the Bank modal.</p>
                        </div>

                        {/* Tags — multi-select creatable combobox */}
                        <div className="space-y-1.5">
                            <Label className="text-slate-700 flex items-center gap-1.5">
                                <Tag className="h-3.5 w-3.5" /> Tags
                            </Label>
                            <Popover open={tagOpen} onOpenChange={setTagOpen}>
                                <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        aria-expanded={tagOpen}
                                        className="w-full min-h-9 h-auto justify-start font-normal border-slate-200 flex-wrap gap-1 py-1.5 px-3"
                                    >
                                        {form.tags.length > 0 ? (
                                            <>
                                                {form.tags.map((t) => (
                                                    <span
                                                        key={t}
                                                        className="inline-flex items-center gap-1 text-[11px] bg-slate-100 text-slate-600 border border-slate-200 px-1.5 py-0.5 rounded"
                                                    >
                                                        {t}
                                                        <X
                                                            className="h-2.5 w-2.5 text-slate-400 hover:text-red-500 cursor-pointer"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setForm({ ...form, tags: form.tags.filter((x) => x !== t) });
                                                            }}
                                                        />
                                                    </span>
                                                ))}
                                                <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400 ml-auto shrink-0" />
                                            </>
                                        ) : (
                                            <span className="text-slate-400 text-sm flex-1 text-left">Select or type tags…</span>
                                        )}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                    <Command>
                                        <CommandInput
                                            placeholder="Search or create a tag…"
                                            value={tagSearch}
                                            onValueChange={setTagSearch}
                                        />
                                        <CommandList>
                                            <CommandEmpty>
                                                {tagSearch.trim() && (
                                                    <button
                                                        className="w-full text-left px-3 py-2 text-sm text-emerald-700 hover:bg-emerald-50"
                                                        onMouseDown={(e) => {
                                                            e.preventDefault();
                                                            const val = tagSearch.trim().toLowerCase();
                                                            if (val && !form.tags.includes(val)) {
                                                                setForm({ ...form, tags: [...form.tags, val] });
                                                            }
                                                            setTagSearch("");
                                                        }}
                                                    >
                                                        + Add "{tagSearch.trim()}"
                                                    </button>
                                                )}
                                            </CommandEmpty>
                                            <CommandGroup heading="Available tags">
                                                {allTags
                                                    .filter((t) => t.toLowerCase().includes(tagSearch.toLowerCase()))
                                                    .map((t) => (
                                                        <CommandItem
                                                            key={t}
                                                            value={t}
                                                            onSelect={() => {
                                                                setForm({
                                                                    ...form,
                                                                    tags: form.tags.includes(t)
                                                                        ? form.tags.filter((x) => x !== t)
                                                                        : [...form.tags, t],
                                                                });
                                                                setTagSearch("");
                                                            }}
                                                        >
                                                            <Check className={`mr-2 h-3.5 w-3.5 ${form.tags.includes(t) ? "opacity-100 text-emerald-600" : "opacity-0"}`} />
                                                            {t}
                                                        </CommandItem>
                                                    ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                </PopoverContent>
                            </Popover>
                            <p className="text-[11px] text-slate-400">Click to select existing tags or type to create new ones.</p>
                        </div>
                    </div>

                    <div className="pt-5 border-t border-slate-100 flex justify-end gap-3 mt-4">
                        <Button variant="outline" onClick={closeDialog}>Cancel</Button>
                        <Button
                            className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[110px]"
                            onClick={saveSubject}
                            disabled={!form.code.trim() || !form.name.trim() || isSaving}
                        >
                            {isSaving ? "Saving..." : editingId ? "Update Subject" : "Add to Bank"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Bulk Import Modal ──────────────────────────────────────────── */}
            <BulkImportModal
                isOpen={isBulkOpen}
                onClose={() => setIsBulkOpen(false)}
                onSuccess={fetchSubjects}
            />

            {/* ── Delete Confirmation ─────────────────────────────────────────── */}
            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove from Bank?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will permanently remove this subject from the global master bank.
                            Subjects already imported into curricula will not be affected.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteId && deleteSubject(deleteId)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Remove
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
