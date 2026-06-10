"use client";

// Settings — loads from and saves to real database

import * as React from "react";
import { Save } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiGet, apiPost } from "@/lib/api";

export default function AdminSettingsPage() {
  const [collegeName, setCollegeName] = React.useState("");
  const [confidence, setConfidence] = React.useState("0.85");
  const [spoof, setSpoof] = React.useState("true");
  const [lateThreshold, setLateThreshold] = React.useState("5");
  const [earlyLeave, setEarlyLeave] = React.useState("10");
  const [autoAbsent, setAutoAbsent] = React.useState("true");
  const [attThreshold, setAttThreshold] = React.useState("75");
  const [saved, setSaved] = React.useState(false);

  // Load all settings from database on page open
  React.useEffect(() => {
    async function load() {
      try {
        const settings = await apiGet<any[]>("/settings");
        settings.forEach((s: any) => {
          if (s.key === "institution_name") setCollegeName(s.value || "");
          if (s.key === "confidence_threshold")
            setConfidence(s.value || "0.85");
          if (s.key === "spoof_detection_enabled") setSpoof(s.value || "true");
          if (s.key === "late_threshold_minutes")
            setLateThreshold(s.value || "5");
          if (s.key === "early_leave_buffer") setEarlyLeave(s.value || "10");
          if (s.key === "auto_absent_enabled") setAutoAbsent(s.value || "true");
          if (s.key === "attendance_threshold")
            setAttThreshold(s.value || "75");
        });
      } catch (e) {
        console.error(e);
      }
    }
    load();
  }, []);

  // Save all settings to database
  async function save() {
    try {
      await apiPost("/settings/bulk", {
        settings: [
          { key: "institution_name", value: collegeName },
          { key: "confidence_threshold", value: confidence },
          { key: "spoof_detection_enabled", value: spoof },
          { key: "late_threshold_minutes", value: lateThreshold },
          { key: "early_leave_buffer", value: earlyLeave },
          { key: "auto_absent_enabled", value: autoAbsent },
          { key: "attendance_threshold", value: attThreshold },
        ],
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e: any) {
      alert(e.message);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="System configuration — all changes saved to database."
        actions={
          <Button onClick={save}>
            <Save className="h-4 w-4" />
            {saved ? "✓ Saved!" : "Save changes"}
          </Button>
        }
      />

      <Card className="shadow-sm">
        <CardContent className="p-5">
          <Tabs defaultValue="general">
            <TabsList>
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="ai">AI / Camera</TabsTrigger>
              <TabsTrigger value="rules">Attendance Rules</TabsTrigger>
            </TabsList>

            {/* General */}
            <TabsContent
              value="general"
              className="mt-4 grid gap-4 md:grid-cols-2"
            >
              <div className="space-y-2">
                <div className="text-sm font-medium">
                  College / Institution name
                </div>
                <Input
                  value={collegeName}
                  onChange={(e) => setCollegeName(e.target.value)}
                  placeholder="e.g. Himalayan College of Technology"
                />
                <div className="text-xs text-muted-foreground">
                  Shown on all reports and exports.
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">
                  Attendance warning threshold (%)
                </div>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={attThreshold}
                  onChange={(e) => setAttThreshold(e.target.value)}
                />
                <div className="text-xs text-muted-foreground">
                  Students below this % get warning notification. Default: 75%
                </div>
              </div>
            </TabsContent>

            {/* AI */}
            <TabsContent value="ai" className="mt-4 grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="text-sm font-medium">
                  Face confidence threshold
                </div>
                <Input
                  type="number"
                  step="0.01"
                  min="0.5"
                  max="1"
                  value={confidence}
                  onChange={(e) => setConfidence(e.target.value)}
                />
                <div className="text-xs text-muted-foreground">
                  0.85 = default. Lower = more false positives.
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">Spoof detection</div>
                <select
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  value={spoof}
                  onChange={(e) => setSpoof(e.target.value)}
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
                <div className="text-xs text-muted-foreground">
                  Detects photo/video spoofing attempts.
                </div>
              </div>
            </TabsContent>

            {/* Rules */}
            <TabsContent
              value="rules"
              className="mt-4 grid gap-4 md:grid-cols-2"
            >
              <div className="space-y-2">
                <div className="text-sm font-medium">
                  Late threshold (mins after start)
                </div>
                <Input
                  type="number"
                  min="1"
                  value={lateThreshold}
                  onChange={(e) => setLateThreshold(e.target.value)}
                />
                <div className="text-xs text-muted-foreground">
                  Enter within {lateThreshold} mins = Present. After = Late.
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">
                  Early leave buffer (mins before end)
                </div>
                <Input
                  type="number"
                  min="1"
                  value={earlyLeave}
                  onChange={(e) => setEarlyLeave(e.target.value)}
                />
                <div className="text-xs text-muted-foreground">
                  Leave within {earlyLeave} mins of end = OK. Before = Absent.
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-medium">
                  Auto absent at session end
                </div>
                <select
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  value={autoAbsent}
                  onChange={(e) => setAutoAbsent(e.target.value)}
                >
                  <option value="true">Enabled</option>
                  <option value="false">Disabled</option>
                </select>
                <div className="text-xs text-muted-foreground">
                  Auto-marks absent for students who never showed up.
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
