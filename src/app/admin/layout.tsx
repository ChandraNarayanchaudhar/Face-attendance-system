"use client";

import { useAuthGuard } from "@/lib/use-auth-guard";
import { AppShell } from "@/components/layout/app-shell";
import { adminNav } from "@/lib/navigation";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoggedIn } = useAuthGuard("admin");

  if (!isLoggedIn || !user) {
    return null;
  }

  return (
    <AppShell nav={adminNav} user={{ name: user.name, roleLabel: "Admin" }}>
      {children}
    </AppShell>
  );
}
