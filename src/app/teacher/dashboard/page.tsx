"use client";

import * as React from "react";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { apiGet } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

export default function TeacherDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [stats, setStats] = React.useState({
    totalSessions: 0,
    completedSessions: 0,
    studentsEnrolled: 0,
    averageAttendance: 0,
  });
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const teacherId = user.id;

    async function load() {
      try {
        // Get only this teacher's sessions
        const sessions = await apiGet<any[]>(
          `/sessions?teacher_id=${encodeURIComponent(teacherId)}`,
        );
        const completed = sessions.filter(
          (s) => s.status === "Completed",
        ).length;

        // Fetch real teacher dashboard stats from the backend
        const dashboard = await apiGet<{
          total_students: number;
          avg_attendance_7d: number;
        }>("/reports/dashboard");

        setStats({
          totalSessions: sessions.length,
          completedSessions: completed,
          studentsEnrolled: dashboard.total_students,
          averageAttendance: dashboard.avg_attendance_7d ?? 0,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="p-8 text-muted-foreground">Loading dashboard...</div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Welcome to your teacher dashboard"
      />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Total Sessions Card */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Total Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSessions}</div>
            <p className="text-xs text-muted-foreground">All sessions</p>
          </CardContent>
        </Card>

        {/* Completed Sessions Card */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedSessions}</div>
            <p className="text-xs text-muted-foreground">Finished sessions</p>
          </CardContent>
        </Card>

        {/* Students Enrolled Card */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.studentsEnrolled}</div>
            <p className="text-xs text-muted-foreground">
              Enrolled in your classes
            </p>
          </CardContent>
        </Card>

        {/* Avg Attendance Card */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">
              Avg Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageAttendance}%</div>
            <p className="text-xs text-muted-foreground">Class average</p>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold mb-2">Start a Session</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Begin attendance for a class
              </p>
              <a
                href="/teacher/sessions"
                className="text-primary hover:underline text-sm"
              >
                Go to Sessions →
              </a>
            </div>
            <div className="rounded-lg border p-4">
              <h3 className="font-semibold mb-2">View Reports</h3>
              <p className="text-sm text-muted-foreground mb-3">
                Check attendance reports
              </p>
              <a
                href="/teacher/reports"
                className="text-primary hover:underline text-sm"
              >
                Go to Reports →
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
