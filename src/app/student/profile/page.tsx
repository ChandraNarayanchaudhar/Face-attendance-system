"use client";

// Student profile — real logged-in student details from database

import * as React from "react";
import { Mail, User } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/lib/auth-store";
import { apiGet } from "@/lib/api";

export default function StudentProfilePage() {
  const user = useAuthStore((s) => s.user);

  const [profile, setProfile] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        setProfile(await apiGet<any>(`/students/${user.id}`));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  function faceBadge(status: string) {
    if (status === "Registered")
      return <Badge variant="success">✓ Registered for face recognition</Badge>;
    if (status === "Pending")
      return (
        <Badge variant="warning">Pending — contact admin to register</Badge>
      );
    return <Badge variant="destructive">Missing — contact admin</Badge>;
  }

  if (loading)
    return <div className="p-8 text-muted-foreground">Loading profile...</div>;
  if (!profile)
    return <div className="p-8 text-muted-foreground">Profile not found.</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Profile"
        description="Your student details from the database."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Student info */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Student information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            {[
              { label: "Full Name", value: profile.name },
              { label: "Student ID", value: profile.id },
              { label: "Semester", value: profile.semester || "—" },
              { label: "Section", value: profile.section || "—" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border bg-muted/20 p-4"
              >
                <div className="text-xs font-medium text-muted-foreground">
                  {item.label}
                </div>
                <div className="mt-1 text-sm font-semibold">{item.value}</div>
              </div>
            ))}

            {/* Email */}
            <div className="rounded-2xl border bg-muted/20 p-4 sm:col-span-2">
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Mail className="h-3 w-3" /> Email
              </div>
              <div className="mt-1 text-sm font-semibold">{profile.email}</div>
            </div>

            {/* Face registration status */}
            <div className="rounded-2xl border bg-muted/20 p-4 sm:col-span-2">
              <div className="text-xs font-medium text-muted-foreground mb-2">
                Face Registration (CCTV)
              </div>
              {faceBadge(profile.face_data_status)}
              <div className="mt-2 text-xs text-muted-foreground">
                Face registration is required for automatic attendance via CCTV
                cameras.
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Attendance */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Overall attendance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border bg-background p-5 shadow-sm">
              <div className="text-sm text-muted-foreground">Overall %</div>
              <div className="mt-2 flex items-center justify-between">
                <div className="text-4xl font-bold">
                  {profile.overall_attendance_pct}%
                </div>
                <Badge
                  variant={
                    profile.overall_attendance_pct >= 75 ? "success" : "warning"
                  }
                >
                  {profile.overall_attendance_pct >= 75
                    ? "Good standing"
                    : "Below threshold"}
                </Badge>
              </div>

              {/* Progress bar */}
              <div className="mt-4 h-3 w-full rounded-full bg-muted">
                <div
                  className={`h-3 rounded-full ${
                    profile.overall_attendance_pct >= 75
                      ? "bg-primary"
                      : "bg-yellow-500"
                  }`}
                  style={{ width: `${profile.overall_attendance_pct}%` }}
                />
              </div>

              <div className="mt-3 text-xs text-muted-foreground">
                Minimum required: 75%. Current:{" "}
                {profile.overall_attendance_pct >= 75
                  ? `${(profile.overall_attendance_pct - 75).toFixed(1)}% above minimum`
                  : `${(75 - profile.overall_attendance_pct).toFixed(1)}% below minimum`}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
