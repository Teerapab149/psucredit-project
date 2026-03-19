"use client";

import { useState, useRef } from "react";
import Papa from "papaparse";
import { Upload, FileSpreadsheet, Loader2 } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface ParsedRow {
    code: string;
    name: string;
    credits: string | number;
    subjectGroup?: string;
    tags?: string;
}

interface BulkImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function BulkImportModal({ isOpen, onClose, onSuccess }: BulkImportModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState("");
    const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
    const [fallbackGroup, setFallbackGroup] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const reset = () => {
        setFileName("");
        setParsedData([]);
        setFallbackGroup("");
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleClose = () => {
        reset();
        onClose();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setFileName(file.name);

        Papa.parse<ParsedRow>(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.errors.length > 0) {
                    toast.error(`CSV parse error: ${results.errors[0].message}`);
                    return;
                }

                const rows = results.data.filter(
                    (row) => row.code?.trim() && row.name?.trim() && row.credits != null
                );

                if (rows.length === 0) {
                    toast.error("No valid rows found. Expected headers: code, name, credits");
                    setParsedData([]);
                    return;
                }

                setParsedData(rows);
                toast.success(`Parsed ${rows.length} row(s) from CSV`);
            },
            error: (err) => {
                toast.error(`Failed to read file: ${err.message}`);
            },
        });
    };

    const handleSubmit = async () => {
        if (parsedData.length === 0) return;

        setIsSubmitting(true);
        try {
            const subjects = parsedData.map((row) => ({
                code: row.code.trim(),
                name: row.name.trim(),
                credits: parseInt(String(row.credits), 10),
                subjectGroup: row.subjectGroup?.trim() || fallbackGroup.trim() || null,
                tags: row.tags
                    ? row.tags.split(",").map((t) => t.trim()).filter(Boolean)
                    : [],
            }));

            const res = await fetch("/api/admin/master-subjects/bulk", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ subjects }),
            });

            const data = await res.json();

            if (res.ok) {
                toast.success(data.message || `${data.count} subject(s) imported`);
                onSuccess();
                handleClose();
            } else {
                toast.error(data.error || "Import failed");
            }
        } catch {
            toast.error("An error occurred during import");
        } finally {
            setIsSubmitting(false);
        }
    };

    const previewRows = parsedData.slice(0, 5);

    return (
        <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
            <DialogContent className="sm:max-w-[700px] flex flex-col max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle className="text-xl flex items-center gap-2">
                        <FileSpreadsheet className="h-5 w-5 text-emerald-600" />
                        Bulk Import CSV
                    </DialogTitle>
                    <DialogDescription>
                        Upload a CSV file to import subjects into the master bank.
                        Expected headers: <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">code</code>,{" "}
                        <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">name</code>,{" "}
                        <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">credits</code>,{" "}
                        <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">subjectGroup</code> (optional),{" "}
                        <code className="text-xs bg-slate-100 px-1 py-0.5 rounded">tags</code> (optional, comma-separated).
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* File input */}
                    <div className="space-y-1.5">
                        <Label className="text-slate-700">CSV File</Label>
                        <div className="flex gap-3">
                            <Input
                                ref={fileInputRef}
                                type="file"
                                accept=".csv"
                                onChange={handleFileChange}
                                className="cursor-pointer file:mr-3 file:px-3 file:py-1 file:rounded file:border-0 file:bg-emerald-50 file:text-emerald-700 file:text-sm file:font-medium hover:file:bg-emerald-100"
                            />
                        </div>
                        {fileName && (
                            <p className="text-xs text-slate-500">
                                File: {fileName} — {parsedData.length} valid row(s) found
                            </p>
                        )}
                    </div>

                    {/* Fallback group */}
                    <div className="space-y-1.5">
                        <Label className="text-slate-700">Fallback Subject Group</Label>
                        <Input
                            placeholder="e.g. Faculty of Engineering"
                            value={fallbackGroup}
                            onChange={(e) => setFallbackGroup(e.target.value)}
                        />
                        <p className="text-[11px] text-slate-400">
                            Applied to rows where the <code>subjectGroup</code> column is empty or missing.
                        </p>
                    </div>

                    {/* Preview table */}
                    {previewRows.length > 0 && (
                        <div className="space-y-1.5">
                            <Label className="text-slate-700">
                                Preview (first {previewRows.length} of {parsedData.length} rows)
                            </Label>
                            <div className="border rounded-md overflow-auto max-h-[240px]">
                                <Table>
                                    <TableHeader className="bg-slate-50">
                                        <TableRow className="border-slate-100">
                                            <TableHead className="h-9 text-xs font-semibold text-slate-500">Code</TableHead>
                                            <TableHead className="h-9 text-xs font-semibold text-slate-500">Name</TableHead>
                                            <TableHead className="h-9 text-xs font-semibold text-slate-500 text-center w-[70px]">Credits</TableHead>
                                            <TableHead className="h-9 text-xs font-semibold text-slate-500">Group</TableHead>
                                            <TableHead className="h-9 text-xs font-semibold text-slate-500">Tags</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {previewRows.map((row, i) => (
                                            <TableRow key={i} className="border-slate-100">
                                                <TableCell className="py-2 font-mono text-xs font-bold text-slate-600">
                                                    {row.code}
                                                </TableCell>
                                                <TableCell className="py-2 text-xs text-slate-700">
                                                    {row.name}
                                                </TableCell>
                                                <TableCell className="py-2 text-xs text-center text-slate-600">
                                                    {row.credits}
                                                </TableCell>
                                                <TableCell className="py-2 text-xs text-slate-500">
                                                    {row.subjectGroup?.trim() || (
                                                        fallbackGroup.trim() ? (
                                                            <span className="text-emerald-600 italic">{fallbackGroup}</span>
                                                        ) : (
                                                            <span className="text-slate-300">—</span>
                                                        )
                                                    )}
                                                </TableCell>
                                                <TableCell className="py-2 text-xs text-slate-500">
                                                    {row.tags || <span className="text-slate-300">—</span>}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="pt-4 border-t mt-2">
                    <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={parsedData.length === 0 || isSubmitting}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[140px]"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Importing...
                            </>
                        ) : (
                            <>
                                <Upload className="mr-2 h-4 w-4" />
                                Import {parsedData.length} Subject{parsedData.length !== 1 ? "s" : ""}
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
