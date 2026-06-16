"use client";

import React, { useEffect, useState } from "react";
import { useUIStore } from "@/stores/ui-store";
import { Calendar, Clock, MapPin, User, BookOpen } from "lucide-react";

interface Schedule {
  ScheduleId: number;
  DayOfWeek: number;
  StartTime: string;
  EndTime: string;
  Class: {
    SectionCode: string;
    Subject: {
      SubjectCode: string;
      SubjectName: string;
    };
    ClassAssignments: {
      Instructor: {
        User: {
          FirstName: string;
          LastName: string;
        };
      };
    }[];
  };
  Room: {
    RoomCode: string;
    RoomName: string;
  };
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function StudentSchedulePage() {
  const { addToast } = useUIStore();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<number>(new Date().getDay());

  useEffect(() => {
    async function fetchSchedule() {
      try {
        const res = await fetch("/api/student/schedule");
        if (res.ok) {
          const result = await res.json();
          setSchedules(result.schedules);
        } else {
          addToast({
            type: "error",
            title: "Error",
            message: "Failed to fetch schedule data.",
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchSchedule();
  }, []);

  const filteredSchedules = schedules.filter((s) => s.DayOfWeek === selectedDay);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-slate-500 text-sm">Building class calendar...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.025em", margin: 0, lineHeight: 1.25 }}>Class Schedule</h1>
        <p style={{ fontSize: 14, color: "#64748B", margin: "5px 0 0", fontWeight: 400 }}>View and organize your weekly academic timetable.</p>
      </div>

      {/* Day Selector Buttons */}
      <div className="flex flex-wrap gap-2 pb-2" style={{ borderBottom: "1px solid #E2E8F0" }}>
        {DAYS.map((day, idx) => (
          <button
            key={day}
            onClick={() => setSelectedDay(idx)}
            className={selectedDay === idx ? "pm-btn-primary" : "pm-btn-secondary"}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Schedule Feed for Selected Day */}
      <div className="max-w-4xl space-y-4">
        {filteredSchedules.length === 0 ? (
          <div className="pm-card" style={{ padding: 48, textAlign: "center", color: "#64748B", fontSize: 14 }}>
            No classes scheduled for {DAYS[selectedDay]}.
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredSchedules.map((schedule) => (
              <div
                key={schedule.ScheduleId}
                className="pm-card pm-card-animate flex flex-col md:flex-row md:items-center justify-between gap-6"
                style={{ padding: 24 }}
              >
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ background: "#EEF2FF", border: "1px solid #E0E7FF", color: "#6366F1" }}>
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="pm-badge" style={{ background: "#EEF2FF", color: "#6366F1", fontSize: 10, fontWeight: 700 }}>
                        {schedule.Class.Subject.SubjectCode}
                      </span>
                      <span style={{ fontSize: 12, color: "#64748B" }}>({schedule.Class.SectionCode})</span>
                    </div>
                    <h3 style={{ fontSize: 15, fontWeight: 700, color: "#0F172A" }}>
                      {schedule.Class.Subject.SubjectName}
                    </h3>
                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 mt-3" style={{ fontSize: 12, color: "#64748B" }}>
                      <span className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5" style={{ color: "#94A3B8" }} />
                        {schedule.Class.ClassAssignments?.[0]
                          ? `${schedule.Class.ClassAssignments[0].Instructor.User.FirstName} ${schedule.Class.ClassAssignments[0].Instructor.User.LastName}`
                          : "TBA"}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" style={{ color: "#94A3B8" }} />
                        {schedule.Room.RoomName} ({schedule.Room.RoomCode})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0 py-3 px-4 rounded-xl md:self-center self-start" style={{ background: "#F8FAFC", border: "1px solid #E2E8F0" }}>
                  <Clock className="w-4 h-4" style={{ color: "#6366F1" }} />
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#1E293B" }}>
                      {schedule.StartTime} - {schedule.EndTime}
                    </p>
                    <p style={{ fontSize: 10, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>
                      Class Duration
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
