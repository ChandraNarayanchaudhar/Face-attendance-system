"use client";

// Reports — real charts and at-risk students

import * as React from "react";
import { Download } from "lucide-react";
import { AttendanceLineChart } from "@/components/charts/attendance-line-chart";
import { SubjectBarChart } from "@/components/charts/subject-bar-chart";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiGet, apiFetch } from "@/lib/api";

export default function AdminReportsPage() {
  const [atRisk, setAtRisk] = React.useState<any[]>([]);
  const [summary, setSummary] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function load() {
      try {
        const [students, sum] = await Promise.all([
          apiGet<any[]>("/reports/at-risk-students?threshold=75"),
          apiGet<any>("/reports/attendance-summary"),
        ]);
        setAtRisk(students);
        setSummary(sum);
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
      a.download = "attendance_report.csv";
      a.click();
    } catch {
      alert("Export failed");
    }
  }

  if (loading)
    return <div className="p-8 text-muted-foreground">Loading reports...</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Attendance trends, subject stats, and at-risk students."
        actions={
          <Button variant="outline" onClick={exportCSV}>
            <Download className="h-4 w-4" /> Export CSV
          </Button>
        }
      />

      {/* Summary cards */}
      {summary && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Total Records", value: summary.total_records, color: "" },
            {
              label: "Present",
              value: summary.present_count,
              color: "text-green-600",
            },
            {
              label: "Late",
              value: summary.late_count,
              color: "text-yellow-600",
            },
            {
              label: "Absent",
              value: summary.absent_count,
              color: "text-red-500",
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border bg-card p-5 shadow-sm"
            >
              <div className="text-sm text-muted-foreground">{item.label}</div>
              <div className={`mt-1 text-3xl font-semibold ${item.color}`}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Weekly attendance trend</CardTitle>
          </CardHeader>
          <CardContent>
            <AttendanceLineChart />
          </CardContent>
        </Card>
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Subject-wise attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <SubjectBarChart />
          </CardContent>
        </Card>
      </div>

      {/* At-risk students */}
      <Card className="shadow-sm">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Low attendance students</CardTitle>
          <Badge variant="warning">{atRisk.length} below 75%</Badge>
        </CardHeader>
        <CardContent>
          {atRisk.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4">
              ✅ All students above 75% — good standing!
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {atRisk.map((s: any) => (
                <div
                  key={s.id}
                  className="rounded-2xl border bg-background p-4 shadow-sm"
                >
                  <div className="font-semibold text-sm">{s.name}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {s.id} • Section {s.section}
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                      Attendance
                    </div>
                    <Badge variant="warning">{s.overall_attendance_pct}%</Badge>
                  </div>
                  <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
                    <div
                      className="h-1.5 rounded-full bg-yellow-500"
                      style={{ width: `${s.overall_attendance_pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
