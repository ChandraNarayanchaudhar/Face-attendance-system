# main.py — Smart Attendance API entry point

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

import asyncio

import sqlite3
from database import engine, Base, get_db, DATABASE_URL, default_db_path
import models
from routers import (
    auth, students, teachers, subjects,
    sessions, attendance, holidays, alerts,
    notifications, reports, settings,
)
from routers import websocket as ws_router

def _ensure_sqlite_schema():
    if not DATABASE_URL.startswith("sqlite"):
        return

    Base.metadata.create_all(bind=engine)

    conn = sqlite3.connect(default_db_path)
    try:
        cur = conn.cursor()

        cur.execute("PRAGMA table_info(sessions)")
        session_cols = [row[1] for row in cur.fetchall()]
        if "semester" not in session_cols:
            cur.execute("ALTER TABLE sessions ADD COLUMN semester VARCHAR")

        cur.execute("PRAGMA table_info(users)")
        user_cols = [row[1] for row in cur.fetchall()]
        if "teacher_semesters" not in user_cols:
            cur.execute("ALTER TABLE users ADD COLUMN teacher_semesters TEXT")

        cur.execute("PRAGMA table_info(alerts)")
        alert_cols = [row[1] for row in cur.fetchall()]
        if "image" not in alert_cols:
            cur.execute("ALTER TABLE alerts ADD COLUMN image TEXT")

        cur.execute("UPDATE users SET email = lower(email) WHERE email != lower(email)")
        cur.execute("UPDATE users SET is_active = 1 WHERE is_active IS NULL")
        conn.commit()
    finally:
        conn.close()

# Ensure existing SQLite schema includes new columns and create missing tables
_ensure_sqlite_schema()

app = FastAPI(
    title="Smart Attendance API",
    version="3.0.0",
    docs_url="/docs",
)


@app.on_event("startup")
async def capture_event_loop():
    # Let sync route handlers (and the face-recognition scripts calling in
    # over HTTP) trigger WebSocket broadcasts via broadcast_sync().
    ws_router.set_main_loop(asyncio.get_running_loop())

# CORS — allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://0.0.0.0:3000",
    ],
    allow_origin_regex=r"^https?://.*:3000$",
    allow_credentials=True,
    allow_methods=["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
    allow_headers=["*"],
)

# All routers
app.include_router(auth.router,          prefix="/api/auth",          tags=["Auth"])
app.include_router(students.router,      prefix="/api/students",      tags=["Students"])
app.include_router(teachers.router,      prefix="/api/teachers",      tags=["Teachers"])
app.include_router(subjects.router,      prefix="/api/subjects",      tags=["Subjects"])
app.include_router(sessions.router,      prefix="/api/sessions",      tags=["Sessions"])
app.include_router(attendance.router,    prefix="/api/attendance",    tags=["Attendance"])
app.include_router(holidays.router,      prefix="/api/holidays",      tags=["Holidays"])
app.include_router(alerts.router,        prefix="/api/alerts",        tags=["Alerts"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(reports.router,       prefix="/api/reports",       tags=["Reports"])
app.include_router(settings.router,      prefix="/api/settings",      tags=["Settings"])
app.include_router(ws_router.router,                                  tags=["WebSocket"])

@app.get("/")
def root():
    return {"service": "Smart Attendance API", "status": "running", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "ok"}

# Activity feed — called by face recognition camera
@app.post("/api/activity-feed")
def add_activity_feed(body: dict, db=Depends(get_db)):
    event = models.ActivityFeedEvent(
        label=body.get("label", ""),
        tone=body.get("tone", "primary"),
    )
    db.add(event)
    db.commit()
    ws_router.broadcast_sync({
        "type": "feed_event",
        "data": {"label": event.label, "tone": event.tone},
        "timestamp": event.created_at.isoformat() if event.created_at else None,
    })
    return {"status": "ok"}