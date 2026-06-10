import type { Subject } from "./types";

export const subjects: Subject[] = [
  {
    id: "sub-math",
    name: "Mathematics",
    code: "MTH-201",
    teacher: "R. Acharya",
    schedule: "Mon/Wed/Fri • 10:00–11:00",
    avgAttendancePct: 86,
  },
  {
    id: "sub-os",
    name: "Operating Systems",
    code: "CSC-302",
    teacher: "S. Gurung",
    schedule: "Tue/Thu • 09:00–10:30",
    avgAttendancePct: 79,
  },
  {
    id: "sub-ai",
    name: "AI Fundamentals",
    code: "CSC-340",
    teacher: "P. Shrestha",
    schedule: "Mon/Thu • 13:00–14:30",
    avgAttendancePct: 83,
  },
  {
    id: "sub-db",
    name: "Database Systems",
    code: "CSC-220",
    teacher: "N. Karki",
    schedule: "Wed/Fri • 12:00–13:30",
    avgAttendancePct: 88,
  },
];

