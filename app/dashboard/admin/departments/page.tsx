"use client";

import React, { useState } from "react";
import DepartmentsTab from "./components/DepartmentsTab";
import SessionsTab from "./components/SessionsTab";
import SectionsTab from "./components/SectionsTab";
import SemestersTab from "./components/SemestersTab";

export default function AdminDepartmentsPage() {
  const [activeTab, setActiveTab] = useState("departments");

  return (
    <div className="space-y-6">
      {/* ─── Tab Navigation ─── */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("departments")}
          className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${
            activeTab === "departments" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Departments
        </button>
        <button
          onClick={() => setActiveTab("sessions")}
          className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${
            activeTab === "sessions" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Sessions
        </button>
        <button
          onClick={() => setActiveTab("sections")}
          className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${
            activeTab === "sections" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Sections
        </button>
        <button
          onClick={() => setActiveTab("semesters")}
          className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${
            activeTab === "semesters" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Year &amp; Semester
        </button>
      </div>

      {/* ─── Tab Content ─── */}
      <div className="mt-6">
        {activeTab === "departments" && <DepartmentsTab />}
        {activeTab === "sessions" && <SessionsTab />}
        {activeTab === "sections" && <SectionsTab />}
        {activeTab === "semesters" && <SemestersTab />}
      </div>
    </div>
  );
}
