#!/usr/bin/env python3
"""Init or migrate the SQLite DB for development.

This script will:
- create missing tables via SQLAlchemy's Base.metadata.create_all
- add missing `users` columns (phone_number, profile_image) via ALTER TABLE when possible
- optionally create a default admin user if none exists

Run from the repo root: `python backend/scripts/init_db.py`
"""
import os
import sqlite3
from sqlalchemy.orm import Session

sys_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
import sys
if sys_path not in sys.path:
    sys.path.insert(0, sys_path)

from database import DATABASE_URL, engine, Base, SessionLocal
import models
from auth import hash_password


def sqlite_path_from_url(url: str) -> str:
    if url.startswith('sqlite'):
        p = url.replace('sqlite:///', '')
        return os.path.abspath(p)
    raise RuntimeError('Only sqlite supported by this script')


def ensure_tables():
    # Create any missing tables
    print('Ensuring tables exist via SQLAlchemy Base.metadata.create_all...')
    Base.metadata.create_all(bind=engine)


def add_missing_user_columns(db_path: str):
    conn = sqlite3.connect(db_path)
    try:
        cur = conn.cursor()
        cur.execute("PRAGMA table_info('users')")
        cols = [r[1] for r in cur.fetchall()]
        to_add = []
        if 'phone_number' not in cols:
            to_add.append(("phone_number", "TEXT"))
        if 'profile_image' not in cols:
            to_add.append(("profile_image", "TEXT"))
        if 'teacher_semesters' not in cols:
            to_add.append(("teacher_semesters", "TEXT"))

        for name, ctype in to_add:
            print(f"Adding column {name} {ctype} to users table")
            cur.execute(f"ALTER TABLE users ADD COLUMN {name} {ctype}")
        if to_add:
            conn.commit()
        else:
            print('No missing users columns detected')
    finally:
        conn.close()


def add_missing_session_columns(db_path: str):
    conn = sqlite3.connect(db_path)
    try:
        cur = conn.cursor()
        cur.execute("PRAGMA table_info('sessions')")
        cols = [r[1] for r in cur.fetchall()]
        if 'semester' not in cols:
            print('Adding column semester VARCHAR to sessions table')
            cur.execute("ALTER TABLE sessions ADD COLUMN semester VARCHAR")
            conn.commit()
        else:
            print('No missing sessions columns detected')
    finally:
        conn.close()


def seed_admin_if_missing():
    s: Session = SessionLocal()
    try:
        admin = s.query(models.User).filter(models.User.role == 'admin').first()
        if admin:
            print('Admin user already exists:', admin.email)
            return
        print('Creating default admin user: admin@example.com / password: admin')
        user = models.User(
            name='Administrator',
            email='admin@example.com',
            hashed_password=hash_password('admin'),
            role='admin',
            is_active=True,
        )
        s.add(user)
        s.commit()
        print('Admin user created')
    finally:
        s.close()


def main():
    print('DATABASE_URL=', DATABASE_URL)
    if DATABASE_URL.startswith('sqlite'):
        db_path = sqlite_path_from_url(DATABASE_URL)
        print('SQLite DB path:', db_path)
        if not os.path.exists(db_path):
            print('DB file does not exist yet; creating tables')
            ensure_tables()
        else:
            # ensure tables exist (no-op for existing) then migrate columns
            ensure_tables()
            add_missing_user_columns(db_path)
            add_missing_session_columns(db_path)
        seed_admin_if_missing()
    else:
        print('Non-sqlite DATABASE_URL detected; running create_all()')
        ensure_tables()
        seed_admin_if_missing()


if __name__ == '__main__':
    main()
