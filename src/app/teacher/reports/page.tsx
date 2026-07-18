"use client";

import * as React from "react";
import { Download } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiGet, apiFetch } from "@/lib/api";

export default function TeacherReportsPage() {
  const [summary, setSummary] = React.useState<any>(null);
  const [subjects, setSubjects] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function load() {
      try {
        const [summaryData, subjectsData] = await Promise.all([
          apiGet<any>("/reports/attendance-summary"),
          apiGet<any[]>("/reports/subject-attendance"),
        ]);
        setSummary(summaryData);
        setSubjects(subjectsData);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function exportCSV() {
    try {
      const res = await apiFetch("/reports/export/csv");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "attendance.csv";
      a.click();
    } catch (e) {
      console.error(e);
      alert("Export failed");
    }
  }

  if (loading)
    return <div className="p-8 text-muted-foreground">Loading reports...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Attendance analytics and export for your classes."
        actions={
          <Button variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">
              {summary?.total_records ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Present</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">
              {summary?.present_count ?? 0}
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Absent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-semibold">
              {summary?.absent_count ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Subject attendance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {subjects.map((subject) => (
              <div key={subject.subject_id} className="rounded-2xl border p-4">
                <div className="font-semibold">{subject.name}</div>
                <div className="text-xs text-muted-foreground">
                  {subject.code}
                </div>
                <div className="mt-2 text-2xl font-semibold">
                  {subject.avg_pct}%
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
