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