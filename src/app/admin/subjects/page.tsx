"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Search, FileText, Trash2, Edit, Check, ChevronsUpDown } from "lucide-react";
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
    DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface Category {
    id: string;
    name: string;
    children?: Category[];
}

interface CurriculumYear {
    id: string;
    name: string;
    startYear: number | null;
    endYear: number | null;
    categories: Category[];
}

interface Subject {
    id: string;
    code: string;
    name: string;
    credits: number;
    categoryId: string;
    category?: {
        name: string;
        curriculumYear?: {
            name: string;
            startYear: number | null;
        };
    };
}

export default function SubjectsPage() {
    const [years, setYears] = useState<CurriculumYear[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [openCategoryDropdown, setOpenCategoryDropdown] = useState(false);

    const [newSubject, setNewSubject] = useState<{
        code: string;
        name: string;
        credits: number;
        categoryId: string;
    }>({
        code: "",
        name: "",
        credits: 3,
        categoryId: "",
    });

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [yearsRes, subjectsRes] = await Promise.all([
                fetch("/api/admin/curriculum"),
                fetch("/api/admin/subjects"),
            ]);
            
            if (yearsRes.ok) setYears(await yearsRes.json());
            if (subjectsRes.ok) setSubjects(await subjectsRes.json());
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const createSubject = async () => {
        if (!newSubject.categoryId) return;
        
        await fetch("/api/admin/subjects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newSubject),
        });
        
        setNewSubject({ code: "", name: "", credits: 3, categoryId: "" });
        setIsDialogOpen(false);
        setOpenCategoryDropdown(false);
        fetchData();
    };

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

    const filteredSubjects = useMemo(() => {
        if (!searchQuery) return subjects;
        const q = searchQuery.toLowerCase();
        return subjects.filter(s => 
            s.code.toLowerCase().includes(q) || 
            s.name.toLowerCase().includes(q)
        );
    }, [subjects, searchQuery]);

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Subjects Database</h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Manage individual courses and assign them to curriculum categories.
                    </p>
                </div>
                
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm">
                            <Plus className="mr-2 h-4 w-4" /> Add Subject
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader className="mb-4">
                            <DialogTitle className="text-xl">Add New Subject</DialogTitle>
                            <DialogDescription>
                                Create a manual entry for a single course. Typically used for corrections.
                            </DialogDescription>
                        </DialogHeader>
                        
                        <div className="space-y-5">
                            <div className="grid grid-cols-4 gap-4">
                                <div className="col-span-1 space-y-2">
                                    <Label className="text-slate-700">Code</Label>
                                    <Input
                                        placeholder="315-101"
                                        value={newSubject.code}
                                        onChange={(e) => setNewSubject({ ...newSubject, code: e.target.value })}
                                        className="font-mono text-sm uppercase"
                                    />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <Label className="text-slate-700">Name</Label>
                                    <Input
                                        placeholder="Business Programming"
                                        value={newSubject.name}
                                        onChange={(e) => setNewSubject({ ...newSubject, name: e.target.value })}
                                    />
                                </div>
                                <div className="col-span-1 space-y-2">
                                    <Label className="text-slate-700">Credits</Label>
                                    <Input
                                        type="number"
                                        value={newSubject.credits}
                                        onChange={(e) => setNewSubject({ ...newSubject, credits: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            </div>
                            
                            <div className="space-y-2">
                                <Label className="text-slate-700">Assign to Category</Label>
                                <Popover open={openCategoryDropdown} onOpenChange={setOpenCategoryDropdown} modal={true}>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            aria-expanded={openCategoryDropdown}
                                            className="w-full justify-between font-normal bg-white h-auto p-3"
                                        >
                                            {newSubject.categoryId && allCategoriesFlat.length > 0 ? (
                                                <div className="flex flex-col items-start gap-1 text-left">
                                                    <span className="font-medium text-slate-800 break-words whitespace-normal leading-tight">
                                                        {allCategoriesFlat.find((cat) => cat.id === newSubject.categoryId)?.label}
                                                    </span>
                                                    <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                        {allCategoriesFlat.find((cat) => cat.id === newSubject.categoryId)?.yearName}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-slate-500">Select a category...</span>
                                            )}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[450px] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Search category by name or year..." />
                                            <CommandList className="max-h-[300px] overflow-y-auto">
                                                <CommandEmpty>No category found matching your search.</CommandEmpty>
                                                <CommandGroup>
                                                    {allCategoriesFlat.map((cat) => (
                                                        <CommandItem
                                                            key={cat.id}
                                                            value={`${cat.yearName} ${cat.label}`}
                                                            onSelect={() => {
                                                                setNewSubject({ 
                                                                    ...newSubject, 
                                                                    categoryId: cat.id === newSubject.categoryId ? "" : cat.id 
                                                                });
                                                                setOpenCategoryDropdown(false);
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4 shrink-0 mt-0.5",
                                                                    newSubject.categoryId === cat.id ? "opacity-100 text-emerald-600" : "opacity-0"
                                                                )}
                                                            />
                                                            <div className="flex flex-col items-start gap-1">
                                                                <span className="font-medium break-words leading-tight">{cat.label}</span>
                                                                <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded uppercase tracking-wider">
                                                                    {cat.yearName}
                                                                </span>
                                                            </div>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>

                            <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                <Button 
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white" 
                                    onClick={createSubject} 
                                    disabled={!newSubject.code || !newSubject.name || !newSubject.categoryId}
                                >
                                    Save Course
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row justify-between gap-4">
                    <div className="relative w-full sm:max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input 
                            placeholder="Filter by subject code or name..." 
                            className="pl-9 bg-white border-slate-200"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Badge variant="outline" className="bg-white px-3 py-1 font-normal text-slate-600 self-start sm:self-center">
                        Total Records: <strong className="ml-1 text-slate-900">{filteredSubjects.length}</strong>
                    </Badge>
                </div>

                <div className="overflow-x-auto flex-1">
                    {loading ? (
                        <div className="flex h-64 items-center justify-center">
                            <div className="flex flex-col items-center gap-2 text-slate-400">
                                <div className="h-6 w-6 rounded-full border-2 border-slate-200 border-t-emerald-500 animate-spin" />
                                <span className="text-sm">Fetching database...</span>
                            </div>
                        </div>
                    ) : filteredSubjects.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-12 text-center h-64">
                            <FileText className="h-10 w-10 text-slate-300 mb-3" />
                            <h3 className="text-slate-900 font-medium">No results found</h3>
                            <p className="text-slate-500 text-sm mt-1">
                                {searchQuery ? "Try adjusting your search filters." : "Start by importing subjects or adding them manually."}
                            </p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader className="bg-slate-50/50 sticky top-0 z-10 shadow-sm">
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-[120px] font-medium text-slate-600">Course Code</TableHead>
                                    <TableHead className="font-medium text-slate-600">Course Name</TableHead>
                                    <TableHead className="w-[80px] text-center font-medium text-slate-600">Credits</TableHead>
                                    <TableHead className="font-medium text-slate-600">Mapped Category</TableHead>
                                    <TableHead className="text-right font-medium text-slate-600">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredSubjects.map((subject) => (
                                    <TableRow key={subject.id} className="hover:bg-slate-50/50 transition-colors">
                                        <TableCell className="font-mono text-[13px] font-semibold text-slate-700">
                                            {subject.code}
                                        </TableCell>
                                        <TableCell className="font-medium text-slate-900">
                                            {subject.name}
                                        </TableCell>
                                        <TableCell className="text-center font-medium">
                                            <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none font-mono">
                                                {subject.credits}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {subject.category ? (
                                                <div className="flex flex-col items-start gap-1">
                                                    <span className="text-sm text-slate-700 truncate max-w-[300px]" title={subject.category.name}>
                                                        {subject.category.name}
                                                    </span>
                                                    {subject.category.curriculumYear && (
                                                        <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 uppercase tracking-wider">
                                                            {subject.category.curriculumYear.name} 
                                                            {subject.category.curriculumYear.startYear && ` (${subject.category.curriculumYear.startYear})`}
                                                        </span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 text-sm italic">Unassigned</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right space-x-1">
                                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 h-8 w-8">
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600 hover:bg-red-50 h-8 w-8">
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </div>
        </div>
    );
}
