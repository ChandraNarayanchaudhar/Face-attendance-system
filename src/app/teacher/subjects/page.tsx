"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function TeacherSubjectsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Subjects" description="Your assigned subjects" />
      <Card className="shadow-sm">
        <CardContent className="p-8 text-center text-muted-foreground">
          Subject management coming soon...
        </CardContent>
      </Card>
    </div>
  );
}
