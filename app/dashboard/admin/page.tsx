"use client";

import React, { useEffect, useState } from "react";
import { useUIStore } from "@/stores/ui-store";
import {
  Users,
  User,
  Calendar,
  BookOpen,
  MapPin,
  Shield,
  Activity,
  Clock,
  Terminal,
  RefreshCw,
} from "lucide-react";

interface Metrics {
  students: number;
  instructors: number;
  admins: number;
  classes: number;
  rooms: number;
  subjects: number;
}

interface ScheduleRecord {
  ScheduleId: number;
  StartTime: string;
  EndTime: string;
  Class: {
    Subject: { SubjectName: string; SubjectCode: string };
  };
  Room: { RoomCode: string };
}

interface UserRegistration {
  UserId: number;
  FirstName: string;
  LastName: string;
  Email: string;
  CreatedAt: string;
  Role: { RoleName: string };
}

export default function AdminOverviewPage() {
  const { addToast } = useUIStore();
  const [metrics, setMetrics] = useState<Metrics>({
    students: 0,
    instructors: 0,
    admins: 0,
    classes: 0,
    rooms: 0,
    subjects: 0,
  });
  const [todaySchedules, setTodaySchedules] = useState<ScheduleRecord[]>([]);
  const [recentRegistrations, setRecentRegistrations] = useState<UserRegistration[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOverviewData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/overview");
      if (res.ok) {
        const result = await res.json();
        setMetrics(result.data.metrics);
        setTodaySchedules(result.data.todaySchedules);
        setRecentRegistrations(result.data.recentRegistrations);
      } else {
        addToast({
          type: "error",
          title: "Error",
          message: "Failed to load system overview.",
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverviewData();
  }, []);

  if (loading && todaySchedules.length === 0 && recentRegistrations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-500 text-sm">Compiling system dashboard metrics...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.025em", margin: 0, lineHeight: 1.25 }}>Admin Dashboard</h1>
          <p style={{ fontSize: 14, color: "#64748B", margin: "5px 0 0", fontWeight: 400 }}>Real-time operational state metrics and active schedule monitoring.</p>
        </div>
        <button
          onClick={fetchOverviewData}
          className="pm-btn-secondary self-start sm:self-center flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Synchronize Stats
        </button>
      </div>

      {/* ─── Metric Cards Grid ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Students */}
        <div className="pm-stat-card pm-card-animate" style={{ "--strip-color": "#6366F1", padding: "28px 24px" } as React.CSSProperties}>
          <div className="flex items-center justify-between">
            <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.07em", textTransform: "uppercase" }}>Students</div>
            <Users className="w-5 h-5" style={{ color: "#6366F1" }} />
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, color: "#4F46E5", letterSpacing: "-0.03em", lineHeight: 1.1, marginTop: 12, textAlign: "center" }}>{metrics.students}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1E293B", marginTop: 8, textAlign: "center" }}>Registered profiles</div>
        </div>

        {/* Instructors */}
        <div className="pm-stat-card pm-card-animate" style={{ "--strip-color": "#10B981", padding: "28px 24px" } as React.CSSProperties}>
          <div className="flex items-center justify-between">
            <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.07em", textTransform: "uppercase" }}>Instructors</div>
            <Users className="w-5 h-5" style={{ color: "#10B981" }} />
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, color: "#059669", letterSpacing: "-0.03em", lineHeight: 1.1, marginTop: 12, textAlign: "center" }}>{metrics.instructors}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1E293B", marginTop: 8, textAlign: "center" }}>Academic assignments</div>
        </div>

        {/* Classes */}
        <div className="pm-stat-card pm-card-animate" style={{ "--strip-color": "#F59E0B", padding: "28px 24px" } as React.CSSProperties}>
          <div className="flex items-center justify-between">
            <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.07em", textTransform: "uppercase" }}>Active Classes</div>
            <Calendar className="w-5 h-5" style={{ color: "#F59E0B" }} />
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, color: "#D97706", letterSpacing: "-0.03em", lineHeight: 1.1, marginTop: 12, textAlign: "center" }}>{metrics.classes}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1E293B", marginTop: 8, textAlign: "center" }}>Section assignments</div>
        </div>

        {/* Subjects */}
        <div className="pm-stat-card pm-card-animate" style={{ "--strip-color": "#F43F5E", padding: "28px 24px" } as React.CSSProperties}>
          <div className="flex items-center justify-between">
            <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.07em", textTransform: "uppercase" }}>Subjects</div>
            <BookOpen className="w-5 h-5" style={{ color: "#F43F5E" }} />
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, color: "#E11D48", letterSpacing: "-0.03em", lineHeight: 1.1, marginTop: 12, textAlign: "center" }}>{metrics.subjects}</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1E293B", marginTop: 8, textAlign: "center" }}>Academic catalog</div>
        </div>
      </div>

      {/* ─── Bottom Layout: Today's Overview ─── */}
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Today's Active Schedules */}
        <div className="space-y-4">
          <h2 className="flex items-center gap-2" style={{ fontSize: 16, fontWeight: 700, color: "#0F172A", margin: 0 }}>
            <Calendar className="w-5 h-5" style={{ color: "#6366F1" }} />
            Today's Active Schedules
          </h2>
          <div className="pm-card overflow-hidden">
            {todaySchedules.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">No classes scheduled for today.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {todaySchedules.map((sched) => (
                  <div key={sched.ScheduleId} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 border border-indigo-100 flex flex-col items-center justify-center text-indigo-600">
                        <span className="text-[10px] font-bold leading-none">START</span>
                        <span className="text-xs font-extrabold">{sched.StartTime}</span>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{sched.Class.Subject.SubjectName}</h4>
                        <p className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5 mt-0.5">
                          <span className="text-indigo-500 font-bold">{sched.Class.Subject.SubjectCode}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-300" />
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {sched.Room.RoomCode}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="inline-block px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-bold border border-emerald-100">
                        ACTIVE
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
              <button className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700">View Full Calendar</button>
            </div>
          </div>
        </div>

        {/* Recent Student Registrations */}
        <div className="space-y-4">
          <h2 className="flex items-center gap-2" style={{ fontSize: 16, fontWeight: 700, color: "#0F172A", margin: 0 }}>
            <Users className="w-5 h-5" style={{ color: "#6366F1" }} />
            Recent Registrations
          </h2>
          <div className="pm-card overflow-hidden">
            {recentRegistrations.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-sm">No recent user registrations.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentRegistrations.map((reg) => (reg.Role.RoleName === 'STUDENT' || reg.Role.RoleName === 'INSTRUCTOR') && (
                  <div key={reg.UserId} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200">
                        <User className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{reg.FirstName} {reg.LastName}</h4>
                        <p className="text-[11px] text-slate-500">{reg.Email}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        reg.Role.RoleName === 'STUDENT' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                      }`}>
                        {reg.Role.RoleName}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {new Date(reg.CreatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
              <button className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700">Manage Registry</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
