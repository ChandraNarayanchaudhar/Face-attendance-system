"use client";

import * as React from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiGet } from "@/lib/api";
import { useAuthStore } from "@/lib/auth-store";

type SessionItem = {
  id: string;
  subject_name: string;
  subject_code?: string;
  semester?: string;
  camera?: string;
  session_date: string;
  start_time: string;
  end_time: string;
  status: string;
};

export default function TeacherSessionsPage() {
  const user = useAuthStore((s) => s.user);
  const [sessions, setSessions] = React.useState<SessionItem[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    if (!user) return;
    try {
      const data = await apiGet<SessionItem[]>(`/sessions?teacher_id=${user.id}`);
      setSessions(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  React.useEffect(() => {
    async function fetchData() {
      await load();
    }
    void fetchData();
  }, [load]);

  if (loading) {
    return <div className="p-8 text-muted-foreground">Loading sessions...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Sessions"
        description="View your scheduled and live sessions."
      />
      <Card className="shadow-sm">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Semester</TableHead>
                <TableHead>Camera</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    <div className="font-medium">{session.subject_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {session.subject_code}
                    </div>
                  </TableCell>
                  <TableCell>{session.session_date}</TableCell>
                  <TableCell>{session.start_time} - {session.end_time}</TableCell>
                  <TableCell>{session.semester || "—"}</TableCell>
                  <TableCell>{session.camera || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {session.status}
                  </TableCell>
                </TableRow>
              ))}
              {sessions.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="text-center text-muted-foreground py-8"
                  >
                    No sessions assigned to you yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
