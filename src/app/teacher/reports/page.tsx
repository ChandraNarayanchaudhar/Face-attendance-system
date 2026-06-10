"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function TeacherReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Generate and view attendance reports"
      />
      <Card className="shadow-sm">
        <CardContent className="p-8 text-center text-muted-foreground">
          Report generation coming soon...
        </CardContent>
      </Card>
    </div>
  );
}
