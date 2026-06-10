"use client";

// Admin dashboard — real data, auto refreshes every 10 seconds
// When anything updates → dashboard shows new data automatically

import * as React from "react";
import { Activity, AlertCircle, Clock, Users } from "lucide-react";
import { AttendanceLineChart } from "@/components/charts/attendance-line-chart";
import { SubjectBarChart } from "@/components/charts/subject-bar-chart";
import { MetricCard } from "@/components/cards/metric-card";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiGet } from "@/lib/api";

export default function AdminDashboardPage() {
  const [stats, setStats] = React.useState<any>(null);
  const [sessions, setSessions] = React.useState<any[]>([]);
  const [feed, setFeed] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [lastSync, setLastSync] = React.useState<Date | null>(null);

  async function load() {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const [s, ses, f] = await Promise.all([
        apiGet<any>("/reports/dashboard"),
        apiGet<any[]>(`/sessions?session_date=${today}`),
        apiGet<any[]>("/reports/activity-feed?limit=8"),
      ]);
      setStats(s);
      setSessions(ses);
      setFeed(f);
      setLastSync(new Date());
    } catch (e) {
      console.error("Dashboard load error:", e);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
    // Auto refresh every 10 seconds — shows all admin changes live
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  if (loading)
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        Loading dashboard...
      </div>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Real-time overview — auto updates every 10 seconds."
        actions={
          <div className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-green-600 font-medium">Live</span>
            {lastSync && (
              <span className="text-xs text-muted-foreground">
                · {lastSync.toLocaleTimeString()}
              </span>
            )}
          </div>
        }
      />

      {/* Metric cards — real numbers */}
      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Present Today"
          value={String(stats?.today_present ?? 0)}
          delta={`${stats?.today_late ?? 0} late`}
          tone="success"
          icon={<Users className="h-4 w-4" />}
        />
        <MetricCard
          title="Avg Attendance (7d)"
          value={`${stats?.avg_attendance_7d ?? 0}%`}
          delta="Last 7 days"
          tone="primary"
          icon={<Activity className="h-4 w-4" />}
        />
        <MetricCard
          title="Late Today"
          value={String(stats?.today_late ?? 0)}
          delta="After 5 mins = Late"
          tone="warning"
          icon={<Clock className="h-4 w-4" />}
        />
        <MetricCard
          title="Open Alerts"
          value={String(stats?.open_alerts ?? 0)}
          delta="Needs review"
          tone="danger"
          icon={<AlertCircle className="h-4 w-4" />}
        />
      </section>

      {/* Charts — real data */}
      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Weekly attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <AttendanceLineChart />
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Subject performance</CardTitle>
          </CardHeader>
          <CardContent>
            <SubjectBarChart />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        {/* Today sessions — shows camera */}
        <Card className="shadow-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Today's sessions</CardTitle>
            <Badge variant="secondary">{sessions.length} total</Badge>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>📷 Camera</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      {s.subject_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.room}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {s.camera ? (
                        <span className="flex items-center gap-1">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              s.status === "Live"
                                ? "bg-green-500 animate-pulse"
                                : "bg-gray-400"
                            }`}
                          />
                          {s.camera}
                        </span>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.start_time}–{s.end_time}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          s.status === "Live"
                            ? "success"
                            : s.status === "Completed"
                              ? "secondary"
                              : "default"
                        }
                      >
                        {s.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {sessions.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground py-6"
                    >
                      No sessions today
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Live activity feed */}
        <Card className="shadow-sm">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Activity feed</CardTitle>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
              Auto refresh
            </span>
          </CardHeader>
          <CardContent className="space-y-2">
            {feed.length === 0 && (
              <div className="text-sm text-muted-foreground text-center py-6">
                No activity yet
              </div>
            )}
            {feed.map((e: any) => (
              <div
                key={e.id}
                className="flex items-center justify-between gap-3 rounded-xl border bg-background px-3 py-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className={`h-2 w-2 rounded-full flex-shrink-0 ${
                      e.tone === "success"
                        ? "bg-green-500"
                        : e.tone === "warning"
                          ? "bg-yellow-500"
                          : e.tone === "danger"
                            ? "bg-red-500"
                            : "bg-blue-500"
                    }`}
                  />
                  <span className="truncate text-sm">{e.label}</span>
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {new Date(e.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
