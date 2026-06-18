"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useUIStore } from "@/stores/ui-store";
import {
  Users,
  Search,
  UserPlus,
  Lock,
  Edit2,
  Trash2,
  X,
  User,
  Shield,
  BookOpen,
  RefreshCw,
  Plus,
  ShieldAlert,
  Eye,
  EyeOff,
  AlertTriangle,
  ChevronRight,
  Save,
  Loader2,
} from "lucide-react";
import UserOverridesModal from "./components/UserOverridesModal";


interface UserRecord {
  UserToken: string;
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
    Course?: { CourseToken: string } | null;
    YearLevel?: number;
    Section?: string;
    StudySession?: string;
  } | null;
  Instructor?: {
    EmployeeNumber: string;
    Department?: {
      DepartmentToken: string;
      DepartmentCode: string;
      DepartmentName: string;
    } | null;
  } | null;
}

interface Course {
  CourseToken: string;
  CourseCode: string;
  CourseName: string;
}

interface Stats {
  userCount: number;
  roleCount: number;
  activeCount: number;
}

interface RolePermission {
  ModuleKey:   string;
  ModuleLabel: string;
  CanCreate:   boolean;
  CanRead:     boolean;
  CanUpdate:   boolean;
  CanDelete:   boolean;
}

interface RoleRecord {
  RoleToken:   string;
  RoleName:    string;
  Description: string | null;
  IsSystem:    boolean;
  UserCount:   number;
  Permissions: RolePermission[];
}

interface ModuleRecord {
  ModuleKey:   string;
  ModuleLabel: string;
  SortOrder:   number;
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
  const [startDateFilter, setStartDateFilter] = useState("");
  const [endDateFilter, setEndDateFilter] = useState("");
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

  const [isOverridesOpen, setIsOverridesOpen] = useState(false);
  const [overrideUserToken, setOverrideUserToken] = useState("");
  const [overrideUserName, setOverrideUserName] = useState("");

  // Form states
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [roleId, setRoleId] = useState(3); // Default to Student (3)
  const [isActive, setIsActive] = useState(true);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Profile-specific form states
  const [studentNumber, setStudentNumber] = useState("");
  const [employeeNumber, setEmployeeNumber] = useState("");
  const [courseId, setCourseId] = useState("");
  const [yearLevel, setYearLevel] = useState("");
  const [section, setSection] = useState("");
  const [studySession, setStudySession] = useState("");
  const [department, setDepartment] = useState("");
  const [departments, setDepartments] = useState<any[]>([]);
  const [departmentToken, setDepartmentToken] = useState("");

  // ─── RBAC tab state ───────────────────────────────────────────────────────
  const [modules, setModules]                   = useState<ModuleRecord[]>([]);
  const [selectedRole, setSelectedRole]         = useState<RoleRecord | null>(null);
  const [editMatrix, setEditMatrix]             = useState<RolePermission[]>([]);
  const [isDirty, setIsDirty]                   = useState(false);
  const [savingPerms, setSavingPerms]           = useState(false);
  const [rolesLoading, setRolesLoading]         = useState(false);

  // Add Role drawer
  const [isAddRoleOpen, setIsAddRoleOpen]       = useState(false);
  const [newRoleName, setNewRoleName]           = useState("");
  const [newRoleDesc, setNewRoleDesc]           = useState("");
  const [addingRole, setAddingRole]             = useState(false);

  // Delete confirmation
  const [roleToDelete, setRoleToDelete]         = useState<RoleRecord | null>(null);
  const [deletingRole, setDeletingRole]         = useState(false);

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
        params.append("roleToken", roleFilter);
      }
      if (statusFilter !== "ALL") params.append("isActive", statusFilter === "ACTIVE" ? "true" : "false");
      if (startDateFilter) params.append("startDate", new Date(startDateFilter).toISOString());
      if (endDateFilter) params.append("endDate", new Date(endDateFilter).toISOString());
      
      const selectedRoleFilterName = roles.find(r => r.RoleToken === roleFilter)?.RoleName;
      if (selectedRoleFilterName === "STUDENT") {
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

  const fetchRoles = useCallback(async () => {
    try {
      setRolesLoading(true);
      const res = await fetch("/api/roles");
      if (res.ok) {
        const result = await res.json();
        setRoles(result.roles);
      }
    } catch (err) {
      console.error("Failed to load roles:", err);
    } finally {
      setRolesLoading(false);
    }
  }, []);

  const fetchModules = useCallback(async () => {
    try {
      const res = await fetch("/api/modules");
      if (res.ok) {
        const result = await res.json();
        setModules(result.modules);
      }
    } catch (err) {
      console.error("Failed to load modules:", err);
    }
  }, []);

  // Looks up an integer RoleId by name — used only by the user create/edit forms
  // (those forms still send `RoleId: number` to /api/users)
  const getRoleIdByName = (name: string): number => {
    // roles[] now has no exposed RoleId — fall back to stable seed-order IDs
    const SEED_IDS: Record<string, number> = {
      SUPER_ADMIN: 1, ADMIN: 2, INSTRUCTOR: 3, STUDENT: 4,
    };
    return SEED_IDS[name] ?? 0;
  };

  const getRoleNameByToken = (token: string) => {
    const r = roles.find(role => role.RoleToken === token);
    return r?.RoleName ?? "";
  };

  // Looks up role name by integer ID — stable reverse map for user create/edit
  const getRoleNameByIntId = (id: number): string => {
    const SEED_NAMES: Record<number, string> = {
      1: "SUPER_ADMIN", 2: "ADMIN", 3: "INSTRUCTOR", 4: "STUDENT",
    };
    return SEED_NAMES[id] ?? "";
  };


  useEffect(() => {
    if (roles.length > 0) {
      const studentRole = roles.find(r => r.RoleName === "STUDENT");
      if (studentRole) {
        // roleId is now stored as integer — use selectedRole separately for RBAC
        setSelectedRole(null);
      }
    }
  }, [roles]);

  useEffect(() => {
    fetchUsers();
  }, [page, search, roleFilter, statusFilter, courseFilter, yearLevelFilter, sectionFilter, studySessionFilter, startDateFilter, endDateFilter]);

  const fetchDepartments = async () => {
    try {
      const res = await fetch("/api/departments");
      const data = await res.json();
      if (data.success) {
        setDepartments(data.departments);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchCourses();
    fetchRoles();
    fetchModules();
    fetchDepartments();
  }, [fetchRoles, fetchModules]);

  useEffect(() => {
    if (activeTab === "roles") {
      fetchRoles();
      fetchModules();
    }
  }, [activeTab, fetchRoles, fetchModules]);

  // ─── RBAC handlers ──────────────────────────────────────────────────────────
  const selectRole = (role: RoleRecord) => {
    setSelectedRole(role);
    // Deep-copy the permission array so we can dirty-track edits
    setEditMatrix(role.Permissions.map(p => ({ ...p })));
    setIsDirty(false);
  };

  const togglePermission = (moduleKey: string, action: keyof RolePermission) => {
    if (action === "ModuleKey" || action === "ModuleLabel") return;
    setEditMatrix(prev =>
      prev.map(p =>
        p.ModuleKey === moduleKey
          ? { ...p, [action]: !p[action as keyof RolePermission] }
          : p
      )
    );
    setIsDirty(true);
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setSavingPerms(true);
    try {
      const res = await fetch(`/api/roles/${selectedRole.RoleToken}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Permissions: editMatrix }),
      });
      if (res.ok) {
        addToast({ type: "success", title: "Permissions Saved", message: `Updated permissions for ${selectedRole.RoleName}` });
        setIsDirty(false);
        fetchRoles();
      } else {
        const data = await res.json();
        addToast({ type: "error", title: "Save Failed", message: data.message ?? "Could not save permissions." });
      }
    } catch {
      addToast({ type: "error", title: "Network Error", message: "Failed to reach the server." });
    } finally {
      setSavingPerms(false);
    }
  };

  const handleAddRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleName.trim()) return;
    setAddingRole(true);
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ RoleName: newRoleName.trim().toUpperCase(), Description: newRoleDesc || null }),
      });
      const data = await res.json();
      if (res.ok) {
        addToast({ type: "success", title: "Role Created", message: `'${newRoleName.toUpperCase()}' has been added.` });
        setIsAddRoleOpen(false);
        setNewRoleName("");
        setNewRoleDesc("");
        fetchRoles();
      } else {
        addToast({ type: "error", title: "Error", message: data.message ?? "Could not create role." });
      }
    } catch {
      addToast({ type: "error", title: "Network Error", message: "Failed to reach the server." });
    } finally {
      setAddingRole(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!roleToDelete) return;
    setDeletingRole(true);
    try {
      const res = await fetch(`/api/roles/${roleToDelete.RoleToken}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        addToast({ type: "success", title: "Role Deleted", message: `'${roleToDelete.RoleName}' has been removed.` });
        setRoleToDelete(null);
        if (selectedRole?.RoleToken === roleToDelete.RoleToken) {
          setSelectedRole(null);
          setEditMatrix([]);
        }
        fetchRoles();
      } else {
        addToast({ type: "error", title: "Delete Failed", message: data.message ?? "Could not delete role." });
        setRoleToDelete(null);
      }
    } catch {
      addToast({ type: "error", title: "Network Error", message: "Failed to reach the server." });
    } finally {
      setDeletingRole(false);
    }
  };


  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      addToast({
        type: "error",
        title: "Validation Error",
        message: "Passwords do not match.",
      });
      return;
    }
    setSubmitting(true);
    try {
      const payload: any = {
        Email: email,
        FirstName: firstName,
        LastName: lastName,
        RoleId: roleId,
        Password: password,
      };

      const roleName = getRoleNameByIntId(roleId);

      if (roleName === "STUDENT") {
        payload.StudentNumber = studentNumber;
        payload.CourseToken = courseId || undefined;
        payload.YearLevel = yearLevel ? parseInt(yearLevel, 10) : undefined;
        payload.Section = section || undefined;
        payload.StudySession = studySession || undefined;
      } else if (roleName === "INSTRUCTOR") {
        payload.EmployeeNumber = employeeNumber;
        payload.DepartmentToken = departmentToken || undefined;
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
          message: "Identity account initialized successfully.",
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

    if (password && password !== confirmPassword) {
      addToast({ type: "error", title: "Validation Error", message: "Passwords do not match." });
      return;
    }

    setSubmitting(true);
    try {
      const payload: any = {
        FirstName: firstName,
        LastName: lastName,
        Email: email,
        RoleId: roleId,
        IsActive: isActive,
      };

      if (password) {
        payload.Password = password;
      }

      const roleName = getRoleNameByIntId(roleId);

      if (roleName === "STUDENT") {
        payload.StudentNumber = studentNumber || null;
        payload.CourseToken = courseId || null;
        payload.YearLevel = yearLevel ? parseInt(yearLevel, 10) : null;
        payload.Section = section || null;
        payload.StudySession = studySession || null;
      } else if (roleName === "INSTRUCTOR") {
        payload.EmployeeNumber = employeeNumber || null;
        payload.DepartmentToken = departmentToken || null;
      }

      const res = await fetch(`/api/users/${selectedUser.UserToken}`, {
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
      addToast({ type: "error", title: "Error", message: "An unexpected error occurred." });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleLock = async (userRecord: UserRecord) => {
    try {
      const res = await fetch(`/api/users/${userRecord.UserToken}`, {
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

  const handleDeleteUser = async (userToken: string) => {
    if (!confirm("Are you sure you want to soft-delete this user? All associations will be preserved but access will be revoked.")) return;

    try {
      const res = await fetch(`/api/users/${userToken}`, { method: "DELETE" });
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
    setEmail(userRecord.Email);
    setRoleId(userRecord.Role.RoleId);
    setIsActive(userRecord.IsActive);
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
    
    if (userRecord.Student) {
      setStudentNumber(userRecord.Student.StudentNumber || "");
      setCourseId(userRecord.Student.Course?.CourseToken || "");
      setYearLevel(userRecord.Student.YearLevel?.toString() || "");
      setSection(userRecord.Student.Section || "");
      setStudySession(userRecord.Student.StudySession || "");
    } else {
      setStudentNumber("");
      setCourseId("");
      setYearLevel("");
      setSection("");
      setStudySession("");
    }
    
    if (userRecord.Instructor) {
      setEmployeeNumber(userRecord.Instructor.EmployeeNumber || "");
      setDepartmentToken(userRecord.Instructor.Department?.DepartmentToken || "");
    } else {
      setEmployeeNumber("");
      setDepartmentToken("");
    }

    setIsEditOpen(true);
  };

  const openOverridesModal = (userRecord: UserRecord) => {
    setOverrideUserToken(userRecord.UserToken);
    setOverrideUserName(`${userRecord.FirstName} ${userRecord.LastName}`);
    setIsOverridesOpen(true);
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
    setDepartmentToken("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
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
                  {roles.map((r) => (
                    <option key={r.RoleToken} value={r.RoleToken}>
                      {r.RoleName.replace("_", " ")}
                    </option>
                  ))}
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
                <input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  className="px-4 py-2.5 rounded-xl text-[11px] font-bold bg-slate-50 border border-slate-200 text-slate-700 outline-none focus:border-indigo-500"
                  title="Start Date"
                />
                <input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  className="px-4 py-2.5 rounded-xl text-[11px] font-bold bg-slate-50 border border-slate-200 text-slate-700 outline-none focus:border-indigo-500"
                  title="End Date"
                />
                <button
                  onClick={() => {
                    setSearch("");
                    setRoleFilter("ALL");
                    setStatusFilter("ALL");
                    setStartDateFilter("");
                    setEndDateFilter("");
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
                      <tr key={item.UserToken} className="hover:bg-slate-50/50 transition-colors">
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
                            <button onClick={() => openOverridesModal(item)} title="Access Overrides" className="p-2 rounded-lg bg-indigo-50/50 hover:bg-indigo-100 text-indigo-500 border border-indigo-100 transition-all cursor-pointer"><ShieldAlert className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleToggleLock(item)} title={item.IsLocked ? "Unlock User" : "Lock User"} className="p-2 rounded-lg bg-white hover:bg-slate-50 text-slate-400 hover:text-indigo-600 border border-slate-200 transition-all cursor-pointer"><Lock className="w-3.5 h-3.5" /></button>
                            <button onClick={() => openEditModal(item)} title="Edit Profile" className="p-2 rounded-lg bg-white hover:bg-slate-50 text-slate-400 hover:text-indigo-600 border border-slate-200 transition-all cursor-pointer"><Edit2 className="w-3.5 h-3.5" /></button>
                            <button onClick={() => handleDeleteUser(item.UserToken)} className="p-2 rounded-lg bg-rose-50/50 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-100 transition-all cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
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
        <div className="space-y-4">
          {/* ─── RBAC Panel Header ─── */}
          <div className="flex items-center justify-between">
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", margin: 0 }}>Roles &amp; Permissions</h2>
              <p style={{ fontSize: 12, color: "#64748B", margin: "4px 0 0" }}>Define module-level access rights for each role. Changes are saved atomically.</p>
            </div>
            <button
              onClick={() => { setIsAddRoleOpen(true); setNewRoleName(""); setNewRoleDesc(""); }}
              className="pm-btn-primary flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" /> New Role
            </button>
          </div>

          {/* ─── Main 2-Column Layout ─── */}
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4 items-start">

            {/* ─── Left: Roles List ─── */}
            <div className="pm-card overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/60">
                <span style={{ fontSize: 10, fontWeight: 800, color: "#94A3B8", letterSpacing: "0.08em", textTransform: "uppercase" }}>Role Catalogue</span>
              </div>
              {rolesLoading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {roles.map((role) => {
                    const isSelected = selectedRole?.RoleToken === role.RoleToken;
                    const ROLE_COLORS: Record<string, string> = {
                      SUPER_ADMIN: "#6366F1", ADMIN: "#8B5CF6", INSTRUCTOR: "#10B981", STUDENT: "#F59E0B",
                    };
                    const accent = ROLE_COLORS[role.RoleName] ?? "#64748B";
                    return (
                      <div
                        key={role.RoleToken}
                        role="button"
                        tabIndex={0}
                        onClick={() => selectRole(role)}
                        onKeyDown={(e) => e.key === "Enter" && selectRole(role)}
                        className={`w-full text-left px-4 py-3.5 transition-all group flex items-center justify-between gap-3 cursor-pointer ${
                          isSelected ? "bg-indigo-50/80 border-l-4 border-indigo-500" : "hover:bg-slate-50 border-l-4 border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${accent}18`, color: accent }}>
                            <Shield className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className={`text-xs font-bold truncate ${isSelected ? "text-indigo-700" : "text-slate-800"}`}>
                                {role.RoleName.replace(/_/g, " ")}
                              </p>
                              {role.IsSystem && (
                                <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 shrink-0">SYSTEM</span>
                              )}
                            </div>
                            <p className="text-[10px] text-slate-400 mt-0.5">{role.UserCount} user{role.UserCount !== 1 ? "s" : ""}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {!role.IsSystem && (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); setRoleToDelete(role); }}
                              className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-500 text-slate-400 transition-all"
                              title="Delete role"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <ChevronRight className={`w-4 h-4 transition-transform ${isSelected ? "text-indigo-500 rotate-90" : "text-slate-300"}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>

              )}
            </div>

            {/* ─── Right: Permission Matrix ─── */}
            {selectedRole ? (
              <div className="pm-card overflow-hidden">
                {/* Matrix Header */}
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                      <Shield className="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <h3 style={{ fontSize: 14, fontWeight: 800, color: "#0F172A", margin: 0 }}>
                        {selectedRole.RoleName.replace(/_/g, " ")}
                      </h3>
                      <p style={{ fontSize: 11, color: "#94A3B8", margin: 0 }}>{selectedRole.Description || "No description"}</p>
                    </div>
                    {selectedRole.IsSystem && (
                      <span className="ml-2 text-[9px] font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-500 tracking-wider">PROTECTED</span>
                    )}
                  </div>
                  {isDirty && (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full animate-pulse">
                      Unsaved changes
                    </span>
                  )}
                </div>

                {/* Legend */}
                <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-5 flex-wrap">
                  {[
                    { label: "Create", color: "#6366F1" },
                    { label: "Read",   color: "#10B981" },
                    { label: "Update", color: "#F59E0B" },
                    { label: "Delete", color: "#EF4444" },
                  ].map(({ label, color }) => (
                    <div key={label} className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: color }} />
                      <span style={{ fontSize: 10, color: "#64748B", fontWeight: 600 }}>{label}</span>
                    </div>
                  ))}
                  <span className="text-[10px] text-slate-300 ml-auto">Toggle to grant / revoke. No Read = module hidden.</span>
                </div>


                {/* Permission rows — fixed height with internal scroll */}
                <div className="overflow-y-auto" style={{ maxHeight: 420 }}>
                  <div className="divide-y divide-slate-50">
                    {editMatrix.map((perm) => {
                      const isLocked = selectedRole.IsSystem && selectedRole.RoleName === "SUPER_ADMIN";
                      const ACTIONS: { key: keyof RolePermission; label: string; onColor: string; trackOn: string; trackOff: string }[] = [
                        { key: "CanCreate", label: "Create", onColor: "#6366F1", trackOn: "#EEF2FF",  trackOff: "#F1F5F9" },
                        { key: "CanRead",   label: "Read",   onColor: "#10B981", trackOn: "#ECFDF5",  trackOff: "#F1F5F9" },
                        { key: "CanUpdate", label: "Update", onColor: "#F59E0B", trackOn: "#FFFBEB",  trackOff: "#F1F5F9" },
                        { key: "CanDelete", label: "Delete", onColor: "#EF4444", trackOn: "#FEF2F2",  trackOff: "#F1F5F9" },
                      ];
                      return (
                        <div key={perm.ModuleKey} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/40 transition-colors">
                          {/* Module name */}
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: perm.CanRead ? "#10B981" : "#CBD5E1" }} />
                            <span className="text-xs font-semibold text-slate-800">{perm.ModuleLabel}</span>
                            <span className="text-[9px] text-slate-400 font-mono">{perm.ModuleKey}</span>
                            {!perm.CanRead && (
                              <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-400">HIDDEN</span>
                            )}
                          </div>
                          {/* Toggle group */}
                          <div className="flex items-center gap-5 flex-wrap justify-end">
                            {ACTIONS.map(({ key, label, onColor, trackOn, trackOff }) => {
                              const isOn = !!perm[key];
                              return (
                                <div key={key} className="flex items-center gap-1.5">
                                  <span
                                    className="text-[10px] font-bold tracking-wide text-right w-12"
                                    style={{ color: isOn ? onColor : "#94A3B8" }}
                                  >
                                    {label}
                                  </span>
                                  <button
                                    type="button"
                                    disabled={isLocked}
                                    onClick={() => togglePermission(perm.ModuleKey, key)}
                                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                                      isLocked ? "cursor-not-allowed opacity-50" : "hover:opacity-90 focus:outline-none"
                                    }`}
                                    style={{ backgroundColor: isOn ? onColor : "#CBD5E1" }}
                                  >
                                    <span
                                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                        isOn ? "translate-x-4" : "translate-x-0"
                                      }`}
                                    />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>


                {/* Save / Cancel footer */}
                <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/40 flex items-center justify-end gap-3">
                  {isDirty && (
                    <button
                      onClick={() => { setEditMatrix(selectedRole.Permissions.map(p => ({ ...p }))); setIsDirty(false); }}
                      className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors"
                    >
                      Discard
                    </button>
                  )}
                  <button
                    onClick={handleSavePermissions}
                    disabled={!isDirty || savingPerms || selectedRole.RoleName === "SUPER_ADMIN"}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: isDirty ? "#6366F1" : "#E2E8F0", color: isDirty ? "#fff" : "#94A3B8" }}
                  >
                    {savingPerms ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    {savingPerms ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="pm-card flex flex-col items-center justify-center py-20 text-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                  <Shield className="w-8 h-8 text-slate-300" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-500">Select a role to edit permissions</p>
                  <p className="text-xs text-slate-400 mt-1">Click any role from the left panel to view its permission matrix.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* ─── Modal: Add New Role ─── */}
      {isAddRoleOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-md rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsAddRoleOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="mb-6 text-center">
              <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 mb-3">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Create New Role</h3>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">The role will be created with all permissions disabled. Configure them in the matrix after creation.</p>
            </div>
            <form onSubmit={handleAddRole} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Role Name</label>
                <input
                  type="text"
                  value={newRoleName}
                  onChange={(e) => setNewRoleName(e.target.value.toUpperCase())}
                  placeholder="e.g. REGISTRAR"
                  required
                  className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-sm font-bold placeholder:font-normal placeholder:text-slate-400 uppercase tracking-wider"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Description <span className="font-normal normal-case text-slate-300">(optional)</span></label>
                <input
                  type="text"
                  value={newRoleDesc}
                  onChange={(e) => setNewRoleDesc(e.target.value)}
                  placeholder="Brief description of this role"
                  className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-sm placeholder:text-slate-400"
                />
              </div>
              <button
                type="submit"
                disabled={addingRole || !newRoleName.trim()}
                className="w-full py-3 rounded-2xl font-black text-sm bg-indigo-600 text-white hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
              >
                {addingRole ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                {addingRole ? "Creating..." : "Create Role"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal: Delete Role Confirmation ─── */}
      {roleToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="glass w-full max-w-sm rounded-3xl p-6 shadow-2xl relative">
            <div className="mb-5 text-center">
              <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-rose-50 border border-rose-100 text-rose-500 mb-3">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Delete Role</h3>
              <p className="text-[12px] text-slate-500 mt-2 leading-relaxed">
                You are about to permanently remove <strong className="text-slate-800">{roleToDelete.RoleName.replace(/_/g, " ")}</strong>.
                {roleToDelete.UserCount > 0 ? (
                  <span className="block mt-2 text-rose-500 font-semibold">
                    ⚠ {roleToDelete.UserCount} user{roleToDelete.UserCount !== 1 ? "s are" : " is"} currently assigned to this role.
                    Reassign them before deletion.
                  </span>
                ) : (
                  <span className="block mt-2 text-slate-400">This action will soft-delete the role. All permission records will be archived.</span>
                )}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setRoleToDelete(null)}
                className="flex-1 py-2.5 rounded-2xl font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteRole}
                disabled={deletingRole || roleToDelete.UserCount > 0}
                className="flex-1 py-2.5 rounded-2xl font-black text-sm bg-rose-500 text-white hover:bg-rose-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {deletingRole ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deletingRole ? "Deleting..." : "Delete Role"}
              </button>
            </div>
          </div>
        </div>
      )}

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
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { name: "STUDENT", label: "Student", icon: User },
                    { name: "INSTRUCTOR", label: "Instructor", icon: Shield },
                    { name: "ADMIN", label: "Admin", icon: ShieldAlert },
                    { name: "SUPER_ADMIN", label: "Super Admin", icon: Lock },
                  ].map((role) => {
                    const actualId = getRoleIdByName(role.name);
                    return (
                      <button
                        key={role.name}
                        type="button"
                        onClick={() => setRoleId(actualId)}
                        className={`py-3 px-3 rounded-2xl text-[11px] font-bold border transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                          roleId === actualId
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200"
                            : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-white"
                        }`}
                      >
                        <role.icon className="w-4 h-4" />
                        {role.label}
                      </button>
                    );
                  })}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-4 pr-10 py-2.5 rounded-xl text-slate-800 glass-input text-xs font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-4 pr-10 py-2.5 rounded-xl text-slate-800 glass-input text-xs font-semibold"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Student fields */}
              {getRoleNameByIntId(roleId) === "STUDENT" && (
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
                          <option key={c.CourseToken} value={c.CourseToken}>
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
              {getRoleNameByIntId(roleId) === "INSTRUCTOR" && (
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
                      <select
                        value={departmentToken}
                        onChange={(e) => setDepartmentToken(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs font-bold"
                      >
                        <option value="">Select Department</option>
                        {departments.map((dept) => (
                          <option key={dept.DepartmentToken} value={dept.DepartmentToken}>
                            {dept.DepartmentName} ({dept.DepartmentCode})
                          </option>
                        ))}
                      </select>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="glass w-full max-w-lg rounded-3xl p-6 shadow-2xl relative my-8">
            <button onClick={() => setIsEditOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100"><X className="w-5 h-5" /></button>
            <div className="mb-6 text-center">
              <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 mb-3"><Edit2 className="w-6 h-6" /></div>
              <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">Modify Identity Authorization</h3>
              <p className="text-[11px] text-slate-500 mt-1 font-medium">Update operational profile parameters and security credentials.</p>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4">
              {/* Role Selection */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Registry Role Tier</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { name: "STUDENT", label: "Student", icon: User },
                    { name: "INSTRUCTOR", label: "Instructor", icon: Shield },
                    { name: "ADMIN", label: "Admin", icon: ShieldAlert },
                    { name: "SUPER_ADMIN", label: "Super Admin", icon: Lock },
                  ].map((role) => {
                    const actualId = getRoleIdByName(role.name);
                    return (
                      <button
                        key={role.name}
                        type="button"
                        onClick={() => setRoleId(actualId)}
                        className={`py-3 px-3 rounded-2xl text-[11px] font-bold border transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                          roleId === actualId
                            ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-200"
                            : "bg-slate-50 border-slate-200 text-slate-500 hover:bg-white"
                        }`}
                      >
                        <role.icon className="w-4 h-4" />
                        {role.label}
                      </button>
                    );
                  })}
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

              {/* Password Updates (Optional) */}
              <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-200/50 space-y-4">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Update Security Credentials (Optional)</span>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">New Password</label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Leave blank to keep same"
                        className="w-full pl-4 pr-10 py-2.5 rounded-xl text-slate-800 glass-input text-xs font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Leave blank to keep same"
                        className="w-full pl-4 pr-10 py-2.5 rounded-xl text-slate-800 glass-input text-xs font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Student fields */}
              {getRoleNameByIntId(roleId) === "STUDENT" && (
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
                          <option key={c.CourseToken} value={c.CourseToken}>
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
              {getRoleNameByIntId(roleId) === "INSTRUCTOR" && (
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
                      <select
                        value={departmentToken}
                        onChange={(e) => setDepartmentToken(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl text-slate-800 glass-input text-xs font-bold"
                      >
                        <option value="">Select Department</option>
                        {departments.map((dept) => (
                          <option key={dept.DepartmentToken} value={dept.DepartmentToken}>
                            {dept.DepartmentName} ({dept.DepartmentCode})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
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
      {/* User Overrides Modal */}
      <UserOverridesModal
        isOpen={isOverridesOpen}
        onClose={() => setIsOverridesOpen(false)}
        userToken={overrideUserToken}
        userName={overrideUserName}
      />
    </div>
  );
}
