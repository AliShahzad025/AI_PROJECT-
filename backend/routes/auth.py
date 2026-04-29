from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import firebase_admin
from firebase_admin import firestore
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
        return {"token": token, "user": {"uid": "mock_uid", "email": req.email, "name": "Mock User", "role": "student"}}

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
    
    # In a real app, verify hashed password. For this migration, assuming plaintext for simplicity or just basic check.
    if user_doc.get('password') != req.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = jwt.encode({"uid": user_doc['uid'], "role": user_doc.get('role', 'student'), "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=2)}, SECRET_KEY, algorithm="HS256")
    return {"token": token, "user": {"uid": user_doc['uid'], "email": user_doc['email'], "name": user_doc.get('name', 'User'), "role": user_doc.get('role', 'student')}}

@router.post("/register")
def register(req: RegisterRequest):
    db = get_db()
    uid = str(uuid.uuid4())
    user_data = {
        "email": req.email,
        "password": req.password, # Note: Hash this in a production environment!
        "name": req.name,
        "role": "student", # Default role
        "createdAt": datetime.datetime.utcnow().isoformat()
    }
    
    if db:
        # Check if email exists
        users_ref = db.collection('users')
        query = users_ref.where('email', '==', req.email).limit(1).stream()
        if any(query):
            raise HTTPException(status_code=400, detail="Email already registered")
        
        db.collection('users').document(uid).set(user_data)
    
    token = jwt.encode({"uid": uid, "role": "student", "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=2)}, SECRET_KEY, algorithm="HS256")
    return {"token": token, "user": {"uid": uid, "email": req.email, "name": req.name, "role": "student"}}
