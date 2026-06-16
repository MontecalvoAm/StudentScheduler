"use client";

import React, { useEffect, useState } from "react";
import { useUIStore } from "@/stores/ui-store";
import {
  Calendar,
  Clock,
  Play,
  CheckCircle,
  XCircle,
  QrCode,
  Users,
  Settings,
  X,
  FileText,
  MapPin,
  RefreshCw,
  Eye,
} from "lucide-react";

interface Schedule {
  ScheduleId: number;
  Class: {
    ClassId: number;
    SectionCode: string;
    Subject: {
      SubjectCode: string;
      SubjectName: string;
    };
    Enrollments: any[];
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
  SubjectCode: string;
  SubjectName: string;
  SectionCode: string;
  Method: "BUTTON" | "QR" | "BOTH";
  OpenedAt: string | null;
  AutoCloseAt: string | null;
  EnrolledCount: number;
  MarkedCount: number;
  QrCodeToken: string | null;
}

interface ClassAssignment {
  ClassId: number;
  SectionCode: string;
  Subject: {
    SubjectCode: string;
    SubjectName: string;
  };
  Semester: {
    SemesterName: string;
    SchoolYear: {
      YearLabel: string;
    };
  };
  Enrollments: any[];
}

export default function InstructorDashboard() {
  const { addToast } = useUIStore();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [classes, setClasses] = useState<ClassAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal / Session Creation State
  const [openModalClass, setOpenModalClass] = useState<Schedule | null>(null);
  const [method, setMethod] = useState<"BUTTON" | "QR">("BUTTON");
  const [autoCloseMinutes, setAutoCloseMinutes] = useState<number>(15);
  const [submitting, setSubmitting] = useState(false);

  // QR Modal Display State
  const [qrModalSession, setQrModalSession] = useState<{
    sessionId: number;
    subjectName: string;
    qrCodeUrl: string;
  } | null>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/instructor/dashboard");
      if (res.ok) {
        const result = await res.json();
        setSchedules(result.data.schedules);
        setActiveSessions(result.data.activeSessions);
        setClasses(result.data.classes);
      } else {
        addToast({
          type: "error",
          title: "Error",
          message: "Failed to load instructor dashboard.",
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

  const handleStartSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!openModalClass) return;

    setSubmitting(true);
    try {
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
      const res = await fetch("/api/attendance/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ScheduleId: openModalClass.ScheduleId,
          SessionDate: today,
          Method: method,
          AutoCloseMinutes: autoCloseMinutes,
        }),
      });

      const result = await res.json();
      if (res.ok) {
        addToast({
          type: "success",
          title: "Session Started",
          message: `Attendance is now open for ${openModalClass.Class.Subject.SubjectCode}`,
        });
        setOpenModalClass(null);
        fetchDashboardData();

        // If it was QR mode, show the QR Code immediately
        if (method === "QR" && result.data.QrCodeDataUrl) {
          setQrModalSession({
            sessionId: result.data.SessionId,
            subjectName: openModalClass.Class.Subject.SubjectName,
            qrCodeUrl: result.data.QrCodeDataUrl,
          });
        }
      } else {
        addToast({
          type: "error",
          title: "Error starting session",
          message: result.message ?? "Could not open session",
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseSession = async (sessionId: number) => {
    try {
      const res = await fetch(`/api/attendance/sessions/${sessionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CLOSED" }),
      });

      if (res.ok) {
        addToast({
          type: "success",
          title: "Session Closed",
          message: "Attendance session closed manually.",
        });
        fetchDashboardData();
      } else {
        addToast({
          type: "error",
          title: "Error",
          message: "Could not close attendance session.",
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleViewQr = async (session: ActiveSession) => {
    try {
      // Fetch the QR token to regenerate the url
      const res = await fetch(`/api/attendance/sessions?scheduleId=${session.SessionId}`);
      // Wait, we can generate a client-side QR token or fetch it if needed, or simply render it.
      // But we can also generate one or grab the existing one. For simplicity, let's fetch session details:
      // If we don't have the QR data url, let's make an endpoint or pass the token.
      // Wait, we can generate a QR code using standard nextjs or fetch it from session.
      // Let's create an API endpoint GET /api/attendance/sessions/[sessionId]/qr that returns the QR code url.
      const qrRes = await fetch(`/api/attendance/sessions/${session.SessionId}/qr`);
      const qrData = await qrRes.json();
      if (qrRes.ok && qrData.QrCodeDataUrl) {
        setQrModalSession({
          sessionId: session.SessionId,
          subjectName: session.SubjectName,
          qrCodeUrl: qrData.QrCodeDataUrl,
        });
      } else {
        addToast({
          type: "error",
          title: "QR Error",
          message: qrData.message ?? "Failed to retrieve QR code",
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading && schedules.length === 0 && classes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-500 text-sm">Loading classroom controller...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.025em", margin: 0, lineHeight: 1.25 }}>Instructor Console</h1>
          <p style={{ fontSize: 14, color: "#64748B", margin: "5px 0 0", fontWeight: 400 }}>Manage schedules, start attendance checks, and view enrollment.</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="pm-btn-secondary self-start sm:self-center flex items-center gap-2"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Portal
        </button>
      </div>

      {/* ─── Active Sessions (Open Checks) ─── */}
      {activeSessions.length > 0 && (
        <div className="space-y-4">
          <h2 className="flex items-center gap-2" style={{ fontSize: 16, fontWeight: 700, color: "#1E293B", margin: 0 }}>
            <Clock className="w-5 h-5" style={{ color: "#6366F1" }} />
            Active Attendance Checks
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {activeSessions.map((session) => (
              <div
                key={session.SessionId}
                className="pm-card pm-card-animate flex flex-col justify-between"
                style={{ padding: 24, borderLeft: "4px solid #10B981", ["--strip-color" as any]: "#10B981" }}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="pm-badge" style={{ background: "#ECFDF5", color: "#059669", fontSize: 10, fontWeight: 700 }}>
                      {session.SubjectCode}
                    </span>
                    <span style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>
                      Class: {session.SectionCode}
                    </span>
                  </div>
                  <h3 className="truncate" style={{ fontSize: 16, fontWeight: 700, color: "#0F172A" }}>{session.SubjectName}</h3>
                  <p style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>
                    Method: {session.Method} | Opened: {session.OpenedAt ? new Date(session.OpenedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "N/A"}
                  </p>

                  {/* Attendance Progress bar */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span style={{ fontSize: 12, color: "#64748B" }}>Student responses:</span>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "#1E293B" }}>
                        {session.MarkedCount} / {session.EnrolledCount}
                      </span>
                    </div>
                    <div className="pm-progress-track">
                      <div
                        className="pm-progress-fill"
                        style={{
                          width: `${session.EnrolledCount > 0 ? (session.MarkedCount / session.EnrolledCount) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ height: 1, background: "#E2E8F0", margin: "20px 0 16px" }} />
                <div className="flex items-center gap-3">
                  {session.Method === "QR" && (
                    <button
                      onClick={() => handleViewQr(session)}
                      className="pm-btn-secondary flex items-center justify-center gap-2"
                    >
                      <QrCode className="w-4 h-4" />
                      Show QR
                    </button>
                  )}
                  <button
                    onClick={() => handleCloseSession(session.SessionId)}
                    className="flex-1 py-2 px-4 rounded-xl text-xs font-semibold bg-rose-600/15 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/10 hover:border-rose-500/30 transition-all text-center cursor-pointer"
                  >
                    Close Check-in
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Today's Schedule & Assigned Classes ─── */}
      <div className="grid lg:grid-cols-3 gap-8">
        {/* Today's Schedule (Actions to open session) */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="flex items-center gap-2" style={{ fontSize: 16, fontWeight: 700, color: "#1E293B", margin: 0 }}>
            <Calendar className="w-5 h-5" style={{ color: "#6366F1" }} />
            Today's Schedule
          </h2>
          <div className="pm-card" style={{ overflow: "hidden" }}>
            {schedules.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No classes scheduled for today.
              </div>
            ) : (
              <div className="divide-y divide-slate-200">
                {schedules.map((schedule) => {
                  const hasActive = activeSessions.some((s) => s.SubjectCode === schedule.Class.Subject.SubjectCode);
                  return (
                    <div key={schedule.ScheduleId} className="p-5 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="pm-badge" style={{ background: "#F5F3FF", color: "#6D28D9", fontSize: 10, fontWeight: 700 }}>
                            {schedule.Class.Subject.SubjectCode}
                          </span>
                          <span style={{ fontSize: 12, color: "#64748B" }}>
                            {schedule.Room.RoomName} ({schedule.Room.RoomCode})
                          </span>
                        </div>
                        <h4 className="truncate" style={{ fontSize: 15, fontWeight: 700, color: "#0F172A" }}>
                          {schedule.Class.Subject.SubjectName}
                        </h4>
                        <p style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>
                          Time: {schedule.StartTime} - {schedule.EndTime} | Sec: {schedule.Class.SectionCode}
                        </p>
                      </div>

                      <div className="shrink-0">
                        {hasActive ? (
                          <span className="pm-badge inline-flex items-center gap-1.5" style={{ background: "#ECFDF5", color: "#059669", fontSize: 12, fontWeight: 600, padding: "6px 12px" }}>
                            <CheckCircle className="w-4 h-4" /> Open
                          </span>
                        ) : (
                          <button
                            onClick={() => setOpenModalClass(schedule)}
                            className="pm-btn-primary flex items-center gap-1.5"
                          >
                            <Play className="w-3.5 h-3.5 fill-current" /> Start Check-in
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* My Enrolled Classes */}
        <div className="space-y-4">
          <h2 className="flex items-center gap-2" style={{ fontSize: 16, fontWeight: 700, color: "#1E293B", margin: 0 }}>
            <Users className="w-5 h-5" style={{ color: "#6366F1" }} />
            My Classes
          </h2>
          <div className="pm-card space-y-4" style={{ padding: 20 }}>
            {classes.length === 0 ? (
              <p className="text-center text-slate-500 text-xs py-4">No assigned classes found.</p>
            ) : (
              <div className="space-y-3.5">
                {classes.map((cls) => (
                  <div
                    key={cls.ClassId}
                    className="p-3 rounded-xl flex items-center justify-between transition-all"
                    style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}
                  >
                    <div className="min-w-0">
                      <h4 className="truncate" style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>
                        {cls.Subject.SubjectCode}
                      </h4>
                      <p className="truncate" style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                        {cls.Subject.SubjectName}
                      </p>
                    </div>
                    <span className="pm-badge flex items-center gap-1" style={{ background: "#F5F3FF", color: "#6D28D9", fontSize: 10, fontWeight: 600 }}>
                      <Users className="w-3 h-3" style={{ color: "#6366F1" }} />
                      {cls.Enrollments.length} Enrolled
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Modal: Configure and Start Attendance Session ─── */}
      {openModalClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-md rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setOpenModalClass(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <div className="inline-flex items-center justify-center p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-3">
                <Settings className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Start Attendance Session</h3>
              <p className="text-xs text-slate-500 mt-1">
                Configure check-in rules for {openModalClass.Class.Subject.SubjectCode}.
              </p>
            </div>

            <form onSubmit={handleStartSession} className="space-y-5">
              {/* Method Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Check-in Method
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setMethod("BUTTON")}
                    className={`py-3 px-4 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      method === "BUTTON"
                        ? "bg-indigo-600/10 border-indigo-500/30 text-indigo-400"
                        : "bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    Button check-in
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod("QR")}
                    className={`py-3 px-4 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      method === "QR"
                        ? "bg-indigo-600/10 border-indigo-500/30 text-indigo-400"
                        : "bg-slate-100 border-slate-200 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    QR Code Check-in
                  </button>
                </div>
              </div>

              {/* Auto Close Timer */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Auto Close Session
                </label>
                <select
                  value={autoCloseMinutes}
                  onChange={(e) => setAutoCloseMinutes(parseInt(e.target.value, 10))}
                  className="w-full px-4 py-3 rounded-xl text-slate-800 glass-input text-xs"
                >
                  <option value={10}>10 Minutes</option>
                  <option value={15}>15 Minutes</option>
                  <option value={30}>30 Minutes</option>
                  <option value={45}>45 Minutes</option>
                  <option value={60}>60 Minutes</option>
                </select>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-4 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/20 cursor-pointer"
              >
                {submitting ? "Opening..." : "Launch Attendance Check"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal: QR Code Screen Display ─── */}
      {qrModalSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-sm rounded-3xl p-6 text-center shadow-2xl relative">
            <button
              onClick={() => setQrModalSession(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-1">{qrModalSession.subjectName}</h3>
            <p className="text-xs text-slate-500 mb-6">Scan QR code using student portal</p>

            <div className="bg-white p-4 rounded-2xl inline-block shadow-inner mb-6">
              <img
                src={qrModalSession.qrCodeUrl}
                alt="Attendance Session QR"
                className="w-64 h-64 mx-auto"
              />
            </div>

            <p className="text-[10px] text-slate-500">
              This code rotates/expires every 5 minutes. Keep this screen visible.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
