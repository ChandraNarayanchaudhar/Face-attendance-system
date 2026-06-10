"use client";

// Holidays — add/delete holidays saved to database

import * as React from "react";
import { Plus, Trash2, Wand2 } from "lucide-react";
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
import { apiGet, apiPost, apiDelete } from "@/lib/api";

export default function AdminHolidaysPage() {
  const [data, setData] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    date: "",
    name: "",
    tag: "National",
  });

  async function load() {
    try {
      setData(await apiGet<any[]>("/holidays"));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
  }, []);

  async function addHoliday() {
    if (!form.date || !form.name) return;
    try {
      await apiPost("/holidays", form);
      setOpen(false);
      setForm({ date: "", name: "", tag: "National" });
      load();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function markToday() {
    try {
      await apiPost("/holidays/today", {});
      load();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function remove(id: string) {
    try {
      await apiDelete(`/holidays/${id}`);
      load();
    } catch (e: any) {
      alert(e.message);
    }
  }

  if (loading)
    return <div className="p-8 text-muted-foreground">Loading holidays...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Holidays"
        description="Manage holidays. Changes visible to all students and teachers."
        actions={
          <>
            <Button variant="outline" onClick={markToday}>
              <Wand2 className="h-4 w-4" /> Mark today
            </Button>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4" /> Add holiday
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add holiday</DialogTitle>
                  <DialogDescription>
                    Saved to database. All users will see it.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">Date</div>
                    <Input
                      type="date"
                      value={form.date}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, date: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">Name</div>
                    <Input
                      placeholder="e.g. Buddha Jayanti"
                      value={form.name}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid gap-2">
                    <div className="text-sm font-medium">Type</div>
                    <Select
                      value={form.tag}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, tag: e.target.value }))
                      }
                    >
                      <option value="National">National</option>
                      <option value="Institution">Institution</option>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={addHoliday}>Add</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        }
      />

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Holiday list ({data.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.length === 0 && (
            <div className="text-sm text-muted-foreground py-4">
              No holidays added yet.
            </div>
          )}
          {data.map((h: any) => (
            <div
              key={h.id}
              className="flex items-start justify-between gap-3 rounded-2xl border bg-background p-4 shadow-sm"
            >
              <div>
                <div className="font-semibold text-sm">{h.name}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {h.date}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={h.tag === "National" ? "default" : "secondary"}>
                  {h.tag}
                </Badge>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => remove(h.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
