"use client";

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
import { apiFetch, apiGet } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

export default function TeacherAttendancePage() {
  const user = useAuthStore((s) => s.user);
  const [records, setRecords] = React.useState<any[]>([]);
  const [sessions, setSessions] = React.useState<any[]>([]);
  const [subjects, setSubjects] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [subjectId, setSubjectId] = React.useState("all");
  const [sessionId, setSessionId] = React.useState("all");
  const [status, setStatus] = React.useState("all");
  const [date, setDate] = React.useState("");

  React.useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const [teacherSessions, teacherSubjects, teacherAttendance] =
          await Promise.all([
            apiGet<any[]>(`/sessions?teacher_id=${user.id}`),
            apiGet<any[]>(`/subjects?teacher_id=${user.id}`),
            apiGet<any[]>(`/attendance?teacher_id=${user.id}`),
          ]);
        setSessions(teacherSessions);
        setSubjects(teacherSubjects);
        setRecords(teacherAttendance);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  const filteredRecords = records.filter((record) => {
    if (subjectId !== "all" && record.subject_id !== subjectId) return false;
    if (sessionId !== "all" && record.session_id !== sessionId) return false;
    if (status !== "all" && record.status !== status) return false;
    if (date && record.date !== date) return false;
    return true;
  });

  async function exportCSV() {
    try {
      const subjectQuery =
        subjectId !== "all" ? `subject_id=${subjectId}&` : "";
      const sessionQuery =
        sessionId !== "all" ? `session_id=${sessionId}&` : "";
      const statusQuery = status !== "all" ? `status=${status}&` : "";
      const dateQuery = date ? `date_from=${date}&date_to=${date}` : "";
      const res = await apiFetch(
        `/reports/export/csv?${subjectQuery}${sessionQuery}${statusQuery}${dateQuery}`,
      );
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "attendance.csv";
      a.click();
    } catch (e) {
      console.error(e);
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
        description="View and export student attendance for your sessions."
        actions={
          <Button variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        }
      />

      <Card className="shadow-sm">
        <CardContent className="p-5">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <div className="text-sm font-medium">Subject</div>
              <Select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
              >
                <option value="all">All subjects</option>
                {subjects
                  .filter((s) => s.teacher_id === user?.id)
                  .map((subject) => (
                    <option key={subject.id} value={subject.id}>
                      {subject.name}
                    </option>
                  ))}
              </Select>
            </div>
            <div>
              <div className="text-sm font-medium">Session</div>
              <Select
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
              >
                <option value="all">All sessions</option>
                {sessions.map((session) => (
                  <option key={session.id} value={session.id}>
                    {session.subject_name} • {session.session_date}
                  </option>
                ))}
              </Select>
            </div>
            <div>
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
            <div>
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
                {filteredRecords.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div className="font-medium">{record.student_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {record.student_id}
                      </div>
                    </TableCell>
                    <TableCell>{record.subject_name}</TableCell>
                    <TableCell>{record.date}</TableCell>
                    <TableCell>{record.time || "—"}</TableCell>
                    <TableCell>{statusBadge(record.status)}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {record.marked_by || "—"}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {record.confidence
                        ? `${Math.round(record.confidence * 100)}%`
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredRecords.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground py-8"
                    >
                      No attendance records found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="grid gap-3 p-4 md:hidden">
            {filteredRecords.map((record) => (
              <div
                key={record.id}
                className="rounded-2xl border bg-background p-4 shadow-sm"
              >
                <div className="font-medium">{record.student_name}</div>
                <div className="text-xs text-muted-foreground">
                  {record.subject_name}
                </div>
                <div className="text-xs text-muted-foreground">
                  {record.date} • {record.time || "—"}
                </div>
                <div className="mt-2">{statusBadge(record.status)}</div>
                <div className="text-xs text-muted-foreground mt-2">
                  Marked by: {record.marked_by || "—"}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
