"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Upload,
  CheckCircle,
  BarChart3,
  ArrowRight,
  Shield,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] },
});

const steps = [
  {
    icon: Upload,
    title: "Upload PDFs",
    num: "01",
    desc: "อัปโหลดไฟล์ Grade Report และ Registration Report ของคุณเข้าระบบ",
    accent: "from-blue-500 to-cyan-400",
    bg: "bg-blue-50 text-blue-600",
  },
  {
    icon: CheckCircle,
    title: "Verify Data",
    num: "02",
    desc: "ตรวจสอบความถูกต้องของรายวิชา และปรับแก้ข้อมูลได้แบบ Interactive",
    accent: "from-indigo-500 to-purple-400",
    bg: "bg-indigo-50 text-indigo-600",
  },
  {
    icon: BarChart3,
    title: "See Results",
    num: "03",
    desc: "ดูสรุปหน่วยกิตทันที รู้ว่าขาดวิชาไหน หมวดไหน และวางแผนเทอมได้เลย",
    accent: "from-sky-500 to-blue-400",
    bg: "bg-sky-50 text-sky-600",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-50 selection:bg-blue-200 font-sans text-slate-900 overflow-hidden">
      

      {/* ═══════ HERO SECTION ═══════ */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32">
        {/* Modern Aurora Background */}
        <div className="absolute inset-0 pointer-events-none flex justify-center overflow-hidden">
          <motion.div
            animate={{ x: [-40, 40, -40], y: [-20, 20, -20] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-0 -left-20 w-[600px] h-[600px] rounded-full bg-blue-400/20 blur-[100px] mix-blend-multiply"
          />
          <motion.div
            animate={{ x: [40, -40, 40], y: [20, -20, 20] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-20 -right-20 w-[500px] h-[500px] rounded-full bg-purple-400/20 blur-[100px] mix-blend-multiply"
          />
          <div
            className="absolute inset-0 opacity-[0.15]"
            style={{
              backgroundImage: "radial-gradient(circle, #0f172a 1px, transparent 1px)",
              backgroundSize: "40px 40px",
              maskImage: "linear-gradient(to bottom, black 40%, transparent 100%)",
              WebkitMaskImage: "linear-gradient(to bottom, black 40%, transparent 100%)",
            }}
          />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 mx-auto max-w-4xl px-6 lg:px-8 flex flex-col items-center text-center">
          <motion.div {...fadeUp(0)}>
            <div className="mb-8 inline-flex items-center gap-2 rounded-full bg-white/80 backdrop-blur-sm border border-slate-200/60 px-4 py-2 shadow-sm hover:shadow-md transition-shadow">
              <Shield className="h-4 w-4 text-blue-600" />
              <span className="text-[13px] font-semibold text-slate-700 tracking-wide">
                Credit checker for FMS Students
              </span>
            </div>
          </motion.div>

          <motion.h1 
            {...fadeUp(0.1)}
            className="text-5xl sm:text-6xl xl:text-7xl font-extrabold tracking-tight leading-[1.15]"
          >
            Track Your Path <br className="hidden sm:block" />
            to{" "}
            <span className="relative inline-block whitespace-nowrap">
              <span className="bg-gradient-to-r from-blue-600 via-indigo-500 to-purple-600 bg-clip-text text-transparent">
                Graduation
              </span>
              <svg
                className="absolute -bottom-2 sm:-bottom-4 left-0 w-full opacity-80"
                viewBox="0 0 200 8"
                fill="none"
              >
                <motion.path
                  d="M2 6C50 2 150 2 198 6"
                  stroke="url(#paint0_linear)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ delay: 0.8, duration: 0.8, ease: "easeOut" }}
                />
                <defs>
                  <linearGradient id="paint0_linear" x1="2" y1="4" x2="198" y2="4" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#2563eb" />
                    <stop offset="1" stopColor="#9333ea" />
                  </linearGradient>
                </defs>
              </svg>
            </span>
          </motion.h1>

          <motion.p
            {...fadeUp(0.2)}
            className="mt-8 text-lg sm:text-xl text-slate-600 leading-relaxed max-w-2xl font-medium"
          >
            ระบบตรวจสอบโครงสร้างหลักสูตรอัตโนมัติ อัปโหลดไฟล์เพื่อเช็คหน่วยกิตคงเหลือ วางแผนการเรียน และดูภาพรวมได้ทันที
          </motion.p>

          <motion.div
            {...fadeUp(0.4)}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto"
          >
            <Link href="/upload" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-base font-semibold shadow-xl shadow-blue-500/25 rounded-2xl h-14 px-8 transition-all hover:scale-105 border border-white/10"
              >
                <Upload className="h-5 w-5" />
                Upload Files
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto text-base font-semibold text-slate-700 bg-white/80 backdrop-blur-md border-slate-200 hover:bg-white hover:text-slate-900 rounded-2xl h-14 px-8 shadow-sm transition-all hover:-translate-y-0.5"
              >
                Sign In
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ═══════ STEPS SECTION (Glassmorphism) ═══════ */}
      <section className="relative z-20 py-24">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-20">
            <h2 className="text-3xl font-bold sm:text-4xl bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-600">
              How it works
            </h2>
            <p className="mt-4 text-lg text-slate-600 font-medium">3 ขั้นตอนง่ายๆ ในการตรวจสอบโครงสร้างหลักสูตรของคุณ</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3 relative">
            {/* Animated Connecting Line */}
            <div className="hidden md:block absolute top-12 left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-transparent via-blue-200 to-transparent z-0 opacity-50"></div>

            {steps.map((step, i) => (
              <motion.div
                key={step.title}
                {...fadeUp(0.15 * i)}
                className="relative z-10 group"
              >
                <div className="h-full flex flex-col bg-white/60 backdrop-blur-xl rounded-[2rem] p-8 border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 hover:-translate-y-2">
                  <div className={`mb-6 flex h-16 w-16 items-center justify-center rounded-2xl shadow-inner ${step.bg}`}>
                    <step.icon className="h-8 w-8" />
                  </div>
                  
                  <div className="text-sm font-bold text-slate-400 mb-2 font-mono tracking-wider">STEP {step.num}</div>
                  <h3 className="text-xl font-bold mb-3 text-slate-900">{step.title}</h3>
                  <p className="text-slate-600 leading-relaxed text-sm font-medium">
                    {step.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div {...fadeUp(0.6)} className="mt-20 text-center">
            <Link href="/upload">
              <Button
                size="lg"
                variant="outline"
                className="group gap-2 text-base font-semibold text-slate-700 bg-white/80 backdrop-blur-sm border-slate-200 hover:bg-white hover:text-slate-900 rounded-2xl h-14 px-8 shadow-sm transition-all hover:shadow-md"
              >
                Get started — it takes 30 seconds
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* ═══════ FOOTER ═══════ */}
      <footer className="relative bg-slate-900 text-slate-400 py-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 to-slate-900 pointer-events-none" />
        <div className="relative mx-auto max-w-7xl px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center backdrop-blur-sm">
              <GraduationCap className="h-4 w-4 text-white" />
            </div>
            <span className="text-sm font-bold text-slate-200 tracking-wide">FMS Credit Tracker</span>
          </div>
          <p className="text-sm font-medium">
            © FMS@PSU 2026. All Rights Reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}