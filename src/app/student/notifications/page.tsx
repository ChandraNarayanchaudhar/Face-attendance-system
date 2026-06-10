"use client";

// Student notifications — real notifications, auto refresh every 10 seconds

import * as React from "react";
import { Bell, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiGet, apiPatch, apiPost } from "@/lib/api";

export default function StudentNotificationsPage() {
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  async function load() {
    try {
      setItems(await apiGet<any[]>("/notifications"));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    load();
    // Auto refresh every 10 seconds — gets new notifications from attendance
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  async function markRead(id: string) {
    try {
      await apiPatch(`/notifications/${id}/read`, {});
      load();
    } catch (e) {
      console.error(e);
    }
  }

  async function markAllRead() {
    try {
      await apiPost("/notifications/read-all", {});
      load();
    } catch (e) {
      console.error(e);
    }
  }

  function notifIcon(type: string) {
    if (type === "success") return <CheckCircle2 className="h-4 w-4" />;
    if (type === "warning") return <AlertTriangle className="h-4 w-4" />;
    return <Info className="h-4 w-4" />;
  }

  function notifColor(type: string) {
    if (type === "success")
      return "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400";
    if (type === "warning")
      return "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400";
    return "bg-primary/10 text-primary";
  }

  function typeBadge(type: string) {
    if (type === "success") return <Badge variant="success">Present</Badge>;
    if (type === "warning") return <Badge variant="warning">Attention</Badge>;
    return <Badge variant="default">Info</Badge>;
  }

  const unread = items.filter((n: any) => !n.is_read).length;

  if (loading)
    return (
      <div className="p-8 text-muted-foreground">Loading notifications...</div>
    );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description="Real-time updates about your attendance — auto refreshes every 10 seconds."
        actions={
          unread > 0 ? (
            <Button variant="outline" onClick={markAllRead}>
              Mark all read ({unread})
            </Button>
          ) : undefined
        }
      />

      <Card className="shadow-sm">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            Notifications
            {unread > 0 && <Badge variant="destructive">{unread} new</Badge>}
          </CardTitle>
          {/* Auto refresh indicator */}
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            Auto refresh
          </span>
        </CardHeader>
        <CardContent className="grid gap-3">
          {items.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-8">
              No notifications yet.
            </div>
          )}
          {items.map((n: any) => (
            <div
              key={n.id}
              onClick={() => !n.is_read && markRead(n.id)}
              className={`flex items-start justify-between gap-3 rounded-2xl border p-4 shadow-sm cursor-pointer transition-colors ${
                n.is_read
                  ? "bg-background opacity-70"
                  : "bg-primary/5 border-primary/20"
              }`}
            >
              <div className="flex gap-3 min-w-0">
                {/* Icon by type */}
                <div
                  className={`mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-2xl ${notifColor(n.type)}`}
                >
                  {notifIcon(n.type)}
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">
                    {n.title}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {n.body}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {new Date(n.created_at).toLocaleString()}
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0 space-y-1 text-right">
                {typeBadge(n.type)}
                {/* Unread blue dot */}
                {!n.is_read && (
                  <div className="flex justify-end">
                    <div className="h-2 w-2 rounded-full bg-primary" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
