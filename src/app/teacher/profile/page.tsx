"use client";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";

export default function TeacherProfilePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Profile"
        description="Manage your profile information"
      />
      <Card className="shadow-sm">
        <CardContent className="p-8 text-center text-muted-foreground">
          Profile management coming soon...
        </CardContent>
      </Card>
    </div>
  );
}
