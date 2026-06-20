"use client";

import React, { useEffect, useState } from "react";
import { useUIStore } from "@/stores/ui-store";
import { 
  Clock, 
  Plus, 
  X,
  Layers
} from "lucide-react";

interface SessionData {
  name: string;
  studentCount: number;
}

export default function SessionsTab() {
  const { addToast } = useUIStore();
  const [sessionsList, setSessionsList] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [isOpen, setIsOpen] = useState(false);
  const [sessionType, setSessionType] = useState("DAY"); // DAY or NIGHT
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchSessionsData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/sessions");
      if (res.ok) {
        const result = await res.json();
        setSessionsList(result.sessions);
      }
    } catch (err) {
      console.error("Failed to load sessions:", err);
      addToast({ type: "error", title: "Error", message: "Failed to fetch sessions." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessionsData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const url = "/api/sessions"; // Using standard API path as planned
      const payload = {
        sessionType,
        startTime,
        endTime
      };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        addToast({ 
          type: "success", 
          title: "Session Created",
          message: `Session has been saved.`
        });
        setIsOpen(false);
        resetForm();
        fetchSessionsData();
      } else {
        const result = await res.json().catch(() => ({ message: "Unknown error" }));
        addToast({ type: "error", title: "Action Failed", message: result.message || "Failed to create session." });
      }
    } catch (err) {
      console.error(err);
      addToast({ type: "error", title: "Error", message: "Failed to submit request." });
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSessionType("DAY");
    setStartTime("");
    setEndTime("");
  };

  return (
    <>
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Study Sessions</h2>
            <p className="text-[11px] text-slate-400 font-medium">Student distribution by study period program.</p>
          </div>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsOpen(true);
          }}
          className="cursor-pointer flex items-center gap-2 bg-indigo-600 text-white font-bold text-xs px-4 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
        >
          <Plus className="w-4 h-4" /> Add Session
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-500 text-xs font-semibold">Querying Sessions...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sessionsList.length === 0 ? (
            <div className="pm-card col-span-2" style={{ padding: 64, textAlign: "center", color: "#94A3B8", fontSize: 14, fontWeight: 500, fontStyle: "italic" }}>
              No sessions found in student registry.
            </div>
          ) : (
            sessionsList.map((session) => (
              <div key={session.name} className="pm-stat-card pm-card-animate" style={{ "--strip-color": session.name === "DAY" ? "#3B82F6" : "#6366F1", padding: "24px" } as React.CSSProperties}>
                <h3 className="text-lg font-bold text-slate-900 tracking-tight">{session.name} SESSION</h3>
                <p className="text-xs text-slate-400 font-semibold mt-1">Study Period Program</p>
                <div className="text-3xl font-extrabold text-slate-900 mt-4">{session.studentCount} Students</div>
              </div>
            ))
          )}
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
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Add Session</h3>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                Create a new study period program schedule.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Session Type</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="sessionType"
                      value="DAY"
                      checked={sessionType === "DAY"}
                      onChange={(e) => setSessionType(e.target.value)}
                      className="text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    Day Class
                  </label>
                  <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                    <input
                      type="radio"
                      name="sessionType"
                      value="NIGHT"
                      checked={sessionType === "NIGHT"}
                      onChange={(e) => setSessionType(e.target.value)}
                      className="text-indigo-600 focus:ring-indigo-500 border-slate-300"
                    />
                    Night Class
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Start Time</label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">End Time</label>
                <input
                  type="time"
                  required
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs font-bold"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="cursor-pointer w-full py-3 px-4 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-150 disabled:bg-slate-300 mt-4"
              >
                {submitting ? "Saving changes..." : "Create Session"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
