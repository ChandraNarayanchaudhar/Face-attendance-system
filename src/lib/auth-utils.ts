// src/lib/auth-utils.ts
// Login and register — calls real backend
// Token saved automatically in background

import { API_BASE } from "@/lib/config";

function normalizeLocalHostUrl(url: string) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "localhost") {
      parsed.hostname = "127.0.0.1";
      return parsed.toString();
    }
    if (parsed.hostname === "127.0.0.1") {
      parsed.hostname = "localhost";
      return parsed.toString();
    }
    return url;
  } catch {
    return url;
  }
}

async function fetchWithLocalFallback(url: string, options: RequestInit) {
  try {
    return await fetch(url, options);
  } catch (error) {
    const fallback = normalizeLocalHostUrl(url);
    if (fallback !== url) {
      console.warn(`Primary fetch failed for ${url}; retrying with fallback ${fallback}`);
      return await fetch(fallback, options);
    }
    throw error;
  }
}

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: "student" | "teacher" | "admin";
  student_id?: string;
  section?: string;
  semester?: string;
  department?: string;
  phone_number?: string;
  profile_image?: string;
}

// Login — checks email + password + role against real database
export async function authenticateUser(
  email: string,
  password: string,
  role: "student" | "teacher" | "admin",
) {
  try {
    const url = `${API_BASE}/auth/login`;
    const res = await fetchWithLocalFallback(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role }),
    });

    // Network-level error handled by catch; here we surface API-level failures
    if (!res.ok) {
      let payload: any = null;
      try {
        payload = await res.json();
      } catch {}
      // For 4xx/5xx return null so caller shows credential error, but log details
      console.warn("Authentication failed", res.status, payload);
      return null;
    }

    const data = await res.json();
    // Save token and user silently
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("user", JSON.stringify(data.user));
    return data.user;
  } catch (error: any) {
    // Distinguish network errors from credential failures
    const url = `${API_BASE}/auth/login`;
    console.error("Login network error connecting to API:", url, error);
    throw new Error(
      `Network error: could not reach API at ${url}. Check backend is running, CORS settings, and that the browser can access this host.`,
    );
  }
}

// Register — saves new user to real database
export async function registerUser(payload: RegisterPayload) {
  try {
    const url = `${API_BASE}/auth/register`;
    const res = await fetchWithLocalFallback(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    let data: any = null;
    try {
      data = await res.json();
    } catch {}
    if (!res.ok)
      throw new Error(data?.detail || `Registration failed: ${res.status}`);
    // Save token and user silently
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("user", JSON.stringify(data.user));
    return data.user;
  } catch (error: any) {
    console.error("Registration/network error:", error);
    throw new Error(
      error?.message || `Network error: could not reach API at ${API_BASE}`,
    );
  }
}

// Get token — used internally by api.ts
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

// Get saved user — used by auth store
export function getSavedUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Logout — clears token and user
export function logoutUser() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}
