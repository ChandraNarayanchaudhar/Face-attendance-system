// src/lib/auth-utils.ts
// Login and register — calls real backend
// Token saved automatically in background

const API = "http://127.0.0.1:8000/api";

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role: "student" | "teacher" | "admin";
  section?: string;
  semester?: string;
  department?: string;
}

// Login — checks email + password + role against real database
export async function authenticateUser(
  email: string,
  password: string,
  role: "student" | "teacher" | "admin",
) {
  try {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, role }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    // Save token and user silently
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("user", JSON.stringify(data.user));
    return data.user;
  } catch (e) {
    console.error("Login error:", e);
    return null;
  }
}

// Register — saves new user to real database
export async function registerUser(payload: RegisterPayload) {
  const res = await fetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail || "Registration failed");
  // Save token and user silently
  localStorage.setItem("token", data.access_token);
  localStorage.setItem("user", JSON.stringify(data.user));
  return data.user;
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
