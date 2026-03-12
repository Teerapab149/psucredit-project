import { type NextAuthConfig } from "next-auth";
import type { JWT } from "next-auth/jwt";

// Augment NextAuth types to include role & id
declare module "next-auth" {
    interface User {
        role?: string;
        studentId?: string | null;
    }
    interface Session {
        user: {
            id: string;
            role: string;
            studentId?: string | null;
            name?: string | null;
            email?: string | null;
            image?: string | null;
        };
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        role?: string;
        studentId?: string | null;
    }
}

export const authConfig = {
    providers: [], // Providers are added in auth.ts (Node.js runtime only)
    callbacks: {
        async jwt({ token, user }: { token: JWT; user?: import("next-auth").User }) {
            if (user) {
                token.role = user.role;
                token.studentId = user.studentId;
            }
            return token;
        },
        async session({ session, token }: { session: import("next-auth").Session; token: JWT }) {
            if (session.user) {
                session.user.id = token.sub as string;
                session.user.role = token.role as string;
                session.user.studentId = token.studentId;
            }
            return session;
        },
    },
    pages: {
        signIn: "/admin/login",
    },
} satisfies NextAuthConfig;
