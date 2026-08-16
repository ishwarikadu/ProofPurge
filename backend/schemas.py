from pydantic import BaseModel, EmailStr
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str

class DeviceCreate(BaseModel):
    device_id: str
    device_type: str
    model: str
    storage: str    

class DeviceResponse(BaseModel):
    id: int
    device_id: str
    device_type: str
    model: str
    storage: str
    status: str
    user_id: int

class Config:
    from_attributes = True

class DeviceStatusUpdate(BaseModel):
    status: str

class SanitizationResponse(BaseModel):
    id: int
    device_id: int
    method: str
    passes: int
    result: str
    verification_status: str

    class Config:
        from_attributes = True

class VerificationResponse(BaseModel):
    id: int
    device_id: int
    sanitization_id: int
    sectors_checked: int
    sectors_verified: int
    verification_percentage: int
    result: str

    class Config:
        from_attributes = True

class CertificateResponse(BaseModel):
    id: int
    certificate_id: str
    device_id: int
    sanitization_method: str
    verification_percentage: int
    verification_result: str
    certificate_hash: str
    issued_at: str

    class Config:
        from_attributes = True

class CertificateVerificationResponse(BaseModel):
    valid: bool
    certificate_id: str
    device_id: str
    device_model: str
    device_type: str
    storage: str
    sanitization_method: str
    verification_percentage: int
    verification_result: str
    issued_at: str

class AuditEventResponse(BaseModel):
    id: int
    device_id: int
    event_type: str
    description: str
    timestamp: str
    event_hash: str

    class Config:
        from_attributes = True

class QRCodeResponse(BaseModel):
    certificate_id: str
    verification_url: str
    qr_code: str