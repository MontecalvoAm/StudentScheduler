"use client";

import React, { useEffect, useState } from "react";
import { useUIStore } from "@/stores/ui-store";
import { Calendar, Plus, X, Search, RefreshCw, Clock, MapPin, BookOpen, AlertTriangle } from "lucide-react";

interface ScheduleRecord {
  ScheduleId: number;
  DayOfWeek: number;
  StartTime: string;
  EndTime: string;
  Class: {
    ClassId: number;
    SectionCode: string;
    Subject: {
      SubjectCode: string;
      SubjectName: string;
    };
  };
  Room: {
    RoomId: number;
    RoomCode: string;
    RoomName: string;
  };
}

interface ClassRecord {
  ClassId: number;
  SectionCode: string;
  Subject: {
    SubjectCode: string;
    SubjectName: string;
  };
}

interface RoomRecord {
  RoomId: number;
  RoomCode: string;
  RoomName: string;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function AdminSchedulesPage() {
  const { addToast } = useUIStore();
  const [schedules, setSchedules] = useState<ScheduleRecord[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [rooms, setRooms] = useState<RoomRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [isOpen, setIsOpen] = useState(false);
  const [classId, setClassId] = useState("");
  const [roomId, setRoomId] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState("1"); // Default Monday
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("09:30");
  const [effectiveFrom, setEffectiveFrom] = useState(new Date().toISOString().split("T")[0]);
  const [submitting, setSubmitting] = useState(false);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/schedules");
      if (res.ok) {
        const result = await res.json();
        setSchedules(result.schedules);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [classesRes, roomsRes] = await Promise.all([
        fetch("/api/classes"),
        fetch("/api/rooms"),
      ]);

      if (classesRes.ok) setClasses((await classesRes.json()).classes);
      if (roomsRes.ok) setRooms((await roomsRes.json()).rooms);
    } catch (err) {
      console.error("Dependency error in schedules:", err);
    }
  };

  useEffect(() => {
    fetchSchedules();
    fetchDependencies();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ClassId: parseInt(classId, 10),
          RoomId: parseInt(roomId, 10),
          DayOfWeek: parseInt(dayOfWeek, 10),
          StartTime: startTime,
          EndTime: endTime,
          EffectiveFrom: effectiveFrom,
        }),
      });

      const result = await res.json();
      if (res.ok) {
        addToast({ type: "success", title: "Schedule Created" });
        setIsOpen(false);
        resetForm();
        fetchSchedules();
      } else {
        addToast({
          type: "error",
          title: "Scheduling Conflict Detected",
          message: result.message ?? "Could not build class schedule.",
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setClassId("");
    setRoomId("");
    setDayOfWeek("1");
    setStartTime("08:00");
    setEndTime("09:30");
  };

  const filtered = schedules.filter(
    (s) =>
      s.Class.Subject.SubjectCode.toLowerCase().includes(search.toLowerCase()) ||
      s.Class.Subject.SubjectName.toLowerCase().includes(search.toLowerCase()) ||
      s.Room.RoomCode.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.025em", margin: 0, lineHeight: 1.25 }}>Class Timetables</h1>
          <p style={{ fontSize: 14, color: "#64748B", margin: "5px 0 0", fontWeight: 400 }}>Configure schedule calendars, facility allocations, and instructor slots.</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsOpen(true);
          }}
          className="pm-btn-primary self-start sm:self-center flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Schedule Slot
        </button>
      </div>

      {/* Search Filter */}
      <div className="pm-card" style={{ padding: 16, display: "flex", gap: 12 }}>
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by code, title, room..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs placeholder:text-slate-400"
          />
        </div>
        <button
          onClick={fetchSchedules}
          className="pm-btn-secondary" style={{ padding: 10 }}
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Schedules grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-500 text-xs">Querying calendar...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="pm-card" style={{ padding: 48, textAlign: "center", color: "#64748B", fontSize: 14 }}>
          No schedules configured.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <div
              key={item.ScheduleId}
              className="pm-card pm-card-animate flex flex-col justify-between"
              style={{ padding: 20 }}
            >
              <div>
                <div className="flex items-center justify-between mb-3.5">
                  <span className="pm-badge" style={{ background: "#F5F3FF", color: "#6D28D9", fontSize: 10, fontWeight: 700, fontFamily: "monospace" }}>
                    {DAYS[item.DayOfWeek]}
                  </span>
                  <span style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>{item.Class.SectionCode}</span>
                </div>
                <h3 className="truncate" style={{ fontSize: 15, fontWeight: 700, color: "#0F172A" }}>{item.Class.Subject.SubjectName}</h3>
                <div style={{ height: 1, background: "#E2E8F0", margin: "16px 0 12px" }} />
                <div className="flex flex-wrap gap-y-2">
                  <div className="flex items-center gap-1.5 w-full">
                    <Clock className="w-3.5 h-3.5" style={{ color: "#94A3B8" }} />
                    <span style={{ fontSize: 13, color: "#64748B" }}>{item.StartTime} - {item.EndTime}</span>
                  </div>
                  <div className="flex items-center gap-1.5 w-full">
                    <MapPin className="w-3.5 h-3.5" style={{ color: "#94A3B8" }} />
                    <span style={{ fontSize: 13, color: "#64748B" }}>{item.Room.RoomName} ({item.Room.RoomCode})</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── Modal: Create Schedule ─── */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-md rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <div className="inline-flex items-center justify-center p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-3">
                <Calendar className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Create Schedule Slot</h3>
              <p className="text-xs text-slate-500 mt-1">Setup day slots and verify allocation overlap conflicts.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Class Section</label>
                <select
                  required
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs"
                >
                  <option value="">Select Class Section...</option>
                  {classes.map((cls) => (
                    <option key={cls.ClassId} value={cls.ClassId}>
                      {cls.Subject.SubjectCode} - {cls.SectionCode}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Facility Room</label>
                <select
                  required
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs"
                >
                  <option value="">Select Room...</option>
                  {rooms.map((rm) => (
                    <option key={rm.RoomId} value={rm.RoomId}>
                      {rm.RoomName} ({rm.RoomCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Day of Week</label>
                <select
                  required
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs font-semibold"
                >
                  {DAYS.map((day, idx) => (
                    <option key={day} value={idx}>
                      {day}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Start Time</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">End Time</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs"
                  />
                </div>
              </div>

              <div className="p-3.5 bg-amber-500/5 border border-amber-500/15 rounded-xl text-[10px] text-amber-400 leading-normal flex items-start gap-2.5 mt-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>The system automatically checks room schedules and assigned instructors' availability slots to prevent timing overlaps.</span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-4 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/20 cursor-pointer"
              >
                {submitting ? "Processing..." : "Add Timetable Slot"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
