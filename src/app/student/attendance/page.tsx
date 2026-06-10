"use client";

// Student attendance — real records for logged-in student only

import * as React from "react";
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
import { AttendanceLineChart } from "@/components/charts/attendance-line-chart";
import { useAuthStore } from "@/lib/auth-store";
import { apiGet } from "@/lib/api";

export default function StudentAttendancePage() {
  const user = useAuthStore((s) => s.user);

  const [records, setRecords] = React.useState<any[]>([]);
  const [subjectStats, setSubjectStats] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const [recs, stats] = await Promise.all([
          apiGet<any[]>("/attendance"),
          apiGet<any[]>(`/students/${user.id}/subject-stats`),
        ]);
        setRecords(recs);
        setSubjectStats(stats);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  function statusBadge(s: string) {
    if (s === "Present") return <Badge variant="success">Present</Badge>;
    if (s === "Late") return <Badge variant="warning">Late</Badge>;
    return <Badge variant="destructive">Absent</Badge>;
  }

  if (loading)
    return (
      <div className="p-8 text-muted-foreground">Loading attendance...</div>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Attendance"
        description="Your real attendance records and subject progress."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Trend chart */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Weekly trend</CardTitle>
          </CardHeader>
          <CardContent>
            <AttendanceLineChart />
          </CardContent>
        </Card>

        {/* Subject progress bars */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Subject progress</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {subjectStats.length === 0 && (
              <div className="text-sm text-muted-foreground">
                No records yet.
              </div>
            )}
            {subjectStats.map((s: any) => (
              <div
                key={s.subject_id}
                className="rounded-2xl border bg-background p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">
                      {s.subject_name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {s.present} present • {s.absent} absent • {s.total} total
                    </div>
                  </div>
                  <Badge
                    variant={
                      s.pct >= 85
                        ? "success"
                        : s.pct >= 75
                          ? "default"
                          : "warning"
                    }
                  >
                    {s.pct}%
                  </Badge>
                </div>
                <div className="mt-3 h-2 w-full rounded-full bg-muted">
                  <div
                    className={`h-2 rounded-full ${s.pct >= 75 ? "bg-primary" : "bg-yellow-500"}`}
                    style={{ width: `${s.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Full history */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Attendance history</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Subject</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Marked by</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      {r.subject_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.date}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.time || "—"}
                    </TableCell>
                    {/* face=camera auto, manual=teacher, auto=session-end */}
                    <TableCell className="text-muted-foreground">
                      {r.marked_by || "—"}
                    </TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                  </TableRow>
                ))}
                {records.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center text-muted-foreground py-8"
                    >
                      No attendance records yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile */}
          <div className="grid gap-3 p-4 md:hidden">
            {records.map((r: any) => (
              <div
                key={r.id}
                className="flex items-start justify-between gap-3 rounded-2xl border bg-background p-4 shadow-sm"
              >
                <div>
                  <div className="font-medium text-sm">{r.subject_name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {r.date} • {r.time || "—"} • {r.marked_by || "—"}
                  </div>
                </div>
                {statusBadge(r.status)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
