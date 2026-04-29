from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import auth, exams, monitor
from dotenv import load_dotenv
import os
import firebase_admin
from firebase_admin import credentials

load_dotenv()

# Initialize Firebase Admin
# In a real environment, you'd use a service account JSON file.
# For this FYP template, we assume the environment might have default credentials,
# or we just initialize it empty for mock testing if credentials aren't provided.
try:
    if not firebase_admin._apps:
        # Assuming there is a firebase-service-account.json in the backend directory
        # If not, this might fail, so we wrap in try-except
        cred_path = os.getenv("FIREBASE_CREDENTIALS", "firebase-service-account.json")
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
        else:
            print("Warning: Firebase service account file not found. Database operations will fail.")
            firebase_admin.initialize_app()
except Exception as e:
    print(f"Error initializing Firebase Admin: {e}")

app = FastAPI(title="ProctorAI Backend")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for development. In prod, restrict to frontend URL.
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(exams.router, prefix="/api/exams", tags=["Exams"])
app.include_router(monitor.router, prefix="/ws", tags=["Monitoring"])

@app.get("/")
def read_root():
    return {"message": "ProctorAI Backend API is running."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
