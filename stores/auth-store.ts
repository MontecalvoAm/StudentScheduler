import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type PermissionFlags = {
  CanCreate: boolean;
  CanRead:   boolean;
  CanUpdate: boolean;
  CanDelete: boolean;
};

export type PermissionMap = Record<string, PermissionFlags>;

interface AuthUser {
  UserId:       number;
  Email:        string;
  FirstName:    string;
  LastName:     string;
  Role:         string;
  Section?:     string | null;
  StudySession?: string | null;
}

interface AuthState {
  user:            AuthUser | null;
  permissions:     PermissionMap;
  isLoading:       boolean;
  isInitialized:   boolean;
  setUser:         (user: AuthUser) => void;
  clearUser:       () => void;
  setPermissions:  (permissions: PermissionMap) => void;
  clearPermissions: () => void;
  setLoading:      (loading: boolean) => void;
  setInitialized:  () => void;
  /** Returns true if the user can perform the given action on a module */
  can:             (moduleKey: string, action: keyof PermissionFlags) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user:          null,
      permissions:   {},
      isLoading:     false,
      isInitialized: false,

      setUser:         (user) => set({ user }),
      clearUser:       () => set({ user: null, permissions: {} }),
      setPermissions:  (permissions) => set({ permissions }),
      clearPermissions: () => set({ permissions: {} }),
      setLoading:      (isLoading) => set({ isLoading }),
      setInitialized:  () => set({ isInitialized: true }),

      can: (moduleKey, action) => {
        const { user, permissions } = get();
        if (!user) return false;
        // SUPER_ADMIN always has access (fallback for any missing permission rows)
        if (user.Role === "SUPER_ADMIN") return true;
        return permissions[moduleKey]?.[action] ?? false;
      },
    }),
    {
      name:       "sched-auth",
      storage:    createJSONStorage(() => sessionStorage),
      partialize: (state) => ({
        user:        state.user,
        permissions: state.permissions,
      }),
    }
  )
);
