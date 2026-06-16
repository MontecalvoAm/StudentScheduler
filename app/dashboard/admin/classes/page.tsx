"use client";

import React, { useEffect, useState } from "react";
import { useUIStore } from "@/stores/ui-store";
import { Plus, X, Search, RefreshCw, Award, User, Users, BookOpen } from "lucide-react";

interface ClassRecord {
  ClassId: number;
  SectionCode: string;
  MaxStudents: number;
  StudySession: string | null;
  Subject: {
    SubjectId: number;
    SubjectCode: string;
    SubjectName: string;
  };
  Semester: {
    SemesterId: number;
    SemesterName: string;
    SchoolYear: {
      YearLabel: string;
    };
  };
  Enrollments: any[];
  ClassAssignments: {
    Instructor: {
      InstructorId: number;
      User: {
        FirstName: string;
        LastName: string;
      };
    };
  }[];
}

interface Subject {
  SubjectId: number;
  SubjectCode: string;
  SubjectName: string;
}

interface Semester {
  SemesterId: number;
  SemesterName: string;
  SchoolYear: {
    YearLabel: string;
  };
}

interface Instructor {
  InstructorId: number;
  FirstName: string;
  LastName: string;
  EmployeeNumber: string;
}

interface Student {
  StudentId: number;
  FirstName: string;
  LastName: string;
  StudentNumber: string;
}

export default function AdminClassesPage() {
  const { addToast } = useUIStore();
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modals state
  const [isClassOpen, setIsClassOpen] = useState(false);
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<ClassRecord | null>(null);

  // Form states
  const [subjectId, setSubjectId] = useState("");
  const [semesterId, setSemesterId] = useState("");
  const [sectionCode, setSectionCode] = useState("");
  const [studySession, setStudySession] = useState("");
  const [maxStudents, setMaxStudents] = useState(40);

  const [instructorId, setInstructorId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/classes");
      if (res.ok) {
        const result = await res.json();
        setClasses(result.classes);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [subjectsRes, semestersRes, instructorsRes, studentsRes] = await Promise.all([
        fetch("/api/subjects"),
        fetch("/api/semesters"),
        fetch("/api/instructors"),
        fetch("/api/students"),
      ]);

      if (subjectsRes.ok) setSubjects((await subjectsRes.json()).subjects);
      if (semestersRes.ok) setSemesters((await semestersRes.json()).semesters);
      if (instructorsRes.ok) setInstructors((await instructorsRes.json()).instructors);
      if (studentsRes.ok) setStudents((await studentsRes.json()).students);
    } catch (err) {
      console.error("Dependency loading error:", err);
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchDependencies();
  }, []);

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch("/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          SubjectId: parseInt(subjectId, 10),
          SemesterId: parseInt(semesterId, 10),
          SectionCode: sectionCode,
          MaxStudents: maxStudents,
          StudySession: studySession || undefined,
        }),
      });

      if (res.ok) {
        addToast({ type: "success", title: "Class Created" });
        setIsClassOpen(false);
        resetClassForm();
        fetchClasses();
      } else {
        const result = await res.json();
        addToast({ type: "error", title: "Failed to create class", message: result.message });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignInstructor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/classes/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ClassId: selectedClass.ClassId,
          InstructorId: parseInt(instructorId, 10),
        }),
      });

      if (res.ok) {
        addToast({ type: "success", title: "Instructor Assigned" });
        setIsAssignOpen(false);
        setInstructorId("");
        fetchClasses();
      } else {
        const result = await res.json();
        addToast({ type: "error", title: "Failed to assign", message: result.message });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnrollStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClass) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/classes/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ClassId: selectedClass.ClassId,
          StudentId: parseInt(studentId, 10),
        }),
      });

      if (res.ok) {
        addToast({ type: "success", title: "Student Enrolled" });
        setIsEnrollOpen(false);
        setStudentId("");
        fetchClasses();
      } else {
        const result = await res.json();
        addToast({ type: "error", title: "Failed to enroll", message: result.message });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const resetClassForm = () => {
    setSubjectId("");
    setSemesterId("");
    setSectionCode("");
    setStudySession("");
    setMaxStudents(40);
  };

  const filtered = classes.filter(
    (c) =>
      c.SectionCode.toLowerCase().includes(search.toLowerCase()) ||
      c.Subject.SubjectCode.toLowerCase().includes(search.toLowerCase()) ||
      c.Subject.SubjectName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.025em", margin: 0, lineHeight: 1.25 }}>Class Sections</h1>
          <p style={{ fontSize: 14, color: "#64748B", margin: "5px 0 0", fontWeight: 400 }}>Manage class catalogs, faculty assignments, and student roster enrollments.</p>
        </div>
        <button
          onClick={() => {
            resetClassForm();
            setIsClassOpen(true);
          }}
          className="pm-btn-primary self-start sm:self-center flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Class
        </button>
      </div>

      {/* Filter panel */}
      <div className="pm-card" style={{ padding: 16, display: "flex", gap: 12 }}>
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by code, title, or section..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs placeholder:text-slate-400"
          />
        </div>
        <button
          onClick={fetchClasses}
          className="pm-btn-secondary" style={{ padding: 10 }}
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Classes Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-500 text-xs">Querying section catalog...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="pm-card" style={{ padding: 48, textAlign: "center", color: "#64748B", fontSize: 14 }}>
          No classes registered.
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => {
            const instructor = item.ClassAssignments?.[0]?.Instructor;
            return (
              <div
                key={item.ClassId}
                className="pm-card pm-card-animate flex flex-col justify-between"
                style={{ padding: 20 }}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="pm-badge" style={{ background: "#F5F3FF", color: "#6D28D9", fontSize: 10, fontWeight: 700 }}>
                      {item.Subject.SubjectCode}
                    </span>
                    <div className="flex items-center gap-2">
                      {item.StudySession && <span className="text-[9px] font-bold text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded-full">{item.StudySession}</span>}
                      <span style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>Sec: {item.SectionCode}</span>
                    </div>
                  </div>
                  <h3 className="truncate" style={{ fontSize: 15, fontWeight: 700, color: "#0F172A" }}>{item.Subject.SubjectName}</h3>
                  <p style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>{item.Semester.SemesterName} ({item.Semester.SchoolYear.YearLabel})</p>

                  <div style={{ height: 1, background: "#E2E8F0", margin: "16px 0 12px" }} />
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="w-3.5 h-3.5" style={{ color: "#94A3B8" }} />
                      <span style={{ fontSize: 13, color: "#64748B" }}>Fac: {instructor ? `${instructor.User.FirstName} ${instructor.User.LastName}` : "None Assigned"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5" style={{ color: "#94A3B8" }} />
                      <span style={{ fontSize: 13, color: "#64748B" }}>Roster: {item.Enrollments.length} / {item.MaxStudents} Students</span>
                    </div>
                  </div>
                </div>

                <div style={{ height: 1, background: "#E2E8F0", margin: "16px 0 12px" }} />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setSelectedClass(item);
                      setIsAssignOpen(true);
                    }}
                    className="pm-btn-secondary flex-1" style={{ fontSize: 11, padding: "8px 12px" }}
                  >
                    Assign Faculty
                  </button>
                  <button
                    onClick={() => {
                      setSelectedClass(item);
                      setIsEnrollOpen(true);
                    }}
                    className="pm-btn-secondary flex-1" style={{ fontSize: 11, padding: "8px 12px" }}
                  >
                    Enroll Student
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Modal: Create Class ─── */}
      {isClassOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-md rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsClassOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <div className="inline-flex items-center justify-center p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 mb-3">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Create Section Offering</h3>
              <p className="text-xs text-slate-500 mt-1">Configure subjects, sections, and class bounds.</p>
            </div>

            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Subject</label>
                <select
                  required
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs"
                >
                  <option value="">Select Subject...</option>
                  {subjects.map((s) => (
                    <option key={s.SubjectId} value={s.SubjectId}>
                      {s.SubjectCode} - {s.SubjectName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Academic Term (Semester)</label>
                <select
                  required
                  value={semesterId}
                  onChange={(e) => setSemesterId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs"
                >
                  <option value="">Select Semester...</option>
                  {semesters.map((sem) => (
                    <option key={sem.SemesterId} value={sem.SemesterId}>
                      {sem.SemesterName} ({sem.SchoolYear.YearLabel})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Section Code</label>
                  <input
                    type="text"
                    required
                    value={sectionCode}
                    onChange={(e) => setSectionCode(e.target.value.toUpperCase())}
                    placeholder="e.g. CS1A"
                    className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Session</label>
                  <select
                    value={studySession}
                    onChange={(e) => setStudySession(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs"
                  >
                    <option value="">Select Session...</option>
                    <option value="DAY">DAY</option>
                    <option value="NIGHT">NIGHT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Max Students</label>
                <input
                  type="number"
                  required
                  min={1}
                  max={200}
                  value={maxStudents}
                  onChange={(e) => setMaxStudents(parseInt(e.target.value, 10))}
                  className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-4 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-lg shadow-indigo-600/20 cursor-pointer"
              >
                {submitting ? "Saving..." : "Add Class Offering"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal: Assign Instructor ─── */}
      {isAssignOpen && selectedClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-md rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsAssignOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-900">Assign Faculty Instructor</h3>
              <p className="text-xs text-slate-500 mt-1">Assign primary instructor for class section: {selectedClass.SectionCode}.</p>
            </div>

            <form onSubmit={handleAssignInstructor} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Select Instructor</label>
                <select
                  required
                  value={instructorId}
                  onChange={(e) => setInstructorId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs"
                >
                  <option value="">Select Instructor...</option>
                  {instructors.map((ins) => (
                    <option key={ins.InstructorId} value={ins.InstructorId}>
                      {ins.LastName}, {ins.FirstName} ({ins.EmployeeNumber})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-4 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer"
              >
                {submitting ? "Assigning..." : "Confirm Assignment"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal: Enroll Student ─── */}
      {isEnrollOpen && selectedClass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-md rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsEnrollOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6">
              <h3 className="text-lg font-bold text-slate-900">Enroll Student in Class</h3>
              <p className="text-xs text-slate-500 mt-1">Add student to section roster list.</p>
            </div>

            <form onSubmit={handleEnrollStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Select Student</label>
                <select
                  required
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs"
                >
                  <option value="">Select Student...</option>
                  {students.map((st) => (
                    <option key={st.StudentId} value={st.StudentId}>
                      {st.LastName}, {st.FirstName} ({st.StudentNumber})
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-4 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-all cursor-pointer"
              >
                {submitting ? "Enrolling..." : "Enroll Student"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
