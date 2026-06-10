import { Camera, ShieldAlert, UserCheck } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const cameras = [
  { id: "Cam 1", location: "Gate", faces: 18, session: "Operating Systems" },
  { id: "Cam 2", location: "Lab", faces: 12, session: "AI Fundamentals" },
  { id: "Cam 3", location: "Corridor", faces: 0, session: "—" },
];

const recognized = [
  { name: "Nisha Rai", time: "09:01", confidence: 0.97 },
  { name: "Sita Karki", time: "09:06", confidence: 0.92 },
  { name: "Aayush Thapa", time: "09:00", confidence: 0.86 },
];

const unknown = [
  { camera: "Cam 1 • Gate", time: "09:04", reason: "Unknown face" },
  { camera: "Cam 3 • Corridor", time: "08:52", reason: "Camera offline (simulated)" },
];

export default function LiveMonitorPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Live Monitor"
        description="Simulated camera streams with recognition events and unknown alerts."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {cameras.map((c) => (
            <Card key={c.id} className="shadow-sm">
              <CardHeader className="flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-sm font-semibold">
                    {c.id} • {c.location}
                  </CardTitle>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Session: {c.session}
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
                    Fake stream preview
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="text-muted-foreground">Face count</div>
                  <div className="font-semibold">{c.faces}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="text-sm font-semibold">Recognized faces</CardTitle>
              <Badge variant="success">{recognized.length}</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {recognized.map((r) => (
                <div
                  key={r.name + r.time}
                  className="flex items-start justify-between gap-3 rounded-2xl border bg-background p-4 shadow-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{r.name}</div>
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
              <CardTitle className="text-sm font-semibold">Unknown alerts</CardTitle>
              <Badge variant="destructive">{unknown.length}</Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {unknown.map((u) => (
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
                  In a real system, snapshots and embeddings would be reviewed and resolved
                  here. This prototype simulates the workflow only.
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

