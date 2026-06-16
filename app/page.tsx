"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import { Calendar, Mail, Lock, Loader2, ArrowRight, Eye, EyeOff } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, setUser, isLoading, setLoading } = useAuthStore();
  const { addToast } = useUIStore();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ Email?: string; Password?: string }>({});

  // If already logged in, redirect to dashboard
  useEffect(() => {
    if (user) {
      const from = searchParams.get("from") ?? getDashboardRoute(user.Role);
      router.push(from);
    }
  }, [user, router, searchParams]);

  const getDashboardRoute = (role: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "/dashboard/admin";
      case "INSTRUCTOR":
        return "/dashboard/instructor";
      case "STUDENT":
      default:
        return "/dashboard/student";
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Simple client validation
    const newErrors: { Email?: string; Password?: string } = {};
    if (!email) newErrors.Email = "Email is required";
    if (!password) newErrors.Password = "Password is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Email: email, Password: password }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.error === "ACCOUNT_LOCKED") {
          addToast({
            type: "error",
            title: "Account Locked",
            message: result.message,
          });
        } else if (result.error === "VALIDATION_ERROR") {
          const fieldErrors = result.issues.fieldErrors;
          setErrors({
            Email: fieldErrors.Email?.[0],
            Password: fieldErrors.Password?.[0],
          });
        } else {
          addToast({
            type: "error",
            title: "Login Failed",
            message: result.message ?? "Invalid email or password",
          });
        }
        return;
      }

      setUser(result.user);
      addToast({
        type: "success",
        title: "Welcome Back",
        message: `Logged in as ${result.user.FirstName} (${result.user.Role})`,
      });

      const from = searchParams.get("from") ?? getDashboardRoute(result.user.Role);
      router.push(from);
    } catch (err) {
      console.error(err);
      addToast({
        type: "error",
        title: "Connection Error",
        message: "Failed to connect to the authentication server.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-600 shadow-xl shadow-indigo-200 mb-6">
            <Calendar className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Schedule Tracker
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Academic Schedule & Attendance Portal
          </p>
        </div>

        {/* Login Card */}
        <div className="pm-card p-8 bg-white">
          <form onSubmit={handleLogin} className="space-y-6">
            {/* Email Field */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@university.edu"
                  className="w-full pl-12 pr-4 py-3 rounded-xl text-slate-900 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm placeholder:text-slate-400 outline-none"
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
              {errors.Email && (
                <p className="text-xs text-rose-500 mt-1.5 font-medium">{errors.Email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-3 rounded-xl text-slate-900 border border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm placeholder:text-slate-400 outline-none"
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <div className="flex justify-end mt-2">
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    addToast({
                      type: "info",
                      title: "Password Reset",
                      message: "Please contact administration to reset your password.",
                    });
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  Forgot Password?
                </a>
              </div>
              {errors.Password && (
                <p className="text-xs text-rose-500 mt-1.5 font-medium">{errors.Password}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="pm-btn-primary w-full py-3.5 flex items-center justify-center gap-2 text-sm"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Sign In <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer info */}
        <div className="text-center mt-10">
          <p className="text-xs text-slate-400 font-medium">
            Authorized Access Only. All activities are monitored and audited.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
