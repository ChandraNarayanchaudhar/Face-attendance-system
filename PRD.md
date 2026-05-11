Product Requirements Document (PRD)
Smart Attendance System — Frontend Only 

Build a production-quality frontend prototype for a Smart Attendance System for colleges/schools using React + Next.js + TypeScript + Tailwind CSS + shadcn/ui. No backend required now. Use mock JSON/local state.

Goal: polished admin + student portals with realistic flows, responsive UI, consistent design system, and clickable navigation between all pages.

1. Product Vision

A modern attendance platform that uses AI/face-recognition workflows (simulated in frontend) to help institutions:

Track attendance in real time
Manage classes, students, subjects
Monitor live sessions / camera feeds
Generate reports
Let students view attendance and alerts

This is frontend-only but should feel like real SaaS software.

2. Primary User Roles
Admin / Teacher

Can manage operations.

Student

Can view personal attendance.

3. Tech Stack
Next.js App Router
React
TypeScript
Tailwind CSS
shadcn/ui
Lucide Icons
Recharts (charts)
Framer Motion (animations)
Zustand or Context API (state)
Mock JSON data
4. Global Design System (STRICT)
Design Personality

Modern SaaS + clean + minimal + premium dashboard.

Think:

Notion + Linear + Stripe Dashboard
Colors
Primary Brand
Indigo: #4F46E5
Primary Hover
#4338CA
Success
Green #16A34A
Warning
Amber #D97706
Danger
Red #DC2626
Background Light
#F8FAFC
Card Background
White #FFFFFF
Border
#E5E7EB
Text Main
#111827
Text Muted
#6B7280
Dark Mode Ready

Use CSS variables.

Radius
Cards: rounded-2xl
Inputs: rounded-xl
Buttons: rounded-xl
Shadows
Soft only:
shadow-sm
shadow-md

No harsh shadows.

Typography
Headings: semibold
Body: medium/regular
Use Inter font
Spacing Rules
Page padding: p-6
Section gaps: gap-6
Card padding: p-5
5. App Layout
Shared Layout
Desktop
Sidebar | Top Navbar
        | Main Content
Mobile
Collapsible sidebar drawer
Top navbar
6. Sidebar Navigation
Admin Sidebar
Dashboard
Live Monitor
Sessions
Attendance
Holidays
Subjects
Students
Reports
Alerts
Settings
Student Sidebar
Home
My Attendance
Sessions
Holidays
Subjects
Notifications
Profile
7. Routes / Pages
PUBLIC ROUTES
/

Landing login page

Features:

Logo
Welcome card
Role selector
Email / ID input
Password
Login button
Demo quick login buttons
ADMIN ROUTES
/admin/dashboard

Widgets:

Total Present Today
Avg Attendance
Late Students
Alerts

Charts:

Weekly attendance line chart
Subject performance bar chart

Tables:

Today's sessions

Activity feed:

Face recognized
Late arrival
Unknown face
/admin/live-monitor

Grid of 3 camera cards:

Live pulse indicator
Fake camera streams
Face count
Session linked

Right panel:

Recognized faces list
Unknown alerts
/admin/sessions

Table:

Subject
Teacher
Room
Start
End
Status

Buttons:

Start session
End session
Create new session modal
/admin/attendance

Advanced table:

Student ID
Name
Subject
Date
Time
Status
Confidence

Filters:

Subject
Date
Status

Export button.

/admin/holidays

Calendar + list view.

Features:

Add holiday modal
Mark today holiday
Delete holiday
National / Institution tag
/admin/subjects

Grid cards:

Each subject:

Name
Code
Teacher
Avg Attendance %
Schedule

Actions:

Edit
Delete
/admin/students

Table:

Student ID
Name
Section
Overall %
Face Data Status

Actions:

Edit
Register Face
Remove
/admin/reports

Charts:

Monthly attendance
Low attendance students
Subject wise trends

Buttons:

Export PDF
Export Excel
/admin/alerts

List:

Unknown faces
Duplicate faces
Spoof attempts
Camera offline

Actions:

Resolve
Ignore
View Snapshot
/admin/settings

Tabs:

General

College name, logo

AI Settings

Confidence threshold
Spoof detection toggle

Attendance Rules

Late threshold
Auto absent toggle

Notifications

Email alerts

STUDENT ROUTES
/student/home

Hero card:

Welcome student
Overall attendance %

Cards:

Subject stats

Warnings:

Below 75%
/student/attendance

Charts + progress bars

History table:

Subject
Date
Status
/student/sessions

Today's classes list

Live class indicator

/student/holidays

Upcoming holidays list

/student/subjects

Cards:

Subject
Teacher
Schedule
My %
/student/notifications

Cards:

Present marked
Warning low %
Session started
/student/profile
Name
ID
Semester
Section
Email
Attendance %
8. Components Library
Layout Components
Sidebar
Navbar
PageHeader
SectionWrapper
Cards
MetricCard
StatusCard
SubjectCard
AlertCard
Tables
DataTable
AttendanceTable
StudentTable
UI
Button
Input
Select
Badge
Modal
Tabs
Drawer
Tooltip
Charts
AttendanceLineChart
SubjectBarChart
PieChartCard
9. State Management

Use mock JSON.

students.ts
subjects.ts
sessions.ts
attendance.ts
holidays.ts
alerts.ts
10. UX Rules
Always smooth
Loading skeletons
Hover states
Transition 200ms
Clickable feel

Every button functional (mock).

Empty States

Show beautiful empty messages.

11. Responsive Rules
Desktop First

Then tablet/mobile.

Sidebar becomes drawer.

Tables become cards on mobile.