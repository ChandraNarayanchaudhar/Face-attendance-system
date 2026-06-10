// src/components/charts/subject-bar-chart.tsx
// Real per-subject attendance from backend

"use client";

import * as React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiGet } from "@/lib/api";

export function SubjectBarChart() {
  const [data, setData] = React.useState<any[]>([]);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    async function load() {
      try {
        // Load real subject attendance % from backend
        const subjects = await apiGet<any[]>("/reports/subject-attendance");
        setData(
          subjects.map((s: any) => ({
            subject: s.code,
            pct: s.avg_pct,
          })),
        );
      } catch (e) {
        setData([]);
      }
    }
    load();
  }, []);

  if (!mounted)
    return (
      <div className="h-56 w-full rounded-2xl bg-muted/40 animate-pulse" />
    );

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: 8, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="subject"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          />
          <YAxis
            domain={[0, 100]}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 16,
            }}
            formatter={(v: any) => [`${v}%`, "Attendance"]}
          />
          <Bar dataKey="pct" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
