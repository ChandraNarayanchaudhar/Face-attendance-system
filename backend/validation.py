# validation.py — Teacher assignment and session validation utilities

import json
from datetime import datetime
from typing import List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException
from sqlalchemy import or_
import models


def parse_teacher_semesters(teacher_semesters_json: Optional[str]) -> List[str]:
    """Parse JSON semester list from teacher_semesters field."""
    if not teacher_semesters_json:
        return []
    try:
        parsed = json.loads(teacher_semesters_json)
    except (json.JSONDecodeError, TypeError) as exc:
        raise ValueError("teacher_semesters must be a valid JSON list") from exc
    if not isinstance(parsed, list) or any(not isinstance(item, str) for item in parsed):
        raise ValueError("teacher_semesters must be a JSON list of strings")
    return parsed


def serialize_teacher_semesters(semesters: Optional[List[str]]) -> Optional[str]:
    """Serialize semester list to JSON string."""
    if not semesters:
        return None
    try:
        return json.dumps(semesters)
    except TypeError:
        return None


def validate_teacher_exists(teacher_id: Optional[str], db: Session) -> Optional[models.User]:
    """Validate teacher exists and is active. Returns teacher or None if not specified."""
    if not teacher_id:
        return None
    teacher = db.query(models.User).filter(
        models.User.id == teacher_id,
        models.User.role == "teacher",
        or_(models.User.is_active == True, models.User.is_active.is_(None)),
    ).first()
    if not teacher:
        raise HTTPException(400, f"Teacher {teacher_id} not found or inactive")
    return teacher


def validate_teacher_semester_assignment(
    teacher_id: str,
    session_semester: str,
    db: Session
) -> None:
    """Validate that teacher is assigned to teach the required semester."""
    teacher = db.query(models.User).filter(
        models.User.id == teacher_id,
        models.User.role == "teacher"
    ).first()
    if not teacher:
        raise HTTPException(400, f"Teacher not found")
    
    assigned_semesters = parse_teacher_semesters(teacher.teacher_semesters)
    if assigned_semesters and session_semester not in assigned_semesters:
        raise HTTPException(
            400,
            f"Teacher '{teacher.name}' is not assigned to semester '{session_semester}'. "
            f"Assigned semesters: {', '.join(assigned_semesters) or 'None'}"
        )


def check_teacher_time_conflict(
    teacher_id: str,
    session_date_str: str,
    start_time_str: str,
    end_time_str: str,
    exclude_session_id: Optional[str] = None,
    db: Optional[Session] = None
) -> List[dict]:
    """
    Check if teacher has conflicting sessions at the same time.
    Returns list of conflicting sessions (empty if no conflicts).
    """
    if not db:
        return []
    
    try:
        # Parse times (format: "HH:MM")
        start_h, start_m = map(int, start_time_str.split(":"))
        end_h, end_m = map(int, end_time_str.split(":"))
        start_minutes = start_h * 60 + start_m
        end_minutes = end_h * 60 + end_m
    except (ValueError, AttributeError):
        # Invalid time format - let it pass (other validation will catch it)
        return []
    
    try:
        from datetime import datetime as dt
        session_date = dt.strptime(session_date_str, "%Y-%m-%d").date() if isinstance(session_date_str, str) else session_date_str
    except (ValueError, AttributeError):
        return []
    
    # Find all sessions for this teacher on the same date
    existing_sessions = db.query(models.Session).filter(
        models.Session.teacher_id == teacher_id,
        models.Session.session_date == session_date,
        models.Session.status.in_(["Scheduled", "Live"]),
    )
    
    if exclude_session_id:
        existing_sessions = existing_sessions.filter(models.Session.id != exclude_session_id)
    
    conflicts = []
    for session in existing_sessions.all():
        try:
            ex_start_h, ex_start_m = map(int, session.start_time.split(":"))
            ex_end_h, ex_end_m = map(int, session.end_time.split(":"))
            ex_start_minutes = ex_start_h * 60 + ex_start_m
            ex_end_minutes = ex_end_h * 60 + ex_end_m
            
            # Check for overlap: start < other.end AND end > other.start
            if start_minutes < ex_end_minutes and end_minutes > ex_start_minutes:
                conflicts.append({
                    "session_id": session.id,
                    "subject_name": session.subject.name if session.subject else "Unknown",
                    "start_time": session.start_time,
                    "end_time": session.end_time,
                    "room": session.room
                })
        except (ValueError, AttributeError):
            continue
    
    return conflicts


def validate_subject_semester(subject_id: str, db: Session) -> Optional[str]:
    """
    Get the semester context for a subject (from sessions or inferred).
    Returns semester string if found, None otherwise.
    """
    subject = db.query(models.Subject).filter(models.Subject.id == subject_id).first()
    if not subject:
        return None
    
    # Try to get semester from subject's sessions (if any)
    session = db.query(models.Session).filter(models.Session.subject_id == subject_id).first()
    if session:
        # TODO: When session gets semester field, retrieve from here
        pass
    
    return None


def get_teacher_workload(teacher_id: str, db: Session) -> dict:
    """Get teacher's current workload (subjects, sessions count)."""
    subjects_count = db.query(models.Subject).filter(
        models.Subject.teacher_id == teacher_id
    ).count()
    
    active_sessions = db.query(models.Session).filter(
        models.Session.teacher_id == teacher_id,
        models.Session.status.in_(["Scheduled", "Live"])
    ).count()
    
    return {
        "total_subjects": subjects_count,
        "active_sessions": active_sessions
    }
