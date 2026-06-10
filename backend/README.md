# Smart Attendance System — Python FastAPI Backend

Production-ready REST API that powers every page of the Smart Attendance Next.js frontend.

## Tech Stack

| Layer | Library |
|---|---|
| Framework | FastAPI |
| ORM | SQLAlchemy 2 |
| Database | SQLite (dev) / PostgreSQL (prod) |
| Auth | JWT (python-jose) + bcrypt |
| Validation | Pydantic v2 |
| Server | Uvicorn |

---

## Project Structure

```
smart-attendance-backend/
├── main.py              # App entry point, CORS, router registration
├── database.py          # DB engine, session, Base
├── models.py            # All SQLAlchemy ORM tables
├── schemas.py           # All Pydantic request/response models
├── auth.py              # JWT helpers + FastAPI security dependencies
├── utils.py             # Shared helpers (recalc, notifications, feed)
├── seed.py              # Seed DB with all frontend demo data
├── requirements.txt
└── routers/
    ├── auth.py          # POST /register  /login  GET /me
    ├── students.py      # CRUD + face status + per-student stats
    ├── teachers.py      # GET list/detail
    ├── subjects.py      # CRUD
    ├── sessions.py      # CRUD + lifecycle (Scheduled→Live→Completed) + auto-absent
    ├── attendance.py    # CRUD + bulk mark + auto notifications + % recalc
    ├── holidays.py      # CRUD + mark-today-as-holiday
    ├── alerts.py        # CRUD + resolve/ignore
    ├── notifications.py # GET my notifs + mark read + delete
    ├── reports.py       # Dashboard stats + trend + rankings + CSV export
    └── settings.py      # Key-value settings + bulk upsert
```

---

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Seed the database
python seed.py

# 3. Start the server
uvicorn main:app --reload --port 8000
```

Interactive API docs → **http://localhost:8000/docs**

---

## Demo Accounts

| Role | Email | Password |
|---|---|---|
| admin | admin@demo.com | admin123 |
| teacher | ramesh.kumar@teacher.demo | teacher123 |
| teacher | anjali.singh@teacher.demo | teacher123 |
| student | sita.karki@student.demo | student123 |
| student | nisha.rai@student.demo | student123 |
| student | aayush.thapa@student.demo | student123 |
| student | prakash.shah@student.demo | student123 |

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `sqlite:///./smart_attendance.db` | DB connection string |
| `SECRET_KEY` | (dev default) | JWT signing key — **change in production** |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `1440` (24h) | Token lifetime |

For PostgreSQL:
```bash
export DATABASE_URL="postgresql://user:pass@localhost/smart_attendance"
```

---

## Full API Reference

### Auth — `/api/auth`
| Method | Path | Description |
|---|---|---|
| POST | `/register` | Create account (student/teacher/admin) |
| POST | `/login` | Get JWT token |
| GET | `/me` | Current user info |
| POST | `/logout` | Client-side logout |
| PUT | `/me/password` | Change password |

### Students — `/api/students`
| Method | Path | Description |
|---|---|---|
| GET | `/` | List all students (filter: section, semester, face_status, search) |
| POST | `/` | Create student (admin) |
| GET | `/{id}` | Get one student |
| PATCH | `/{id}` | Update student fields |
| DELETE | `/{id}` | Soft-deactivate (admin) |
| PUT | `/{id}/face` | Update face_data_status |
| GET | `/{id}/attendance` | Student's attendance history |
| GET | `/{id}/subject-stats` | Per-subject breakdown |

### Teachers — `/api/teachers`
| Method | Path | Description |
|---|---|---|
| GET | `/` | List all teachers |
| GET | `/{id}` | Get one teacher |

### Subjects — `/api/subjects`
| Method | Path | Description |
|---|---|---|
| GET | `/` | List all subjects |
| POST | `/` | Create subject |
| GET | `/{id}` | Get one subject |
| PATCH | `/{id}` | Update subject |
| DELETE | `/{id}` | Delete subject (admin) |

### Sessions — `/api/sessions`
| Method | Path | Description |
|---|---|---|
| GET | `/` | List sessions (filter: status, subject_id, teacher_id, date) |
| POST | `/` | Create session |
| GET | `/{id}` | Get one session |
| PATCH | `/{id}` | Update session details |
| DELETE | `/{id}` | Delete session (admin) |
| PATCH | `/{id}/status` | Set Scheduled / Live / Completed |
| POST | `/{id}/end` | End session + auto-mark absent |
| GET | `/{id}/attendance` | All attendance for this session |

### Attendance — `/api/attendance`
| Method | Path | Description |
|---|---|---|
| GET | `/` | List records (students see own only; filter by student, subject, date range) |
| POST | `/` | Mark one student |
| POST | `/bulk` | Mark many students at once |
| GET | `/{id}` | Get one record |
| PATCH | `/{id}` | Override status manually |
| DELETE | `/{id}` | Delete record (admin) |

### Holidays — `/api/holidays`
| Method | Path | Description |
|---|---|---|
| GET | `/` | List holidays (filter: tag) |
| POST | `/` | Add holiday (admin) |
| POST | `/today` | Mark today as holiday (admin) |
| DELETE | `/{id}` | Remove holiday (admin) |

### Alerts — `/api/alerts`
| Method | Path | Description |
|---|---|---|
| GET | `/` | List alerts (filter: status, severity) |
| POST | `/` | Create alert (face-recognition service) |
| GET | `/{id}` | Get one alert |
| PATCH | `/{id}/status` | Resolve / Ignore |
| DELETE | `/{id}` | Delete (admin) |

### Notifications — `/api/notifications`
| Method | Path | Description |
|---|---|---|
| GET | `/` | My notifications |
| PATCH | `/{id}/read` | Mark one as read |
| POST | `/read-all` | Mark all as read |
| DELETE | `/{id}` | Delete one |

### Reports — `/api/reports`
| Method | Path | Description |
|---|---|---|
| GET | `/dashboard` | Dashboard metric cards |
| GET | `/attendance-summary` | Totals + percentages with filters |
| GET | `/at-risk-students` | Students below threshold |
| GET | `/subject-attendance` | Per-subject bar chart data |
| GET | `/attendance-trend` | Daily % for line chart |
| GET | `/activity-feed` | Live event feed |
| GET | `/student-rankings` | Leaderboard by attendance % |
| GET | `/export/csv` | Download CSV report |

### Settings — `/api/settings`
| Method | Path | Description |
|---|---|---|
| GET | `/` | List all settings |
| GET | `/{key}` | Get one setting |
| PUT | `/` | Upsert one setting |
| POST | `/bulk` | Upsert multiple settings |
| DELETE | `/{key}` | Delete setting |

---

## Automatic Business Logic

- **Auto-absent**: When a session ends (`PATCH /status` → Completed or `POST /end`), every enrolled student without an attendance record is automatically marked Absent.
- **Percentage recalc**: Every time a record is created, updated, or deleted, `overall_attendance_pct` on the Student and `avg_attendance_pct` on the Subject are recalculated.
- **Notifications**: Every attendance mark creates a real-time notification for the student (Present/Late/Absent). A warning notification is sent when attendance drops below 75%.
- **Activity feed**: Every session start/end and face recognition event appends to the live activity feed.

---

## Connecting the Next.js Frontend

Add to `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

Replace the mock `import { students } from "@/data/students"` imports with `fetch` calls to the API. Use the JWT token from login in `Authorization: Bearer <token>` headers.
