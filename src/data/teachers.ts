export interface Teacher {
  id: string;
  name: string;
  email: string;
  department: string;
  subjects: string[];
}

export const teachers: Teacher[] = [
  {
    id: "TECH-001",
    name: "Dr. Ramesh Kumar",
    email: "ramesh.kumar@teacher.demo",
    department: "Computer Science",
    subjects: ["Data Structures", "Web Development"],
  },
  {
    id: "TECH-002",
    name: "Prof. Anjali Singh",
    email: "anjali.singh@teacher.demo",
    department: "Mathematics",
    subjects: ["Calculus", "Linear Algebra"],
  },
  {
    id: "TECH-003",
    name: "Dr. Vikram Patel",
    email: "vikram.patel@teacher.demo",
    department: "Physics",
    subjects: ["Quantum Mechanics", "Thermodynamics"],
  },
];
