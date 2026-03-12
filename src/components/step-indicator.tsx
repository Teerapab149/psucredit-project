"use client";

import { motion } from "framer-motion";
import { Upload, CheckCircle, BarChart3 } from "lucide-react";
import { usePathname } from "next/navigation";

const steps = [
    { path: "/upload", label: "Upload", icon: Upload },
    { path: "/verify", label: "Verify", icon: CheckCircle },
    { path: "/results", label: "Results", icon: BarChart3 },
];

export function StepIndicator() {
    const pathname = usePathname();
    const currentIndex = steps.findIndex((s) => pathname.startsWith(s.path));

    return (
        <div className="flex items-center justify-center gap-2 py-6">
            {steps.map((step, index) => {
                const isActive = index === currentIndex;
                const isCompleted = index < currentIndex;
                const Icon = step.icon;

                return (
                    <div key={step.path} className="flex items-center gap-2">
                        <motion.div
                            initial={{ scale: 0.8 }}
                            animate={{ scale: isActive ? 1.1 : 1 }}
                            className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${isActive
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30"
                                    : isCompleted
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-slate-100 text-slate-400"
                                }`}
                        >
                            <Icon className="h-4 w-4" />
                            <span className="hidden sm:inline">{step.label}</span>
                        </motion.div>
                        {index < steps.length - 1 && (
                            <div className="flex items-center">
                                <motion.div
                                    className={`h-0.5 w-8 transition-colors ${isCompleted ? "bg-emerald-400" : "bg-slate-200"
                                        }`}
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: 1 }}
                                    transition={{ delay: 0.2 }}
                                />
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
