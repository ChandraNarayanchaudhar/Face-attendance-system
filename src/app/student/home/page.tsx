"use client";

// Student home — real data for logged-in student only

import * as React from "react";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/lib/auth-store";
import { apiGet } from "@/lib/api";

export default function StudentHomePage() {
  const user = useAuthStore((s) => s.user);

  const [profile, setProfile] = React.useState<any>(null);
  const [subjectStats, setSubjectStats] = React.useState<any[]>([]);
  const [nextSession, setNextSession] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const today = new Date().toISOString().slice(0, 10);
        const [p, stats, sessions] = await Promise.all([
          apiGet<any>(`/students/${user.id}`),
          apiGet<any[]>(`/students/${user.id}/subject-stats`),
          apiGet<any[]>(`/sessions?session_date=${today}`),
        ]);
        setProfile(p);
        setSubjectStats(stats);
        // Find next upcoming or live session
        setNextSession(
          sessions.find((s: any) => s.status !== "Completed") || null,
        );
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  if (loading)
    return (
      <div className="p-8 text-muted-foreground">Loading your dashboard...</div>
    );
  if (!profile)
    return (
      <div className="p-8 text-muted-foreground">
        Profile not found. Please login again.
      </div>
    );

  // Subjects below 75%
  const warnings = subjectStats.filter((s: any) => s.pct < 75);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Home"
        description="Your personal attendance overview."
      />

      {/* Welcome card */}
      <Card className="shadow-sm">
        <CardHeader className="flex-row items-start justify-between space-y-0">
          <div>
            <CardTitle className="text-base font-semibold">
              Welcome back, {profile.name.split(" ")[0]} 👋
            </CardTitle>
            <div className="mt-1 text-sm text-muted-foreground">
              Semester {profile.semester} • Section {profile.section}
            </div>
          </div>
          <Badge
            variant={
              profile.overall_attendance_pct >= 75 ? "success" : "warning"
            }
          >
            Overall {profile.overall_attendance_pct}%
          </Badge>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          {/* Status */}
          <div className="rounded-2xl border bg-muted/20 p-4">
            <div className="text-sm font-medium text-muted-foreground">
              Status
            </div>
            <div className="mt-1 text-lg font-semibold">
              {profile.overall_attendance_pct >= 75
                ? "✅ On track"
                : "⚠️ Needs improvement"}
            </div>
          </div>

          {/* Next class */}
          <div className="rounded-2xl border bg-muted/20 p-4">
            <div className="text-sm font-medium text-muted-foreground">
              Next class
            </div>
            {nextSession ? (
              <>
                <div className="mt-1 text-lg font-semibold">
                  {nextSession.subject_name}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {nextSession.start_time} • {nextSession.room}
                </div>
                {/* Show if camera is monitoring */}
                {nextSession.camera && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    📷 {nextSession.camera}
                  </div>
                )}
              </>
            ) : (
              <div className="mt-1 text-lg font-semibold text-muted-foreground">
                No classes today
              </div>
            )}
          </div>

          {/* Quick links */}
          <div className="rounded-2xl border bg-muted/20 p-4">
            <div className="text-sm font-medium text-muted-foreground">
              Quick links
            </div>
            <div className="mt-3 flex flex-col gap-2">
              <Button asChild size="sm" variant="outline">
                <a href="/student/attendance">
                  My attendance <ArrowRight className="h-3 w-3" />
                </a>
              </Button>
              <Button asChild size="sm" variant="outline">
                <a href="/student/sessions">
                  Today sessions <ArrowRight className="h-3 w-3" />
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Subject stats */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Subject attendance</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {subjectStats.length === 0 && (
              <div className="text-sm text-muted-foreground col-span-2">
                No subjects found. Contact admin to add subjects.
              </div>
            )}
            {subjectStats.map((s: any) => (
              <div
                key={s.subject_id}
                className="rounded-2xl border bg-background p-4 shadow-sm"
              >
                <div className="text-sm font-semibold">{s.subject_name}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {s.subject_code}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">My %</div>
                  <Badge variant={s.pct >= 75 ? "success" : "warning"}>
                    {s.pct}%
                  </Badge>
                </div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                  <div
                    className="h-1.5 rounded-full bg-primary"
                    style={{ width: `${s.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Warnings */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Warnings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {warnings.length === 0 ? (
              <div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                ✅ You are above 75% in all subjects. Keep it up!
              </div>
            ) : (
              warnings.map((s: any) => (
                <div
                  key={s.subject_id}
                  className="rounded-2xl border bg-background p-4 shadow-sm"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-yellow-600">
                    <AlertTriangle className="h-4 w-4" />
                    Below 75% — {s.subject_name}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Current: {s.pct}%. Attend upcoming sessions to recover.
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
