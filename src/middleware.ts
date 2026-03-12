import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
    const { pathname } = req.nextUrl;

    // Allow access to the admin login page without authentication
    if (pathname === "/admin/login") {
        return NextResponse.next();
    }

    // Protect all other /admin/* routes
    if (pathname.startsWith("/admin")) {
        const session = req.auth;

        // Not logged in → redirect to admin login
        if (!session?.user) {
            return NextResponse.redirect(new URL("/admin/login", req.url));
        }

        // Logged in but not ADMIN → redirect to home
        const role = session.user.role;
        if (role !== "ADMIN") {
            return NextResponse.redirect(new URL("/", req.url));
        }
    }

    return NextResponse.next();
});

export const config = {
    matcher: ["/admin/:path*"],
};
