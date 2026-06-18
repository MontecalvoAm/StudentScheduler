import React, { useEffect, useState } from "react";
import { X, ShieldAlert, Check, Minus, Loader2 } from "lucide-react";
import { useUIStore } from "@/stores/ui-store";

interface Override {
  ModuleKey: string;
  ModuleLabel: string;
  RolePerms: { CanCreate: boolean; CanRead: boolean; CanUpdate: boolean; CanDelete: boolean };
  Overrides: { CanCreate: boolean | null; CanRead: boolean | null; CanUpdate: boolean | null; CanDelete: boolean | null };
  Resolved: { CanCreate: boolean; CanRead: boolean; CanUpdate: boolean; CanDelete: boolean };
}

interface UserOverridesModalProps {
  isOpen: boolean;
  onClose: () => void;
  userToken: string;
  userName: string;
}

export default function UserOverridesModal({ isOpen, onClose, userToken, userName }: UserOverridesModalProps) {
  const { addToast } = useUIStore();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [permissions, setPermissions] = useState<Override[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (isOpen && userToken) {
      fetchPermissions();
    }
  }, [isOpen, userToken]);

  const fetchPermissions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userToken}/permissions`);
      const data = await res.json();
      if (res.ok) {
        setPermissions(data.permissions);
        setIsDirty(false);
      } else {
        addToast({ type: "error", title: "Failed to load permissions" });
      }
    } catch (e) {
      console.error(e);
      addToast({ type: "error", title: "Network error" });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = permissions.map((p) => ({
        ModuleKey: p.ModuleKey,
        CanCreate: p.Overrides.CanCreate,
        CanRead: p.Overrides.CanRead,
        CanUpdate: p.Overrides.CanUpdate,
        CanDelete: p.Overrides.CanDelete,
      }));

      const res = await fetch(`/api/users/${userToken}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Overrides: payload }),
      });

      if (res.ok) {
        addToast({ type: "success", title: "Overrides Saved", message: `Updated access for ${userName}` });
        setIsDirty(false);
        onClose();
      } else {
        addToast({ type: "error", title: "Failed to save overrides" });
      }
    } catch (e) {
      console.error(e);
      addToast({ type: "error", title: "Network error" });
    } finally {
      setSaving(false);
    }
  };

  const toggleOverride = (moduleKey: string, action: "CanCreate" | "CanRead" | "CanUpdate" | "CanDelete") => {
    setPermissions((prev) =>
      prev.map((p) => {
        if (p.ModuleKey !== moduleKey) return p;
        
        const currentResolved = p.Resolved[action];
        const newResolved = !currentResolved;
        
        // If the new resolved state exactly matches the base role's permission,
        // we can remove the explicit override (set to null) so it seamlessly inherits.
        // Otherwise, we set the explicit override boolean.
        const rolePerm = p.RolePerms[action];
        const newOverride = newResolved === rolePerm ? null : newResolved;
        
        return {
          ...p,
          Overrides: { ...p.Overrides, [action]: newOverride },
          Resolved: { ...p.Resolved, [action]: newResolved },
        };
      })
    );
    setIsDirty(true);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">User Access Overrides</h2>
              <p className="text-xs font-medium text-slate-500">Managing overrides for <span className="font-bold text-slate-700">{userName}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
              <span className="text-slate-500 text-xs font-semibold">Loading access matrix...</span>
            </div>
          ) : (
            <div className="space-y-6">
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
                <span className="text-[10px] text-slate-400 font-medium ml-auto">
                  Toggles show effective access. Changes automatically override base roles.
                </span>
              </div>

              {/* Permission rows — fixed height with internal scroll */}
              <div className="overflow-y-auto" style={{ maxHeight: 420 }}>
                <div className="divide-y divide-slate-50">
                  {permissions.map((p) => {
                    const ACTIONS: { key: "CanCreate" | "CanRead" | "CanUpdate" | "CanDelete"; label: string; onColor: string }[] = [
                      { key: "CanCreate", label: "Create", onColor: "#6366F1" },
                      { key: "CanRead",   label: "Read",   onColor: "#10B981" },
                      { key: "CanUpdate", label: "Update", onColor: "#F59E0B" },
                      { key: "CanDelete", label: "Delete", onColor: "#EF4444" },
                    ];
                    return (
                      <div key={p.ModuleKey} className="flex items-center justify-between px-6 py-4 hover:bg-slate-50/40 transition-colors">
                        {/* Module name */}
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.Resolved.CanRead ? "#10B981" : "#CBD5E1" }} />
                          <span className="text-xs font-semibold text-slate-800">{p.ModuleLabel}</span>
                          <span className="text-[9px] text-slate-400 font-mono">{p.ModuleKey}</span>
                          {!p.Resolved.CanRead && (
                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-400">HIDDEN</span>
                          )}
                          {/* Indicator if overridden */}
                          {Object.values(p.Overrides).some(val => val !== null) && (
                            <span className="text-[8px] font-bold px-1.5 py-0.5 rounded border border-indigo-100 bg-indigo-50 text-indigo-500 ml-2">OVERRIDDEN</span>
                          )}
                        </div>
                        {/* Toggle group */}
                        <div className="flex items-center gap-5 flex-wrap justify-end">
                          {ACTIONS.map(({ key, label, onColor }) => {
                            const isResolvedOn = p.Resolved[key];
                            
                            let bgColor = isResolvedOn ? onColor : "#CBD5E1";
                            let translateX = isResolvedOn ? "translate-x-4" : "translate-x-0";

                            return (
                              <div key={key} className="flex items-center gap-1.5">
                                <span
                                  className="text-[10px] font-bold tracking-wide text-right w-12"
                                  style={{ color: isResolvedOn ? onColor : "#94A3B8" }}
                                >
                                  {label}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => toggleOverride(p.ModuleKey, key)}
                                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out hover:opacity-90 focus:outline-none`}
                                  style={{ backgroundColor: bgColor }}
                                >
                                  <span
                                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${translateX}`}
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
            </div>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-white">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !isDirty}
            className="pm-btn-primary flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldAlert className="w-4 h-4" />}
            Save Overrides
          </button>
        </div>
      </div>
    </div>
  );
}
