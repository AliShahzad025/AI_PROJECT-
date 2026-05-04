from firebase.firebase_admin import db
from fastapi import HTTPException

class UserService:
    @staticmethod
    async def get_user_profile(uid: str):
        doc = db.collection('users').document(uid).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="User not found")
        return doc.to_dict()

    @staticmethod
    async def update_user(uid: str, data: dict):
        db.collection('users').document(uid).update(data)
        return await UserService.get_user_profile(uid)

    @staticmethod
    async def list_users(role: str = None, limit: int = 100):
        query = db.collection('users')
        if role:
            query = query.where('role', '==', role)
        
        docs = query.limit(limit).get()
        return [doc.to_dict() for doc in docs]

user_service = UserService()
