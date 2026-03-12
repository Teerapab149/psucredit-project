import { auth } from "@/lib/auth";
import { AdminSidebar } from "./admin-sidebar";

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    // If no session or not ADMIN, allow the child route to handle it 
    // (Middleware already protects /admin routes, but /admin/login is unprotected).
    // So if no session, just render children (which will be the login page).
    if (!session || session.user.role !== "ADMIN") {
        return <>{children}</>;
    }

    return (
        <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
            <AdminSidebar user={session.user} />
            <main className="flex-1 overflow-y-auto">
                <div className="h-16 flex items-center px-8 border-b border-slate-200 bg-white/50 backdrop-blur-sm sticky top-0 z-10 transition-all">
                    <p className="text-sm font-medium text-slate-500">
                        Admin Portal / <span className="text-slate-900">Workspace</span>
                    </p>
                </div>
                <div className="p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
