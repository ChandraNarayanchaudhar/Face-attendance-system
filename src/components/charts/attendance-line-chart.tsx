// src/components/charts/attendance-line-chart.tsx
// Real 7-day attendance trend from backend

"use client";

import * as React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { apiGet } from "@/lib/api";

export function AttendanceLineChart() {
  const [data, setData] = React.useState<any[]>([]);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    async function load() {
      try {
        // Load real 7-day trend from backend
        const trend = await apiGet<any[]>("/reports/attendance-trend?days=7");
        const formatted = trend.map((t: any) => ({
          day: new Date(t.date).toLocaleDateString("en", { weekday: "short" }),
          pct: t.pct,
        }));
        setData(formatted);
      } catch (e) {
        // Show empty chart if API fails
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
        <LineChart
          data={data}
          margin={{ left: 8, right: 8, top: 8, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis
            dataKey="day"
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
          <Line
            type="monotone"
            dataKey="pct"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            dot={{ r: 3, fill: "hsl(var(--primary))" }}
            activeDot={{ r: 5 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
