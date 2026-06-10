// src/lib/auth-store.ts
// Zustand store — holds logged in user (student, teacher, admin)

import { create } from "zustand";
import { logoutUser, getSavedUser } from "@/lib/auth-utils";

export type UserRole = "student" | "teacher" | "admin";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthStore {
  user: AuthUser | null;
  isLoggedIn: boolean;
  isHydrating: boolean;
  login: (user: AuthUser) => void;
  logout: () => void;
  setUser: (user: AuthUser | null) => void;
  restoreSession: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoggedIn: false,
  isHydrating: true,

  // Save user after successful login
  login: (user: AuthUser) =>
    set({ user, isLoggedIn: true, isHydrating: false }),

  // Clear user on logout
  logout: () => {
    logoutUser();
    set({ user: null, isLoggedIn: false, isHydrating: false });
  },

  // Set or clear user manually
  setUser: (user: AuthUser | null) =>
    set({ user, isLoggedIn: user !== null, isHydrating: false }),

  // Restore saved session from localStorage on page reload
  restoreSession: () => {
    const saved = getSavedUser();
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (saved && token) {
      set({ user: saved, isLoggedIn: true, isHydrating: false });
    } else {
      set({ isHydrating: false });
    }
  },
}));
