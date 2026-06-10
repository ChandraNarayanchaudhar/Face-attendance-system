"use client";

// Attendance — real records with filters and CSV export

import * as React from "react";
import { Download, Filter } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiGet, apiFetch } from "@/lib/api";

export default function AdminAttendancePage() {
  const [records, setRecords] = React.useState<any[]>([]);
  const [subjects, setSubjects] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [subject, setSubject] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [date, setDate] = React.useState("");

  async function load() {
    try {
      let url = "/attendance?";
      if (subject !== "all") url += `subject_id=${subject}&`;
      if (status !== "all") url += `status=${status}&`;
      if (date) url += `date_from=${date}&date_to=${date}`;
      const [recs, subs] = await Promise.all([
        apiGet<any[]>(url),
        apiGet<any[]>("/subjects"),
      ]);
      setRecords(recs);
      setSubjects(subs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, [subject, status, date]);

  async function exportCSV() {
    try {
      const res = await apiFetch("/reports/export/csv");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "attendance.csv";
      a.click();
    } catch {
      alert("Export failed");
    }
  }

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
        title="Attendance"
        description="All attendance records. Filter by subject, status, or date."
        actions={
          <Button variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        }
      />

      {/* Filters */}
      <Card className="shadow-sm">
        <CardContent className="p-5">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Filter className="h-4 w-4 text-muted-foreground" /> Subject
              </div>
              <Select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              >
                <option value="all">All subjects</option>
                {subjects.map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Status</div>
              <Select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="all">All</option>
                <option value="Present">Present</option>
                <option value="Late">Late</option>
                <option value="Absent">Absent</option>
              </Select>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium">Date</div>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Records table */}
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Marked By</TableHead>
                  <TableHead className="text-right">Confidence</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.student_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.student_id}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.subject_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.date}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.time || "—"}
                    </TableCell>
                    <TableCell>{statusBadge(r.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {/* face = camera auto-marked, manual = teacher override, auto = session-end absent */}
                      {r.marked_by || "—"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {r.confidence
                        ? `${Math.round(r.confidence * 100)}%`
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {records.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground py-8"
                    >
                      No records found
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
                  <div className="font-medium text-sm">{r.student_name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {r.subject_name} • {r.date} • {r.time || "—"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {r.marked_by} •{" "}
                    {r.confidence ? `${Math.round(r.confidence * 100)}%` : "—"}
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
