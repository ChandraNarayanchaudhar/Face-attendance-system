import * as React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  title: string;
  value: string;
  delta?: string;
  icon?: React.ReactNode;
  tone?: "primary" | "success" | "warning" | "danger" | "neutral";
};

export function MetricCard({
  title,
  value,
  delta,
  icon,
  tone = "neutral",
}: MetricCardProps) {
  const toneStyles: Record<string, string> = {
    neutral: "bg-muted/40 text-foreground",
    primary: "bg-primary/10 text-primary",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
    danger: "bg-destructive/10 text-destructive",
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
        {icon ? (
          <div className={cn("rounded-2xl p-2", toneStyles[tone])}>{icon}</div>
        ) : null}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        {delta ? (
          <div className="mt-1 text-sm text-muted-foreground">{delta}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}

