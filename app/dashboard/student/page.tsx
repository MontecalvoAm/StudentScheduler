"use client";

import React, { useEffect, useState } from "react";
import { useUIStore } from "@/stores/ui-store";
import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  QrCode,
  MapPin,
  RefreshCw,
  Award,
} from "lucide-react";

interface Schedule {
  ScheduleId: number;
  Class: {
    Subject: {
      SubjectCode: string;
      SubjectName: string;
    };
  };
  Room: {
    RoomCode: string;
    RoomName: string;
  };
  StartTime: string;
  EndTime: string;
}

interface ActiveSession {
  SessionId: number;
  SubjectName: string;
  SubjectCode: string;
  RoomCode: string;
  StartTime: string;
  EndTime: string;
  Method: "BUTTON" | "QR";
  AlreadyMarked: boolean;
  MarkedStatus: string | null;
  MarkedAt: string | null;
}

interface Stats {
  present: number;
  late: number;
  absent: number;
  excused: number;
  total: number;
  percentage: number;
}

export default function StudentDashboard() {
  const { addToast } = useUIStore();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [stats, setStats] = useState<Stats>({
    present: 0,
    late: 0,
    absent: 0,
    excused: 0,
    total: 0,
    percentage: 100,
  });
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<number | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/student/dashboard");
      if (res.ok) {
        const result = await res.json();
        setSchedules(result.data.schedules);
        setActiveSessions(result.data.activeSessions);
        setStats(result.data.stats);
      } else {
        addToast({
          type: "error",
          title: "Fetch Error",
          message: "Failed to load dashboard data.",
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleMarkAttendance = async (sessionId: number) => {
    setMarking(sessionId);
    try {
      const res = await fetch("/api/attendance/mark", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ SessionId: sessionId }),
      });

      const result = await res.json();
      if (res.ok) {
        addToast({
          type: "success",
          title: "Attendance Marked",
          message: `Successfully marked as ${result.data.Status}`,
        });
        fetchDashboardData(); // Refresh stats/sessions
      } else {
        addToast({
          type: "error",
          title: "Marking Failed",
          message: result.message ?? "Failed to mark attendance",
        });
      }
    } catch (err) {
      console.error(err);
      addToast({
        type: "error",
        title: "Connection Error",
        message: "Failed to connect to the attendance API.",
      });
    } finally {
      setMarking(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-500 text-sm">Gathering classroom updates...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.025em", margin: 0, lineHeight: 1.25 }}>Student Dashboard</h1>
          <p style={{ fontSize: 14, color: "#64748B", margin: "5px 0 0", fontWeight: 400 }}>Welcome to your academic attendance summary.</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="pm-btn-secondary self-start sm:self-center flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Sync Info
        </button>
      </div>

      {/* ─── Metric Summaries ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="pm-stat-card pm-card-animate" style={{ "--strip-color": "#6366F1" } as React.CSSProperties}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#4F46E5", letterSpacing: "-0.03em", lineHeight: 1.1, marginTop: 4 }}>
            {stats.percentage.toFixed(1)}%
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1E293B", marginTop: 2 }}>Attendance Rate</div>
          <div style={{ fontSize: 11.5, color: "#64748B", fontWeight: 400, marginTop: 1 }}>Goal: &gt; 90%</div>
        </div>
        <div className="pm-stat-card pm-card-animate" style={{ "--strip-color": "#10B981" } as React.CSSProperties}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#059669", letterSpacing: "-0.03em", lineHeight: 1.1, marginTop: 4 }}>
            {stats.present}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1E293B", marginTop: 2 }}>Present Count</div>
          <div style={{ fontSize: 11.5, color: "#64748B", fontWeight: 400, marginTop: 1 }}>On-time attendances</div>
        </div>
        <div className="pm-stat-card pm-card-animate" style={{ "--strip-color": "#F59E0B" } as React.CSSProperties}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#D97706", letterSpacing: "-0.03em", lineHeight: 1.1, marginTop: 4 }}>
            {stats.late}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1E293B", marginTop: 2 }}>Late Count</div>
          <div style={{ fontSize: 11.5, color: "#64748B", fontWeight: 400, marginTop: 1 }}>After 15-min threshold</div>
        </div>
        <div className="pm-stat-card pm-card-animate" style={{ "--strip-color": "#EF4444" } as React.CSSProperties}>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#DC2626", letterSpacing: "-0.03em", lineHeight: 1.1, marginTop: 4 }}>
            {stats.absent}
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#1E293B", marginTop: 2 }}>Absences</div>
          <div style={{ fontSize: 11.5, color: "#64748B", fontWeight: 400, marginTop: 1 }}>Unexcused missed classes</div>
        </div>
      </div>

      {/* ─── Check-In Alerts (Active Attendance Sessions) ─── */}
      {activeSessions.length > 0 && (
        <div className="space-y-4">
          <h2 className="flex items-center gap-2" style={{ fontSize: 16, fontWeight: 700, color: "#0F172A" }}>
            <Clock className="w-5 h-5" style={{ color: "#6366F1" }} />
            Active Attendance Check-ins
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {activeSessions.map((session) => (
              <div
                key={session.SessionId}
                className="pm-card pm-card-animate flex flex-col justify-between"
                style={{ borderLeft: "4px solid #6366F1" }}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="pm-badge" style={{ background: "#EEF2FF", color: "#6366F1", fontSize: 10, fontWeight: 700 }}>
                      {session.SubjectCode}
                    </span>
                    <span className="flex items-center gap-1" style={{ fontSize: 12, color: "#64748B" }}>
                      <MapPin className="w-3.5 h-3.5" />
                      {session.RoomCode}
                    </span>
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0F172A" }} className="truncate">{session.SubjectName}</h3>
                  <p style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>
                    Scheduled: {session.StartTime} - {session.EndTime}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between gap-4">
                  {session.AlreadyMarked ? (
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold">
                      <CheckCircle2 className="w-4 h-4" />
                      Marked as {session.MarkedStatus}
                    </div>
                  ) : session.Method === "QR" ? (
                    <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold">
                      <QrCode className="w-4 h-4" />
                      Requires QR code scan on screen
                    </div>
                  ) : (
                    <button
                      onClick={() => handleMarkAttendance(session.SessionId)}
                      disabled={marking !== null}
                      className="pm-btn-primary w-full text-center"
                    >
                      {marking === session.SessionId ? "Marking..." : "Check In Now"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Today's Schedule & Attendance Log ─── */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Today's Schedule */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="flex items-center gap-2" style={{ fontSize: 16, fontWeight: 700, color: "#0F172A" }}>
            <Calendar className="w-5 h-5" style={{ color: "#6366F1" }} />
            Today's Schedule
          </h2>
          <div className="pm-card" style={{ overflow: "hidden" }}>
            {schedules.length === 0 ? (
              <div style={{ padding: 32, textAlign: "center", color: "#64748B", fontSize: 14 }}>
                No classes scheduled for today.
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "#E2E8F0" }}>
                {schedules.map((schedule) => (
                  <div key={schedule.ScheduleId} className="p-4 sm:p-5 flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="pm-badge" style={{ background: "#F1F5F9", color: "#475569", fontSize: 10, fontWeight: 700 }}>
                          {schedule.Class.Subject.SubjectCode}
                        </span>
                        <span style={{ fontSize: 12, color: "#64748B" }}>{schedule.Room.RoomName}</span>
                      </div>
                      <h4 className="truncate" style={{ fontSize: 14, fontWeight: 700, color: "#1E293B" }}>
                        {schedule.Class.Subject.SubjectName}
                      </h4>
                    </div>
                    <div className="text-right shrink-0">
                      <p style={{ fontSize: 14, fontWeight: 600, color: "#1E293B" }}>{schedule.StartTime}</p>
                      <p style={{ fontSize: 10, color: "#64748B" }}>to {schedule.EndTime}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Legend / Info */}
        <div className="space-y-4">
          <h2 className="flex items-center gap-2" style={{ fontSize: 16, fontWeight: 700, color: "#0F172A" }}>
            <Award className="w-5 h-5" style={{ color: "#6366F1" }} />
            Attendance Rules
          </h2>
          <div className="pm-card pm-card-animate space-y-4" style={{ padding: 20 }}>
            <div className="flex gap-3">
              <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#10B981" }} />
              <div>
                <h4 style={{ fontSize: 12, fontWeight: 600, color: "#1E293B" }}>Present (On-time)</h4>
                <p style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                  Check-in within the first 15 minutes of class start.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#F59E0B" }} />
              <div>
                <h4 style={{ fontSize: 12, fontWeight: 600, color: "#1E293B" }}>Late Status</h4>
                <p style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                  Check-in after 15 minutes. Counting towards completion, but logged as late.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <XCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#EF4444" }} />
              <div>
                <h4 style={{ fontSize: 12, fontWeight: 600, color: "#1E293B" }}>Absent</h4>
                <p style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                  Unchecked classes or manually closed sessions marked by the instructor.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
