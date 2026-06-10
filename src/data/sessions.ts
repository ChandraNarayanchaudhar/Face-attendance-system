import type { Session } from "./types";

export const sessions: Session[] = [
  {
    id: "SES-1001",
    subjectId: "sub-os",
    subjectName: "Operating Systems",
    teacher: "S. Gurung",
    room: "Lab 2A",
    start: "09:00",
    end: "10:30",
    status: "Live",
  },
  {
    id: "SES-1002",
    subjectId: "sub-math",
    subjectName: "Mathematics",
    teacher: "R. Acharya",
    room: "Room 301",
    start: "10:00",
    end: "11:00",
    status: "Scheduled",
  },
  {
    id: "SES-1003",
    subjectId: "sub-db",
    subjectName: "Database Systems",
    teacher: "N. Karki",
    room: "Room 204",
    start: "12:00",
    end: "13:30",
    status: "Scheduled",
  },
  {
    id: "SES-0996",
    subjectId: "sub-ai",
    subjectName: "AI Fundamentals",
    teacher: "P. Shrestha",
    room: "Room 105",
    start: "13:00",
    end: "14:30",
    status: "Completed",
  },
];

