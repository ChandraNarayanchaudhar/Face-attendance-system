// src/app/login/page.tsx
// Login — admin/teacher/student
// Admin and teacher have no register link

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/lib/auth-store";
import { authenticateUser } from "@/lib/auth-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "teacher" | "admin">("student");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      if (!email || !password) {
        setError("Enter email and password.");
        return;
      }
      const user = await authenticateUser(email, password, role);
      if (!user) {
        setError("Incorrect email, password, or role.");
        return;
      }
      login(user);
      // Redirect based on role
      if (user.role === "student") router.push("/student/home");
      else if (user.role === "teacher") router.push("/teacher/dashboard");
      else router.push("/admin/dashboard");
    } catch (err: any) {
      setError(err.message || "Login failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-2xl border bg-card px-4 py-2 shadow-sm">
            <div className="h-8 w-8 rounded-xl bg-primary/15" />
            <div className="leading-tight text-left">
              <div className="text-sm font-semibold">Smart Attendance</div>
              <div className="text-xs text-muted-foreground">
                Real-time system
              </div>
            </div>
          </div>
          <h1 className="text-2xl font-semibold">Sign in</h1>
        </div>

        {/* Card */}
        <div className="rounded-2xl border bg-card p-8 shadow-md space-y-5">
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Role selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Login as</label>
              <div className="flex gap-2">
                {(["student", "teacher", "admin"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      role === r
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-input bg-background hover:bg-muted"
                    }`}
                  >
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/* Register link — students only */}
          {role === "student" && (
            <div className="text-center text-sm text-muted-foreground">
              No account?{" "}
              <Link
                href="/register"
                className="font-medium text-primary hover:underline"
              >
                Register here
              </Link>
            </div>
          )}

          {/* Admin/teacher hint */}
          {(role === "admin" || role === "teacher") && (
            <div className="rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground text-center">
              {role === "admin"
                ? "Admin accounts are created by the system."
                : "Teacher accounts are created by the admin."}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
