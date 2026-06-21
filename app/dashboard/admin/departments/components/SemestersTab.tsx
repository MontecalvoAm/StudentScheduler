"use client";

import React, { useEffect, useState } from "react";
import { useUIStore } from "@/stores/ui-store";
import { 
  CalendarDays, 
  Plus, 
  X,
  Layers,
  Edit2,
  Trash2
} from "lucide-react";

export default function SemestersTab() {
  const { addToast } = useUIStore();
  const [semestersList, setSemestersList] = useState<any[]>([]);
  const [schoolYearsList, setSchoolYearsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [modalType, setModalType] = useState<"none" | "schoolYear" | "semester">("none");
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editId, setEditId] = useState<number | null>(null);
  const [academicYear, setAcademicYear] = useState("");
  const [syStartDate, setSyStartDate] = useState("");
  const [syEndDate, setSyEndDate] = useState("");

  const [semesterTerm, setSemesterTerm] = useState("1st Semester");
  const [semStartDate, setSemStartDate] = useState("");
  const [semEndDate, setSemEndDate] = useState("");
  const [selectedSchoolYearId, setSelectedSchoolYearId] = useState("");
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

  const handleDelete = async (type: "schoolYear" | "semester", id: number) => {
    if (!window.confirm(`Are you sure you want to delete this ${type === "schoolYear" ? "school year" : "semester"}?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/semesters?type=${type}&id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        addToast({ type: "success", title: "Deleted", message: "Successfully deleted item." });
        fetchSemestersData();
      } else {
        const result = await res.json().catch(() => ({ message: "Unknown error" }));
        addToast({ type: "error", title: "Delete Failed", message: result.message || "Failed to delete item." });
      }
    } catch (err) {
      console.error(err);
      addToast({ type: "error", title: "Error", message: "Failed to delete item." });
    }
  };

  const openEditModal = (type: "schoolYear" | "semester", item: any) => {
    setModalType(type);
    setModalMode("edit");
    if (type === "schoolYear") {
      setEditId(item.SchoolYearId);
      setAcademicYear(item.YearLabel);
      setSyStartDate(new Date(item.StartDate).toISOString().split("T")[0]);
      setSyEndDate(new Date(item.EndDate).toISOString().split("T")[0]);
    } else {
      setEditId(item.SemesterId);
      setSelectedSchoolYearId(item.SchoolYearId.toString());
      setSemesterTerm(item.SemesterName);
      setSemStartDate(new Date(item.StartDate).toISOString().split("T")[0]);
      setSemEndDate(new Date(item.EndDate).toISOString().split("T")[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = "/api/semesters";
      const payload = modalType === "schoolYear" 
        ? {
            type: "schoolYear",
            id: modalMode === "edit" ? editId : undefined,
            yearLabel: academicYear,
            startDate: syStartDate,
            endDate: syEndDate
          }
        : {
            type: "semester",
            id: modalMode === "edit" ? editId : undefined,
            schoolYearId: selectedSchoolYearId,
            semesterName: semesterTerm,
            startDate: semStartDate,
            endDate: semEndDate
          };

      const res = await fetch(url, {
        method: modalMode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        addToast({ 
          type: "success", 
          title: modalMode === "edit" ? "Updated" : "Created",
          message: `${modalType === "schoolYear" ? "School Year" : "Semester"} successfully ${modalMode === "edit" ? "updated" : "added"}.`
        });
        setModalType("none");
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
    setModalMode("create");
    setEditId(null);
    setAcademicYear("");
    setSyStartDate("");
    setSyEndDate("");
    setSemesterTerm("1st Semester");
    setSemStartDate("");
    setSemEndDate("");
    setSelectedSchoolYearId("");
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              resetForm();
              setModalType("schoolYear");
            }}
            className="cursor-pointer flex items-center gap-2 bg-slate-800 text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-slate-900 transition-colors shadow-lg"
          >
            <Plus className="w-4 h-4" /> Add School Year
          </button>
          <button
            onClick={() => {
              resetForm();
              setModalType("semester");
            }}
            className="cursor-pointer flex items-center gap-2 bg-indigo-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
          >
            <Plus className="w-4 h-4" /> Add Semester
          </button>
        </div>
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
                          <td className="p-5 text-right space-x-2">
                            <button
                              onClick={() => openEditModal("schoolYear", sy)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete("schoolYear", sy.SchoolYearId)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
                          <td className="p-5 text-right space-x-2">
                            <button
                              onClick={() => openEditModal("semester", sem)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                              title="Edit"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete("semester", sem.SemesterId)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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

      {modalType !== "none" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-md rounded-3xl p-6 shadow-2xl relative bg-white">
            <button
              onClick={() => setModalType("none")}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6 text-center">
              <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 mb-3">
                <CalendarDays className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {modalMode === "edit" ? "Edit " : "Add "}
                {modalType === "schoolYear" ? "School Year" : "Semester"}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                {modalMode === "edit" ? "Update details for this academic period." : (modalType === "schoolYear" ? "Create a new academic year." : "Create a new semester period for a school year.")}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {modalType === "schoolYear" ? (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Academic Year Label</label>
                    <input
                      type="text"
                      required
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      placeholder="e.g. 2026-2027"
                      className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs font-bold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Start Date</label>
                      <input
                        type="date"
                        required
                        value={syStartDate}
                        onChange={(e) => setSyStartDate(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">End Date</label>
                      <input
                        type="date"
                        required
                        value={syEndDate}
                        onChange={(e) => setSyEndDate(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs font-bold"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">School Year</label>
                    <select
                      required
                      value={selectedSchoolYearId}
                      onChange={(e) => setSelectedSchoolYearId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs font-bold bg-white"
                    >
                      <option value="" disabled>Select School Year</option>
                      {schoolYearsList.map((sy) => (
                        <option key={sy.SchoolYearId} value={sy.SchoolYearId}>{sy.YearLabel}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Semester Name</label>
                    <input
                      type="text"
                      required
                      value={semesterTerm}
                      onChange={(e) => setSemesterTerm(e.target.value)}
                      placeholder="e.g. 1st Semester"
                      className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs font-bold"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Start Date</label>
                      <input
                        type="date"
                        required
                        value={semStartDate}
                        onChange={(e) => setSemStartDate(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">End Date</label>
                      <input
                        type="date"
                        required
                        value={semEndDate}
                        onChange={(e) => setSemEndDate(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs font-bold"
                      />
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="cursor-pointer w-full py-3 px-4 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-150 disabled:bg-slate-300 mt-4"
              >
                {submitting ? "Saving changes..." : `${modalMode === "edit" ? "Save Changes" : "Create"} ${modalType === "schoolYear" ? "School Year" : "Semester"}`}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
