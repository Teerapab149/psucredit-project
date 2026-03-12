"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BookOpen, FolderTree, FileText, Upload, LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

const navItems = [
    { name: "Dashboard Overview", href: "/admin", icon: LayoutDashboard },
    { name: "Curriculum Years", href: "/admin/curriculums", icon: BookOpen },
    { name: "Categories Strategy", href: "/admin/categories", icon: FolderTree },
    { name: "Subjects Database", href: "/admin/subjects", icon: FileText },
    { name: "Bulk Import", href: "/admin/import", icon: Upload },
];

export function AdminSidebar({ user }: { user: any }) {
    const pathname = usePathname();

    return (
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-full shadow-sm z-10">
            <div className="h-16 flex items-center px-6 border-b border-slate-200">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded bg-blue-600 flex items-center justify-center shadow-inner">
                        <span className="text-white font-bold text-lg">P</span>
                    </div>
                    <h1 className="text-lg font-bold text-slate-900 tracking-tight">PSU Credit</h1>
                </div>
            </div>
            
            <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    // Exact match for /admin, prefix match for others
                    const isActive = item.href === "/admin" 
                        ? pathname === "/admin" 
                        : pathname.startsWith(item.href);
                    
                    return (
                        <Link 
                            key={item.name} 
                            href={item.href} 
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 ${
                                isActive 
                                    ? "bg-blue-50 text-blue-700 shadow-sm" 
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                            }`}
                        >
                            <item.icon className={`h-[18px] w-[18px] ${isActive ? "text-blue-700" : "text-slate-400"}`} />
                            {item.name}
                        </Link>
                    )
                })}
            </nav>

            <div className="p-4 border-t border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-3 mb-4 px-2">
                    <div className="h-9 w-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold border border-blue-200 shadow-sm shrink-0">
                        {user?.name?.charAt(0) || "A"}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{user?.name || "Administrator"}</p>
                        <p className="text-xs text-slate-500 truncate">{user?.email}</p>
                    </div>
                </div>
                <Button 
                    variant="ghost" 
                    className="w-full justify-start text-slate-600 hover:text-red-600 hover:bg-red-50" 
                    onClick={() => signOut({ callbackUrl: "/admin/login" })}
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    Secure Sign Out
                </Button>
            </div>
        </aside>
    );
}
