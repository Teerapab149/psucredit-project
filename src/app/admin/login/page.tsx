"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { motion } from "framer-motion";
import { ShieldCheck, Loader2, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const loginSchema = z.object({
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
    const router = useRouter();
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginForm>({
        defaultValues: { email: "", password: "" },
    });

    const onSubmit = async (data: LoginForm) => {
        setLoading(true);
        setError("");

        const result = await signIn("credentials", {
            email: data.email,
            password: data.password,
            redirect: false,
        });

        if (result?.error) {
            setError("Invalid email or password");
            setLoading(false);
        } else {
            router.push("/admin");
            router.refresh();
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
            {/* Decorative background elements */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />
                <div className="absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="relative w-full max-w-md px-4"
            >
                {/* Header */}
                <div className="mb-8 text-center">
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.1, duration: 0.4 }}
                        className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg shadow-blue-500/30"
                    >
                        <ShieldCheck className="h-8 w-8 text-white" />
                    </motion.div>
                    <h1 className="text-2xl font-bold text-white">
                        Admin Portal
                    </h1>
                    <p className="mt-1 text-slate-400">
                        PSU Credit Tracker — Administrator Access
                    </p>
                </div>

                {/* Login Card */}
                <Card className="border-0 bg-white/5 backdrop-blur-xl shadow-2xl shadow-black/20">
                    <CardHeader>
                        <CardTitle className="text-lg text-white">
                            Sign In
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form
                            onSubmit={handleSubmit(onSubmit)}
                            className="space-y-4"
                        >
                            {/* Email */}
                            <div className="space-y-2">
                                <Label
                                    htmlFor="admin-email"
                                    className="text-slate-300"
                                >
                                    Email
                                </Label>
                                <Input
                                    id="admin-email"
                                    type="email"
                                    placeholder="Username"
                                    className="border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                                    {...register("email", {
                                        required: "Email is required",
                                        pattern: {
                                            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                                            message:
                                                "Please enter a valid email",
                                        },
                                    })}
                                />
                                {errors.email && (
                                    <p className="text-xs text-red-400">
                                        {errors.email.message}
                                    </p>
                                )}
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <Label
                                    htmlFor="admin-password"
                                    className="text-slate-300"
                                >
                                    Password
                                </Label>
                                <Input
                                    id="admin-password"
                                    type="password"
                                    placeholder="••••••••"
                                    className="border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                                    {...register("password", {
                                        required: "Password is required",
                                    })}
                                />
                                {errors.password && (
                                    <p className="text-xs text-red-400">
                                        {errors.password.message}
                                    </p>
                                )}
                            </div>

                            {/* Server error */}
                            {error && (
                                <motion.p
                                    initial={{ opacity: 0, y: -4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 p-3 rounded-lg"
                                >
                                    {error}
                                </motion.p>
                            )}

                            {/* Submit */}
                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg shadow-blue-600/25 transition-all duration-200"
                            >
                                {loading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <LogIn className="mr-2 h-4 w-4" />
                                )}
                                Sign In
                            </Button>
                        </form>
                    </CardContent>
                </Card>

                {/* Footer */}
                <p className="mt-6 text-center text-xs text-slate-500">
                    This page is restricted to authorized administrators only.
                </p>
            </motion.div>
        </div>
    );
}
