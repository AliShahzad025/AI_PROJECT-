from fastapi import APIRouter, Depends, Body
from services.auth_service import auth_service
from utils.helpers import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["Authentication"])

class TokenVerifyRequest(BaseModel):
    idToken: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    displayName: str
    role: str

@router.post("/verify-token")
async def verify_token(req: TokenVerifyRequest):
    return await auth_service.verify_firebase_token(req.idToken)

@router.post("/register")
async def register(req: RegisterRequest):
    return await auth_service.register_user(req.email, req.password, req.displayName, req.role)

@router.get("/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user
