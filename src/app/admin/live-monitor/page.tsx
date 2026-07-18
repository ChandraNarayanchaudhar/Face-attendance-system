"use client";

import { useMemo } from "react";
import { Camera, DoorOpen, ShieldAlert, UserCheck } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRealtime } from "@/hooks/useRealtime";

function todayDateStr() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

export default function LiveMonitorPage() {
  // Live sessions (cameras) — refresh when feed events occur
  const { data: sessions, loading: sessionsLoading } = useRealtime({
    endpoint: `/sessions?status=Live`,
    refreshInterval: 5000,
    liveEventType: "feed_event",
  } as any);

  // Today's recent attendance records — refresh on feed events
  const { data: attendance } = useRealtime({
    endpoint: `/attendance?date_from=${todayDateStr()}`,
    refreshInterval: 5000,
    liveEventType: "feed_event",
  } as any);

  // Alerts (unknown faces, camera offline) — refresh on alert events
  const { data: alerts } = useRealtime({
    endpoint: `/alerts`,
    refreshInterval: 10000,
    liveEventType: "alert",
  } as any);

  // Gate-mode activity feed (gate recognitions, session start/end, etc.)
  // — Gate mode doesn't write to /api/attendance, only to the activity feed,
  // so this is the only place gate recognitions show up live.
  const { data: feed } = useRealtime({
    endpoint: `/reports/activity-feed?limit=10`,
    refreshInterval: 5000,
    liveEventType: "feed_event",
  } as any);

  const cameras = useMemo(() => {
    if (!sessions || !Array.isArray(sessions)) return [];
    return sessions.map((s: any) => ({
      id: s.id || s.camera || `${s.room || ""}`,
      location: s.room || s.camera || "—",
      faces: 0,
      session: s.subject_name || "—",
    }));
  }, [sessions]);

  const recognized = useMemo(() => {
    if (!attendance || !Array.isArray(attendance)) return [];
    // show most recent 8 records
    return attendance.slice(0, 8).map((r: any) => ({
      name: r.student_name || "Unknown",
      time: r.time || r.date || "—",
      confidence: r.confidence || 0,
    }));
  }, [attendance]);

  const unknown = useMemo(() => {
    if (!alerts || !Array.isArray(alerts)) return [];
    return alerts.slice(0, 6).map((a: any) => ({
      camera: a.camera || "Camera",
      time: a.created_at ? new Date(a.created_at).toLocaleTimeString() : "—",
      reason: a.type || "Unknown alert",
    }));
  }, [alerts]);

  const gateActivity = useMemo(() => {
    if (!feed || !Array.isArray(feed)) return [];
    return feed.map((f: any) => ({
      id: f.id,
      label: f.label,
      tone: f.tone || "primary",
      time: f.created_at ? new Date(f.created_at).toLocaleTimeString() : "—",
    }));
  }, [feed]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Monitor"
        description="Live camera streams and real-time recognition from the database."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {(cameras.length > 0 ? cameras : Array.from({ length: 3 })).map(
            (c: any, idx: number) => {
              const cam = c ?? {
                id: `Cam ${idx + 1}`,
                location: "—",
                faces: 0,
                session: "—",
              };
              return (
                <Card key={cam.id ?? idx} className="shadow-sm">
                  <CardHeader className="flex-row items-start justify-between space-y-0">
                    <div>
                      <CardTitle className="text-sm font-semibold">
                        {cam.id} • {cam.location}
                      </CardTitle>
                      <div className="mt-1 text-sm text-muted-foreground">
                        Session: {cam.session}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success/50" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
                      </span>
                      <Badge variant="secondary">Live</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="aspect-video w-full overflow-hidden rounded-2xl border bg-muted/40">
                      <div className="flex h-full items-center justify-center text-muted-foreground">
                        <Camera className="mr-2 h-4 w-4" />
                        {sessionsLoading
                          ? "Loading stream..."
                          : "Live stream preview"}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="text-muted-foreground">Face count</div>
                      <div className="font-semibold">{cam.faces ?? 0}</div>
                    </div>
                  </CardContent>
                </Card>
              );
            },
          )}
        </div>

        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold">
                Gate activity
              </CardTitle>
              <Badge variant="secondary">{gateActivity.length}</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {gateActivity.map((g: any) => (
                <div
                  key={g.id}
                  className="flex items-start justify-between gap-3 rounded-2xl border bg-background p-4 shadow-sm"
                >
                  <div className="flex min-w-0 items-start gap-2">
                    <DoorOpen className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <div className="truncate text-sm font-medium">
                      {g.label}
                    </div>
                  </div>
                  <div className="shrink-0 text-xs font-medium text-muted-foreground">
                    {g.time}
                  </div>
                </div>
              ))}
              {gateActivity.length === 0 && (
                <div className="text-sm text-muted-foreground">
                  No gate activity yet. Start Gate mode and recognized faces
                  will appear here live.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold">
                Recognized faces
              </CardTitle>
              <Badge variant="success">{recognized.length}</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {recognized.map((r: any) => (
                <div
                  key={r.name + r.time}
                  className="flex items-start justify-between gap-3 rounded-2xl border bg-background p-4 shadow-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      {r.name}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Confidence {(r.confidence * 100).toFixed(0)}%
                    </div>
                  </div>
                  <div className="text-xs font-medium text-muted-foreground">
                    {r.time}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold">
                Unknown alerts
              </CardTitle>
              <Badge variant="destructive">{unknown.length}</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {unknown.map((u: any) => (
                <div
                  key={u.camera + u.time}
                  className="rounded-2xl border bg-background p-4 shadow-sm"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <ShieldAlert className="h-4 w-4 text-destructive" />
                    {u.reason}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {u.camera} • {u.time}
                  </div>
                </div>
              ))}
              <div className="rounded-2xl border bg-muted/30 p-4">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <UserCheck className="h-4 w-4 text-primary" />
                  Tip
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  This view shows live recognition events from the database and
                  alerts (no baked demo data). Use the face-recognition workers
                  to push real events.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
