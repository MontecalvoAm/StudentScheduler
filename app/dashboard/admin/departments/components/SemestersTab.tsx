"use client";

import React, { useEffect, useState } from "react";
import { useUIStore } from "@/stores/ui-store";
import { 
  CalendarDays, 
  Plus, 
  X,
  Layers
} from "lucide-react";

export default function SemestersTab() {
  const { addToast } = useUIStore();
  const [semestersList, setSemestersList] = useState<any[]>([]);
  const [schoolYearsList, setSchoolYearsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [isOpen, setIsOpen] = useState(false);
  const [academicYear, setAcademicYear] = useState("");
  const [semesterTerm, setSemesterTerm] = useState("1st Semester");
  const [submitting, setSubmitting] = useState(false);

  const fetchSemestersData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/semesters?all=true");
      if (res.ok) {
        const result = await res.json();
        setSemestersList(result.semesters);
        setSchoolYearsList(result.schoolYears);
      }
    } catch (err) {
      console.error("Failed to load semesters/years:", err);
      addToast({ type: "error", title: "Error", message: "Failed to fetch calendar data." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSemestersData();
  }, []);

  const handleToggleActive = async (type: "semester" | "schoolYear", id: number, currentStatus: boolean) => {
    try {
      const res = await fetch("/api/semesters", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id, isActive: !currentStatus }),
      });
      if (res.ok) {
        addToast({
          type: "success",
          title: "Status Updated",
          message: `Successfully updated ${type === "semester" ? "semester" : "school year"} active state.`,
        });
        fetchSemestersData();
      } else {
        addToast({
          type: "error",
          title: "Update Failed",
          message: "Failed to update active state.",
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = "/api/semesters";
      const payload = {
        academicYear,
        semesterTerm,
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        addToast({ 
          type: "success", 
          title: "Calendar Entry Created",
          message: `Term successfully added.`
        });
        setIsOpen(false);
        resetForm();
        fetchSemestersData();
      } else {
        const result = await res.json().catch(() => ({ message: "Unknown error" }));
        addToast({ type: "error", title: "Action Failed", message: result.message || "Failed to create entry." });
      }
    } catch (err) {
      console.error(err);
      addToast({ type: "error", title: "Error", message: "Failed to submit request." });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setAcademicYear("");
    setSemesterTerm("1st Semester");
  };

  return (
    <>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Academic Calendar</h2>
            <p className="text-[11px] text-slate-400 font-medium">Manage school years and semester periods.</p>
          </div>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsOpen(true);
          }}
          className="cursor-pointer flex items-center gap-2 bg-indigo-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
        >
          <Plus className="w-4 h-4" /> Add School Semester/Year
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-500 text-xs font-semibold">Querying Semesters & Years...</span>
        </div>
      ) : (
        <div className="space-y-8">
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-4">Academic School Years</h3>
            <div className="pm-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50" style={{ fontSize: 10, fontWeight: 800, color: "#64748B", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      <th className="p-5">Year Label</th>
                      <th className="p-5">Duration</th>
                      <th className="p-5 text-center">Status</th>
                      <th className="p-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {schoolYearsList.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-400 italic">No school years found.</td>
                      </tr>
                    ) : (
                      schoolYearsList.map((sy) => (
                        <tr key={sy.SchoolYearId} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-5 font-bold text-slate-900">{sy.YearLabel}</td>
                          <td className="p-5 text-slate-500">
                            {new Date(sy.StartDate).toLocaleDateString()} - {new Date(sy.EndDate).toLocaleDateString()}
                          </td>
                          <td className="p-5 text-center">
                            <span className={`inline-block px-2.5 py-1 rounded-lg text-[9px] font-bold tracking-wider ${
                              sy.IsActive ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-slate-100 text-slate-500 border border-slate-200"
                            }`}>
                              {sy.IsActive ? "ACTIVE" : "INACTIVE"}
                            </span>
                          </td>
                          <td className="p-5 text-right">
                            <button
                              onClick={() => handleToggleActive("schoolYear", sy.SchoolYearId, sy.IsActive)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                                sy.IsActive
                                  ? "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100"
                                  : "bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100"
                              }`}
                            >
                              {sy.IsActive ? "Deactivate" : "Activate"}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-900 mb-4">Academic Semesters</h3>
            <div className="pm-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50" style={{ fontSize: 10, fontWeight: 800, color: "#64748B", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      <th className="p-5">Semester Name</th>
                      <th className="p-5">Academic Year</th>
                      <th className="p-5">Duration</th>
                      <th className="p-5 text-center">Status</th>
                      <th className="p-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {semestersList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400 italic">No semesters found.</td>
                      </tr>
                    ) : (
                      semestersList.map((sem) => (
                        <tr key={sem.SemesterId} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-5 font-bold text-slate-900">{sem.SemesterName}</td>
                          <td className="p-5 text-slate-500 font-mono">{sem.SchoolYear?.YearLabel}</td>
                          <td className="p-5 text-slate-500">
                            {new Date(sem.StartDate).toLocaleDateString()} - {new Date(sem.EndDate).toLocaleDateString()}
                          </td>
                          <td className="p-5 text-center">
                            <span className={`inline-block px-2.5 py-1 rounded-lg text-[9px] font-bold tracking-wider ${
                              sem.IsActive ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-slate-100 text-slate-500 border border-slate-200"
                            }`}>
                              {sem.IsActive ? "ACTIVE" : "INACTIVE"}
                            </span>
                          </td>
                          <td className="p-5 text-right">
                            <button
                              onClick={() => handleToggleActive("semester", sem.SemesterId, sem.IsActive)}
                              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                                sem.IsActive
                                  ? "bg-rose-50 text-rose-600 border-rose-100 hover:bg-rose-100"
                                  : "bg-indigo-50 text-indigo-600 border-indigo-100 hover:bg-indigo-100"
                              }`}
                            >
                              {sem.IsActive ? "Deactivate" : "Activate"}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-md rounded-3xl p-6 shadow-2xl relative bg-white">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6 text-center">
              <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 mb-3">
                <CalendarDays className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Add School Semester/Year</h3>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                Create a new academic period to assign to classes.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Academic Year</label>
                <input
                  type="text"
                  required
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="e.g. 2025-2026"
                  className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Semester</label>
                <select
                  required
                  value={semesterTerm}
                  onChange={(e) => setSemesterTerm(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs font-bold bg-white"
                >
                  <option value="1st Semester">1st Semester</option>
                  <option value="2nd Semester">2nd Semester</option>
                  <option value="Summer">Summer</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="cursor-pointer w-full py-3 px-4 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-150 disabled:bg-slate-300 mt-4"
              >
                {submitting ? "Saving changes..." : "Create Calendar Entry"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
