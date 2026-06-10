export type Subject = {
  id: string;
  name: string;
  code: string;
  teacher: string;
  schedule: string;
  avgAttendancePct: number;
};

export type Student = {
  id: string;
  name: string;
  section: string;
  semester: string;
  email: string;
  overallAttendancePct: number;
  faceDataStatus: "Registered" | "Pending" | "Missing";
};

export type Session = {
  id: string;
  subjectId: string;
  subjectName: string;
  teacher: string;
  room: string;
  start: string;
  end: string;
  status: "Scheduled" | "Live" | "Completed";
};

export type AttendanceRecord = {
  id: string;
  studentId: string;
  studentName: string;
  subjectId: string;
  subjectName: string;
  date: string;
  time: string;
  status: "Present" | "Late" | "Absent";
  confidence: number;
};

export type Holiday = {
  id: string;
  date: string;
  name: string;
  tag: "National" | "Institution";
};

export type Alert = {
  id: string;
  type:
    | "Unknown face"
    | "Duplicate face"
    | "Spoof attempt"
    | "Camera offline";
  severity: "Low" | "Medium" | "High";
  camera?: string;
  createdAt: string;
  status: "Open" | "Resolved" | "Ignored";
};

