"use client";

// Student holidays — real holidays from database

import * as React from "react";
import { CalendarDays, RefreshCcw } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { HolidayCalendar } from "@/components/holiday-calendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRealtime } from "@/hooks/useRealtime";

export default function StudentHolidaysPage() {
  const { data, loading, error, refresh } = useRealtime<any[]>({
    endpoint: "/holidays",
    liveEventType: "holidays_updated",
  });

  const holidays = data ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = holidays.filter((h: any) => h.date >= today);
  const past = holidays.filter((h: any) => h.date < today);

  if (loading)
    return <div className="p-8 text-muted-foreground">Loading holidays...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Holidays"
        description="Upcoming and past holidays from the institution."
        actions={
          <Button variant="outline" onClick={refresh}>
            <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        }
      />

      <HolidayCalendar holidays={holidays} />

      {/* Upcoming */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            Upcoming holidays ({upcoming.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {upcoming.length === 0 && (
            <div className="text-sm text-muted-foreground">
              No upcoming holidays scheduled.
            </div>
          )}
          {upcoming.map((h: any) => (
            <div
              key={h.id}
              className="flex items-start justify-between gap-3 rounded-2xl border bg-background p-4 shadow-sm"
            >
              <div>
                <div className="font-semibold text-sm">{h.name}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {h.date}
                </div>
              </div>
              <Badge variant={h.tag === "National" ? "default" : "secondary"}>
                {h.tag}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Past holidays */}
      {past.length > 0 && (
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">
              Past holidays
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {past.map((h: any) => (
              <div
                key={h.id}
                className="flex items-start justify-between gap-3 rounded-2xl border bg-muted/20 p-4 opacity-60"
              >
                <div>
                  <div className="font-semibold text-sm">{h.name}</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    {h.date}
                  </div>
                </div>
                <Badge variant="secondary">{h.tag}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
