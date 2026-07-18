"use client";

import * as React from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { apiGet, apiPatch, apiDelete, apiPost } from "@/lib/api";

type SubjectItem = {
  id: string;
  name: string;
  code: string;
  teacher_id?: string | null;
  teacher_name?: string | null;
  schedule?: string | null;
  avg_attendance_pct?: number;
};

type Teacher = {
  id: string;
  name: string;
  department?: string | null;
};

export default function AdminSubjectsPage() {
  const [data, setData] = React.useState<SubjectItem[]>([]);
  const [teachers, setTeachers] = React.useState<Teacher[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState<SubjectItem | null>(null);
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    code: "",
    teacher_id: "",
    schedule: "",
  });

  async function loadData() {
    setLoading(true);
    try {
      const [subjects, teachersData] = await Promise.all([
        apiGet<SubjectItem[]>("/subjects"),
        apiGet<Teacher[]>("/teachers"),
      ]);
      setData(subjects);
      setTeachers(teachersData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadData();
  }, []);

  async function createSubject() {
    try {
      await apiPost<SubjectItem>("/subjects", form);
      setOpen(false);
      setForm({ name: "", code: "", teacher_id: "", schedule: "" });
      loadData();
    } catch (e: any) {
      alert(e.message || "Unable to create subject");
    }
  }

  async function updateSubject() {
    if (!editing) return;
    try {
      await apiPatch<SubjectItem>(`/subjects/${editing.id}`, {
        name: editing.name,
        schedule: editing.schedule,
        teacher_id: editing.teacher_id || null,
      });
      setEditing(null);
      loadData();
    } catch (e: any) {
      alert(e.message || "Unable to update subject");
    }
  }

  async function removeSubject(id: string) {
    if (!confirm("Delete this subject?")) return;
    try {
      await apiDelete(`/subjects/${id}`);
      loadData();
    } catch (e: any) {
      alert(e.message || "Unable to delete subject");
    }
  }

  if (loading)
    return <div className="p-8 text-muted-foreground">Loading subjects...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subjects"
        description="Manage subject data backed by the database."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4" /> Add subject
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add subject</DialogTitle>
                <DialogDescription>
                  Creates a subject record and assigns a teacher.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-3">
                <div className="grid gap-1">
                  <div className="text-sm font-medium">Name</div>
                  <Input
                    placeholder="e.g. Operating Systems"
                    value={form.name}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, name: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-1">
                  <div className="text-sm font-medium">Code</div>
                  <Input
                    placeholder="e.g. CSC-302"
                    value={form.code}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, code: e.target.value }))
                    }
                  />
                </div>
                <div className="grid gap-1">
                  <div className="text-sm font-medium">Assign teacher</div>
                  <Select
                    value={form.teacher_id}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, teacher_id: e.target.value }))
                    }
                  >
                    <option value="">Select teacher</option>
                    {teachers.map((teacher) => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name}{" "}
                        {teacher.department ? `— ${teacher.department}` : ""}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="grid gap-1">
                  <div className="text-sm font-medium">Schedule</div>
                  <Input
                    placeholder="e.g. Mon/Wed/Fri • 09:00–10:30"
                    value={form.schedule}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, schedule: e.target.value }))
                    }
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={createSubject}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {data.map((subject) => (
          <Card key={subject.id} className="shadow-sm">
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-sm font-semibold">
                  {subject.name}
                </CardTitle>
                <div className="mt-1 text-sm text-muted-foreground">
                  {subject.code}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Edit"
                  onClick={() => setEditing(subject)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Delete"
                  onClick={() => removeSubject(subject.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <div className="text-muted-foreground">Teacher</div>
                <div className="font-medium">{subject.teacher_name || "—"}</div>
              </div>
              <div className="text-sm">
                <div className="text-muted-foreground">Schedule</div>
                <div className="font-medium">{subject.schedule || "—"}</div>
              </div>
              <div className="flex items-center justify-between rounded-2xl border bg-muted/20 p-4">
                <div className="text-sm font-medium">Avg Attendance</div>
                <Badge
                  variant={
                    (subject.avg_attendance_pct ?? 0) >= 75
                      ? "success"
                      : "warning"
                  }
                >
                  {subject.avg_attendance_pct?.toFixed(1) ?? "0.0"}%
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        {data.length === 0 && (
          <div className="text-sm text-muted-foreground col-span-3">
            No subjects found. Add one to get started.
          </div>
        )}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit subject</DialogTitle>
            <DialogDescription>Save changes to the database.</DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="grid gap-1">
                <div className="text-sm font-medium">Name</div>
                <Input
                  value={editing.name}
                  onChange={(e) =>
                    setEditing((p) => (p ? { ...p, name: e.target.value } : p))
                  }
                />
              </div>
              <div className="grid gap-1">
                <div className="text-sm font-medium">Assign teacher</div>
                <Select
                  value={editing.teacher_id || ""}
                  onChange={(e) =>
                    setEditing((p) =>
                      p ? { ...p, teacher_id: e.target.value } : p,
                    )
                  }
                >
                  <option value="">No teacher</option>
                  {teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.name}{" "}
                      {teacher.department ? `— ${teacher.department}` : ""}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid gap-1">
                <div className="text-sm font-medium">Schedule</div>
                <Input
                  value={editing.schedule || ""}
                  onChange={(e) =>
                    setEditing((p) =>
                      p ? { ...p, schedule: e.target.value } : p,
                    )
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={updateSubject}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
