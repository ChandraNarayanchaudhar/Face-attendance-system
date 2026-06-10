"use client";

// Student holidays — real holidays from database

import * as React from "react";
import { CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiGet } from "@/lib/api";

export default function StudentHolidaysPage() {
  const [holidays, setHolidays] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function load() {
      try {
        setHolidays(await apiGet<any[]>("/holidays"));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Split into upcoming and past
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
      />

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
