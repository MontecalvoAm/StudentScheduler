"use client";

import React, { useEffect, useState } from "react";
import { useUIStore } from "@/stores/ui-store";
import { 
  BookMarked, 
  Plus, 
  X,
  Layers
} from "lucide-react";

interface SectionData {
  name: string;
  studentCount: number;
}

interface Course {
  CourseToken: string;
  CourseCode: string;
  CourseName: string;
}

export default function SectionsTab() {
  const { addToast } = useUIStore();
  const [sectionsList, setSectionsList] = useState<SectionData[]>([]);
  const [coursesList, setCoursesList] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [isOpen, setIsOpen] = useState(false);
  const [courseToken, setCourseToken] = useState("");
  const [sectionName, setSectionName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch sections
      const secRes = await fetch("/api/admin/sections");
      if (secRes.ok) {
        const secResult = await secRes.json();
        setSectionsList(secResult.sections);
      }
      
      // Fetch courses for the dropdown
      const courseRes = await fetch("/api/courses");
      if (courseRes.ok) {
        const courseResult = await courseRes.json();
        setCoursesList(courseResult.courses || []);
      }
    } catch (err) {
      console.error("Failed to load data:", err);
      addToast({ type: "error", title: "Error", message: "Failed to fetch sections data." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = "/api/sections";
      const payload = {
        CourseToken: courseToken,
        SectionName: sectionName,
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        addToast({ 
          type: "success", 
          title: "Section Created",
          message: `Section ${sectionName} has been saved.`
        });
        setIsOpen(false);
        resetForm();
        fetchData();
      } else {
        const result = await res.json().catch(() => ({ message: "Unknown error" }));
        addToast({ type: "error", title: "Action Failed", message: result.message || "Failed to create section." });
      }
    } catch (err) {
      console.error(err);
      addToast({ type: "error", title: "Error", message: "Failed to submit request." });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCourseToken("");
    setSectionName("");
  };

  return (
    <>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <BookMarked className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Class Sections</h2>
            <p className="text-[11px] text-slate-400 font-medium">All section codes registered in the student registry.</p>
          </div>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsOpen(true);
          }}
          className="cursor-pointer flex items-center gap-2 bg-indigo-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
        >
          <Plus className="w-4 h-4" /> Add Section
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-500 text-xs font-semibold">Querying Sections...</span>
        </div>
      ) : (
        <div className="pm-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50" style={{ fontSize: 10, fontWeight: 800, color: "#64748B", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  <th className="p-5">Section Code</th>
                  <th className="p-5 text-center">Total Students</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {sectionsList.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="p-8 text-center text-slate-400 italic">No sections found in student registry.</td>
                  </tr>
                ) : (
                  sectionsList.map((section) => (
                    <tr key={section.name} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-5 font-bold text-slate-900 font-mono">{section.name}</td>
                      <td className="p-5 text-center font-semibold text-indigo-600">{section.studentCount}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
                <BookMarked className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Add Section</h3>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                Create a new class section assigned to a specific course.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Course</label>
                <select
                  required
                  value={courseToken}
                  onChange={(e) => setCourseToken(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs font-bold bg-white"
                >
                  <option value="" disabled>Select a Course</option>
                  {coursesList.map((c) => (
                    <option key={c.CourseToken} value={c.CourseToken}>
                      {c.CourseCode} - {c.CourseName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Section Code</label>
                <input
                  type="text"
                  required
                  value={sectionName}
                  onChange={(e) => setSectionName(e.target.value)}
                  placeholder="e.g. 1A, 2B, C"
                  className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs font-bold"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="cursor-pointer w-full py-3 px-4 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-150 disabled:bg-slate-300 mt-4"
              >
                {submitting ? "Saving changes..." : "Create Section"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
