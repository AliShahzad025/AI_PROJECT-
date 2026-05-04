from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    displayName: str
    role: str # "student" | "instructor" | "admin"
    profilePhotoURL: Optional[str] = None
    isActive: bool = True

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    uid: str
    createdAt: datetime
    lastLogin: Optional[datetime] = None

class UserUpdate(BaseModel):
    displayName: Optional[str] = None
    profilePhotoURL: Optional[str] = None
    isActive: Optional[bool] = None
