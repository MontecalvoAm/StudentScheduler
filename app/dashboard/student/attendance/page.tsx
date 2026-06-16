"use client";

import React, { useEffect, useState } from "react";
import { useUIStore } from "@/stores/ui-store";
import { CheckCircle2, AlertTriangle, XCircle, HelpCircle, Calendar, BookOpen } from "lucide-react";

interface AttendanceRecord {
  AttendanceRecordId: number;
  Status: "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";
  MarkedAt: string;
  Session: {
    SessionDate: string;
    Schedule: {
      Class: {
        SectionCode: string;
        Subject: {
          SubjectCode: string;
          SubjectName: string;
        };
      };
    };
  };
}

export default function StudentAttendancePage() {
  const { addToast } = useUIStore();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  useEffect(() => {
    async function fetchAttendance() {
      try {
        const res = await fetch("/api/student/attendance");
        if (res.ok) {
          const result = await res.json();
          setRecords(result.records);
        } else {
          addToast({
            type: "error",
            title: "Error",
            message: "Failed to fetch attendance history.",
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchAttendance();
  }, []);

  const filteredRecords = records.filter((r) => {
    if (filterStatus === "ALL") return true;
    return r.Status === filterStatus;
  });

  const getStatusBadge = (status: string) => {
    const badges = {
      PRESENT: {
        color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        icon: CheckCircle2,
      },
      LATE: {
        color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        icon: AlertTriangle,
      },
      ABSENT: {
        color: "bg-rose-500/10 text-rose-400 border-rose-500/20",
        icon: XCircle,
      },
      EXCUSED: {
        color: "bg-blue-500/10 text-blue-400 border-blue-500/20",
        icon: HelpCircle,
      },
    }[status as "PRESENT" | "LATE" | "ABSENT" | "EXCUSED"];

    const Icon = badges.icon;
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-semibold ${badges.color}`}>
        <Icon className="w-3.5 h-3.5" />
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-500 text-sm">Gathering enrollment records...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.025em", margin: 0, lineHeight: 1.25 }}>Attendance History</h1>
        <p style={{ fontSize: 14, color: "#64748B", margin: "5px 0 0", fontWeight: 400 }}>Review your past class check-ins and performance.</p>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2 pb-2" style={{ borderBottom: "1px solid #E2E8F0" }}>
        {["ALL", "PRESENT", "LATE", "ABSENT", "EXCUSED"].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={filterStatus === status ? "pm-btn-primary" : "pm-btn-secondary"}
          >
            {status}
          </button>
        ))}
      </div>

      {/* History Log Cards */}
      <div className="max-w-4xl space-y-4">
        {filteredRecords.length === 0 ? (
          <div className="pm-card" style={{ padding: 48, textAlign: "center", color: "#64748B", fontSize: 14 }}>
            No attendance records found matching status {filterStatus}.
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredRecords.map((record) => (
              <div
                key={record.AttendanceRecordId}
                className="pm-card pm-card-animate flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                style={{ padding: 20 }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5" style={{ background: "#EEF2FF", border: "1px solid #E0E7FF", color: "#6366F1" }}>
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="pm-badge" style={{ background: "#F1F5F9", color: "#475569", fontSize: 10, fontWeight: 700 }}>
                        {record.Session.Schedule.Class.Subject.SubjectCode}
                      </span>
                      <span style={{ fontSize: 12, color: "#64748B" }}>
                        {record.Session.Schedule.Class.SectionCode}
                      </span>
                    </div>
                    <h3 className="truncate" style={{ fontSize: 15, fontWeight: 700, color: "#0F172A" }}>
                      {record.Session.Schedule.Class.Subject.SubjectName}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-2" style={{ fontSize: 12, color: "#64748B" }}>
                      <Calendar className="w-3.5 h-3.5" style={{ color: "#94A3B8" }} />
                      <span>
                        Session Date: {new Date(record.Session.SessionDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex sm:flex-col items-start sm:items-end justify-between sm:justify-center gap-2 pt-3 sm:pt-0" style={{ borderTop: "none" }}>
                  {getStatusBadge(record.Status)}
                  <p style={{ fontSize: 10, color: "#64748B" }}>
                    Checked in: {new Date(record.MarkedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
