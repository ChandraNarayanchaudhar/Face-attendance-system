"use client";

// Student subjects — real enrolled subjects with own attendance %

import * as React from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/lib/auth-store";
import { apiGet } from "@/lib/api";

export default function StudentSubjectsPage() {
  const user = useAuthStore((s) => s.user);

  const [stats, setStats] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        setStats(await apiGet<any[]>(`/students/${user.id}/subject-stats`));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user]);

  if (loading)
    return <div className="p-8 text-muted-foreground">Loading subjects...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Subjects"
        description="Your enrolled subjects with real attendance percentages."
      />

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((s: any) => (
          <Card key={s.subject_id} className="shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3">
                <span className="truncate text-sm">{s.subject_name}</span>
                <Badge variant={s.pct >= 75 ? "success" : "warning"}>
                  {s.pct}%
                </Badge>
              </CardTitle>
              <div className="text-sm text-muted-foreground">
                {s.subject_code}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Present / Absent / Total counts */}
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded-xl border bg-muted/20 p-2">
                  <div className="font-semibold text-green-600">
                    {s.present}
                  </div>
                  <div className="text-xs text-muted-foreground">Present</div>
                </div>
                <div className="rounded-xl border bg-muted/20 p-2">
                  <div className="font-semibold text-red-500">{s.absent}</div>
                  <div className="text-xs text-muted-foreground">Absent</div>
                </div>
                <div className="rounded-xl border bg-muted/20 p-2">
                  <div className="font-semibold">{s.total}</div>
                  <div className="text-xs text-muted-foreground">Total</div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="h-2 w-full rounded-full bg-muted">
                <div
                  className={`h-2 rounded-full ${s.pct >= 75 ? "bg-primary" : "bg-yellow-500"}`}
                  style={{ width: `${s.pct}%` }}
                />
              </div>

              {/* Warning if below 75% */}
              {s.pct < 75 && (
                <div className="rounded-lg bg-yellow-50 px-3 py-2 text-xs text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
                  ⚠️ Below 75% minimum — attend more classes
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {stats.length === 0 && (
          <div className="text-sm text-muted-foreground col-span-3">
            No subjects found. Contact admin.
          </div>
        )}
      </div>
    </div>
  );
}
