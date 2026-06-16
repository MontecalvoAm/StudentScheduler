"use client";

import React, { useEffect, useState } from "react";
import { useUIStore } from "@/stores/ui-store";
import {
  Users,
  Search,
  UserPlus,
  Lock,
  Unlock,
  Edit2,
  Trash2,
  X,
  Mail,
  User,
  Shield,
  BookOpen,
  RefreshCw,
  MoreVertical,
  Plus,
} from "lucide-react";

interface UserRecord {
  UserId: number;
  Email: string;
  FirstName: string;
  LastName: string;
  IsActive: boolean;
  IsLocked: boolean;
  FailedLoginCount: number;
  Role: {
    RoleId: number;
    RoleName: string;
  };
  Student?: {
    StudentNumber: string;
    YearLevel?: number;
    Section?: string;
    StudySession?: string;
  } | null;
  Instructor?: {
    EmployeeNumber: string;
    Department?: string;
  } | null;
}

interface Course {
  CourseId: number;
  CourseCode: string;
  CourseName: string;
}

interface Stats {
  userCount: number;
  roleCount: number;
  activeCount: number;
}

interface RoleRecord {
  RoleId: number;
  RoleName: string;
  Description: string | null;
  _count: { Users: number };
}

export default function AdminUsersPage() {
  const { addToast } = useUIStore();

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [roles, setRoles] = useState<RoleRecord[]>([]);
  const [stats, setStats] = useState<Stats>({ userCount: 0, roleCount: 0, activeCount: 0 });
  const [activeTab, setActiveTab] = useState("users");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [courseFilter, setCourseFilter] = useState("ALL");
  const [yearLevelFilter, setYearLevelFilter] = useState("ALL");
  const [sectionFilter, setSectionFilter] = useState("");
  const [studySessionFilter, setStudySessionFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal control
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);

  // Form states
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [roleId, setRoleId] = useState(3); // Default to Student (3)
  const [isActive, setIsActive] = useState(true);

  // Profile-specific form states
  const [studentNumber, setStudentNumber] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [courseId, setCourseId] = useState("");
  const [yearLevel, setYearLevel] = useState("");
  const [section, setSection] = useState("");
  const [studySession, setStudySession] = useState("");
  const [department, setDepartment] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "10",
        search,
      });
      if (roleFilter !== "ALL") {
        const idMap: Record<string, string> = { SUPER_ADMIN: "1", INSTRUCTOR: "2", STUDENT: "3" };
        params.append("roleId", idMap[roleFilter]);
      }
      if (statusFilter !== "ALL") params.append("isActive", statusFilter === "ACTIVE" ? "true" : "false");
      if (roleFilter === "STUDENT") {
        if (courseFilter !== "ALL") params.append("courseId", courseFilter);
        if (yearLevelFilter !== "ALL") params.append("yearLevel", yearLevelFilter);
        if (sectionFilter) params.append("section", sectionFilter);
        if (studySessionFilter !== "ALL") params.append("studySession", studySessionFilter);
      }

      const res = await fetch(`/api/users?${params.toString()}`);
      if (res.ok) {
        const result = await res.json();
        setUsers(result.data);
        setTotalPages(result.meta.totalPages);
        setStats(result.meta.stats);
      } else {
        addToast({ type: "error", title: "Error", message: "Failed to load users." });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await fetch("/api/courses");
      if (res.ok) {
        const result = await res.json();
        setCourses(result.courses);
      }
    } catch (err) {
      console.error("Failed to load courses:", err);
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch("/api/roles");
      if (res.ok) {
        const result = await res.json();
        setRoles(result.roles);
      }
    } catch (err) {
      console.error("Failed to load roles:", err);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [page, search, roleFilter, statusFilter, courseFilter, yearLevelFilter, sectionFilter, studySessionFilter]);

  useEffect(() => {
    fetchCourses();
    fetchRoles();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload: any = {
        Email: email,
        FirstName: firstName,
        LastName: lastName,
        RoleId: roleId,
      };

      if (roleId === 3) {
        payload.StudentNumber = studentNumber;
        payload.CourseId = courseId ? parseInt(courseId, 10) : undefined;
        payload.YearLevel = yearLevel ? parseInt(yearLevel, 10) : undefined;
        payload.Section = section || undefined;
        payload.StudySession = studySession || undefined;
      } else if (roleId === 2) {
        payload.EmployeeNumber = employeeNumber;
        payload.Department = department || undefined;
      }

      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (res.ok) {
        addToast({
          type: "success",
          title: "User Created",
          message: `Temporary credentials emailed to ${email}`,
        });
        setIsCreateOpen(false);
        resetForm();
        fetchUsers();
      } else {
        addToast({
          type: "error",
          title: "Failed to create user",
          message: result.message ?? "Invalid configuration parameters",
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setSubmitting(true);
    try {
      const payload: any = {
        FirstName: firstName,
        LastName: lastName,
        IsActive: isActive,
      };

      if (selectedUser.Role.RoleName === "STUDENT") {
        payload.CourseId = courseId ? parseInt(courseId, 10) : null;
        payload.YearLevel = yearLevel ? parseInt(yearLevel, 10) : null;
        payload.Section = section || null;
        payload.StudySession = studySession || null;
      } else if (selectedUser.Role.RoleName === "INSTRUCTOR") {
        payload.Department = department || null;
      }

      const res = await fetch(`/api/users/${selectedUser.UserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        addToast({ type: "success", title: "User Updated", message: "Successfully updated user profile." });
        setIsEditOpen(false);
        setSelectedUser(null);
        resetForm();
        fetchUsers();
      } else {
        const result = await res.json();
        addToast({ type: "error", title: "Error", message: result.message ?? "Failed to update user." });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleLock = async (userRecord: UserRecord) => {
    try {
      const res = await fetch(`/api/users/${userRecord.UserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ IsLocked: !userRecord.IsLocked }),
      });

      if (res.ok) {
        addToast({
          type: "success",
          title: userRecord.IsLocked ? "User Unlocked" : "User Locked",
          message: `Account is now ${userRecord.IsLocked ? "unlocked" : "locked"}`,
        });
        fetchUsers();
      } else {
        addToast({ type: "error", title: "Lock Action Failed" });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm("Are you sure you want to soft-delete this user? All associations will be preserved but access will be revoked.")) return;

    try {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      if (res.ok) {
        addToast({ type: "success", title: "User Soft-Deleted" });
        fetchUsers();
      } else {
        addToast({ type: "error", title: "Deletion Failed" });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openEditModal = (userRecord: UserRecord) => {
    setSelectedUser(userRecord);
    setFirstName(userRecord.FirstName);
    setLastName(userRecord.LastName);
    setIsActive(userRecord.IsActive);
    
    if (userRecord.Student) {
      setCourseId(userRecord.Student.CourseId?.toString() || "");
      setYearLevel(userRecord.Student.YearLevel?.toString() || "");
      setSection(userRecord.Student.Section || "");
      setStudySession(userRecord.Student.StudySession || "");
    }
    if (userRecord.Instructor) {
      setDepartment(userRecord.Instructor.Department || "");
    }

    setIsEditOpen(true);
  };

  const resetForm = () => {
    setEmail("");
    setFirstName("");
    setLastName("");
    setRoleId(3);
    setIsActive(true);
    setStudentNumber("");
    setEmployeeNumber("");
    setCourseId("");
    setYearLevel("");
    setSection("");
    setStudySession("");
    setDepartment("");
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0F172A", letterSpacing: "-0.025em", margin: 0, lineHeight: 1.25 }}>User Management</h1>
          <p style={{ fontSize: 14, color: "#64748B", margin: "5px 0 0", fontWeight: 400 }}>View and manage institutional security credentials and access authorizations.</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsCreateOpen(true);
          }}
          className="pm-btn-primary self-start sm:self-center flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" /> Add New User
        </button>
      </div>

      {/* ─── Top Cards Summary ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="pm-stat-card pm-card-animate" style={{ "--strip-color": "#6366F1", padding: "24px" } as React.CSSProperties}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Users</span>
            <Users className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 text-center">{stats.userCount}</div>
          <div className="text-[11px] text-slate-500 font-medium text-center mt-1">Institutional records</div>
        </div>
        <div className="pm-stat-card pm-card-animate" style={{ "--strip-color": "#10B981", padding: "24px" } as React.CSSProperties}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Accounts</span>
            <Shield className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 text-center">{stats.activeCount}</div>
          <div className="text-[11px] text-slate-500 font-medium text-center mt-1">Authenticated profiles</div>
        </div>
        <div className="pm-stat-card pm-card-animate" style={{ "--strip-color": "#F59E0B", padding: "24px" } as React.CSSProperties}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Defined Roles</span>
            <BookOpen className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-extrabold text-slate-900 text-center">{stats.roleCount}</div>
          <div className="text-[11px] text-slate-500 font-medium text-center mt-1">Access tiers</div>
        </div>
      </div>

      {/* ─── Tabs Navigation ─── */}
      <div className="flex items-center gap-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("users")}
          className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${
            activeTab === "users" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Users Registry
        </button>
        <button
          onClick={() => setActiveTab("roles")}
          className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${
            activeTab === "roles" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Roles & Permissions
        </button>
        <button
          onClick={() => setActiveTab("courses")}
          className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${
            activeTab === "courses" ? "border-indigo-600 text-indigo-600" : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Courses
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
          Year & Semester
        </button>
      </div>

      {activeTab === "users" && (
        <>
          {/* ─── Search & Filters ─── */}
          <div className="pm-card space-y-4" style={{ padding: 20 }}>
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, or registry ID..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs placeholder:text-slate-400 font-medium"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <select 
                  value={roleFilter} 
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-4 py-2.5 rounded-xl text-[11px] font-bold bg-slate-50 border border-slate-200 text-slate-700 outline-none focus:border-indigo-500"
                >
                  <option value="ALL">ALL ROLES</option>
                  <option value="SUPER_ADMIN">SUPER ADMIN</option>
                  <option value="INSTRUCTOR">INSTRUCTOR</option>
                  <option value="STUDENT">STUDENT</option>
                </select>
                <select 
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2.5 rounded-xl text-[11px] font-bold bg-slate-50 border border-slate-200 text-slate-700 outline-none focus:border-indigo-500"
                >
                  <option value="ALL">ALL STATUSES</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="LOCKED">LOCKED</option>
                </select>
                <button
                  onClick={() => {
                    setSearch("");
                    setRoleFilter("ALL");
                    setStatusFilter("ALL");
                    setCourseFilter("ALL");
                    setYearLevelFilter("ALL");
                    setSectionFilter("");
                    setStudySessionFilter("ALL");
                  }}
                  className="p-2.5 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                  title="Reset Filters"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* ─── Registry Table ─── */}
          <div className="pm-card overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-8 h-8 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-slate-500 text-xs font-semibold">Querying Registry...</span>
              </div>
            ) : users.length === 0 ? (
              <div className="p-16 text-center text-slate-400 text-sm font-medium italic">No matches found in the user registry.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50" style={{ fontSize: 10, fontWeight: 800, color: "#64748B", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                      <th className="p-5">Name & Identification</th>
                      <th className="p-5 text-center">System Role</th>
                      <th className="p-5">Profile Detail</th>
                      <th className="p-5 text-center">Status</th>
                      <th className="p-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {users.map((item) => (
                      <tr key={item.UserId} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold border border-slate-200">
                              {item.FirstName[0]}{item.LastName[0]}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 text-sm tracking-tight">{item.FirstName} {item.LastName}</h4>
                              <p className="text-[10px] text-slate-400 font-medium">{item.Email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-5 text-center">
                          <span className={`inline-block px-2.5 py-1 rounded-lg text-[9px] font-bold tracking-wider ${
                            {
                              SUPER_ADMIN: "bg-indigo-50 text-indigo-600 border border-indigo-100",
                              INSTRUCTOR: "bg-emerald-50 text-emerald-600 border border-emerald-100",
                              STUDENT: "bg-amber-50 text-amber-600 border border-amber-100",
                            }[item.Role.RoleName]
                          }`}>
                            {item.Role.RoleName.replace("_", " ")}
                          </span>
                        </td>
                        <td className="p-5">
                          <div className="font-mono text-[10px] text-slate-600">
                            ID: {item.Student?.StudentNumber ?? item.Instructor?.EmployeeNumber ?? "SYSTEM"}
                            {item.Student && (
                              <div className="text-[9px] text-slate-400 font-sans mt-0.5 flex items-center gap-1.5">
                                <span>Yr {item.Student.YearLevel}</span>
                                <span className="w-1 h-1 rounded-full bg-slate-200" />
                                <span>Sec {item.Student.Section}</span>
                                {item.Student.StudySession && (
                                  <>
                                    <span className="w-1 h-1 rounded-full bg-slate-200" />
                                    <span className="font-bold text-indigo-400">{item.Student.StudySession}</span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-5 text-center">
                          <div className="flex flex-col items-center gap-1">
                            {item.IsLocked && <span className="text-[8px] font-bold text-rose-500 bg-rose-50 px-2 py-0.5 rounded border border-rose-100">LOCKED</span>}
                            <span className={`text-[8px] font-bold px-2 py-0.5 rounded border ${item.IsActive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                              {item.IsActive ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                          </div>
                        </td>
                        <td className="p-5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button onClick={() => handleToggleLock(item)} className="p-2 rounded-lg bg-white hover:bg-slate-50 text-slate-400 hover:text-indigo-600 border border-slate-200 transition-all cursor-pointer"><Lock className="w-3.5 h-3.5" /></button>
                            <button onClick={() => openEditModal(item)} className="p-2 rounded-lg bg-white hover:bg-slate-50 text-slate-400 hover:text-indigo-600 border border-slate-200 transition-all cursor-pointer"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleDeleteUser(item.UserId)} className="p-2 rounded-lg bg-rose-50/50 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-100 transition-all cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Footer */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50/50">
                <span className="text-slate-400 text-[10px] font-bold">PAGE {page} OF {totalPages}</span>
                <div className="flex gap-2">
                  <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 transition-all disabled:opacity-50 text-[10px] font-bold">PREV</button>
                  <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 transition-all disabled:opacity-50 text-[10px] font-bold">NEXT</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
      {activeTab === "roles" ? (
        <div className="p-12 text-center text-slate-500 text-sm">Courses management content goes here.</div>
      ) : activeTab === "sessions" ? (
        <div className="p-12 text-center text-slate-500 text-sm">Sessions management content goes here.</div>
      ) : activeTab === "sections" ? (
        <div className="p-12 text-center text-slate-500 text-sm">Sections management content goes here.</div>
      ) : activeTab === "semesters" ? (
        <div className="p-12 text-center text-slate-500 text-sm">Year/Semester management content goes here.</div>
      ) : null}

      {/* ─── Modal: Create User ─── */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="glass w-full max-w-lg rounded-3xl p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setIsCreateOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="mb-6 text-center">
              <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 mb-3">
                <UserPlus className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Register Institutional Account</h3>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">Auto-generate credentials and provision role-based profile parameters.</p>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4">
              {/* Role Selection */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Registry Role Tier</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 3, label: "Student", icon: User },
                    { id: 2, label: "Instructor", icon: Shield },
                    { id: 1, label: "Super Admin", icon: Lock },
                  ].map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setRoleId(role.id)}
                      className={`py-3 px-3 rounded-2xl text-[11px] font-bold border transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                        roleId === role.id
                          ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200"
                          : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-white"
                      }`}
                    >
                      <role.icon className="w-4 h-4" />
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* General details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">First Name</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Last Name</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs font-semibold"
                />
              </div>

              {/* Student fields */}
              {roleId === 3 && (
                <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/50 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1.5">Student ID</label>
                      <input
                        type="text"
                        required
                        value={studentNumber}
                        onChange={(e) => setStudentNumber(e.target.value)}
                        placeholder="e.g. 2026-00001"
                        className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs font-bold font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1.5">Program</label>
                      <select
                        value={courseId}
                        onChange={(e) => setCourseId(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs font-bold"
                      >
                        <option value="">Select Course...</option>
                        {courses.map((c) => (
                          <option key={c.CourseId} value={c.CourseId}>
                            {c.CourseCode}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1.5">Year</label>
                      <select
                        value={yearLevel}
                        onChange={(e) => setYearLevel(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs font-bold"
                      >
                        <option value="">...</option>
                        {[1, 2, 3, 4, 5, 6].map((l) => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1.5">Section</label>
                      <input
                        type="text"
                        value={section}
                        onChange={(e) => setSection(e.target.value.toUpperCase())}
                        className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest mb-1.5">Session</label>
                      <select
                        value={studySession}
                        onChange={(e) => setStudySession(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs font-bold"
                      >
                        <option value="">...</option>
                        <option value="DAY">DAY</option>
                        <option value="NIGHT">NIGHT</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Instructor fields */}
              {roleId === 2 && (
                <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-100/50 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1.5">Employee ID</label>
                      <input
                        type="text"
                        required
                        value={employeeNumber}
                        onChange={(e) => setEmployeeNumber(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs font-bold font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-1.5">Department</label>
                      <input
                        type="text"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        placeholder="e.g. IT"
                        className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs font-bold"
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 px-4 rounded-2xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-xl shadow-indigo-100 cursor-pointer uppercase tracking-widest"
              >
                {submitting ? "Processing Registry Setup..." : "Initialize Identity Record"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal: Edit User ─── */}
      {isEditOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-md rounded-3xl p-6 shadow-2xl relative">
            <button onClick={() => setIsEditOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
            <div className="mb-6 text-center">
              <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 mb-3"><Edit2 className="w-6 h-6" /></div>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Modify Identity Authorization</h3>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">Update operational profile parameters and security states.</p>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs font-semibold" />
                <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs font-semibold" />
              </div>

              {selectedUser.Role.RoleName === 'STUDENT' && (
                <div className="grid grid-cols-3 gap-3">
                  <select value={yearLevel} onChange={(e) => setYearLevel(e.target.value)} className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-50 border border-slate-200">
                    <option value="">Year...</option>
                    {[1,2,3,4,5,6].map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                  <input type="text" placeholder="SEC" value={section} onChange={(e) => setSection(e.target.value.toUpperCase())} className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-50 border border-slate-200" />
                  <select value={studySession} onChange={(e) => setStudySession(e.target.value)} className="px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-50 border border-slate-200">
                    <option value="">Sess...</option>
                    <option value="DAY">DAY</option>
                    <option value="NIGHT">NIGHT</option>
                  </select>
                </div>
              )}

              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <input type="checkbox" id="isActiveEdit" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 bg-white" />
                <label htmlFor="isActiveEdit" className="text-[11px] text-slate-700 font-bold uppercase">Account Operational</label>
              </div>

              <button type="submit" disabled={submitting} className="w-full py-4 px-4 rounded-2xl text-xs font-extrabold bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-xl shadow-indigo-100 cursor-pointer uppercase tracking-widest">
                {submitting ? "Syncing Identity..." : "Commit Authorization Updates"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
