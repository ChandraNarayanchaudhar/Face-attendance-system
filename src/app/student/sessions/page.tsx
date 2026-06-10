"use client";

// Student sessions — today sessions with camera info, auto refresh

import * as React from "react";
import { MonitorPlay } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiGet } from "@/lib/api";

export default function StudentSessionsPage() {
  const [sessions, setSessions] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  async function load() {
    try {
      const today = new Date().toISOString().slice(0, 10);
      setSessions(await apiGet<any[]>(`/sessions?session_date=${today}`));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
    // Auto refresh every 30 seconds — catches session status changes
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, []);

  const upcoming = sessions.filter((s: any) => s.status !== "Completed");
  const completed = sessions.filter((s: any) => s.status === "Completed");

  if (loading)
    return <div className="p-8 text-muted-foreground">Loading sessions...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Today's Sessions"
        description="Your classes today. Camera marks attendance automatically."
      />

      <Card className="shadow-sm">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Upcoming</CardTitle>
          <Badge variant="secondary">{sessions.length} sessions today</Badge>
        </CardHeader>
        <CardContent className="grid gap-3">
          {upcoming.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-6">
              No upcoming sessions today.
            </div>
          )}

          {upcoming.map((s: any) => (
            <div
              key={s.id}
              className={`flex flex-col justify-between gap-4 rounded-2xl border p-4 shadow-sm sm:flex-row sm:items-center ${
                s.status === "Live"
                  ? "border-green-500/30 bg-green-50/30 dark:bg-green-900/10"
                  : "bg-background"
              }`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="font-semibold text-sm">{s.subject_name}</div>
                  {s.status === "Live" ? (
                    <Badge variant="success">🔴 Live now</Badge>
                  ) : (
                    <Badge variant="default">Upcoming</Badge>
                  )}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {s.room} • {s.start_time}–{s.end_time}
                </div>
                {/* Camera info — student knows camera is monitoring */}
                {s.camera && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    📷 Camera: {s.camera}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MonitorPlay className="h-4 w-4" />
                {s.status === "Live"
                  ? "Camera marking attendance now"
                  : "Attendance auto-marked when session starts"}
              </div>
            </div>
          ))}

          {/* Completed sessions */}
          {completed.length > 0 && (
            <div className="mt-2">
              <div className="text-xs font-medium text-muted-foreground mb-2">
                COMPLETED TODAY
              </div>
              {completed.map((s: any) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border bg-muted/20 p-4 mb-2 opacity-60"
                >
                  <div>
                    <div className="font-semibold text-sm">
                      {s.subject_name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {s.room} • {s.start_time}–{s.end_time}
                    </div>
                  </div>
                  <Badge variant="secondary">Completed</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
