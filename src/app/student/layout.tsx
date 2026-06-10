'use client';

import { useAuthGuard } from "@/lib/use-auth-guard";
import { AppShell } from "@/components/layout/app-shell";
import { studentNav } from "@/lib/navigation";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoggedIn } = useAuthGuard('student');

  if (!isLoggedIn || !user) {
    return null;
  }

  return (
    <AppShell
      nav={studentNav}
      user={{ name: user.name, roleLabel: "Student" }}
    >
      {children}
    </AppShell>
  );
}

