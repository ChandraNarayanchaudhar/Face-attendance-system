"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  BookOpen,
  CalendarDays,
  Camera,
  ClipboardCheck,
  FileBarChart2,
  GraduationCap,
  Home,
  LayoutDashboard,
  LogOut,
  Menu,
  MonitorPlay,
  Moon,
  Settings,
  Sun,
  User,
  Users,
} from "lucide-react";
import { useTheme } from "next-themes";

import type { NavItem } from "@/lib/navigation";
import { brand } from "@/lib/navigation";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/auth-store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type AppShellProps = {
  nav: NavItem[];
  user: { name: string; roleLabel: string };
  children: React.ReactNode;
};

export function AppShell({ nav, user, children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const logout = useAuthStore((state) => state.logout);

  const handleLogout = () => {
    logout();
    router.push('/');
  };
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    brand: GraduationCap,
    "layout-dashboard": LayoutDashboard,
    camera: Camera,
    "monitor-play": MonitorPlay,
    "clipboard-check": ClipboardCheck,
    calendar: CalendarDays,
    book: BookOpen,
    users: Users,
    reports: FileBarChart2,
    alerts: AlertTriangle,
    settings: Settings,
    home: Home,
    bell: Bell,
    user: User,
  };
  const BrandIcon = iconMap[brand.iconKey] ?? GraduationCap;

  const Sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
          <BrandIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{brand.name}</div>
          <div className="truncate text-xs text-muted-foreground">
            {user.roleLabel}
          </div>
        </div>
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        <nav className="flex flex-col gap-1 p-3">
          {nav.map((item) => {
            const Icon = iconMap[item.iconKey] ?? LayoutDashboard;
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="truncate">{item.title}</span>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
      <div className="p-3">
        <div className="rounded-2xl border bg-card p-3 shadow-sm">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9">
              <AvatarFallback>
                {user.name
                  .split(" ")
                  .map((p) => p[0])
                  .slice(0, 2)
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold">{user.name}</div>
              <div className="truncate text-xs text-muted-foreground">
                {user.roleLabel}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto grid max-w-[1600px] grid-cols-1 lg:grid-cols-[280px_1fr]">
        <aside className="hidden h-screen border-r bg-card/60 backdrop-blur lg:sticky lg:top-0 lg:block">
          {Sidebar}
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-40 border-b bg-background/70 backdrop-blur">
            <div className="flex items-center justify-between gap-3 p-4 lg:px-6">
              <div className="flex items-center gap-2">
                <Sheet>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="lg:hidden"
                      aria-label="Open menu"
                    >
                      <Menu />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="p-0">
                    <SheetHeader className="p-5">
                      <SheetTitle>Navigation</SheetTitle>
                    </SheetHeader>
                    <Separator />
                    <div className="h-[calc(100vh-72px)]">{Sidebar}</div>
                  </SheetContent>
                </Sheet>
                <div className="text-sm font-semibold text-foreground">
                  {brand.short}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" aria-label="Theme">
                      {theme === "dark" ? <Moon /> : <Sun />}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Theme</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setTheme("light")}>
                      Light
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("dark")}>
                      Dark
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme("system")}>
                      System
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" aria-label="User menu">
                      <User className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          <div className="p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

