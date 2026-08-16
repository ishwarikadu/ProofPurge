from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import engine, Base, get_db
import models
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token
)
from schemas import (
    UserRegister,
    UserLogin,
    TokenResponse,
    DeviceCreate,
    DeviceResponse
)

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
security = HTTPBearer()

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials

    user_id = decode_access_token(token)

    if user_id is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    user = (
        db.query(models.User)
        .filter(models.User.id == int(user_id))
        .first()
    )

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    return user
@app.post(
    "/devices",
    response_model=DeviceResponse
)
def register_device(
    device: DeviceCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    existing_device = (
        db.query(models.Device)
        .filter(models.Device.device_id == device.device_id)
        .first()
    )

    if existing_device:
        raise HTTPException(
            status_code=400,
            detail="Device already registered"
        )

    new_device = models.Device(
        device_id=device.device_id,
        device_type=device.device_type,
        model=device.model,
        storage=device.storage,
        status="READY_TO_SANITIZE",
        user_id=current_user.id
    )

    db.add(new_device)
    db.commit()
    db.refresh(new_device)

    return new_device