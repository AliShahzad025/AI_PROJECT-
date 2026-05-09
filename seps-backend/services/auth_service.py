from firebase_admin import auth
from firebase.firebase_admin import db
from fastapi import HTTPException, status
import datetime

class AuthService:
    @staticmethod
    async def verify_firebase_token(id_token: str):
        try:
            decoded_token = auth.verify_id_token(id_token)
            uid = decoded_token['uid']
            
            # Get user role from Firestore
            user_doc = db.collection('users').document(uid).get()
            if not user_doc.exists:
                raise HTTPException(status_code=404, detail="User document not found")
            
            user_data = user_doc.to_dict()
            
            if not user_data.get('isActive', True):
                raise HTTPException(status_code=403, detail="Account is deactivated")
                
            return {
                "uid": uid,
                "email": decoded_token.get('email'),
                "role": user_data.get('role', 'student'),
                "isVerified": user_data.get('isVerified', False),
                "isActive": user_data.get('isActive', True),
                "displayName": user_data.get('displayName', decoded_token.get('name', ''))
            }
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid authentication credentials: {str(e)}"
            )

    @staticmethod
    async def register_user(email: str, password: str, display_name: str, role: str):
        if role not in ["student", "instructor", "admin"]:
            raise HTTPException(status_code=400, detail="Invalid role")
            
        try:
            # Create Firebase Auth user
            user = auth.create_user(
                email=email,
                password=password,
                display_name=display_name
            )
            
            # Create Firestore document
            user_data = {
                "uid": user.uid,
                "email": email,
                "displayName": display_name,
                "role": role,
                "createdAt": datetime.datetime.now(),
                "isActive": True,
                "isVerified": False, # Everyone needs approval
                "profilePhotoURL": None,
                "lastLogin": None
            }
            db.collection('users').document(user.uid).set(user_data)
            
            # Create verification request
            db.collection('verificationRequests').document(user.uid).set({
                "uid": user.uid,
                "email": email,
                "displayName": display_name,
                "requestedRole": role,
                "status": "pending",
                "submittedAt": datetime.datetime.now()
            })
            
            return user_data
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

auth_service = AuthService()
