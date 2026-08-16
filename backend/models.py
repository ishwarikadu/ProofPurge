from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship

from database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)
    role = Column(String, default="B2C")
    devices = relationship("Device", back_populates="owner")
class Device(Base):
    __tablename__ = "devices"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(String, unique=True, nullable=False, index=True)
    device_type = Column(String, nullable=False)
    model = Column(String, nullable=False)
    storage = Column(String, nullable=False)

    status = Column(
        String,
        default="READY_TO_SANITIZE"
    )
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    owner = relationship("User", back_populates="devices")
    sanitization_records = relationship(
    "SanitizationRecord",
    back_populates="device"
)
    verification_records = relationship(
    "VerificationRecord",
    back_populates="device"
)
    certificate = relationship(
    "Certificate",
    back_populates="device",
    uselist=False
)
    audit_events = relationship(
    "AuditEvent",
    back_populates="device"
)
    audit_anchor = relationship(
    "AuditAnchor",
    back_populates="device",
    uselist=False
)
    
class SanitizationRecord(Base):
    __tablename__ = "sanitization_records"

    id = Column(Integer, primary_key=True, index=True)

    device_id = Column(
        Integer,
        ForeignKey("devices.id"),
        nullable=False
    )
    method = Column(
        String,
        nullable=False
    )
    passes = Column(
        Integer,
        nullable=False
    )
    result = Column(
        String,
        nullable=False
    )
    verification_status = Column(
        String,
        default="PENDING"
    )
    device = relationship(
        "Device",
        back_populates="sanitization_records"
    )
class VerificationRecord(Base):
    __tablename__ = "verification_records"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(
        Integer,
        ForeignKey("devices.id"),
        nullable=False
    )
    sanitization_id = Column(
        Integer,
        ForeignKey("sanitization_records.id"),
        nullable=False
    )
    sectors_checked = Column(
        Integer,
        nullable=False
    )
    sectors_verified = Column(
        Integer,
        nullable=False
    )
    verification_percentage = Column(
        Integer,
        nullable=False
    )
    result = Column(
        String,
        nullable=False
    )
    device = relationship(
        "Device",
        back_populates="verification_records"
    )

class Certificate(Base):
    __tablename__ = "certificates"

    id = Column(Integer, primary_key=True, index=True)
    certificate_id = Column(
        String,
        unique=True,
        nullable=False,
        index=True
    )
    device_id = Column(
        Integer,
        ForeignKey("devices.id"),
        nullable=False
    )
    sanitization_method = Column(
        String,
        nullable=False
    )
    verification_percentage = Column(
        Integer,
        nullable=False
    )
    verification_result = Column(
        String,
        nullable=False
    )
    certificate_hash = Column(
        String,
        unique=True,
        nullable=False
    )
    issued_at = Column(
        String,
        nullable=False
    )
    device = relationship(
        "Device",
        back_populates="certificate"
    )

class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(
        Integer,
        ForeignKey("devices.id"),
        nullable=False
    )
    event_type = Column(
        String,
        nullable=False
    )
    description = Column(
        String,
        nullable=False
    )
    timestamp = Column(
        String,
        nullable=False
    )
    event_hash = Column(
        String,
        nullable=False
    )
    device = relationship(
        "Device",
        back_populates="audit_events"
    )

class AuditAnchor(Base):
    __tablename__ = "audit_anchors"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(
        Integer,
        ForeignKey("devices.id"),
        nullable=False
    )
    anchor_hash = Column(
        String,
        unique=True,
        nullable=False
    )
    blockchain_status = Column(
        String,
        nullable=False,
        default="SIMULATED"
    )
    transaction_id = Column(
        String,
        nullable=True
    )
    anchored_at = Column(
        String,
        nullable=False
    )
    device = relationship(
        "Device",
        back_populates="audit_anchor"
    )    