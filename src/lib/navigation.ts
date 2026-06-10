export type NavItem = {
  title: string;
  href: string;
  iconKey:
    | "layout-dashboard"
    | "camera"
    | "monitor-play"
    | "clipboard-check"
    | "calendar"
    | "book"
    | "users"
    | "reports"
    | "alerts"
    | "settings"
    | "home"
    | "bell"
    | "user";
};

export const adminNav: NavItem[] = [
  { title: "Dashboard", href: "/admin/dashboard", iconKey: "layout-dashboard" },
  { title: "Live Monitor", href: "/admin/live-monitor", iconKey: "camera" },
  { title: "Sessions", href: "/admin/sessions", iconKey: "monitor-play" },
  {
    title: "Attendance",
    href: "/admin/attendance",
    iconKey: "clipboard-check",
  },
  { title: "Holidays", href: "/admin/holidays", iconKey: "calendar" },
  { title: "Subjects", href: "/admin/subjects", iconKey: "book" },
  { title: "Teachers", href: "/admin/teacher", iconKey: "users" },
  { title: "Students", href: "/admin/students", iconKey: "users" },
  { title: "Reports", href: "/admin/reports", iconKey: "reports" },
  { title: "Alerts", href: "/admin/alerts", iconKey: "alerts" },
  { title: "Settings", href: "/admin/settings", iconKey: "settings" },
];

export const studentNav: NavItem[] = [
  { title: "Home", href: "/student/home", iconKey: "home" },
  {
    title: "My Attendance",
    href: "/student/attendance",
    iconKey: "clipboard-check",
  },
  { title: "Sessions", href: "/student/sessions", iconKey: "monitor-play" },
  { title: "Holidays", href: "/student/holidays", iconKey: "calendar" },
  { title: "Subjects", href: "/student/subjects", iconKey: "book" },
  { title: "Notifications", href: "/student/notifications", iconKey: "bell" },
  { title: "Profile", href: "/student/profile", iconKey: "user" },
];

export const teacherNav: NavItem[] = [
  {
    title: "Dashboard",
    href: "/teacher/dashboard",
    iconKey: "layout-dashboard",
  },
  { title: "Sessions", href: "/teacher/sessions", iconKey: "monitor-play" },
  {
    title: "Attendance",
    href: "/teacher/attendance",
    iconKey: "clipboard-check",
  },
  { title: "Subjects", href: "/teacher/subjects", iconKey: "book" },
  { title: "Holidays", href: "/teacher/holidays", iconKey: "calendar" },
  { title: "Reports", href: "/teacher/reports", iconKey: "reports" },
  { title: "Profile", href: "/teacher/profile", iconKey: "user" },
];

export const brand = {
  name: "Smart Attendance",
  short: "Attendance",
  subtitle: "SaaS dashboard demo",
  iconKey: "brand",
} as const;
