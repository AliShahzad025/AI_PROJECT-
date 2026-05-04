from fastapi import APIRouter, Depends
from services.user_service import user_service
from utils.helpers import require_role, get_current_user
from models.user import UserUpdate

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/")
async def list_users(user: dict = Depends(require_role(["admin"]))):
    return await user_service.list_users()

@router.get("/instructors")
async def list_instructors(user: dict = Depends(require_role(["admin"]))):
    return await user_service.list_users(role="instructor")

@router.get("/{uid}")
async def get_user(uid: str, current_user: dict = Depends(get_current_user)):
    if current_user['role'] != 'admin' and current_user['uid'] != uid:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Forbidden")
    return await user_service.get_user_profile(uid)

@router.post("/{uid}/verify")
async def verify_user(uid: str, user: dict = Depends(require_role(["admin"]))):
    return await user_service.update_user(uid, {"isVerified": True})

@router.post("/{uid}/role")
async def update_role(uid: str, role: str, user: dict = Depends(require_role(["admin"]))):
    return await user_service.update_user(uid, {"role": role})

@router.delete("/{uid}")
async def delete_user(uid: str, user: dict = Depends(require_role(["admin"]))):
    return await user_service.delete_user(uid)
