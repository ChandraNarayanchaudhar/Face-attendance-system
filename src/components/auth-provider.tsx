// src/components/auth-provider.tsx
// Restores login session on every page load

"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/auth-store";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const isHydrating = useAuthStore((s) => s.isHydrating);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    restoreSession();
    setMounted(true);
  }, [restoreSession]);

  // Prevent hydration mismatch — don't render until client-side hydration is done
  if (!mounted && isHydrating) {
    return null;
  }

  return <>{children}</>;
}
