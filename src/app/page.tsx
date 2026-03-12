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
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-600/30">
            <GraduationCap className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-900">
            PSU Credit Tracker
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" className="text-slate-600">
              Sign In
            </Button>
          </Link>
          <Link href="/upload">
            <Button className="bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/25">
              Get Started
            </Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-blue-100 px-4 py-1.5 text-sm text-blue-700">
            <Shield className="h-4 w-4" />
            <span>For PSU Students</span>
          </div>

          <h1 className="text-5xl font-bold tracking-tight text-slate-900 sm:text-6xl">
            Track Your Path to{" "}
            <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent">
              Graduation
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-600">
            Upload your grade reports, verify your subjects, and instantly see
            how many credits you have left. Know exactly what you need to
            graduate.
          </p>

          <div className="mt-8 flex items-center justify-center gap-4">
            <Link href="/upload">
              <Button
                size="lg"
                className="gap-2 bg-blue-600 text-lg font-semibold shadow-xl shadow-blue-600/30 hover:bg-blue-700"
              >
                <Upload className="h-5 w-5" />
                Upload Reports
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/login">
              <Button
                size="lg"
                variant="outline"
                className="text-lg font-semibold"
              >
                Sign In
              </Button>
            </Link>
          </div>
        </motion.div>

        {/* Steps */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-20 grid gap-6 md:grid-cols-3"
        >
          {[
            {
              icon: Upload,
              title: "1. Upload PDFs",
              desc: "Upload your Cumulative Grade Report and Registration Report as PDF files.",
              color: "bg-blue-100 text-blue-600",
            },
            {
              icon: CheckCircle,
              title: "2. Verify Data",
              desc: "Review and edit the extracted data in an interactive table. Fix any parsing errors.",
              color: "bg-emerald-100 text-emerald-600",
            },
            {
              icon: BarChart3,
              title: "3. See Results",
              desc: "Get a instant breakdown of your progress and see exactly what you still need.",
              color: "bg-violet-100 text-violet-600",
            },
          ].map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.15 }}
              className="rounded-2xl bg-white/70 p-6 shadow-lg shadow-slate-200/50 backdrop-blur"
            >
              <div
                className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${step.color}`}
              >
                <step.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                {step.title}
              </h3>
              <p className="mt-2 text-sm text-slate-600">{step.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
