"use client";

import * as React from "react";
import { RefreshCcw } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { HolidayCalendar } from "@/components/holiday-calendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useRealtime } from "@/hooks/useRealtime";

export default function TeacherHolidaysPage() {
  const { data, loading, error, refresh } = useRealtime<any[]>({
    endpoint: "/holidays",
    liveEventType: "holidays_updated",
  });

  const holidays = data ?? [];

  if (loading) {
    return <div className="p-8 text-muted-foreground">Loading holidays...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Holidays"
        description="View holidays and non-working days."
        actions={
          <Button variant="outline" onClick={refresh}>
            <RefreshCcw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        }
      />

      <HolidayCalendar holidays={holidays} />
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {holidays.map((holiday) => (
                <TableRow key={holiday.id}>
                  <TableCell>{holiday.date}</TableCell>
                  <TableCell>{holiday.name}</TableCell>
                  <TableCell>{holiday.tag}</TableCell>
                </TableRow>
              ))}
              {holidays.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={3}
                    className="text-center text-muted-foreground py-8"
                  >
                    No holidays found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
