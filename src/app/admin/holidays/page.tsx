"use client";

// Holidays — add/delete holidays saved to database

import * as React from "react";
import { Plus, RefreshCcw, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { HolidayCalendar } from "@/components/holiday-calendar";
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
import { apiPost, apiDelete } from "@/lib/api";
import { useRealtime } from "@/hooks/useRealtime";

export default function AdminHolidaysPage() {
  const { data, loading, refresh } = useRealtime<any[]>({
    endpoint: "/holidays",
    liveEventType: "holidays_updated",
  });
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState({
    date: "",
    name: "",
    tag: "National",
  });

  const holidays = data ?? [];

  async function addHoliday() {
    if (!form.date || !form.name) return;
    try {
      await apiPost("/holidays", form);
      setOpen(false);
      setForm({ date: "", name: "", tag: "National" });
      refresh();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function remove(id: string) {
    try {
      await apiDelete(`/holidays/${id}`);
      refresh();
    } catch (e: any) {
      alert(e.message);
    }
  }

  if (loading) {
    return <div className="p-8 text-muted-foreground">Loading holidays...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Holidays"
        description="Manage holidays in the database. All changes update in real time for students and teachers."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={refresh}>
              <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
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
          </div>
        }
      />

      <HolidayCalendar holidays={holidays} />

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Holiday list ({holidays.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {holidays.length === 0 && (
            <div className="text-sm text-muted-foreground py-4">
              No holidays added yet.
            </div>
          )}
          {holidays.map((h: any) => (
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
