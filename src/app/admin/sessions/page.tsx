"use client";

// Sessions — ADMIN ONLY create/edit/start/end/assign camera
// Teachers can only VIEW

import * as React from "react";
import { Play, Plus, Square } from "lucide-react";
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

export default function AdminSessionsPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "admin";

  const [data, setData] = React.useState<any[]>([]);
  const [subjects, setSubjects] = React.useState<any[]>([]);
  const [teachers, setTeachers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    subject_id: "",
    teacher_id: "",
    room: "",
    camera: "",
    start_time: "09:00",
    end_time: "10:30",
  });

  async function load() {
    try {
      const [ses, subs, tchs] = await Promise.all([
        apiGet<any[]>("/sessions"),
        apiGet<any[]>("/subjects"),
        apiGet<any[]>("/teachers"),
      ]);
      setData(ses);
      setSubjects(subs);
      setTeachers(tchs);
      if (subs.length && !form.subject_id) {
        setForm((p) => ({ ...p, subject_id: subs[0].id }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  async function createSession() {
    try {
      await apiPost("/sessions", form);
      setOpen(false);
      load();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function toggleSession(s: any) {
    try {
      if (s.status === "Scheduled") {
        await apiPatch(`/sessions/${s.id}/status`, { status: "Live" });
      } else if (s.status === "Live") {
        await apiPost(`/sessions/${s.id}/end`, {});
      }
      load();
    } catch (e: any) {
      alert(e.message);
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
                    Assign CCTV camera to auto-mark attendance.
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
                      {subjects.map((s: any) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </Select>
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
                      {teachers.map((t: any) => (
                        <option key={t.id} value={t.id}>
                          {t.name} — {t.department}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">Room</div>
                    <Input
                      value={form.room}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, room: e.target.value }))
                      }
                      placeholder="e.g. Lab 2A"
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">📷 Camera (CCTV)</div>
                    <Input
                      value={form.camera}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, camera: e.target.value }))
                      }
                      placeholder="e.g. Cam 2 • Lab 2A  or  rtsp://admin:pass@192.168.1.100:554/stream"
                    />
                    <div className="text-xs text-muted-foreground">
                      USB cam: enter name like "Cam 2 Lab 2A" — IP/CCTV: enter
                      full RTSP URL
                    </div>
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
                  <TableHead>Subject</TableHead>
                  <TableHead>Teacher</TableHead>
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
                {data.map((s: any) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      {s.subject_name}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {s.teacher_name || "—"}
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
                      colSpan={isAdmin ? 8 : 7}
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
            {data.map((s: any) => (
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
                      {s.room} • {s.start_time}–{s.end_time}
                    </div>
                    {s.camera && (
                      <div className="text-xs text-muted-foreground mt-1">
                        📷 {s.camera}
                      </div>
                    )}
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
