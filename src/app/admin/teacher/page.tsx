"use client";

// Teachers page — admin creates teacher accounts (no self-register for teachers)

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiGet, apiPost, apiDelete } from "@/lib/api";

export default function AdminTeachersPage() {
  const [data, setData] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    password: "",
    department: "",
    teacher_semesters: "",
  });

  async function load() {
    try {
      setData(await apiGet<any[]>("/teachers"));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  async function createTeacher() {
    try {
      const semesters = form.teacher_semesters
        .split(",")
        .map((sem) => sem.trim())
        .filter(Boolean);

      await apiPost("/teachers", {
        ...form,
        teacher_semesters: semesters.length ? semesters : undefined,
      });
      setCreating(false);
      setForm({ name: "", email: "", password: "", department: "", teacher_semesters: "" });
      load();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function remove(id: string) {
    if (!confirm("Deactivate this teacher?")) return;
    try {
      await apiDelete(`/teachers/${id}`);
      load();
    } catch (e: any) {
      alert(e.message);
    }
  }

  if (loading)
    return <div className="p-8 text-muted-foreground">Loading teachers...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teachers"
        description="Admin creates teacher accounts. Teachers cannot self-register."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" /> Add teacher
          </Button>
        }
      />

      <Card className="shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Semesters</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((t: any) => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {t.email}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {t.department || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {Array.isArray(t.teacher_semesters) && t.teacher_semesters.length > 0
                      ? t.teacher_semesters.join(", ")
                      : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => remove(t.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {data.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground py-8"
                  >
                    No teachers yet. Add teachers using the button above.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create teacher dialog */}
      <Dialog open={creating} onOpenChange={setCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add teacher</DialogTitle>
            <DialogDescription>
              Creates teacher account. Teacher can login but cannot
              self-register.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1">
              <div className="text-sm font-medium">Full Name</div>
              <Input
                placeholder="e.g. Dr. Ramesh Kumar"
                value={form.name}
                onChange={(e) =>
                  setForm((p) => ({ ...p, name: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-1">
              <div className="text-sm font-medium">Email</div>
              <Input
                type="email"
                placeholder="teacher@school.com"
                value={form.email}
                onChange={(e) =>
                  setForm((p) => ({ ...p, email: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-1">
              <div className="text-sm font-medium">Password</div>
              <Input
                type="password"
                placeholder="Min 6 characters"
                value={form.password}
                onChange={(e) =>
                  setForm((p) => ({ ...p, password: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-1">
              <div className="text-sm font-medium">Department</div>
              <Input
                placeholder="e.g. Computer Science"
                value={form.department}
                onChange={(e) =>
                  setForm((p) => ({ ...p, department: e.target.value }))
                }
              />
            </div>
            <div className="grid gap-1">
              <div className="text-sm font-medium">Assigned semesters</div>
              <Input
                placeholder="e.g. 6, 7, 8"
                value={form.teacher_semesters}
                onChange={(e) =>
                  setForm((p) => ({ ...p, teacher_semesters: e.target.value }))
                }
              />
              <div className="text-xs text-muted-foreground">
                Enter semester values separated by commas. Leave empty to allow this teacher to cover any semester.
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreating(false)}>
              Cancel
            </Button>
            <Button onClick={createTeacher}>Create teacher</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
