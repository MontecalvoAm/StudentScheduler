"use client";

import React, { useState } from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Filter } from "lucide-react";

export default function AdminCalendarPage() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const daysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const daysCount = daysInMonth(currentDate);
  const startDay = firstDayOfMonth(currentDate);

  const days = Array.from({ length: daysCount }, (_, i) => i + 1);
  const blanks = Array.from({ length: startDay }, (_, i) => i);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.025em", margin: 0 }}>Academic Calendar</h1>
          <p style={{ fontSize: 14, color: "#64748B", marginTop: 4 }}>Manage and visualize academic schedules for the current month.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="pm-btn-secondary p-2"><ChevronLeft className="w-5 h-5" /></button>
          <span className="font-bold text-slate-900 px-4">
            {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
          </span>
          <button className="pm-btn-secondary p-2"><ChevronRight className="w-5 h-5" /></button>
          <button className="pm-btn-primary flex items-center gap-2">
            <Filter className="w-4 h-4" /> Filter
          </button>
        </div>
      </div>

      <div className="pm-card overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-100">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
            <div key={day} className="p-4 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 auto-rows-fr">
          {blanks.map(b => <div key={`blank-${b}`} className="p-4 min-h-[120px] bg-slate-50/50 border-r border-b border-slate-100" />)}
          {days.map(d => (
            <div key={d} className="p-4 min-h-[120px] border-r border-b border-slate-100 hover:bg-slate-50 transition-colors">
              <span className="text-sm font-bold text-slate-900">{d}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
