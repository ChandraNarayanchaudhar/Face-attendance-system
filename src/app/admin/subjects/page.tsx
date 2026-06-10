"use client";

import * as React from "react";
import { Pencil, Trash2 } from "lucide-react";

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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { Subject } from "@/data/types";
import { subjects as seed } from "@/data/subjects";

export default function AdminSubjectsPage() {
  const [data, setData] = React.useState<Subject[]>(seed);
  const [editing, setEditing] = React.useState<Subject | null>(null);

  const update = () => {
    if (!editing) return;
    setData((p) => p.map((s) => (s.id === editing.id ? editing : s)));
    setEditing(null);
  };

  const remove = (id: string) => setData((p) => p.filter((s) => s.id !== id));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subjects"
        description="Manage subjects, teachers, and schedules (mock only)."
      />

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {data.map((s) => (
          <Card key={s.id} className="shadow-sm">
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-sm font-semibold">{s.name}</CardTitle>
                <div className="mt-1 text-sm text-muted-foreground">{s.code}</div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Edit"
                  onClick={() => setEditing(s)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Delete"
                  onClick={() => remove(s.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <div className="text-muted-foreground">Teacher</div>
                <div className="font-medium">{s.teacher}</div>
              </div>
              <div className="text-sm">
                <div className="text-muted-foreground">Schedule</div>
                <div className="font-medium">{s.schedule}</div>
              </div>
              <div className="flex items-center justify-between rounded-2xl border bg-muted/20 p-4">
                <div className="text-sm font-medium">Avg Attendance</div>
                <Badge variant={s.avgAttendancePct >= 85 ? "success" : "warning"}>
                  {s.avgAttendancePct}%
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => (!o ? setEditing(null) : null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit subject</DialogTitle>
            <DialogDescription>Update subject details (mock).</DialogDescription>
          </DialogHeader>
          {editing ? (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <div className="text-sm font-medium">Name</div>
                <Input
                  value={editing.name}
                  onChange={(e) =>
                    setEditing((p) => (p ? { ...p, name: e.target.value } : p))
                  }
                />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium">Teacher</div>
                <Input
                  value={editing.teacher}
                  onChange={(e) =>
                    setEditing((p) => (p ? { ...p, teacher: e.target.value } : p))
                  }
                />
              </div>
              <div className="grid gap-2">
                <div className="text-sm font-medium">Schedule</div>
                <Input
                  value={editing.schedule}
                  onChange={(e) =>
                    setEditing((p) => (p ? { ...p, schedule: e.target.value } : p))
                  }
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={update}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

