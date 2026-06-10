"use client";

import { useAuthGuard } from "@/lib/use-auth-guard";
import { AppShell } from "@/components/layout/app-shell";
import { teacherNav } from "@/lib/navigation";

export default function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoggedIn } = useAuthGuard("teacher");

  if (!isLoggedIn || !user) {
    return null;
  }

  return (
    <AppShell nav={teacherNav} user={{ name: user.name, roleLabel: "Teacher" }}>
      {children}
    </AppShell>
  );
}
