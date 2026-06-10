"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function TeacherSessionsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="My Sessions"
        description="Manage your teaching sessions"
      />
      <Card className="shadow-sm">
        <CardContent className="p-8 text-center text-muted-foreground">
          Sessions management coming soon...
        </CardContent>
      </Card>
    </div>
  );
}
