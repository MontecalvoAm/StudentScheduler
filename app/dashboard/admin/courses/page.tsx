"use client";

import React, { useEffect, useState } from "react";
import { useUIStore } from "@/stores/ui-store";
import {
  GraduationCap,
  Plus,
  BookOpen,
  Search,
  Trash2,
  ChevronRight,
  User,
  PlusCircle,
  CheckCircle,
  AlertCircle,
  Clock,
  Layers,
  ArrowRight,
  FileText,
  X,
  Sparkles,
  Award,
} from "lucide-react";

interface Department {
  DepartmentToken: string;
  DepartmentCode: string;
  DepartmentName: string;
}

interface Course {
  CourseToken: string;
  CourseCode: string;
  CourseName: string;
  Description: string | null;
  YearsDuration: number;
  RequiredUnits: number;
  IsActive: boolean;
  DepartmentId: number | null;
  Department?: Department | null;
  _count?: {
    CourseSubjects: number;
  };
}

interface Subject {
  SubjectToken: string;
  SubjectCode: string;
  SubjectName: string;
  Units: number;
}

interface Mapping {
  CourseSubjectToken: string;
  YearLevel: number;
  Semester: number;
  Subject: Subject;
}

interface StudyPlanSubject {
  StudyPlanSubjectToken: string;
  TargetYearLevel: number;
  TargetSemester: number;
  Status: string;
  Subject: Subject;
  Prerequisites: any[];
}

export default function CoursesPage() {
  const { addToast } = useUIStore();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Course Form Modal State
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseCode, setCourseCode] = useState("");
  const [courseName, setCourseName] = useState("");
  const [yearsDuration, setYearsDuration] = useState("4");
  const [requiredUnits, setRequiredUnits] = useState("120");
  const [description, setDescription] = useState("");
  const [submittingCourse, setSubmittingCourse] = useState(false);

  // Departments state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [departmentToken, setDepartmentToken] = useState("");

  // Curriculum Management Drawer State
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [mappings, setMappings] = useState<Mapping[]>([]);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [selectedSubjectToken, setSelectedSubjectToken] = useState("");
  const [mapYear, setMapYear] = useState("1");
  const [mapSemester, setMapSemester] = useState("1");
  const [mappingSubmitting, setMappingSubmitting] = useState(false);

  // Irregular Study Plan View State
  const [studentSearchNumber, setStudentSearchNumber] = useState("");
  const [activePlanStudent, setActivePlanStudent] = useState<any | null>(null);
  const [studyPlanSubjects, setStudyPlanSubjects] = useState<StudyPlanSubject[]>([]);
  const [floatingSubjects, setFloatingSubjects] = useState<any[]>([]);
  const [selectedFloatingToken, setSelectedFloatingToken] = useState("");
  const [planYear, setPlanYear] = useState("1");
  const [planSemester, setPlanSemester] = useState("1");
  const [planSubmitting, setPlanSubmitting] = useState(false);
  const [loadingStudent, setLoadingStudent] = useState(false);

  // Fetch Departments list
  const fetchDepartments = async () => {
    try {
      const res = await fetch("/api/departments");
      const data = await res.json();
      if (data.success) {
        setDepartments(data.departments);
      }
    } catch (err) {
      console.error("Failed to fetch departments:", err);
    }
  };

  // Fetch Courses list
  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/courses?search=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (data.success) {
        setCourses(data.courses);
      } else {
        addToast({ type: "error", title: "Error", message: data.message || "Failed to fetch courses." });
      }
    } catch (err) {
      console.error(err);
      addToast({ type: "error", title: "Error", message: "Failed to connect to servers." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [search]);

  useEffect(() => {
    fetchDepartments();
  }, []);

  // Handle Create or Update Course
  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCourse(true);
    try {
      const isEdit = !!editingCourse;
      const url = "/api/courses";
      const method = isEdit ? "PUT" : "POST";
      const payload = {
        CourseToken: editingCourse?.CourseToken,
        CourseCode: courseCode,
        CourseName: courseName,
        Description: description,
        YearsDuration: parseInt(yearsDuration, 10),
        RequiredUnits: parseInt(requiredUnits, 10),
        DepartmentToken: departmentToken || null,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        addToast({
          type: "success",
          title: "Success",
          message: `Course ${isEdit ? "updated" : "created"} successfully.`,
        });
        setIsCourseModalOpen(false);
        setEditingCourse(null);
        resetCourseForm();
        fetchCourses();
      } else {
        addToast({ type: "error", title: "Action Failed", message: data.message || "Request failed." });
      }
    } catch (err) {
      console.error(err);
      addToast({ type: "error", title: "Connection Failed", message: "Failed to send request." });
    } finally {
      setSubmittingCourse(false);
    }
  };

  const resetCourseForm = () => {
    setCourseCode("");
    setCourseName("");
    setYearsDuration("4");
    setRequiredUnits("120");
    setDescription("");
    setDepartmentToken("");
  };

  const openEditCourse = (course: Course) => {
    setEditingCourse(course);
    setCourseCode(course.CourseCode);
    setCourseName(course.CourseName);
    setYearsDuration(course.YearsDuration.toString());
    setRequiredUnits(course.RequiredUnits.toString());
    setDescription(course.Description || "");
    setDepartmentToken(course.Department?.DepartmentToken || "");
    setIsCourseModalOpen(true);
  };

  const handleDeleteCourse = async (token: string) => {
    if (!confirm("Are you sure you want to delete this course?")) return;
    try {
      const res = await fetch(`/api/courses?courseToken=${token}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        addToast({ type: "success", title: "Deleted", message: "Course removed successfully." });
        fetchCourses();
      } else {
        addToast({ type: "error", title: "Delete Failed", message: data.message });
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Curriculum mapping
  const loadCurriculum = async (course: Course) => {
    setActiveCourse(course);
    try {
      const res = await fetch(`/api/courses/subjects?courseToken=${course.CourseToken}`);
      const data = await res.json();
      if (data.success) {
        setMappings(data.mappings);
        setAllSubjects(data.allSubjects);
        setSelectedSubjectToken(data.allSubjects[0]?.SubjectToken || "");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubjectToken || !activeCourse) return;
    setMappingSubmitting(true);
    try {
      const res = await fetch("/api/courses/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          CourseToken: activeCourse.CourseToken,
          SubjectToken: selectedSubjectToken,
          YearLevel: parseInt(mapYear, 10),
          Semester: parseInt(mapSemester, 10),
        }),
      });
      const data = await res.json();
      if (data.success) {
        addToast({ type: "success", title: "Subject Mapped", message: "Subject successfully added to curriculum." });
        loadCurriculum(activeCourse);
      } else {
        addToast({ type: "error", title: "Mapping Failed", message: data.message });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setMappingSubmitting(false);
    }
  };

  const handleRemoveMapping = async (mappingToken: string) => {
    try {
      const res = await fetch(`/api/courses/subjects?courseSubjectToken=${mappingToken}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success && activeCourse) {
        addToast({ type: "success", title: "Removed", message: "Subject removed from curriculum." });
        loadCurriculum(activeCourse);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Student Custom Study Plan Handling
  const handleFindStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentSearchNumber.trim()) return;
    setLoadingStudent(true);
    try {
      const res = await fetch(`/api/students/study-plan?studentNumber=${encodeURIComponent(studentSearchNumber)}`);
      const data = await res.json();
      if (data.success) {
        setActivePlanStudent(data.student);
        setStudyPlanSubjects(data.studyPlan.Subjects);
        setFloatingSubjects(data.floatingSubjects);
        setSelectedFloatingToken(data.floatingSubjects[0]?.SubjectToken || "");
      } else {
        addToast({ type: "error", title: "Not Found", message: data.message || "Student search failed." });
        setActivePlanStudent(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingStudent(false);
    }
  };

  const handleAddToStudyPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePlanStudent || !selectedFloatingToken) return;
    setPlanSubmitting(true);
    try {
      // Find the study plan token
      const res = await fetch(`/api/students/study-plan?studentNumber=${activePlanStudent.StudentNumber}`);
      const data = await res.json();
      if (!data.success) throw new Error("Plan not fetched");

      const planToken = data.studyPlan.StudyPlanToken;

      const addRes = await fetch("/api/students/study-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          StudyPlanToken: planToken,
          SubjectToken: selectedFloatingToken,
          TargetYearLevel: parseInt(planYear, 10),
          TargetSemester: parseInt(planSemester, 10),
          Status: "PENDING"
        })
      });

      const addData = await addRes.json();
      if (addData.success) {
        addToast({ type: "success", title: "Subject Added", message: "Subject added to student study plan." });
        // Refresh
        const refreshRes = await fetch(`/api/students/study-plan?studentNumber=${activePlanStudent.StudentNumber}`);
        const refreshData = await refreshRes.json();
        setStudyPlanSubjects(refreshData.studyPlan.Subjects);
        setFloatingSubjects(refreshData.floatingSubjects);
        setSelectedFloatingToken(refreshData.floatingSubjects[0]?.SubjectToken || "");
      } else {
        addToast({ type: "error", title: "Error", message: addData.message });
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setPlanSubmitting(false);
    }
  };

  const handleRemoveFromPlan = async (planSubjectToken: string) => {
    try {
      const res = await fetch(`/api/students/study-plan?planSubjectToken=${planSubjectToken}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success && activePlanStudent) {
        addToast({ type: "success", title: "Removed", message: "Subject removed from study plan." });
        const refreshRes = await fetch(`/api/students/study-plan?studentNumber=${activePlanStudent.StudentNumber}`);
        const refreshData = await refreshRes.json();
        setStudyPlanSubjects(refreshData.studyPlan.Subjects);
        setFloatingSubjects(refreshData.floatingSubjects);
        setSelectedFloatingToken(refreshData.floatingSubjects[0]?.SubjectToken || "");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.025em", margin: 0, lineHeight: 1.25 }}>Course Catalog</h1>
          <p style={{ fontSize: 14, color: "#64748B", margin: "5px 0 0", fontWeight: 400 }}>Configure academic program duration, graduation credits, and custom study plans.</p>
        </div>
        <button
          onClick={() => {
            setEditingCourse(null);
            resetCourseForm();
            setIsCourseModalOpen(true);
          }}
          className="pm-btn-primary self-start sm:self-center flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Course
        </button>
      </div>

      {/* ─── Top Cards Summary ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="pm-stat-card pm-card-animate" style={{ "--strip-color": "#6366F1", padding: "24px" } as React.CSSProperties}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Courses</span>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 text-center">{courses.length}</div>
          <div className="text-[11px] text-slate-500 font-medium text-center mt-1">Registered programs</div>
        </div>
        <div className="pm-stat-card pm-card-animate" style={{ "--strip-color": "#10B981", padding: "24px" } as React.CSSProperties}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Programs</span>
            <CheckCircle className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 text-center">{courses.filter(c => c.IsActive).length}</div>
          <div className="text-[11px] text-slate-500 font-medium text-center mt-1">Operational curriculums</div>
        </div>
        <div className="pm-stat-card pm-card-animate" style={{ "--strip-color": "#F59E0B", padding: "24px" } as React.CSSProperties}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Avg. Required Units</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 text-center">
            {courses.length ? Math.round(courses.reduce((sum, c) => sum + c.RequiredUnits, 0) / courses.length) : 0}
          </div>
          <div className="text-[11px] text-slate-500 font-medium text-center mt-1">Completion requirement</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Courses Grid & List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="pm-card space-y-4" style={{ padding: 20 }}>
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search by program code or title..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs placeholder:text-slate-400 font-medium"
              />
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-slate-500 text-xs font-semibold">Querying Catalog...</span>
              </div>
            ) : courses.length === 0 ? (
              <div className="pm-card" style={{ padding: 64, textAlign: "center", color: "#94A3B8", fontSize: 14, fontWeight: 500, fontStyle: "italic" }}>
                No courses registered in the academic catalog.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {courses.map((course) => (
                  <div
                    key={course.CourseToken}
                    onClick={() => loadCurriculum(course)}
                    className="pm-card pm-card-animate flex flex-col justify-between group cursor-pointer"
                    style={{ padding: "24px" }}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                          <span className="inline-block px-3 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-[10px] font-extrabold tracking-wider border border-indigo-100 uppercase">
                            {course.CourseCode}
                          </span>
                          {course.Department && (
                            <span className="inline-block px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-[10px] font-extrabold tracking-wider border border-slate-200 uppercase">
                              {course.Department.DepartmentCode}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => openEditCourse(course)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors"
                          >
                            <Layers className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCourse(course.CourseToken)}
                            className="p-1.5 hover:bg-red-50 rounded-lg text-slate-500 hover:text-red-600 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", lineHeight: 1.4, marginBottom: 10 }} className="line-clamp-2 min-h-[2.8rem]">
                        {course.CourseName}
                      </h3>
                      {course.Description ? (
                        <p className="line-clamp-3 leading-relaxed" style={{ fontSize: 13, color: "#64748B", marginTop: 12 }}>
                          {course.Description}
                        </p>
                      ) : (
                        <p className="italic" style={{ fontSize: 12, color: "#CBD5E1", marginTop: 12 }}>No catalog description provided.</p>
                      )}
                    </div>
                    <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-between">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${course.IsActive ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                        {course.IsActive ? 'OPERATIONAL' : 'INACTIVE'}
                      </span>
                      <span style={{ fontSize: 12, color: "#64748B", fontWeight: 700 }}>
                        {course.YearsDuration} Years &bull; {course.RequiredUnits} Units
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Custom Study Plan for Irregular Students */}
        <div className="space-y-6">
          <div className="pm-card space-y-4" style={{ padding: 20 }}>
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm">Custom Study Plans</h3>
              <p className="text-[10px] text-slate-500 font-medium">
                Draft customized curriculum, validate prerequisites, and manage floating subjects.
              </p>
            </div>

            {/* Student Search */}
            <form onSubmit={handleFindStudent} className="flex gap-2">
              <input
                type="text"
                placeholder="Enter Student ID / Number..."
                value={studentSearchNumber}
                onChange={(e) => setStudentSearchNumber(e.target.value)}
                className="flex-1 px-3 py-2 rounded-xl text-slate-800 glass-input text-xs placeholder:text-slate-400 font-medium"
              />
              <button
                type="submit"
                disabled={loadingStudent}
                className="cursor-pointer inline-flex items-center gap-1 bg-indigo-600 text-white font-bold text-xs px-3.5 py-2 rounded-xl hover:bg-indigo-700 disabled:bg-slate-300"
              >
                Find
              </button>
            </form>

            {loadingStudent && (
              <div className="py-8 text-center">
                <div className="w-6 h-6 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-1" />
                <span className="text-[10px] text-slate-400 font-medium">Checking student registry...</span>
              </div>
            )}

            {activePlanStudent && (
              <div className="space-y-4 border-t border-slate-100 pt-4">
                {/* Student Info Card */}
                <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs space-y-1">
                  <div className="font-extrabold text-indigo-700">
                    {activePlanStudent.FirstName} {activePlanStudent.LastName}
                  </div>
                  <div className="text-[10px] font-bold text-slate-400">{activePlanStudent.StudentNumber}</div>
                  <div className="text-[10px] font-medium text-slate-500">Course: {activePlanStudent.CourseName}</div>
                </div>

                {/* Floating subjects selector (Subjects student can take) */}
                <div className="space-y-2">
                  <h4 className="font-extrabold text-xs text-slate-800">Add Floating Subject</h4>
                  {floatingSubjects.length === 0 ? (
                    <p className="text-[10px] italic text-slate-400 bg-slate-50 p-3 rounded-lg border border-slate-100">
                      No eligible floating subjects (all prerequisites satisfied, or none untaken).
                    </p>
                  ) : (
                    <form onSubmit={handleAddToStudyPlan} className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <select
                        value={selectedFloatingToken}
                        onChange={(e) => setSelectedFloatingToken(e.target.value)}
                        className="w-full px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-200 text-slate-700 outline-none focus:border-indigo-500 font-medium"
                      >
                        {floatingSubjects.map((sub) => (
                          <option key={sub.SubjectToken} value={sub.SubjectToken}>
                            [{sub.SubjectCode}] {sub.SubjectName} ({sub.Units} Units)
                          </option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <select
                          value={planYear}
                          onChange={(e) => setPlanYear(e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-200 text-slate-700 outline-none focus:border-indigo-500 font-medium"
                        >
                          <option value="1">Year 1</option>
                          <option value="2">Year 2</option>
                          <option value="3">Year 3</option>
                          <option value="4">Year 4</option>
                        </select>
                        <select
                          value={planSemester}
                          onChange={(e) => setPlanSemester(e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-lg text-xs bg-white border border-slate-200 text-slate-700 outline-none focus:border-indigo-500 font-medium"
                        >
                          <option value="1">1st Sem</option>
                          <option value="2">2nd Sem</option>
                          <option value="3">Summer</option>
                        </select>
                        <button
                          type="submit"
                          disabled={planSubmitting}
                          className="cursor-pointer px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 disabled:bg-slate-300"
                        >
                          Add
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Plan schedule checklist */}
                <div className="space-y-2">
                  <h4 className="font-extrabold text-xs text-slate-800">Current Study Plan</h4>
                  {studyPlanSubjects.length === 0 ? (
                    <p className="text-[10px] italic text-slate-400">Empty study plan.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                      {studyPlanSubjects.map((s) => (
                        <div
                          key={s.StudyPlanSubjectToken}
                          className="flex flex-col bg-white border border-slate-100 hover:border-slate-200 rounded-xl p-3 text-xs"
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-extrabold text-indigo-600">{s.Subject.SubjectCode}</span>
                            <button
                              onClick={() => handleRemoveFromPlan(s.StudyPlanSubjectToken)}
                              className="text-slate-400 hover:text-red-500 p-0.5"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <span className="font-bold text-slate-800 text-[11px] my-0.5">{s.Subject.SubjectName}</span>
                          <div className="flex justify-between items-center text-[10px] text-slate-400 mt-1.5">
                            <span className="font-bold">
                              Y{s.TargetYearLevel}S{s.TargetSemester}
                            </span>
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-bold text-slate-600">
                              {s.Status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Modal: Create/Edit Course ─── */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="glass w-full max-w-lg rounded-3xl p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setIsCourseModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6 text-center">
              <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 mb-3">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                {editingCourse ? "Modify Course Profile" : "Register New Course"}
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">
                Set year parameters, unit requirements, and general descriptors.
              </p>
            </div>

            <form onSubmit={handleSaveCourse} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Course Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BSCS"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl text-slate-800 bg-slate-50 border border-slate-200 text-xs font-semibold focus:border-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Course Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Computer Science"
                    value={courseName}
                    onChange={(e) => setCourseName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl text-slate-800 bg-slate-50 border border-slate-200 text-xs font-semibold focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Years Duration</label>
                  <select
                    value={yearsDuration}
                    onChange={(e) => setYearsDuration(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl text-slate-800 bg-slate-50 border border-slate-200 text-xs font-semibold focus:border-indigo-500 outline-none"
                  >
                    <option value="1">1 Year</option>
                    <option value="2">2 Years</option>
                    <option value="3">3 Years</option>
                    <option value="4">4 Years</option>
                    <option value="5">5 Years</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Required Units</label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 120"
                    value={requiredUnits}
                    onChange={(e) => setRequiredUnits(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-2xl text-slate-800 bg-slate-50 border border-slate-200 text-xs font-semibold focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Department</label>
                <select
                  value={departmentToken}
                  onChange={(e) => setDepartmentToken(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl text-slate-800 bg-slate-50 border border-slate-200 text-xs font-semibold focus:border-indigo-500 outline-none"
                >
                  <option value="">No Department</option>
                  {departments.map((dept) => (
                    <option key={dept.DepartmentToken} value={dept.DepartmentToken}>
                      {dept.DepartmentName} ({dept.DepartmentCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Description</label>
                <textarea
                  rows={3}
                  placeholder="Summarize course goals..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl text-slate-800 bg-slate-50 border border-slate-200 text-xs font-semibold focus:border-indigo-500 outline-none resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={submittingCourse}
                className="cursor-pointer w-full py-3 px-4 rounded-2xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-150 disabled:bg-slate-350"
              >
                {submittingCourse ? "Processing Course..." : editingCourse ? "Save Changes" : "Initialize Course"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal: Curriculum Map ─── */}
      {activeCourse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="glass w-full max-w-4xl rounded-3xl p-6 shadow-2xl relative my-8 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setActiveCourse(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6 text-center">
              <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 mb-3">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Curriculum Map: <span className="text-indigo-600">{activeCourse.CourseCode}</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 font-semibold">
                Subject mapping and sequence configuration for {activeCourse.CourseName}.
              </p>
            </div>

            {/* Add Mapping Form */}
            <form onSubmit={handleAddMapping} className="grid grid-cols-1 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-6">
              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Select Subject</label>
                <select
                  value={selectedSubjectToken}
                  onChange={(e) => setSelectedSubjectToken(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white border border-slate-200 text-slate-700 outline-none focus:border-indigo-500 font-medium"
                >
                  {allSubjects.map((sub) => (
                    <option key={sub.SubjectToken} value={sub.SubjectToken}>
                      [{sub.SubjectCode}] {sub.SubjectName} ({sub.Units} Units)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Year</label>
                <select
                  value={mapYear}
                  onChange={(e) => setMapYear(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white border border-slate-200 text-slate-700 outline-none focus:border-indigo-500 font-medium"
                >
                  {Array.from({ length: activeCourse.YearsDuration }).map((_, i) => (
                    <option key={i} value={i + 1}>
                      Year {i + 1}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Semester</label>
                  <select
                    value={mapSemester}
                    onChange={(e) => setMapSemester(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl text-xs bg-white border border-slate-200 text-slate-700 outline-none focus:border-indigo-500 font-medium"
                  >
                    <option value="1">1st Sem</option>
                    <option value="2">2nd Sem</option>
                    <option value="3">Summer</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={mappingSubmitting}
                  className="cursor-pointer p-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm disabled:bg-slate-300"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Mapped Subjects Grouped */}
            <div className="space-y-4">
              {Array.from({ length: activeCourse.YearsDuration }).map((_, yearIdx) => {
                const y = yearIdx + 1;
                const semesters = [1, 2, 3];
                return (
                  <div key={y} className="border border-slate-100 rounded-2xl p-4 space-y-3">
                    <h5 className="font-extrabold text-xs text-indigo-600 tracking-wider uppercase">Year {y}</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {semesters.map((s) => {
                        const list = mappings.filter((m) => m.YearLevel === y && m.Semester === s);
                        return (
                          <div key={s} className="bg-slate-50/50 border border-slate-100 rounded-xl p-3">
                            <h6 className="font-bold text-[10px] text-slate-400 uppercase mb-2">
                              {s === 1 ? "First Semester" : s === 2 ? "Second Semester" : "Summer Term"}
                            </h6>
                            {list.length === 0 ? (
                              <p className="text-[10px] italic text-slate-300">No subjects mapped.</p>
                            ) : (
                              <div className="space-y-1.5">
                                {list.map((m) => (
                                  <div
                                    key={m.CourseSubjectToken}
                                    className="flex items-center justify-between bg-white border border-slate-100 rounded-lg p-2 text-xs"
                                  >
                                    <div className="font-medium text-slate-700">
                                      <span className="font-extrabold text-indigo-600 mr-1.5">
                                        {m.Subject.SubjectCode}
                                      </span>
                                      {m.Subject.SubjectName}
                                    </div>
                                    <button
                                      onClick={() => handleRemoveMapping(m.CourseSubjectToken)}
                                      className="text-slate-400 hover:text-red-500 p-1"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
