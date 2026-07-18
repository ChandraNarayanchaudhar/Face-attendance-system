"use client";

// Sessions — ADMIN ONLY create/edit/start/end/assign camera
// Teachers can only VIEW

import * as React from "react";
import { Check, Copy, Play, Plus, Square } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { apiGet, apiPost, apiPatch } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

type Teacher = {
  id: string;
  name: string;
  department?: string;
  teacher_semesters?: string[];
};

type Subject = {
  id: string;
  name: string;
  code: string;
};

type SessionItem = {
  id: string;
  subject_name: string;
  teacher_name?: string;
  room?: string;
  camera?: string;
  semester?: string;
  start_time: string;
  end_time: string;
  session_date: string;
  status: string;
};

type SessionFormState = {
  subject_id: string;
  teacher_id: string;
  room: string;
  camera: string;
  semester: string;
  start_time: string;
  end_time: string;
};

export default function AdminSessionsPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";

  const [data, setData] = React.useState<SessionItem[]>([]);
  const [subjects, setSubjects] = React.useState<Subject[]>([]);
  const [teachers, setTeachers] = React.useState<Teacher[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const copySessionId = async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1500);
    } catch {
      // Clipboard API unavailable — fail silently, ID is still visible on screen
    }
  };
  const [form, setForm] = React.useState<SessionFormState>({
    subject_id: "",
    teacher_id: "",
    room: "",
    camera: "",
    semester: "",
    start_time: "09:00",
    end_time: "10:30",
  });

  const parseTeacherSemesters = (teacher: {
    teacher_semesters?: string | string[];
  }) => {
    if (!teacher?.teacher_semesters) return [];
    if (Array.isArray(teacher.teacher_semesters))
      return teacher.teacher_semesters;
    try {
      const parsed = JSON.parse(teacher.teacher_semesters);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const isTeacherEligible = (
    teacher: { teacher_semesters?: string | string[] },
    semester: string,
  ) => {
    const semesters = parseTeacherSemesters(teacher);
    return semesters.length === 0 || semesters.includes(semester);
  };

  const load = React.useCallback(async () => {
    try {
      const [ses, subs, tchs] = await Promise.all([
        apiGet<SessionItem[]>("/sessions"),
        apiGet<Subject[]>("/subjects"),
        apiGet<Teacher[]>("/teachers"),
      ]);
      setData(ses);
      setSubjects(subs);
      setTeachers(tchs);
      if (subs.length) {
        setForm((p) => (p.subject_id ? p : { ...p, subject_id: subs[0].id }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    async function fetchData() {
      await load();
    }
    void fetchData();
  }, [load]);

  async function createSession() {
    try {
      if (!form.semester) {
        throw new Error("Please enter the session semester.");
      }
      await apiPost("/sessions", form);
      setOpen(false);
      load();
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert("Failed to create session.");
      }
    }
  }

  async function toggleSession(s: SessionItem) {
    try {
      if (s.status === "Scheduled") {
        await apiPatch(`/sessions/${s.id}/status`, { status: "Live" });
      } else if (s.status === "Live") {
        await apiPost(`/sessions/${s.id}/end`, {});
      }
      load();
    } catch (error) {
      if (error instanceof Error) {
        alert(error.message);
      } else {
        alert("Failed to update session status.");
      }
    }
  }

  function statusBadge(status: string) {
    if (status === "Live") return <Badge variant="success">🔴 Live</Badge>;
    if (status === "Completed")
      return <Badge variant="secondary">Completed</Badge>;
    return <Badge variant="default">Scheduled</Badge>;
  }

  if (loading)
    return <div className="p-8 text-muted-foreground">Loading sessions...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sessions"
        description={
          isAdmin
            ? "Create sessions, assign CCTV cameras, start/end sessions."
            : "View sessions. Contact admin to create or change sessions."
        }
        actions={
          isAdmin ? (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" /> Create session
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create session</DialogTitle>
                  <DialogDescription>
                    Assign an optional CCTV camera to auto-mark attendance.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">Subject</div>
                    <Select
                      value={form.subject_id}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, subject_id: e.target.value }))
                      }
                    >
                      <option value="">Select subject</option>
                      {subjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name} ({subject.code})
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">Semester</div>
                    <Input
                      value={form.semester}
                      onChange={(e) => {
                        const semester = e.target.value;
                        setForm((p) => {
                          const selectedTeacher = teachers.find(
                            (t) => t.id === p.teacher_id,
                          );
                          if (
                            p.teacher_id &&
                            semester &&
                            selectedTeacher &&
                            !isTeacherEligible(selectedTeacher, semester)
                          ) {
                            return { ...p, semester, teacher_id: "" };
                          }
                          return { ...p, semester };
                        });
                      }}
                      placeholder="e.g. 6, 7, 8"
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">Teacher</div>
                    <Select
                      value={form.teacher_id}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, teacher_id: e.target.value }))
                      }
                    >
                      <option value="">Select teacher</option>
                      {teachers.map((t: Teacher) => {
                        const eligible = form.semester
                          ? isTeacherEligible(t, form.semester)
                          : true;
                        return (
                          <option key={t.id} value={t.id} disabled={!eligible}>
                            {t.name} — {t.department}
                            {Array.isArray(t.teacher_semesters) &&
                            t.teacher_semesters.length > 0
                              ? ` (${t.teacher_semesters.join(", ")})`
                              : ""}
                            {form.semester && !eligible
                              ? " — not assigned"
                              : ""}
                          </option>
                        );
                      })}
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">Room (optional)</div>
                    <Input
                      value={form.room}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, room: e.target.value }))
                      }
                      placeholder="e.g. Lab 2A"
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">
                      📷 Camera (optional)
                    </div>
                    <Input
                      value={form.camera}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, camera: e.target.value }))
                      }
                      placeholder="e.g. Cam 2 • Lab 2A  or  rtsp://admin:pass@192.168.1.100:554/stream"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <div className="text-sm font-medium">Start time</div>
                      <Input
                        value={form.start_time}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, start_time: e.target.value }))
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <div className="text-sm font-medium">End time</div>
                      <Input
                        value={form.end_time}
                        onChange={(e) =>
                          setForm((p) => ({ ...p, end_time: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={createSession}>Create</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : undefined
        }
      />

      <Card className="shadow-sm">
        <CardContent className="p-0">
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Session ID</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Teacher</TableHead>
                  <TableHead>Semester</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>📷 Camera</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  {isAdmin && (
                    <TableHead className="text-right">Actions</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((s: SessionItem) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      <button
                        type="button"
                        onClick={() => copySessionId(s.id)}
                        title={s.id}
                        className="flex items-center gap-1 hover:text-foreground"
                      >
                        {s.id.slice(0, 8)}…
                        {copiedId === s.id ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="font-medium">
                      {s.subject_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.teacher_name || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.semester || "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.room}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {s.camera ? (
                        <span className="flex items-center gap-1">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              s.status === "Live"
                                ? "bg-green-500"
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
                    <TableCell className="text-muted-foreground">
                      {s.session_date}
                    </TableCell>
                    <TableCell>{statusBadge(s.status)}</TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        {s.status !== "Completed" && (
                          <Button
                            size="sm"
                            variant={
                              s.status === "Live" ? "destructive" : "default"
                            }
                            onClick={() => toggleSession(s)}
                          >
                            {s.status === "Live" ? (
                              <>
                                <Square className="h-3 w-3" /> End
                              </>
                            ) : (
                              <>
                                <Play className="h-3 w-3" /> Start
                              </>
                            )}
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {data.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={isAdmin ? 9 : 8}
                      className="text-center text-muted-foreground py-8"
                    >
                      No sessions found. Admin can create sessions.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile */}
          <div className="grid gap-3 p-4 md:hidden">
            {data.map((s: SessionItem) => (
              <div
                key={s.id}
                className="rounded-2xl border bg-background p-4 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold text-sm">
                      {s.subject_name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {s.room} • Semester {s.semester || "—"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {s.start_time}–{s.end_time}
                    </div>
                    {s.camera && (
                      <div className="text-xs text-muted-foreground mt-1">
                        📷 {s.camera}
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => copySessionId(s.id)}
                      className="mt-2 flex items-center gap-1 font-mono text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      ID: {s.id.slice(0, 8)}…
                      {copiedId === s.id ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </button>
                  </div>
                  {statusBadge(s.status)}
                </div>
                {isAdmin && s.status !== "Completed" && (
                  <Button
                    className="mt-3 w-full"
                    variant={s.status === "Live" ? "destructive" : "default"}
                    onClick={() => toggleSession(s)}
                  >
                    {s.status === "Live" ? "End session" : "Start session"}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
