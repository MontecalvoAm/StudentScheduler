"use client";

import React, { useEffect, useState } from "react";
import { useUIStore } from "@/stores/ui-store";
import { FileText, Download, Printer, Search, RefreshCw, BarChart2 } from "lucide-react";

interface ClassAssignment {
  ClassId: number;
  ClassName: string;
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
}

interface StudentReport {
  StudentId: number;
  StudentNumber: string;
  FirstName: string;
  LastName: string;
  Email: string;
  Present: number;
  Late: number;
  Absent: number;
  Excused: number;
  TotalSessions: number;
  AttendanceRate: number;
}

interface ReportData {
  classDetails: {
    ClassId: number;
    SubjectCode: string;
    SubjectName: string;
    SectionCode: string;
    SemesterName: string;
    SchoolYear: string;
  };
  totalClosedSessions: number;
  roster: StudentReport[];
}

export default function InstructorReportsPage() {
  const { addToast } = useUIStore();
  const [classes, setClasses] = useState<ClassAssignment[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [loadingReport, setLoadingReport] = useState(false);

  // Load instructor classes on mount
  useEffect(() => {
    async function loadClasses() {
      try {
        const res = await fetch("/api/instructor/dashboard");
        if (res.ok) {
          const result = await res.json();
          setClasses(result.data.classes);
          if (result.data.classes.length > 0) {
            setSelectedClassId(result.data.classes[0].ClassId.toString());
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingClasses(false);
      }
    }
    loadClasses();
  }, []);

  // Fetch report data when selected class changes
  const fetchReport = async () => {
    if (!selectedClassId) return;
    setLoadingReport(true);
    try {
      const res = await fetch(`/api/reports/attendance?classId=${selectedClassId}`);
      if (res.ok) {
        const result = await res.json();
        setReportData(result.data);
      } else {
        addToast({
          type: "error",
          title: "Error",
          message: "Failed to generate report data.",
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingReport(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [selectedClassId]);

  // Client-side CSV Exporter
  const handleExportCSV = () => {
    if (!reportData) return;

    const headers = [
      "Student Number",
      "First Name",
      "Last Name",
      "Email",
      "Present",
      "Late",
      "Absent",
      "Excused",
      "Total Sessions",
      "Attendance Rate (%)",
    ];

    const rows = reportData.roster.map((s) => [
      s.StudentNumber,
      s.FirstName,
      s.LastName,
      s.Email,
      s.Present,
      s.Late,
      s.Absent,
      s.Excused,
      s.TotalSessions,
      s.AttendanceRate.toFixed(2),
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `Attendance_Report_${reportData.classDetails.SubjectCode}_${reportData.classDetails.SectionCode}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast({
      type: "success",
      title: "Export Success",
      message: "CSV report downloaded successfully.",
    });
  };

  const handlePrintPDF = () => {
    window.print();
  };

  if (loadingClasses) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-500 text-sm">Preparing report catalogs...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 print:bg-white print:text-black">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.025em", margin: 0, lineHeight: 1.25 }}>Attendance Reports</h1>
          <p style={{ fontSize: 14, color: "#64748B", margin: "5px 0 0", fontWeight: 400 }}>Analyze student engagement indexes and export audit lists.</p>
        </div>
        {reportData && (
          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              className="pm-btn-secondary flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> Export CSV
            </button>
            <button
              onClick={handlePrintPDF}
              className="pm-btn-primary flex items-center gap-2"
            >
              <Printer className="w-4 h-4" /> Print / PDF
            </button>
          </div>
        )}
      </div>

      {/* Class Selector Panel */}
      <div className="pm-card flex items-center gap-4 print:hidden" style={{ padding: 16, display: "flex", gap: 12 }}>
        <div className="flex-1 max-w-xs">
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs"
          >
            <option value="">Select Class...</option>
            {classes.map((c) => (
              <option key={c.ClassId} value={c.ClassId}>
                {c.Subject.SubjectCode} - {c.Semester.SemesterName}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={fetchReport}
          className="pm-btn-secondary" style={{ padding: 10 }}
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Report Summary Cards */}
      {loadingReport ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-500 text-xs">Compiling records...</span>
        </div>
      ) : !reportData ? (
        <div className="pm-card" style={{ padding: 48, textAlign: "center", color: "#64748B", fontSize: 14 }}>
          Please select a class to view report analysis.
        </div>
      ) : (
        <div className="space-y-8">
          {/* Printable Report Header */}
          <div className="hidden print:block mb-8 text-center">
            <h1 className="text-2xl font-bold">Schedule Tracker Academic Attendance Report</h1>
            <p className="text-sm text-slate-500 mt-1">
              Class: {reportData.classDetails.SubjectName} ({reportData.classDetails.SubjectCode}) | Section: {reportData.classDetails.SectionCode}
            </p>
            <p className="text-xs text-slate-500">
              Term: {reportData.classDetails.SemesterName} ({reportData.classDetails.SchoolYear}) | Total Sessions: {reportData.totalClosedSessions}
            </p>
          </div>

          {/* Metrics Overview */}
          <div className="grid grid-cols-3 gap-4 print:grid-cols-3">
            <div className="pm-stat-card pm-card-animate print:border-slate-300" style={{ "--strip-color": "#6366F1" } as React.CSSProperties}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#4F46E5", letterSpacing: "-0.03em", lineHeight: 1.1, marginTop: 4 }}>
                {reportData.totalClosedSessions}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1E293B", marginTop: 2 }}>Total Sessions</div>
              <div style={{ fontSize: 11.5, color: "#64748B", fontWeight: 400, marginTop: 1 }}>Closed & completed</div>
            </div>
            <div className="pm-stat-card pm-card-animate print:border-slate-300" style={{ "--strip-color": "#10B981" } as React.CSSProperties}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#059669", letterSpacing: "-0.03em", lineHeight: 1.1, marginTop: 4 }}>
                {reportData.roster.length}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1E293B", marginTop: 2 }}>Enrolled Students</div>
              <div style={{ fontSize: 11.5, color: "#64748B", fontWeight: 400, marginTop: 1 }}>Active roster count</div>
            </div>
            <div className="pm-stat-card pm-card-animate print:border-slate-300" style={{ "--strip-color": "#8B5CF6" } as React.CSSProperties}>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#7C3AED", letterSpacing: "-0.03em", lineHeight: 1.1, marginTop: 4 }}>
                {(
                  reportData.roster.reduce((acc, curr) => acc + curr.AttendanceRate, 0) /
                  (reportData.roster.length || 1)
                ).toFixed(1)}%
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#1E293B", marginTop: 2 }}>Average Present Rate</div>
              <div style={{ fontSize: 11.5, color: "#64748B", fontWeight: 400, marginTop: 1 }}>Across all students</div>
            </div>
          </div>

          {/* Attendance Roster Table */}
          <div className="pm-card" style={{ overflow: "hidden" }}>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b" style={{ borderColor: "#E2E8F0", background: "#F8FAFC" }}>
                    <th className="p-4 sm:p-5" style={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.06em", textTransform: "uppercase" }}>Student Details</th>
                    <th className="p-4 sm:p-5" style={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.06em", textTransform: "uppercase" }}>Present</th>
                    <th className="p-4 sm:p-5" style={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.06em", textTransform: "uppercase" }}>Late</th>
                    <th className="p-4 sm:p-5" style={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.06em", textTransform: "uppercase" }}>Absent</th>
                    <th className="p-4 sm:p-5" style={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.06em", textTransform: "uppercase" }}>Excused</th>
                    <th className="p-4 sm:p-5 text-right" style={{ fontSize: 11, fontWeight: 700, color: "#64748B", letterSpacing: "0.06em", textTransform: "uppercase" }}>Attendance Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs text-slate-700 print:divide-slate-200 print:text-black">
                  {reportData.roster.map((student) => (
                    <tr key={student.StudentId} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4 sm:p-5">
                        <div>
                          <h4 style={{ fontSize: 13, fontWeight: 700, color: "#0F172A" }}>
                            {student.LastName}, {student.FirstName}
                          </h4>
                          <p style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>
                            {student.StudentNumber} | {student.Email}
                          </p>
                        </div>
                      </td>
                      <td className="p-4 sm:p-5" style={{ color: "#10B981", fontWeight: 600, fontSize: 13 }}>{student.Present}</td>
                      <td className="p-4 sm:p-5" style={{ color: "#F59E0B", fontWeight: 600, fontSize: 13 }}>{student.Late}</td>
                      <td className="p-4 sm:p-5" style={{ color: "#EF4444", fontWeight: 600, fontSize: 13 }}>{student.Absent}</td>
                      <td className="p-4 sm:p-5" style={{ color: "#3B82F6", fontWeight: 600, fontSize: 13 }}>{student.Excused}</td>
                      <td className="p-4 sm:p-5 text-right" style={{ fontWeight: 700, color: "#0F172A", fontSize: 13 }}>
                        {student.AttendanceRate.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
