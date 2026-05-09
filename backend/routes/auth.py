from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import firebase_admin
from firebase_admin import firestore, auth
import uuid
import datetime
# Basic implementation for JWT token generation
import jwt

router = APIRouter()
SECRET_KEY = "proctorai-secret-key-fyp" # In production, use environment variable

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    role: str

class GoogleLoginRequest(BaseModel):
    idToken: str

def get_db():
    try:
        return firestore.client()
    except Exception as e:
        print("Firestore not initialized, returning mock db.")
        return None

@router.post("/login")
def login(req: LoginRequest):
    db = get_db()
    if not db:
        # Mock mode if Firebase isn't configured
        token = jwt.encode({"uid": "mock_uid", "role": "student", "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=2)}, SECRET_KEY, algorithm="HS256")
        return {"token": token, "user": {"uid": "mock_uid", "email": req.email, "name": "Mock User", "role": "student", "isActive": True}}

    # Query Firestore for the user
    users_ref = db.collection('users')
    query = users_ref.where('email', '==', req.email).limit(1).stream()
    user_doc = None
    for doc in query:
        user_doc = doc.to_dict()
        user_doc['uid'] = doc.id
        break

    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if user_doc.get('password') != req.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Check if user is active
    if not user_doc.get('isActive', True):
        raise HTTPException(status_code=403, detail="Account is deactivated. Please contact administrator.")

    token = jwt.encode({"uid": user_doc['uid'], "role": user_doc.get('role', 'student'), "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=2)}, SECRET_KEY, algorithm="HS256")
    return {"token": token, "user": {
        "uid": user_doc['uid'], 
        "email": user_doc['email'], 
        "name": user_doc.get('name', 'User'), 
        "role": user_doc.get('role', 'student'),
        "isActive": user_doc.get('isActive', True),
        "isVerified": user_doc.get('isVerified', True)
    }}

@router.post("/register")
def register(req: RegisterRequest):
    db = get_db()
    uid = str(uuid.uuid4())
    
    # Everyone needs admin approval
    is_active = True
    is_verified = False
    
    user_data = {
        "email": req.email,
        "password": req.password,
        "name": req.name,
        "role": req.role,
        "isActive": is_active,
        "isVerified": is_verified,
        "createdAt": datetime.datetime.utcnow().isoformat()
    }
    
    if db:
        users_ref = db.collection('users')
        query = users_ref.where('email', '==', req.email).limit(1).stream()
        if any(query):
            raise HTTPException(status_code=400, detail="Email already registered")
        
        db.collection('users').document(uid).set(user_data)
        
        # Create a verification request
        db.collection('verificationRequests').add({
            "uid": uid,
            "email": req.email,
            "displayName": req.name,
            "requestedRole": req.role,
            "status": "pending",
            "submittedAt": firestore.SERVER_TIMESTAMP
        })
    
    token = jwt.encode({"uid": uid, "role": req.role, "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=2)}, SECRET_KEY, algorithm="HS256")
    return {"token": token, "user": {
        "uid": uid, 
        "email": req.email, 
        "name": req.name, 
        "role": req.role,
        "isActive": is_active,
        "isVerified": is_verified
    }}

@router.post("/google-login")
def google_login(req: GoogleLoginRequest):
    db = get_db()
    try:
        # 1. Verify the Firebase ID Token
        decoded_token = auth.verify_id_token(req.idToken)
        uid = decoded_token['uid']
        email = decoded_token.get('email')
        name = decoded_token.get('name', 'Google User')
        
        if not db:
            # Mock mode fallback
            token = jwt.encode({"uid": uid, "role": "student", "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=2)}, SECRET_KEY, algorithm="HS256")
            return {"token": token, "user": {"uid": uid, "email": email, "name": name, "role": "student", "isActive": True}}

        # 2. Check if user exists in Firestore
        user_ref = db.collection('users').document(uid)
        user_doc = user_ref.get()
        
        if not user_doc.exists:
            # Create new user if they don't exist
            user_data = {
                "email": email,
                "name": name,
                "role": "student", # Default role for Google users
                "isActive": True,
                "isVerified": False, # New Google users also need approval
                "createdAt": datetime.datetime.utcnow().isoformat(),
                "provider": "google"
            }
            user_ref.set(user_data)
            
            # Create verification request for Google user
            db.collection('verificationRequests').add({
                "uid": uid,
                "email": email,
                "displayName": name,
                "requestedRole": "student",
                "status": "pending",
                "submittedAt": firestore.SERVER_TIMESTAMP
            })
            
            user_profile = {**user_data, "uid": uid}
        else:
            user_profile = user_doc.to_dict()
            user_profile['uid'] = uid
            
        # 3. Check if user is active
        if not user_profile.get('isActive', True):
            raise HTTPException(status_code=403, detail="Account is deactivated. Please contact administrator.")

        # 4. Issue backend JWT
        token = jwt.encode({
            "uid": uid, 
            "role": user_profile.get('role', 'student'), 
            "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=2)
        }, SECRET_KEY, algorithm="HS256")
        
        return {
            "token": token, 
            "user": {
                "uid": uid,
                "email": user_profile['email'],
                "name": user_profile.get('name', 'User'),
                "role": user_profile.get('role', 'student'),
                "isActive": user_profile.get('isActive', True),
                "isVerified": user_profile.get('isVerified', True)
            }
        }
    except Exception as e:
        print(f"Google login error: {e}")
        raise HTTPException(status_code=401, detail=str(e))
