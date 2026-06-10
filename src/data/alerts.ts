import type { Alert } from "./types";

export const alerts: Alert[] = [
  {
    id: "AL-9001",
    type: "Unknown face",
    severity: "High",
    camera: "Cam 1 • Gate",
    createdAt: "2026-05-11 09:04",
    status: "Open",
  },
  {
    id: "AL-9002",
    type: "Camera offline",
    severity: "Medium",
    camera: "Cam 3 • Corridor",
    createdAt: "2026-05-11 08:52",
    status: "Open",
  },
  {
    id: "AL-9003",
    type: "Spoof attempt",
    severity: "High",
    camera: "Cam 2 • Lab",
    createdAt: "2026-05-10 13:18",
    status: "Resolved",
  },
  {
    id: "AL-9004",
    type: "Duplicate face",
    severity: "Low",
    camera: "Cam 1 • Gate",
    createdAt: "2026-05-09 10:21",
    status: "Ignored",
  },
];

