"use client";

import React, { useEffect, useState } from "react";
import { useUIStore } from "@/stores/ui-store";
import { 
  Layers, 
  Plus, 
  X, 
  Search, 
  CheckCircle2, 
  Award,
  Trash2,
  Edit,
} from "lucide-react";

interface Department {
  DepartmentId: number;
  DepartmentToken: string;
  DepartmentCode: string;
  DepartmentName: string;
  Description: string | null;
  IsActive: boolean;
  _count?: {
    Courses: number;
  };
}

interface Stats {
  totalDepartments: number;
  activeDepartments: number;
  totalCourses: number;
}

export default function DepartmentsTab() {
  const { addToast } = useUIStore();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [stats, setStats] = useState<Stats>({ totalDepartments: 0, activeDepartments: 0, totalCourses: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const [isOpen, setIsOpen] = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [departmentCode, setDepartmentCode] = useState("");
  const [departmentName, setDepartmentName] = useState("");
  const [description, setDescription] = useState("");
  const [isActiveStatus, setIsActiveStatus] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/departments?search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const result = await res.json();
        setDepartments(result.departments);
        
        const activeCount = result.departments.filter((d: Department) => d.IsActive).length;
        const totalCoursesCount = result.departments.reduce((sum: number, d: Department) => sum + (d._count?.Courses || 0), 0);
        setStats({
          totalDepartments: result.departments.length,
          activeDepartments: activeCount,
          totalCourses: totalCoursesCount
        });
      } else {
        addToast({ type: "error", title: "Error", message: "Failed to fetch departments." });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDepartments();
  }, [search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const isEdit = !!editingDept;
      const url = "/api/departments";
      const method = isEdit ? "PUT" : "POST";
      const payload = {
        DepartmentToken: editingDept?.DepartmentToken,
        DepartmentCode: departmentCode,
        DepartmentName: departmentName,
        Description: description || undefined,
        IsActive: isActiveStatus,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        addToast({ 
          type: "success", 
          title: isEdit ? "Department Updated" : "Department Created",
          message: `Department ${departmentCode} has been saved.`
        });
        setIsOpen(false);
        resetForm();
        fetchDepartments();
      } else {
        const result = await res.json();
        addToast({ type: "error", title: "Action Failed", message: result.message });
      }
    } catch (err) {
      console.error(err);
      addToast({ type: "error", title: "Error", message: "Failed to submit request." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (dept: Department) => {
    setEditingDept(dept);
    setDepartmentCode(dept.DepartmentCode);
    setDepartmentName(dept.DepartmentName);
    setDescription(dept.Description || "");
    setIsActiveStatus(dept.IsActive);
    setIsOpen(true);
  };

  const handleDelete = async (token: string, code: string) => {
    if (!window.confirm(`Are you sure you want to delete department ${code}?`)) return;
    try {
      const res = await fetch(`/api/departments?departmentToken=${token}`, { method: "DELETE" });
      if (res.ok) {
        addToast({ type: "success", title: "Deleted", message: "Department successfully removed." });
        fetchDepartments();
      } else {
        const result = await res.json();
        addToast({ type: "error", title: "Error", message: result.message || "Failed to delete department." });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const resetForm = () => {
    setEditingDept(null);
    setDepartmentCode("");
    setDepartmentName("");
    setDescription("");
    setIsActiveStatus(true);
  };

  const filtered = departments.filter((dept) => {
    if (statusFilter === "ACTIVE") return dept.IsActive;
    if (statusFilter === "INACTIVE") return !dept.IsActive;
    return true;
  });

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="pm-card flex items-center justify-between" style={{ padding: "20px 24px" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.07em", textTransform: "uppercase" }}>Total Departments</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#0F172A", marginTop: 4 }}>{stats.totalDepartments}</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        <div className="pm-card flex items-center justify-between" style={{ padding: "20px 24px" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.07em", textTransform: "uppercase" }}>Active Units</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#10B981", marginTop: 4 }}>{stats.activeDepartments}</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="pm-card flex items-center justify-between" style={{ padding: "20px 24px" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", letterSpacing: "0.07em", textTransform: "uppercase" }}>Linked Programs</div>
            <div style={{ fontSize: 32, fontWeight: 800, color: "#F59E0B", marginTop: 4 }}>{stats.totalCourses}</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-2xl border border-slate-200/80 shadow-xs max-w-md w-full">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by department code or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs font-semibold bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all uppercase ${statusFilter === "ALL" ? "bg-white text-slate-800 shadow-xs" : "text-slate-500 hover:text-slate-800"}`}
            >
              All
            </button>
            <button
              onClick={() => setStatusFilter("ACTIVE")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all uppercase ${statusFilter === "ACTIVE" ? "bg-white text-emerald-600 shadow-xs" : "text-slate-500 hover:text-emerald-500"}`}
            >
              Active
            </button>
            <button
              onClick={() => setStatusFilter("INACTIVE")}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wider transition-all uppercase ${statusFilter === "INACTIVE" ? "bg-white text-slate-700 shadow-xs" : "text-slate-500 hover:text-slate-700"}`}
            >
              Inactive
            </button>
          </div>

          <button
            onClick={() => {
              resetForm();
              setIsOpen(true);
            }}
            className="cursor-pointer flex items-center gap-2 bg-indigo-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
          >
            <Plus className="w-4 h-4" /> Add Department
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-500 text-xs font-semibold font-mono">Querying Departments...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="pm-card" style={{ padding: 64, textAlign: "center", color: "#94A3B8", fontSize: 14, fontWeight: 500, fontStyle: "italic" }}>
          No departments found matching the filter criteria.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((dept) => (
            <div
              key={dept.DepartmentId}
              className="pm-card pm-card-animate flex flex-col justify-between group"
              style={{ padding: "24px" }}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="inline-block px-3 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] font-extrabold tracking-wider border border-indigo-100 uppercase">
                    {dept.DepartmentCode}
                  </span>
                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleEdit(dept)}
                      className="p-1 hover:bg-slate-100 rounded text-slate-500 hover:text-indigo-600"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(dept.DepartmentToken, dept.DepartmentCode)}
                      className="p-1 hover:bg-red-50 rounded text-slate-500 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", lineHeight: 1.4, marginBottom: 10 }} className="line-clamp-2 min-h-[2.8rem]">
                  {dept.DepartmentName}
                </h3>
                {dept.Description ? (
                  <p className="line-clamp-3 leading-relaxed" style={{ fontSize: 13, color: "#64748B", marginTop: 12 }}>
                    {dept.Description}
                  </p>
                ) : (
                  <p className="italic" style={{ fontSize: 12, color: "#CBD5E1", marginTop: 12 }}>No catalog description provided.</p>
                )}
              </div>
              <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${dept.IsActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                  {dept.IsActive ? 'OPERATIONAL' : 'INACTIVE'}
                </span>
                <span className="text-[11px] font-bold text-slate-400">
                  {dept._count?.Courses || 0} Programs
                </span>
              </div>
            </div>
          ))}
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
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {editingDept ? "Edit Department" : "Add Department"}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                Configure administrative divisions and course/catalog grouping.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Department Code</label>
                <input
                  type="text"
                  required
                  value={departmentCode}
                  onChange={(e) => setDepartmentCode(e.target.value.toUpperCase())}
                  placeholder="e.g. CCS"
                  className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Department Name</label>
                <input
                  type="text"
                  required
                  value={departmentName}
                  onChange={(e) => setDepartmentName(e.target.value)}
                  placeholder="e.g. College of Computer Studies"
                  className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide department description or focus area..."
                  className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs font-semibold resize-none"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActiveStatus"
                  checked={isActiveStatus}
                  onChange={(e) => setIsActiveStatus(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <label htmlFor="isActiveStatus" className="text-xs font-bold text-slate-600 select-none">
                  Department is operational
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="cursor-pointer w-full py-3 px-4 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-150 disabled:bg-slate-300"
              >
                {submitting ? "Saving changes..." : editingDept ? "Save Changes" : "Initialize Department"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
