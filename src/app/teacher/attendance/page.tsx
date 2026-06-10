"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function TeacherAttendancePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Attendance"
        description="View student attendance records"
      />
      <Card className="shadow-sm">
        <CardContent className="p-8 text-center text-muted-foreground">
          Attendance tracking coming soon...
        </CardContent>
      </Card>
    </div>
  );
}
