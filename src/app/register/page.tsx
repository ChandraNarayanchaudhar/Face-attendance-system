"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/lib/auth-store";
import { registerUser } from "@/lib/auth-utils";
import { validateAndResizeImage, getImagePreviewUrl } from "@/lib/image-utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const router = useRouter();
  const login = useAuthStore((s) => s.login);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    student_id: "",
    phone_number: "",
    profileImage: "",
    section: "",
    semester: "",
  });
  const [imageError, setImageError] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setImageError("");
    setIsLoading(true);
    try {
      if (
        !form.name ||
        !form.email ||
        !form.password ||
        !form.confirmPassword ||
        !form.student_id
      ) {
        setError("Fill in all fields.");
        return;
      }
      if (!/^[0-9]{5}$/.test(form.student_id)) {
        setError("Student ID must be exactly 5 digits.");
        return;
      }
      if (form.password.length < 6) {
        setError("Password must be at least 6 characters.");
        return;
      }
      if (form.password !== form.confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
      if (!form.section || !form.semester) {
        setError("Fill in section and semester.");
        return;
      }
      const user = await registerUser({
        name: form.name,
        email: form.email,
        password: form.password,
        role: "student",
        student_id: form.student_id,
        phone_number: form.phone_number,
        profile_image: form.profileImage || undefined,
        section: form.section,
        semester: form.semester,
      });
      login(user);
      router.push("/student/home");
    } catch (err: any) {
      setError(err.message || "Registration failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 rounded-2xl border bg-card px-4 py-2 shadow-sm">
            <div className="h-8 w-8 rounded-xl bg-primary/15" />
            <div className="leading-tight text-left">
              <div className="text-sm font-semibold">Smart Attendance</div>
              <div className="text-xs text-muted-foreground">
                Student registration
              </div>
            </div>
          </div>
          <h1 className="text-2xl font-semibold">Create account</h1>
        </div>

        <div className="rounded-2xl border bg-card p-8 shadow-md space-y-4">
          {error && (
            <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <Input
                name="name"
                placeholder="Your full name"
                value={form.name}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                name="email"
                type="email"
                placeholder="Your email"
                value={form.email}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Student ID</label>
              <Input
                name="student_id"
                type="text"
                placeholder="e.g. 30020"
                value={form.student_id}
                onChange={handleChange}
                pattern="[0-9]{5}"
                maxLength={5}
                inputMode="numeric"
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Profile photo</label>
              <input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.currentTarget.files?.[0];
                  if (!file) return;
                  setImageError("");
                  const { error, base64 } = await validateAndResizeImage(file);
                  if (error) {
                    setImageError(error);
                    return;
                  }
                  setForm((p) => ({ ...p, profileImage: base64 ?? "" }));
                }}
                disabled={isLoading}
                className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
              />
              {imageError && (
                <div className="text-xs text-destructive">{imageError}</div>
              )}
              {form.profileImage && (
                <img
                  src={getImagePreviewUrl(form.profileImage)}
                  alt="Profile preview"
                  className="mt-3 h-24 w-24 rounded-2xl object-cover"
                />
              )}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input
                name="password"
                type="password"
                placeholder="Min 6 characters"
                value={form.password}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm Password</label>
              <Input
                name="confirmPassword"
                type="password"
                placeholder="Repeat password"
                value={form.confirmPassword}
                onChange={handleChange}
                required
                disabled={isLoading}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Section</label>
                <Input
                  name="section"
                  placeholder="e.g. A"
                  value={form.section}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Semester</label>
                <Input
                  name="semester"
                  placeholder="e.g. 8"
                  value={form.semester}
                  onChange={handleChange}
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Registering..." : "Register"}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-primary hover:underline"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
