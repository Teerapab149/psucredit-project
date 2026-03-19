"use client";

import Link from "next/link";
import Image from "next/image";
import { User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react"; // <-- นำเข้า NextAuth

export default function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession(); // <-- ใช้ session จาก NextAuth แทน store

  // ไม่แสดง Navbar ในหน้า Admin หรือ Login
  if (pathname.startsWith("/admin") || pathname.startsWith("/login")) return null;

  return (
    <nav className="fixed top-0 z-50 w-full border-b border-white/40 bg-white/60 backdrop-blur-xl shadow-sm">
      {/* ปรับ px สำหรับมือถือให้เล็กลง และขยายขึ้นในจอใหญ่ */}
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8 py-3 sm:py-4">

        {/* ด้านซ้าย: Logo คณะ */}
        <Link href="/" className="flex items-center transition-transform hover:scale-105 shrink-0">
          {/* ปรับขนาดกล่องรูปภาพตามขนาดจอ */}
          <div className="relative h-8 w-[140px] sm:h-10 sm:w-[180px] lg:h-12 lg:w-[200px]">
            <Image
              src="/logo/05_FMS_Standard_EN_PNG.png"
              alt="Faculty of Management Sciences"
              fill
              className="object-contain object-left"
              priority
            />
          </div>
        </Link>

        {/* ด้านขวา: ข้อมูล User / ปุ่ม Login */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* เช็คสถานะกำลังโหลด เพื่อไม่ให้ปุ่ม Sign In กระพริบโชว์ก่อน */}
          {status === "loading" ? (
            <div className="h-9 w-24 bg-slate-200/50 animate-pulse rounded-xl"></div>
          ) : session ? (
            <div className="flex items-center gap-2 sm:gap-4 bg-white/80 border border-slate-100 pl-2 sm:pl-4 pr-1.5 sm:pr-2 py-1.5 rounded-full shadow-sm">
              
              {/* ซ่อนชื่อในมือถือ (hidden) และแสดงในระดับ md ขึ้นไป */}
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-bold text-slate-800">{session.user?.name || "Student"}</span>
                {/* ใช้ email หรือดึง studentId จาก session มาแสดง */}
                <span className="text-xs font-semibold text-blue-600">{session.user?.email}</span>
              </div>

              <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center border border-blue-200 shrink-0">
                <User className="h-4 w-4" />
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => signOut({ callbackUrl: '/login' })} // <-- ใช้ signOut ของ NextAuth
                className="h-8 w-8 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                title="Logout"
              >
                <LogOut className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
            </div>
          ) : (
            <>
              <Link href="/login">
                <Button 
                  variant="ghost" 
                  className="text-slate-600 hover:text-slate-900 hover:bg-slate-100/50 font-bold h-9 sm:h-10 rounded-xl px-3 sm:px-4 text-xs sm:text-sm transition-all"
                >
                  Sign In
                </Button>
              </Link>
              <Link href="/upload">
                <Button 
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold h-9 sm:h-10 px-4 sm:px-5 rounded-xl text-xs sm:text-sm shadow-md transition-all hover:-translate-y-0.5"
                >
                  Get Started
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}