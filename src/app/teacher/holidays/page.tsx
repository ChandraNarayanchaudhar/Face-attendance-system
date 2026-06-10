"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function TeacherHolidaysPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Holidays"
        description="View holidays and non-working days"
      />
      <Card className="shadow-sm">
        <CardContent className="p-8 text-center text-muted-foreground">
          Holiday calendar coming soon...
        </CardContent>
      </Card>
    </div>
  );
}
