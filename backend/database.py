import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Use a stable absolute path for the sqlite DB inside the backend directory so
# different working directories (uvicorn reload vs scripts) use the same file.
BASE_DIR = os.path.dirname(__file__)
default_db_path = os.path.join(BASE_DIR, "smart_attendance.db")
DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{default_db_path}")
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}
engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
