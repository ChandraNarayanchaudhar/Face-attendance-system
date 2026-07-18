
import re

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from database import get_db
import models, schemas
from auth import hash_password, verify_password, create_access_token, get_current_user
from utils import validate_base64_image
from typing import Optional

router = APIRouter()


@router.post("/register", response_model=schemas.TokenResponse, status_code=201)
def register(payload: schemas.RegisterRequest, db: Session = Depends(get_db)):
    # Check email not taken
    if db.query(models.User).filter(func.lower(models.User.email) == payload.email.lower()).first():
        raise HTTPException(400, "Email already registered")

    user_kwargs = {
        "name": payload.name,
        "email": payload.email.lower(),
        "hashed_password": hash_password(payload.password),
        "phone_number": payload.phone_number,
        "profile_image": payload.profile_image,
        "role": payload.role,
        "section": payload.section,
        "semester": payload.semester,
        "department": payload.department,
        "is_active": True,
    }

    # Validate provided profile image if present
    if payload.profile_image:
        try:
            validate_base64_image(payload.profile_image)
        except ValueError as e:
            raise HTTPException(400, f"Invalid profile image: {e}")

    def _next_numeric_suffix(prefix: str) -> int:
        # Find max numeric suffix for users with given prefix (e.g. ST-)
        q = db.query(models.User).filter(models.User.id.like(f"{prefix}-%"))
        max_num = 0
        for u in q.all():
            parts = u.id.split("-")
            if len(parts) >= 2 and parts[-1].isdigit():
                num = int(parts[-1])
                if num > max_num:
                    max_num = num
        return max_num + 1

    def _build_id_for_role(role: str, provided: Optional[str]) -> str:
        if role == "student":
            if provided:
                # accept ST-123 or plain digits (legacy)
                if re.fullmatch(r"\d+", provided):
                    return f"ST-{int(provided)}"
                if re.fullmatch(r"ST-\d+", provided):
                    return provided
                raise HTTPException(400, "Student ID must be digits or start with 'ST-'")
            # auto-generate next ST-### id (pad not required)
            nxt = _next_numeric_suffix("ST")
            return f"ST-{nxt}"
        elif role == "teacher":
            if provided:
                if re.fullmatch(r"TE-\d+", provided):
                    return provided
                if re.fullmatch(r"\d+", provided):
                    return f"TE-{int(provided)}"
                raise HTTPException(400, "Teacher ID must be digits or start with 'TE-'")
            nxt = _next_numeric_suffix("TE")
            return f"TE-{nxt}"
        else:
            return None

    # Ensure proper IDs for students/teachers
    if payload.role == "student":
        student_id_val = _build_id_for_role("student", payload.student_id)
        if db.query(models.User).filter(models.User.id == student_id_val).first():
            raise HTTPException(400, "Student ID already registered")
        user_kwargs["id"] = student_id_val
    elif payload.role == "teacher":
        # Teachers may be assigned a TE- id automatically
        teacher_id_val = _build_id_for_role("teacher", None)
        if db.query(models.User).filter(models.User.id == teacher_id_val).first():
            # unlikely but try next
            teacher_id_val = _build_id_for_role("teacher", None)
        user_kwargs["id"] = teacher_id_val

    user = models.User(**user_kwargs)
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.id, "role": user.role})
    return schemas.TokenResponse(
        access_token=token,
        user=schemas.UserOut.model_validate(user),
    )


@router.post("/login", response_model=schemas.TokenResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    try:
        user = db.query(models.User).filter(
            func.lower(models.User.email) == payload.email.lower(),
            func.lower(models.User.role) == payload.role.lower(),
            or_(models.User.is_active == True, models.User.is_active.is_(None)),
        ).first()

        # ensure hashed_password exists before verifying
        if not user or not getattr(user, "hashed_password", None):
            raise HTTPException(401, "Incorrect email, password, or role")

        if not verify_password(payload.password, user.hashed_password):
            raise HTTPException(401, "Incorrect email, password, or role")

        token = create_access_token({"sub": user.id, "role": user.role})
        return schemas.TokenResponse(
            access_token=token,
            user=schemas.UserOut.model_validate(user),
        )
    except HTTPException:
        raise
    except Exception as e:
        # Log traceback to stderr and to a file for easier debugging in dev
        import traceback, sys, os
        tb = traceback.format_exc()
        try:
            with open(os.path.join(os.path.dirname(__file__), '..', 'auth_error.log'), 'a', encoding='utf-8') as f:
                f.write('\n---\n')
                f.write(tb)
        except Exception:
            pass
        traceback.print_exc(file=sys.stderr)
        raise HTTPException(500, "Internal server error")


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return schemas.UserOut.model_validate(current_user)


@router.post("/logout")
def logout():
    # JWT is stateless — cleared on client side
    return {"message": "Logged out"}