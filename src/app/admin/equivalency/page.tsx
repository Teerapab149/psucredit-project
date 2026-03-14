"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, RefreshCw, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
} from "@/components/ui/alert-dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";

interface SubjectEquivalency {
    id: string;
    newCode: string;
    baseCode: string;
    createdAt: string;
}

export default function EquivalencyPage() {
    const [equivalencies, setEquivalencies] = useState<SubjectEquivalency[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isAutoMapping, setIsAutoMapping] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [newMapping, setNewMapping] = useState({
        newCode: "",
        baseCode: "",
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/equivalency");
            if (res.ok) {
                const data = await res.json();
                setEquivalencies(data);
            }
        } catch (err) {
            console.error(err);
            toast.error("Failed to fetch equivalencies");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAddMapping = async () => {
        if (!newMapping.newCode || !newMapping.baseCode) return;

        try {
            const res = await fetch("/api/admin/equivalency", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newMapping),
            });

            if (res.ok) {
                toast.success("Mapping added successfully");
                setIsDialogOpen(false);
                setNewMapping({ newCode: "", baseCode: "" });
                fetchData();
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to add mapping");
            }
        } catch (err) {
            toast.error("An error occurred");
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/admin/equivalency/${id}`, {
                method: "DELETE",
            });

            if (res.ok) {
                toast.success("Mapping deleted");
                fetchData();
            } else {
                toast.error("Failed to delete mapping");
            }
        } catch (err) {
            toast.error("An error occurred");
        } finally {
            setDeleteId(null);
        }
    };

    const handleAutoMap = async () => {
        setIsAutoMapping(true);
        try {
            const res = await fetch("/api/admin/equivalency/auto-map", {
                method: "POST",
            });

            if (res.ok) {
                const data = await res.json();
                toast.success(`Auto-map complete: ${data.count} mappings created`);
                fetchData();
            } else {
                toast.error("Auto-map failed");
            }
        } catch (err) {
            toast.error("An error occurred during auto-mapping");
        } finally {
            setIsAutoMapping(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Subject Equivalency</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Map new subject codes (with suffixes) to their base curriculum codes.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={handleAutoMap}
                        disabled={isAutoMapping}
                        className="border-slate-200 hover:bg-slate-50"
                    >
                        <RefreshCw className={`mr-2 h-4 w-4 ${isAutoMapping ? "animate-spin" : ""}`} />
                        {isAutoMapping ? "Mapping..." : "Auto-Map by 7 Digits"}
                    </Button>

                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                <Plus className="mr-2 h-4 w-4" /> Add Mapping
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[425px]">
                            <DialogHeader>
                                <DialogTitle>Add Manual Mapping</DialogTitle>
                                <DialogDescription>
                                    Create a link between a new subject code and its base version.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="newCode">New Code (with suffix)</Label>
                                    <Input
                                        id="newCode"
                                        placeholder="e.g., 315-202G2B"
                                        value={newMapping.newCode}
                                        onChange={(e) => setNewMapping({ ...newMapping, newCode: e.target.value.toUpperCase() })}
                                        className="font-mono"
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="baseCode">Base Code (7 digits)</Label>
                                    <Input
                                        id="baseCode"
                                        placeholder="e.g., 315-202"
                                        value={newMapping.baseCode}
                                        onChange={(e) => setNewMapping({ ...newMapping, baseCode: e.target.value.toUpperCase() })}
                                        className="font-mono"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3">
                                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                <Button
                                    onClick={handleAddMapping}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                    disabled={!newMapping.newCode || !newMapping.baseCode}
                                >
                                    Save Mapping
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="w-[40%]">New Code</TableHead>
                            <TableHead className="w-[10%] text-center"></TableHead>
                            <TableHead className="w-[40%]">Base Code</TableHead>
                            <TableHead className="w-[10%] text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="h-5 w-5 rounded-full border-2 border-slate-200 border-t-emerald-500 animate-spin" />
                                        <span>Loading mappings...</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : equivalencies.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-32 text-center text-slate-500">
                                    No mappings found. Click "Auto-Map" to scan for suffixes or add one manually.
                                </TableCell>
                            </TableRow>
                        ) : (
                            equivalencies.map((eq) => (
                                <TableRow key={eq.id}>
                                    <TableCell className="font-mono font-bold text-slate-700">{eq.newCode}</TableCell>
                                    <TableCell className="text-center">
                                        <ArrowLeftRight className="h-4 w-4 text-slate-300 inline" />
                                    </TableCell>
                                    <TableCell className="font-mono font-bold text-emerald-600">{eq.baseCode}</TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => setDeleteId(eq.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Mapping?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will remove the equivalency rule. Future matching for this code will use literally without mapping.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="flex justify-end gap-3">
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteId && handleDelete(deleteId)}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Delete
                        </AlertDialogAction>
                    </div>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
