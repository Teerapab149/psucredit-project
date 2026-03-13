"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Calendar, Trash2, Copy, AlertCircle, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from "@/components/ui/sheet";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
import { useSearchParams, useRouter } from "next/navigation";
import { toast } from "sonner";

interface CurriculumYear {
    id: string;
    startYear: number | null;
    endYear: number | null;
    name: string;
    faculty: string | null;
    department: string | null;
    major: string | null;
    track: string | null;
    isActive: boolean;
    baseTemplateId?: string | null;
}

export default function CurriculumsPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentTab = searchParams.get("type") || "template";

    const [years, setYears] = useState<CurriculumYear[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    // State for Clone Feature
    const [isCloneDialogOpen, setIsCloneDialogOpen] = useState(false);
    const [sourceCurriculumId, setSourceCurriculumId] = useState<string | null>(null);
    const [cloneError, setCloneError] = useState<string | null>(null);
    const [isCloning, setIsCloning] = useState(false);

    const initialCurriculumState = {
        startYear: "" as number | "",
        endYear: "" as number | "",
        name: "",
        faculty: "",
        department: "",
        major: "",
        track: "",
        baseTemplateId: null as string | null,
        isTemplate: currentTab === "template",
    };

    const [curriculumForm, setCurriculumForm] = useState<{
        id?: string;
        startYear: number | "";
        endYear: number | "";
        name: string;
        faculty: string;
        department: string;
        major: string;
        track: string;
        baseTemplateId: string | null;
        isTemplate: boolean;
    }>(initialCurriculumState);

    const fetchYears = useCallback(async () => {
        try {
            const res = await fetch("/api/admin/curriculum");
            if (res.ok) {
                const data = await res.json();
                setYears(data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchYears();
    }, [fetchYears]);

    const handleSheetClose = (open: boolean) => {
        setIsSheetOpen(open);
        if (!open) {
            setCurriculumForm(initialCurriculumState); // Prevent stale data
        }
    };

    const submitCurriculum = async () => {
        const isEditing = !!curriculumForm.id;
        const method = isEditing ? "PUT" : "POST";

        await fetch("/api/admin/curriculum", {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(curriculumForm),
        });

        handleSheetClose(false);
        fetchYears();
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/admin/curriculum?id=${id}`, {
                method: "DELETE",
            });
            if (res.ok) {
                toast.success("Curriculum deleted successfully");
                fetchYears();
            } else {
                toast.error("Failed to delete curriculum");
            }
        } catch (err) {
            console.error(err);
            toast.error("An error occurred while deleting");
        }
    };

    const openEditDialog = (curriculum: CurriculumYear & { isTemplate?: boolean }) => {
        setCurriculumForm({
            id: curriculum.id,
            name: curriculum.name,
            startYear: curriculum.startYear || "",
            endYear: curriculum.endYear || "",
            faculty: curriculum.faculty || "",
            department: curriculum.department || "",
            major: curriculum.major || "",
            track: curriculum.track || "",
            baseTemplateId: curriculum.baseTemplateId || null,
            isTemplate: curriculum.isTemplate || false,
        });
        setIsSheetOpen(true);
    };

    const openCloneDialog = (source: CurriculumYear) => {
        setSourceCurriculumId(source.id);
        setCurriculumForm({
            name: `${source.name} (Copy)`,
            startYear: source.startYear || "",
            endYear: source.endYear || "",
            faculty: source.faculty || "",
            department: source.department || "",
            major: source.major || "",
            track: source.track || "",
            baseTemplateId: source.baseTemplateId || null,
            isTemplate: currentTab === "template",
        });
        setCloneError(null);
        setIsCloneDialogOpen(true);
    };

    const executeClone = async () => {
        if (!sourceCurriculumId || !curriculumForm.name) return;
        setIsCloning(true);
        setCloneError(null);
        try {
            const res = await fetch("/api/admin/curriculum/clone", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sourceCurriculumId,
                    newDetails: curriculumForm
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to clone curriculum");

            // Success
            setCurriculumForm(initialCurriculumState);
            setIsCloneDialogOpen(false);
            setSourceCurriculumId(null);
            fetchYears();
        } catch (err: any) {
            setCloneError(err.message);
        } finally {
            setIsCloning(false);
        }
    };

    // Helpers to filter data by tab
    const templates = years.filter((y: any) => y.isTemplate);
    const faculties = years.filter((y: any) => !y.isTemplate);

    // Group faculties for Accordion
    const groupByFaculty = (list: CurriculumYear[]) => {
        const groups: Record<string, CurriculumYear[]> = {};
        list.forEach(item => {
            const facultyName = item.faculty || "Other/Unassigned";
            if (!groups[facultyName]) groups[facultyName] = [];
            groups[facultyName].push(item);
        });
        return groups;
    };
    const groupedFaculties = groupByFaculty(faculties);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Curriculum Management</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Manage university master templates and specific faculty curriculums.
                    </p>
                </div>

                <Sheet open={isSheetOpen} onOpenChange={handleSheetClose}>
                    {/* The trigger is now moved down into the TabsContent to be context-specific */}
                    <SheetContent className="overflow-y-auto sm:max-w-md w-full border-l-0 shadow-2xl">
                        <SheetHeader className="mb-6">
                            <SheetTitle className="text-xl">
                                {curriculumForm.id 
                                    ? "Edit Curriculum" 
                                    : (currentTab === "template" ? "Add Master Template" : "Add Faculty Curriculum")}
                            </SheetTitle>
                            <SheetDescription>
                                {curriculumForm.id 
                                    ? "Update the mapping details for this curriculum." 
                                    : (currentTab === "template" 
                                        ? "Create a new university-wide GE master template." 
                                        : "Create a new curriculum mapping to start organizing subjects.")}
                            </SheetDescription>
                        </SheetHeader>

                        <div className="space-y-5">
                            <div className="space-y-2">
                                <Label className="text-slate-700">Name <span className="text-red-500">*</span></Label>
                                <Input
                                    placeholder='e.g. "หลักสูตรบริหารธุรกิจ 2563"'
                                    value={curriculumForm.name}
                                    onChange={(e) => setCurriculumForm({ ...curriculumForm, name: e.target.value })}
                                    className="focus-visible:ring-blue-500"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-slate-700">Start Year (Opt.)</Label>
                                    <Input
                                        type="number"
                                        placeholder='e.g. "2563"'
                                        value={curriculumForm.startYear}
                                        onChange={(e) => setCurriculumForm({ ...curriculumForm, startYear: e.target.value === "" ? "" : parseInt(e.target.value) })}
                                        className="focus-visible:ring-blue-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-slate-700">End Year (Opt.)</Label>
                                    <Input
                                        type="number"
                                        placeholder='e.g. "2568"'
                                        value={curriculumForm.endYear}
                                        onChange={(e) => setCurriculumForm({ ...curriculumForm, endYear: e.target.value === "" ? "" : parseInt(e.target.value) })}
                                        className="focus-visible:ring-blue-500"
                                    />
                                </div>
                            </div>
                            {currentTab === "faculty" && (
                                <>
                                    <div className="space-y-2">
                                        <Label className="text-slate-700">Faculty (Opt.)</Label>
                                        <Input
                                            placeholder='e.g. "วิทยาการจัดการ"'
                                            value={curriculumForm.faculty}
                                            onChange={(e) => setCurriculumForm({ ...curriculumForm, faculty: e.target.value })}
                                            className="focus-visible:ring-blue-500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-700">Department (Opt.)</Label>
                                        <Input
                                            placeholder='e.g. "บริหารธุรกิจ"'
                                            value={curriculumForm.department}
                                            onChange={(e) => setCurriculumForm({ ...curriculumForm, department: e.target.value })}
                                            className="focus-visible:ring-blue-500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-700">Major (Opt.)</Label>
                                        <Input
                                            placeholder='e.g. "ระบบสารสนเทศทางธุรกิจ"'
                                            value={curriculumForm.major}
                                            onChange={(e) => setCurriculumForm({ ...curriculumForm, major: e.target.value })}
                                            className="focus-visible:ring-blue-500"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-slate-700">Track (Opt.)</Label>
                                        <Input
                                            placeholder='e.g. "ปกติ"'
                                            value={curriculumForm.track}
                                            onChange={(e) => setCurriculumForm({ ...curriculumForm, track: e.target.value })}
                                            className="focus-visible:ring-blue-500"
                                        />
                                    </div>
                                </>
                            )}

                            {currentTab === "faculty" && (
                                <div className="space-y-2 pt-2 border-t border-slate-100">
                                    <Label className="text-slate-700 font-semibold">Inherit from Master Template (Opt.)</Label>
                                    <p className="text-xs text-slate-500 mb-2">Select a university GE template. Its subjects will be cloned into this faculty curriculum.</p>
                                    <Select
                                        value={curriculumForm.baseTemplateId || "none"}
                                        onValueChange={(val) => setCurriculumForm({ ...curriculumForm, baseTemplateId: val === "none" ? null : val })}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="No Base Template (Custom Setup)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">-- No Base Template (Custom Setup) --</SelectItem>
                                            {templates
                                                .filter(y => y.id !== curriculumForm.id) // Cannot inherit from self
                                                .map((y) => (
                                                    <SelectItem key={y.id} value={y.id}>
                                                        {y.name} {y.startYear && `(${y.startYear})`}
                                                    </SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            <div className="pt-4 border-t border-slate-100">
                                <Button
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all"
                                    onClick={submitCurriculum}
                                    disabled={!curriculumForm.name}
                                >
                                    {curriculumForm.id ? "Save Changes" : "Save Curriculum"}
                                </Button>
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>

                <Dialog open={isCloneDialogOpen} onOpenChange={setIsCloneDialogOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader className="mb-4">
                            <DialogTitle className="text-xl">Clone Curriculum</DialogTitle>
                            <DialogDescription>
                                Duplicate an existing curriculum framework. All its categories, nested structures, and subjects will be copied.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                            {cloneError && (
                                <Alert variant="destructive" className="py-2.5">
                                    <AlertCircle className="h-4 w-4" />
                                    <AlertDescription>{cloneError}</AlertDescription>
                                </Alert>
                            )}

                            <div className="space-y-2">
                                <Label className="text-slate-700">New Name <span className="text-red-500">*</span></Label>
                                <Input
                                    value={curriculumForm.name}
                                    onChange={(e) => setCurriculumForm({ ...curriculumForm, name: e.target.value })}
                                />
                            </div>

                            <div className="space-y-3 bg-slate-50 p-4 border border-slate-100 rounded-lg">
                                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Modify Structure Defaults</h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-slate-600 text-xs">Start Year</Label>
                                        <Input
                                            type="number" className="h-8 text-sm"
                                            value={curriculumForm.startYear}
                                            onChange={(e) => setCurriculumForm({ ...curriculumForm, startYear: e.target.value === "" ? "" : parseInt(e.target.value) })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-slate-600 text-xs">Major</Label>
                                        <Input
                                            className="h-8 text-sm"
                                            value={curriculumForm.major}
                                            onChange={(e) => setCurriculumForm({ ...curriculumForm, major: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-slate-600 text-xs">Department</Label>
                                        <Input
                                            className="h-8 text-sm"
                                            value={curriculumForm.department}
                                            onChange={(e) => setCurriculumForm({ ...curriculumForm, department: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-slate-600 text-xs">Track</Label>
                                        <Input
                                            className="h-8 text-sm"
                                            value={curriculumForm.track}
                                            onChange={(e) => setCurriculumForm({ ...curriculumForm, track: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-3 border-t border-slate-100 flex justify-end gap-3 mt-4">
                                <Button variant="ghost" onClick={() => setIsCloneDialogOpen(false)} disabled={isCloning}>
                                    Cancel
                                </Button>
                                <Button
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px]"
                                    onClick={executeClone}
                                    disabled={!curriculumForm.name || isCloning}
                                >
                                    {isCloning ? (
                                        <div className="flex items-center gap-2">
                                            <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                            <span>Cloning...</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <Copy className="h-4 w-4" /> <span>Clone Data</span>
                                        </div>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            {loading ? (
                <div className="flex h-48 items-center justify-center border border-slate-200 rounded-lg bg-white shadow-sm">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                        <div className="h-6 w-6 rounded-full border-2 border-slate-200 border-t-blue-500 animate-spin" />
                        <span className="text-sm">Loading curriculums...</span>
                    </div>
                </div>
            ) : years.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-lg border border-slate-200 border-dashed shadow-sm">
                    <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                        <Calendar className="h-8 w-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">No curriculums found</h3>
                    <p className="mt-1 text-sm text-slate-500 max-w-sm text-center">
                        Get started by creating a new curriculum year to organize subjects and categories.
                    </p>
                    <Button variant="outline" className="mt-6 border-slate-200 shadow-sm hover:bg-slate-50 hover:text-blue-600" onClick={() => {
                        setCurriculumForm({ ...initialCurriculumState, isTemplate: currentTab === "template" });
                        setIsSheetOpen(true);
                    }}>
                        <Plus className="mr-2 h-4 w-4" /> {currentTab === "template" ? "Add Master Template" : "Add Faculty Curriculum"}
                    </Button>
                </div>
            ) : (
                <Tabs value={currentTab} onValueChange={(val) => {
                    router.push(`/admin/curriculums?type=${val}`);
                }} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 max-w-md mb-6">
                        <TabsTrigger value="template">🏛️ Master Templates</TabsTrigger>
                        <TabsTrigger value="faculty">🎓 Faculty Curriculums</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="template" className="mt-0 outline-none">
                        <div className="flex justify-end mb-4">
                            <Button 
                                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                                onClick={() => {
                                    setCurriculumForm({ ...initialCurriculumState, isTemplate: true });
                                    setIsSheetOpen(true);
                                }}
                            >
                                <Plus className="mr-2 h-4 w-4" /> Add Master Template
                            </Button>
                        </div>
                        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="w-[30%] font-medium text-slate-600">Template Name</TableHead>
                                        <TableHead className="font-medium text-slate-600">Active Years</TableHead>
                                        <TableHead className="font-medium text-slate-600">Status</TableHead>
                                        <TableHead className="text-right font-medium text-slate-600">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {templates.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                                                No master templates found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        templates.map((y) => (
                                            <TableRow key={y.id} className="hover:bg-slate-50/50 transition-colors">
                                                <TableCell>
                                                    <div className="font-medium text-slate-900">{y.name}</div>
                                                </TableCell>
                                                <TableCell>
                                                    {y.startYear ? (
                                                        <Badge variant="secondary" className="font-mono bg-slate-100 text-slate-700 hover:bg-slate-200 border-none">
                                                            {y.startYear} {y.endYear ? `- ${y.endYear}` : '- Present'}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-slate-400 text-sm italic">Not specified</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {y.isActive ? (
                                                        <Badge className="bg-green-50 text-green-700 hover:bg-green-100 ring-1 ring-inset ring-green-600/20 shadow-none">Active</Badge>
                                                    ) : (
                                                        <Badge className="bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-500/20 shadow-none">Inactive</Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right space-x-1">
                                                    <Button variant="ghost" size="icon" title="Edit Template" onClick={() => openEditDialog(y)} className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 h-8 w-8">
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" title="Delete Template" className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8">
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    This action cannot be undone. This will permanently delete the 
                                                                    <strong> {y.name}</strong> master template and all its associated categories.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                <AlertDialogAction 
                                                                    onClick={() => handleDelete(y.id)}
                                                                    className="bg-red-600 hover:bg-red-700"
                                                                >
                                                                    Delete
                                                                </AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    <TabsContent value="faculty" className="mt-0 outline-none space-y-4">
                        <div className="flex justify-end mb-2">
                            <Button 
                                className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                                onClick={() => {
                                    setCurriculumForm({ ...initialCurriculumState, isTemplate: false });
                                    setIsSheetOpen(true);
                                }}
                            >
                                <Plus className="mr-2 h-4 w-4" /> Add Faculty Curriculum
                            </Button>
                        </div>
                        {Object.keys(groupedFaculties).length === 0 ? (
                             <div className="text-center py-8 text-slate-500 bg-white rounded-lg border border-slate-200 shadow-sm">
                                 No faculty curriculums found.
                             </div>
                        ) : (
                            <Accordion type="multiple" defaultValue={Object.keys(groupedFaculties)} className="w-full space-y-4">
                                {Object.entries(groupedFaculties).map(([facultyName, facultyList]) => (
                                    <AccordionItem key={facultyName} value={facultyName} className="bg-white border text-card-foreground shadow-sm rounded-lg overflow-hidden data-[state=open]:pb-2">
                                        <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-slate-50">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-md bg-indigo-50 flex items-center justify-center text-indigo-600">
                                                    <Calendar className="h-4 w-4" />
                                                </div>
                                                <h3 className="text-base font-semibold">{facultyName}</h3>
                                                <Badge variant="secondary" className="ml-2 font-normal text-xs">{facultyList.length} Curriculums</Badge>
                                            </div>
                                        </AccordionTrigger>
                                        <AccordionContent className="px-6 pt-0 pb-4">
                                            <div className="rounded-md border border-slate-200 overflow-hidden">
                                                <Table>
                                                    <TableHeader className="bg-slate-50/50">
                                                        <TableRow className="hover:bg-transparent">
                                                            <TableHead className="w-[35%] font-medium text-slate-600">Curriculum Name</TableHead>
                                                            <TableHead className="font-medium text-slate-600">Active Years</TableHead>
                                                            <TableHead className="font-medium text-slate-600">Major / Track</TableHead>
                                                            <TableHead className="font-medium text-slate-600">Status</TableHead>
                                                            <TableHead className="text-right font-medium text-slate-600">Actions</TableHead>
                                                        </TableRow>
                                                    </TableHeader>
                                                    <TableBody>
                                                        {facultyList.map((y) => (
                                                            <TableRow key={y.id} className="hover:bg-slate-50/50 transition-colors">
                                                                <TableCell>
                                                                    <div className="font-medium text-slate-900">{y.name}</div>
                                                                    {y.baseTemplateId && (
                                                                        <Badge variant="outline" className="mt-1 text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200">
                                                                            Uses Inherited Template
                                                                        </Badge>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>
                                                                    {y.startYear ? (
                                                                        <Badge variant="secondary" className="font-mono bg-slate-100 text-slate-700 hover:bg-slate-200 border-none">
                                                                            {y.startYear} {y.endYear ? `- ${y.endYear}` : '- Present'}
                                                                        </Badge>
                                                                    ) : (
                                                                        <span className="text-slate-400 text-sm italic">Not specified</span>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <div className="text-sm">
                                                                        {y.major && <div className="text-slate-700">Major: {y.major}</div>}
                                                                        {y.track && <div className="text-slate-500 mt-0.5 text-xs">Track: {y.track}</div>}
                                                                        {!y.major && !y.track && <span className="text-slate-300">-</span>}
                                                                    </div>
                                                                </TableCell>
                                                                <TableCell>
                                                                    {y.isActive ? (
                                                                        <Badge className="bg-green-50 text-green-700 hover:bg-green-100 ring-1 ring-inset ring-green-600/20 shadow-none">Active</Badge>
                                                                    ) : (
                                                                        <Badge className="bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-500/20 shadow-none">Inactive</Badge>
                                                                    )}
                                                                </TableCell>
                                                                <TableCell className="text-right space-x-1">
                                                                    <Button variant="ghost" size="icon" title="Edit Curriculum" onClick={() => openEditDialog(y)} className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 h-8 w-8">
                                                                        <Pencil className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button variant="ghost" size="icon" title="Clone Curriculum" onClick={() => openCloneDialog(y)} className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 h-8 w-8">
                                                                        <Copy className="h-4 w-4" />
                                                                    </Button>
                                                                    <AlertDialog>
                                                                        <AlertDialogTrigger asChild>
                                                                            <Button variant="ghost" size="icon" title="Delete Curriculum" className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8">
                                                                                <Trash2 className="h-4 w-4" />
                                                                            </Button>
                                                                        </AlertDialogTrigger>
                                                                        <AlertDialogContent>
                                                                            <AlertDialogHeader>
                                                                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                                                                <AlertDialogDescription>
                                                                                    This action cannot be undone. This will permanently delete the 
                                                                                    <strong> {y.name}</strong> curriculum and all its associated categories.
                                                                                </AlertDialogDescription>
                                                                            </AlertDialogHeader>
                                                                            <AlertDialogFooter>
                                                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                                                <AlertDialogAction 
                                                                                    onClick={() => handleDelete(y.id)}
                                                                                    className="bg-red-600 hover:bg-red-700"
                                                                                >
                                                                                    Delete
                                                                                </AlertDialogAction>
                                                                            </AlertDialogFooter>
                                                                        </AlertDialogContent>
                                                                    </AlertDialog>
                                                                </TableCell>
                                                            </TableRow>
                                                        ))}
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        </AccordionContent>
                                    </AccordionItem>
                                ))}
                            </Accordion>
                        )}
                    </TabsContent>
                </Tabs>
            )}
        </div>
    );
}
