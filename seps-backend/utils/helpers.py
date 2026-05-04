from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from firebase_admin import auth
from firebase.firebase_admin import db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        decoded_token = auth.verify_id_token(token)
        uid = decoded_token['uid']
        user_doc = db.collection('users').document(uid).get()
        if not user_doc.exists:
            raise HTTPException(status_code=404, detail="User not found")
        return user_doc.to_dict()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def require_role(allowed_roles: list):
    def role_checker(user: dict = Depends(get_current_user)):
        if user.get('role') not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Operation not permitted for your role"
            )
        return user
    return role_checker

def format_error(code: str, message: str, details: dict = None):
    return {
        "error": {
            "code": code,
            "message": message,
            "details": details or {}
        }
    }
