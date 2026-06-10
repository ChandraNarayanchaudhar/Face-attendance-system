# routers/auth.py — Login and register

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models, schemas
from auth import hash_password, verify_password, create_access_token, get_current_user

router = APIRouter()


@router.post("/register", response_model=schemas.TokenResponse, status_code=201)
def register(payload: schemas.RegisterRequest, db: Session = Depends(get_db)):
    # Check email not taken
    if db.query(models.User).filter(models.User.email == payload.email.lower()).first():
        raise HTTPException(400, "Email already registered")

    user = models.User(
        name=payload.name,
        email=payload.email.lower(),
        hashed_password=hash_password(payload.password),
        role=payload.role,
        section=payload.section,
        semester=payload.semester,
        department=payload.department,
        is_active=True,
    )
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
    user = db.query(models.User).filter(
        models.User.email == payload.email.lower(),
        models.User.role == payload.role,
        models.User.is_active == True,
    ).first()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(401, "Incorrect email, password, or role")

    token = create_access_token({"sub": user.id, "role": user.role})
    return schemas.TokenResponse(
        access_token=token,
        user=schemas.UserOut.model_validate(user),
    )


@router.get("/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return schemas.UserOut.model_validate(current_user)


@router.post("/logout")
def logout():
    # JWT is stateless — cleared on client side
    return {"message": "Logged out"}