"use client";

// Alerts — real security alerts from CCTV cameras

import * as React from "react";
import { Eye, ShieldCheck, ShieldX } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
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
import { apiGet, apiPatch } from "@/lib/api";

export default function AdminAlertsPage() {
  const [data, setData] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [snapshot, setSnapshot] = React.useState<any>(null);

  async function load() {
    try {
      setData(await apiGet<any[]>("/alerts"));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
    // Auto refresh every 15 seconds for new camera alerts
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  async function resolve(id: string) {
    try {
      await apiPatch(`/alerts/${id}/status`, { status: "Resolved" });
      load();
    } catch (e: any) {
      alert(e.message);
    }
  }

  async function ignore(id: string) {
    try {
      await apiPatch(`/alerts/${id}/status`, { status: "Ignored" });
      load();
    } catch (e: any) {
      alert(e.message);
    }
  }

  function severityBadge(sev: string) {
    if (sev === "High") return <Badge variant="destructive">High</Badge>;
    if (sev === "Medium") return <Badge variant="warning">Medium</Badge>;
    return <Badge variant="secondary">Low</Badge>;
  }

  const openCount = data.filter((a: any) => a.status === "Open").length;

  if (loading)
    return <div className="p-8 text-muted-foreground">Loading alerts...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts"
        description={`${openCount} open alert${openCount !== 1 ? "s" : ""} — camera security events.`}
      />

      <Card className="shadow-sm">
        <CardContent className="grid gap-3 p-5">
          {data.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              No alerts. System is running normally.
            </div>
          )}
          {data.map((a: any) => (
            <div
              key={a.id}
              className={`flex flex-col justify-between gap-4 rounded-2xl border p-4 shadow-sm sm:flex-row sm:items-center ${
                a.status === "Open"
                  ? "bg-background border-destructive/20"
                  : "bg-muted/20"
              }`}
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="text-sm font-semibold">{a.type}</div>
                  {severityBadge(a.severity)}
                  <Badge
                    variant={
                      a.status === "Open"
                        ? "destructive"
                        : a.status === "Resolved"
                          ? "success"
                          : "secondary"
                    }
                  >
                    {a.status}
                  </Badge>
                </div>
                {/* Camera that triggered alert */}
                <div className="mt-1 text-sm text-muted-foreground">
                  {a.camera ? `📷 ${a.camera} • ` : ""}
                  {new Date(a.created_at).toLocaleString()}
                </div>
                {a.notes && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {a.notes}
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSnapshot(a)}
                >
                  <Eye className="h-4 w-4" /> View
                </Button>
                {a.status === "Open" && (
                  <>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => resolve(a.id)}
                    >
                      <ShieldCheck className="h-4 w-4" /> Resolve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => ignore(a.id)}
                    >
                      <ShieldX className="h-4 w-4" /> Ignore
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Alert detail dialog */}
      <Dialog open={!!snapshot} onOpenChange={(o) => !o && setSnapshot(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alert details</DialogTitle>
            <DialogDescription>Camera incident review.</DialogDescription>
          </DialogHeader>
          <div className="aspect-video w-full rounded-2xl border bg-muted/40 flex items-center justify-center text-muted-foreground text-sm">
            📷 Camera snapshot placeholder
          </div>
          {snapshot && (
            <div className="rounded-2xl border bg-muted/20 p-4 space-y-2 text-sm">
              <div className="font-semibold">{snapshot.type}</div>
              <div className="text-muted-foreground">
                Camera: {snapshot.camera || "—"}
              </div>
              <div className="text-muted-foreground">
                Time: {new Date(snapshot.created_at).toLocaleString()}
              </div>
              <div className="text-muted-foreground">
                Status: {snapshot.status}
              </div>
              {snapshot.notes && (
                <div className="text-muted-foreground">
                  Notes: {snapshot.notes}
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSnapshot(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
