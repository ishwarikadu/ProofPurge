from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from database import engine, Base, get_db
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime, timezone
import models
import hashlib
import uuid
import random
import qrcode
import io
import base64
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    get_current_user
)
from schemas import (
    CertificateVerificationResponse,
    UserRegister,
    UserLogin,
    TokenResponse,
    DeviceCreate,
    DeviceResponse,
    DeviceStatusUpdate,
    SanitizationResponse,
    VerificationResponse,
    CertificateResponse,
    AuditEventResponse,
    QRCodeResponse,
    AuditAnchorResponse
)

Base.metadata.create_all(bind=engine)
app = FastAPI(
    title="ProofPurge API",
    description="Verified Data Sanitization & Device Lifecycle Prototype",
    version="0.1.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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

def create_audit_event(
    db: Session,
    device: models.Device,
    event_type: str,
    description: str
):
    timestamp = datetime.now(
        timezone.utc
    ).isoformat()
    event_data = (
        f"{device.device_id}|"
        f"{event_type}|"
        f"{description}|"
        f"{timestamp}"
    )
    event_hash = hashlib.sha256(
        event_data.encode("utf-8")
    ).hexdigest()
    event = models.AuditEvent(
        device_id=device.id,
        event_type=event_type,
        description=description,
        timestamp=timestamp,
        event_hash=event_hash
    )
    db.add(event)
    return event
    s
ALLOWED_TRANSITIONS = {
    "READY_TO_SANITIZE": ["SANITIZING"],
    "SANITIZING": ["VERIFICATION"],
    "VERIFICATION": ["VERIFIED", "FAILED"],
    "FAILED": ["SANITIZING", "MANUAL_REVIEW"],
    "VERIFIED": ["CERTIFIED"],
    "CERTIFIED": []
}

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
    db.flush()

    create_audit_event(
    db,
    new_device,
    "DEVICE_REGISTERED",
    "Device registered successfully"
)
    db.commit()
    db.refresh(new_device)
    return new_device

@app.patch(
    "/devices/{device_id}/status",
    response_model=DeviceResponse
)
def update_device_status(
    device_id: str,
    status_update: DeviceStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    device = (
        db.query(models.Device)
        .filter(
            models.Device.device_id == device_id,
            models.Device.user_id == current_user.id
        )
        .first()
    )

    if device is None:
        raise HTTPException(
            status_code=404,
            detail="Device not found"
        )

    current_status = device.status
    new_status = status_update.status

    allowed_statuses = ALLOWED_TRANSITIONS.get(
        current_status,
        []
    )

    if new_status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Invalid status transition: "
                f"{current_status} → {new_status}"
            )
        )

    device.status = new_status

    db.commit()
    db.refresh(device)

    return device

@app.post(
    "/devices/{device_id}/sanitize",
    response_model=SanitizationResponse
)
def sanitize_device(
    device_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    device = (
        db.query(models.Device)
        .filter(
            models.Device.device_id == device_id,
            models.Device.user_id == current_user.id
        )
        .first()
    )
    if device is None:
        raise HTTPException(
            status_code=404,
            detail="Device not found"
        )
    if device.status != "READY_TO_SANITIZE":
        raise HTTPException(
            status_code=400,
            detail=(
                f"Device cannot be sanitized "
                f"from status {device.status}"
            )
        )
    device.status = "SANITIZING"
    create_audit_event(
    db,
    device,
    "SANITIZATION_STARTED",
    "Device sanitization started"
)
    sanitization_record = models.SanitizationRecord(
        device_id=device.id,
        method="SECURE_ERASE_SIMULATION",
        passes=1,
        result="SUCCESS",
        verification_status="PENDING"
    )
    db.add(sanitization_record)
    device.status = "VERIFICATION"
    create_audit_event(
    db,
    device,
    "SANITIZATION_COMPLETED",
    "Device sanitization simulation completed successfully"
)
    db.commit()
    db.refresh(sanitization_record)
    return sanitization_record

@app.post(
    "/devices/{device_id}/verify",
    response_model=VerificationResponse
)
def verify_device(
    device_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    device = (
        db.query(models.Device)
        .filter(
            models.Device.device_id == device_id,
            models.Device.user_id == current_user.id
        )
        .first()
    )
    if device is None:
        raise HTTPException(
            status_code=404,
            detail="Device not found"
        )
    if device.status != "VERIFICATION":
        raise HTTPException(
            status_code=400,
            detail=(
                f"Device cannot be verified "
                f"from status {device.status}"
            )
        )
    sanitization_record = (
        db.query(models.SanitizationRecord)
        .filter(
            models.SanitizationRecord.device_id == device.id,
            models.SanitizationRecord.verification_status == "PENDING"
        )
        .order_by(
            models.SanitizationRecord.id.desc()
        )
        .first()
    )
    if sanitization_record is None:
        raise HTTPException(
            status_code=400,
            detail="No pending sanitization record found"
        )

    sectors_checked = 1000

    failure_simulation = random.random() < 0.2

    if failure_simulation:
        sectors_verified = random.randint(850, 999)
    else:
        sectors_verified = sectors_checked

        verification_percentage = int(
        (sectors_verified / sectors_checked) * 100
    )

        if verification_percentage >= 100:
          result = "VERIFIED"
          device.status = "VERIFIED"
          sanitization_record.verification_status = "VERIFIED"
        else:
          result = "FAILED"
          device.status = "FAILED"
          sanitization_record.verification_status = "FAILED"

        create_audit_event(
         db,
        device,
        "VERIFICATION_COMPLETED",
        f"Verification result: {result}"
)

    verification_record = models.VerificationRecord(
        device_id=device.id,
        sanitization_id=sanitization_record.id,
        sectors_checked=sectors_checked,
        sectors_verified=sectors_verified,
        verification_percentage=verification_percentage,
        result=result
    )
    db.add(verification_record)
    db.commit()
    db.refresh(verification_record)
    return verification_record

@app.post(
    "/devices/{device_id}/certificate",
    response_model=CertificateResponse
)
def generate_certificate(
    device_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    device = (
        db.query(models.Device)
        .filter(
            models.Device.device_id == device_id,
            models.Device.user_id == current_user.id
        )
        .first()
    )
    if device is None:
        raise HTTPException(
            status_code=404,
            detail="Device not found"
        )
    if device.status != "VERIFIED":
        raise HTTPException(
            status_code=400,
            detail=(
                f"Certificate can only be generated "
                f"for VERIFIED devices. "
                f"Current status: {device.status}"
            )
        )
    existing_certificate = (
    db.query(models.Certificate)
    .filter(
        models.Certificate.device_id == device.id
    )
    .first()
)

    if existing_certificate:
     existing_audit_event = (
        db.query(models.AuditEvent)
        .filter(
            models.AuditEvent.device_id == device.id,
            models.AuditEvent.event_type == "CERTIFICATE_ISSUED"
        )
        .first()
    )

    if existing_audit_event is None:
        create_audit_event(
            db,
            device,
            "CERTIFICATE_ISSUED",
            f"Certificate {existing_certificate.certificate_id} issued"
        )

        db.commit()

        return existing_certificate
    verification_record = (
        db.query(models.VerificationRecord)
        .filter(
            models.VerificationRecord.device_id == device.id,
            models.VerificationRecord.result == "VERIFIED"
        )
        .order_by(
            models.VerificationRecord.id.desc()
        )
        .first()
    )
    if verification_record is None:
        raise HTTPException(
            status_code=400,
            detail="No successful verification record found"
        )
    sanitization_record = (
        db.query(models.SanitizationRecord)
        .filter(
            models.SanitizationRecord.id
            == verification_record.sanitization_id
        )
        .first()
    )
    if sanitization_record is None:
        raise HTTPException(
            status_code=400,
            detail="Sanitization record not found"
        )
    certificate_id = f"PP-CERT-{uuid.uuid4().hex[:12].upper()}"
    issued_at = datetime.now(
        timezone.utc
    ).isoformat()
    certificate_data = (
        f"{certificate_id}|"
        f"{device.device_id}|"
        f"{device.model}|"
        f"{device.storage}|"
        f"{sanitization_record.method}|"
        f"{verification_record.verification_percentage}|"
        f"{verification_record.result}|"
        f"{issued_at}"
    )
    certificate_hash = hashlib.sha256(
        certificate_data.encode("utf-8")
    ).hexdigest()
    certificate = models.Certificate(
        certificate_id=certificate_id,
        device_id=device.id,
        sanitization_method=sanitization_record.method,
        verification_percentage=(
            verification_record.verification_percentage
        ),
        verification_result=verification_record.result,
        certificate_hash=certificate_hash,
        issued_at=issued_at
    )
    db.add(certificate)
    device.status = "CERTIFIED"
    create_audit_event(
    db,
    device,
    "CERTIFICATE_GENERATED",
    f"Certificate generated with ID: {certificate_id}"
)
    db.commit()
    db.refresh(certificate)
    return certificate

@app.get(
    "/certificates/{certificate_id}",
    response_model=CertificateResponse
)
def get_certificate(
    certificate_id: str,
    db: Session = Depends(get_db)
):
    certificate = (
        db.query(models.Certificate)
        .filter(
            models.Certificate.certificate_id == certificate_id
        )
        .first()
    )
    if certificate is None:
        raise HTTPException(
            status_code=404,
            detail="Certificate not found"
        )
    return certificate

@app.get(
    "/verify-certificate/{certificate_id}",
    response_model=CertificateVerificationResponse
)
def verify_certificate(
    certificate_id: str,
    db: Session = Depends(get_db)
):
    certificate = (
        db.query(models.Certificate)
        .filter(
            models.Certificate.certificate_id == certificate_id
        )
        .first()
    )
    if certificate is None:
        raise HTTPException(
            status_code=404,
            detail="Certificate not found"
        )
    device = (
        db.query(models.Device)
        .filter(
            models.Device.id == certificate.device_id
        )
        .first()
    )
    if device is None:
        raise HTTPException(
            status_code=404,
            detail="Associated device not found"
        )
    # Reconstruct the original certificate data
    certificate_data = (
        f"{certificate.certificate_id}|"
        f"{device.device_id}|"
        f"{device.model}|"
        f"{device.storage}|"
        f"{certificate.sanitization_method}|"
        f"{certificate.verification_percentage}|"
        f"{certificate.verification_result}|"
        f"{certificate.issued_at}"
    )
    calculated_hash = hashlib.sha256(
        certificate_data.encode("utf-8")
    ).hexdigest()
    valid = (
        calculated_hash == certificate.certificate_hash
    )
    return {
        "valid": valid,
        "certificate_id": certificate.certificate_id,
        "device_id": device.device_id,
        "device_model": device.model,
        "device_type": device.device_type,
        "storage": device.storage,
        "sanitization_method": certificate.sanitization_method,
        "verification_percentage": (
            certificate.verification_percentage
        ),
        "verification_result": (
            certificate.verification_result
        ),
        "issued_at": certificate.issued_at
    }

@app.get(
    "/devices/{device_id}/audit",
    response_model=list[AuditEventResponse]
)
def get_device_audit(
    device_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    device = (
        db.query(models.Device)
        .filter(
            models.Device.device_id == device_id,
            models.Device.user_id == current_user.id
        )
        .first()
    )
    if device is None:
        raise HTTPException(
            status_code=404,
            detail="Device not found"
        )
    events = (
        db.query(models.AuditEvent)
        .filter(
            models.AuditEvent.device_id == device.id
        )
        .order_by(
            models.AuditEvent.id.asc()
        )
        .all()
    )
    return events

@app.get(
    "/devices/{device_id}/certificate",
    response_model=CertificateResponse
)
def get_device_certificate(
    device_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    device = (
        db.query(models.Device)
        .filter(
            models.Device.device_id == device_id,
            models.Device.user_id == current_user.id
        )
        .first()
    )
    if device is None:
        raise HTTPException(
            status_code=404,
            detail="Device not found"
        )
    certificate = (
        db.query(models.Certificate)
        .filter(
            models.Certificate.device_id == device.id
        )
        .first()
    )
    if certificate is None:
        raise HTTPException(
            status_code=404,
            detail="Certificate not found for this device"
        )
    return certificate

@app.get(
    "/devices/{device_id}/certificate/qr",
    response_model=QRCodeResponse
)
def get_certificate_qr(
    device_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    device = (
        db.query(models.Device)
        .filter(
            models.Device.device_id == device_id,
            models.Device.user_id == current_user.id
        )
        .first()
    )
    if device is None:
        raise HTTPException(
            status_code=404,
            detail="Device not found"
        )
    certificate = (
        db.query(models.Certificate)
        .filter(
            models.Certificate.device_id == device.id
        )
        .first()
    )
    if certificate is None:
        raise HTTPException(
            status_code=404,
            detail="Certificate not found for this device"
        )
    verification_url = (
        f"http://127.0.0.1:8000/"
        f"verify-certificate/"
        f"{certificate.certificate_id}"
    )
    qr = qrcode.make(verification_url)
    buffer = io.BytesIO()
    qr.save(buffer, format="PNG")
    qr_base64 = base64.b64encode(
        buffer.getvalue()
    ).decode("utf-8")
    return {
        "certificate_id": certificate.certificate_id,
        "verification_url": verification_url,
        "qr_code": qr_base64
    } 

@app.post(
    "/devices/{device_id}/audit/anchor",
    response_model=AuditAnchorResponse
)
def create_audit_anchor(
    device_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    device = (
        db.query(models.Device)
        .filter(
            models.Device.device_id == device_id,
            models.Device.user_id == current_user.id
        )
        .first()
    )
    if device is None:
        raise HTTPException(
            status_code=404,
            detail="Device not found"
        )
    if device.status != "CERTIFIED":
        raise HTTPException(
            status_code=400,
            detail=(
                f"Audit can only be anchored "
                f"for CERTIFIED devices. "
                f"Current status: {device.status}"
            )
        )
    existing_anchor = (
        db.query(models.AuditAnchor)
        .filter(
            models.AuditAnchor.device_id == device.id
        )
        .first()
    )
    if existing_anchor:
        return existing_anchor
    audit_events = (
        db.query(models.AuditEvent)
        .filter(
            models.AuditEvent.device_id == device.id
        )
        .order_by(
            models.AuditEvent.id.asc()
        )
        .all()
    )
    if not audit_events:
        raise HTTPException(
            status_code=400,
            detail="No audit events found"
        )
    previous_hash = ""
    for event in audit_events:
        chain_data = (
            f"{previous_hash}|"
            f"{event.event_hash}"
        )
        previous_hash = hashlib.sha256(
            chain_data.encode("utf-8")
        ).hexdigest()
    anchor_hash = previous_hash
    anchored_at = datetime.now(
        timezone.utc
    ).isoformat()
    anchor = models.AuditAnchor(
        device_id=device.id,
        anchor_hash=anchor_hash,
        blockchain_status="SIMULATED",
        transaction_id=None,
        anchored_at=anchored_at
    )
    db.add(anchor)
    db.commit()
    db.refresh(anchor)
    return anchor