"use client";

// Subjects — real CRUD with teacher assignment

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

export default function AdminSubjectsPage() {
  const [data, setData] = React.useState<any[]>([]);
  const [teachers, setTeachers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [editing, setEditing] = React.useState<any>(null);
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    code: "",
    teacher_id: "",
    schedule: "",
  });

  async function load() {
    try {
      const [subs, tchs] = await Promise.all([
        apiGet<any[]>("/subjects"),
        apiGet<any[]>("/teachers"),
      ]);
      setData(subs);
      setTeachers(tchs);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  async function create() {
    try {
      await apiPost("/subjects", form);
      setOpen(false);
      setForm({ name: "", code: "", teacher_id: "", schedule: "" });
      load();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function update() {
    if (!editing) return;
    try {
      await apiPatch(`/subjects/${editing.id}`, {
        name: editing.name,
        schedule: editing.schedule,
        teacher_id: editing.teacher_id,
      });
      setEditing(null);
      load();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this subject?")) return;
    try {
      await apiDelete(`/subjects/${id}`);
      load();
    } catch (e: any) {
      alert(e.message);
    }
  }

  if (loading)
    return <div className="p-8 text-muted-foreground">Loading subjects...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subjects"
        description="Manage subjects and assign teachers."
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
                  Creates and saves to database.
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
                    {teachers.map((t: any) => (
                      <option key={t.id} value={t.id}>
                        {t.name} — {t.department}
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
                <Button onClick={create}>Create</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {data.map((s: any) => (
          <Card key={s.id} className="shadow-sm">
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-sm font-semibold">
                  {s.name}
                </CardTitle>
                <div className="mt-1 text-sm text-muted-foreground">
                  {s.code}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setEditing(s)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => remove(s.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <div className="text-muted-foreground">Teacher</div>
                <div className="font-medium">{s.teacher_name || "—"}</div>
              </div>
              <div className="text-sm">
                <div className="text-muted-foreground">Schedule</div>
                <div className="font-medium">{s.schedule || "—"}</div>
              </div>
              <div className="flex items-center justify-between rounded-2xl border bg-muted/20 p-3">
                <div className="text-sm font-medium">Avg Attendance</div>
                <Badge
                  variant={s.avg_attendance_pct >= 75 ? "success" : "warning"}
                >
                  {s.avg_attendance_pct}%
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
        {data.length === 0 && (
          <div className="text-sm text-muted-foreground col-span-3">
            No subjects yet. Add subjects to get started.
          </div>
        )}
      </div>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit subject</DialogTitle>
            <DialogDescription>
              Changes save to database immediately.
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3">
              <div className="grid gap-1">
                <div className="text-sm font-medium">Name</div>
                <Input
                  value={editing.name}
                  onChange={(e) =>
                    setEditing((p: any) => ({ ...p, name: e.target.value }))
                  }
                />
              </div>
              <div className="grid gap-1">
                <div className="text-sm font-medium">Assign teacher</div>
                <Select
                  value={editing.teacher_id || ""}
                  onChange={(e) =>
                    setEditing((p: any) => ({
                      ...p,
                      teacher_id: e.target.value,
                    }))
                  }
                >
                  <option value="">No teacher</option>
                  {teachers.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.name} — {t.department}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid gap-1">
                <div className="text-sm font-medium">Schedule</div>
                <Input
                  value={editing.schedule || ""}
                  onChange={(e) =>
                    setEditing((p: any) => ({ ...p, schedule: e.target.value }))
                  }
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={update}>Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
