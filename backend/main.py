# main.py — Smart Attendance API entry point

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base, get_db
import models
from routers import (
    auth, students, teachers, subjects,
    sessions, attendance, holidays, alerts,
    notifications, reports, settings,
)
from routers import websocket as ws_router

# Create all tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Smart Attendance API",
    version="3.0.0",
    docs_url="/docs",
)

# CORS — allow frontend to connect
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
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
    return {"status": "ok"}