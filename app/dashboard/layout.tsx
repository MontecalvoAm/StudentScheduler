"use client";

import React, { useEffect, useState, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";
import { useUIStore } from "@/stores/ui-store";
import {
  Users,
  Calendar,
  Clock,
  BookOpen,
  MapPin,
  FileText,
  ShieldAlert,
  LogOut,
  ChevronLeft,
  ChevronRight,
  User,
  Activity,
  Award,
  Settings,
  GraduationCap,
  Layers,
  CalendarDays,
} from "lucide-react";

interface MenuItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, setUser, clearUser, isInitialized, setInitialized } =
    useAuthStore();
  const { sidebarOpen, toggleSidebar, setSidebarOpen, addToast } = useUIStore();
  const [syncing, setSyncing] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Sync auth state with API on mount
  useEffect(() => {
    async function syncAuth() {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const result = await response.json();
          setUser(result.user);
        } else {
          clearUser();
          router.push("/");
        }
      } catch (err) {
        console.error("Auth sync error:", err);
      } finally {
        setSyncing(false);
        setInitialized();
      }
    }
    syncAuth();
  }, [setUser, clearUser, router, setInitialized]);

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Handle click outside profile dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Adjust sidebar for screen sizes
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [setSidebarOpen]);

  if (syncing || !isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-400 text-sm font-medium">Securing session...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  // Build menu items based on role
  const menuItems: MenuItem[] = [];

  if (user.Role === "SUPER_ADMIN") {
    menuItems.push(
      { name: "Dashboard", href: "/dashboard/admin", icon: Activity },
      { name: "Users", href: "/dashboard/admin/users", icon: Users },
      { name: "Subjects", href: "/dashboard/admin/subjects", icon: BookOpen },
      { name: "Rooms", href: "/dashboard/admin/rooms", icon: MapPin },
      { name: "Classes", href: "/dashboard/admin/classes", icon: Award },
      { name: "Calendar", href: "/dashboard/admin/calendar", icon: CalendarDays },
      { name: "Schedules", href: "/dashboard/admin/schedules", icon: Calendar },
      { name: "Audit Logs", href: "/dashboard/admin/audit-logs", icon: ShieldAlert }
    );
  } else if (user.Role === "INSTRUCTOR") {
    menuItems.push(
      { name: "Dashboard", href: "/dashboard/instructor", icon: Activity },
      { name: "Sessions", href: "/dashboard/instructor/sessions", icon: Clock },
      { name: "Reports", href: "/dashboard/instructor/reports", icon: FileText }
    );
  } else if (user.Role === "STUDENT") {
    menuItems.push(
      { name: "Dashboard", href: "/dashboard/student", icon: Activity },
      { name: "My Schedule", href: "/dashboard/student/schedule", icon: Calendar },
      { name: "Attendance", href: "/dashboard/student/attendance", icon: Clock }
    );
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      clearUser();
      addToast({
        type: "info",
        title: "Logged Out",
        message: "You have been securely logged out.",
      });
      router.push("/");
    } catch (err) {
      console.error(err);
      addToast({
        type: "error",
        title: "Logout Error",
        message: "Failed to perform server logout.",
      });
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-50 overflow-hidden">
      {/* ─── Sidebar ─── */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 bg-white border-r border-gray-200 transition-all duration-300 ease-in-out transform lg:translate-x-0 lg:static flex flex-col ${
          sidebarOpen ? "w-64" : "w-20"
        } ${!sidebarOpen && "lg:w-20"}`}
      >
        {/* Sidebar Header */}
        <div className={`h-16 flex items-center ${sidebarOpen ? "px-6" : "justify-center px-0"} border-b border-gray-200 transition-all`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 min-w-[36px] rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-100 transition-transform hover:scale-105 active:scale-95">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            {sidebarOpen && (
              <span className="font-bold text-sm tracking-tight text-slate-900 whitespace-nowrap animate-fade-in">
                Schedule Tracker
              </span>
            )}
          </div>
        </div>

        {/* Sidebar Navigation */}
        <nav className={`flex-1 overflow-y-auto ${sidebarOpen ? "px-4" : "px-3"} py-6 space-y-1.5 scrollbar-hide`}>
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  router.push(item.href);
                  if (window.innerWidth < 1024) setSidebarOpen(false);
                }}
                className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all group relative ${
                  isActive
                    ? "bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100/50"
                    : "text-slate-500 hover:text-indigo-600 hover:bg-slate-50 border border-transparent"
                }`}
                title={!sidebarOpen ? item.name : ""}
              >
                <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? "text-indigo-600" : "text-slate-400 group-hover:text-indigo-500"}`} />
                {sidebarOpen && (
                  <span className="whitespace-nowrap truncate animate-fade-in">{item.name}</span>
                )}
                {!sidebarOpen && (
                  <div className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                    {item.name}
                  </div>
                )}
              </a>
            );
          })}
        </nav>

        {/* Sidebar Footer (User Profile Summary) */}
        <div className={`p-4 border-t border-gray-100 bg-slate-50/50 transition-all ${sidebarOpen ? "px-4" : "px-3 flex flex-col items-center"}`}>
          <div className={`flex items-center gap-3 ${!sidebarOpen && "justify-center"}`}>
            <div className="w-9 h-9 min-w-[36px] rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-600 shrink-0">
              <User className="w-4.5 h-4.5" />
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0 overflow-hidden animate-fade-in">
                <h4 className="text-xs font-bold text-slate-800 truncate">
                  {user.FirstName} {user.LastName}
                </h4>
                <p className="text-[10px] font-semibold text-indigo-600 uppercase tracking-tight">
                  {user.Role.replace("_", " ")}
                </p>
              </div>
            )}
          </div>

          {/* Student Specific Info */}
          {sidebarOpen && user.Role === "STUDENT" && (user.Section || user.StudySession) && (
            <div className="mt-3 grid grid-cols-2 gap-2 animate-fade-in">
              {user.Section && (
                <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white border border-slate-200 shadow-xs">
                  <Layers className="w-3 h-3 text-slate-400" />
                  <div className="flex flex-col">
                    <span className="text-[8px] uppercase font-bold text-slate-400 leading-none">Section</span>
                    <span className="text-[10px] font-bold text-slate-700 leading-tight">{user.Section}</span>
                  </div>
                </div>
              )}
              {user.StudySession && (
                <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-white border border-slate-200 shadow-xs">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <div className="flex flex-col">
                    <span className="text-[8px] uppercase font-bold text-slate-400 leading-none">Session</span>
                    <span className="text-[10px] font-bold text-slate-700 leading-tight capitalize">{user.StudySession.toLowerCase()}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Collapse Toggle Button (Improved & Larger) */}
        <button
          onClick={toggleSidebar}
          className="absolute top-1/2 -right-4 -translate-y-1/2 w-8 h-8 bg-white border border-gray-200 rounded-full shadow-lg flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:border-indigo-300 hover:scale-110 active:scale-95 transition-all z-50 cursor-pointer"
          title={sidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
        >
          {sidebarOpen ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </button>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && window.innerWidth < 1024 && (
        <div
          onClick={toggleSidebar}
          className="fixed inset-0 z-20 bg-black/30 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* ─── Main Content Area ─── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="h-16 flex items-center justify-between px-8 border-b border-gray-200 bg-white/80 backdrop-blur-md z-10 shrink-0">
          {/* Left Side: Date & Time */}
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-800 tracking-wide uppercase">
              {currentTime.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span className="text-[10px] font-medium text-slate-400">
              Current Time: {currentTime.toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
          </div>

          {/* Right Side: Profile Dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-3 p-1 rounded-full hover:bg-slate-50 transition-colors group"
            >
              <div className="w-10 h-10 rounded-full bg-indigo-50 border-2 border-indigo-100 flex items-center justify-center text-indigo-600 transition-transform group-hover:scale-105 group-active:scale-95">
                <User className="w-5 h-5" />
              </div>
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 py-3 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* User Header */}
                <div className="px-5 py-3 border-b border-slate-50 mb-2">
                  <h4 className="text-sm font-bold text-slate-900 truncate">
                    {user.FirstName} {user.LastName}
                  </h4>
                  <p className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full inline-block mt-1 uppercase tracking-wider">
                    {user.Role.replace("_", " ")}
                  </p>
                </div>

                {/* Menu Items */}
                <div className="px-2 space-y-1">
                  <button
                    onClick={() => {
                      setIsProfileOpen(false);
                      router.push("/dashboard/settings");
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    Account Settings
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-rose-500 hover:bg-rose-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>

        {/* Main Content Pane */}
        <main className="flex-1 overflow-y-auto bg-gray-50 p-6 sm:p-10">
          {children}
        </main>
      </div>
    </div>
  );
}
