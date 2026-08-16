from fastapi import FastAPI
from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from database import engine, Base, get_db
import models
from auth import (
    hash_password,
    verify_password,
    create_access_token
)
from schemas import (
    UserRegister,
    UserLogin,
    TokenResponse
)

from database import engine, Base
import models

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ProofPurge API",
    description="Verified Data Sanitization & Device Lifecycle Prototype",
    version="0.1.0"
)

@app.get("/")
def root():
    return {
        "project": "ProofPurge",
        "status": "running"
    }

@app.get("/health")
def health():
    return {
        "status": "healthy"
    }

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="ProofPurge API",
    description="Verified Data Sanitization & Device Lifecycle Prototype",
    version="0.1.0"
)

@app.get("/")
def root():
    return {
        "project": "ProofPurge",
        "status": "running"
    }

@app.get("/health")
def health():
    return {
        "status": "healthy"
    }

@app.post("/auth/register")
def register(
    user: UserRegister,
    db: Session = Depends(get_db)
):
    existing_user = (
        db.query(models.User)
        .filter(models.User.email == user.email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    new_user = models.User(
        name=user.name,
        email=user.email,
        password_hash=hash_password(user.password),
        role="B2C"
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "User registered successfully",
        "user_id": new_user.id,
        "name": new_user.name,
        "email": new_user.email,
        "role": new_user.role
    }

@app.post(
    "/auth/login",
    response_model=TokenResponse
)
def login(
    user: UserLogin,
    db: Session = Depends(get_db)
):
    existing_user = (
        db.query(models.User)
        .filter(models.User.email == user.email)
        .first()
    )

    if not existing_user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not verify_password(
        user.password,
        existing_user.password_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    token = create_access_token(
        {
            "sub": str(existing_user.id),
            "role": existing_user.role
        }
    )

    return {
        "access_token": token,
        "token_type": "bearer"
    }