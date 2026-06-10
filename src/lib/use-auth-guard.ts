// src/lib/use-auth-guard.ts
// Redirects to login if not authenticated
// Redirects to correct dashboard if wrong role

"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "./auth-store";

export function useAuthGuard(requiredRole?: "student" | "teacher" | "admin") {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const isHydrating = useAuthStore((s) => s.isHydrating);

  useEffect(() => {
    // Wait for session restoration before redirecting
    if (isHydrating) return;

    if (!isLoggedIn) {
      router.push("/login");
      return;
    }
    if (requiredRole) {
      // Redirect to correct dashboard based on role
      if (requiredRole === "admin" && user?.role !== "admin") {
        if (user?.role === "student") {
          router.push("/student/home");
        } else if (user?.role === "teacher") {
          router.push("/teacher/dashboard");
        }
      }
      if (requiredRole === "teacher" && user?.role !== "teacher") {
        if (user?.role === "student") {
          router.push("/student/home");
        } else if (user?.role === "admin") {
          router.push("/admin/dashboard");
        }
      }
      if (requiredRole === "student" && user?.role !== "student") {
        if (user?.role === "teacher") {
          router.push("/teacher/dashboard");
        } else if (user?.role === "admin") {
          router.push("/admin/dashboard");
        }
      }
    }
  }, [isLoggedIn, user, requiredRole, router, isHydrating]);

  return { user, isLoggedIn };
}
