from pydantic_settings import BaseSettings
from typing import List
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = "SEPS API v1"
    API_V1_STR: str = "/api/v1"
    
    # Firebase
    FIREBASE_SERVICE_ACCOUNT_PATH: str = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH", "serviceAccountKey.json")
    FIREBASE_STORAGE_BUCKET: str = os.getenv("FIREBASE_STORAGE_BUCKET", "")
    PORT: int = 8000
    
    # Security
    ALLOWED_ORIGINS: str = "*" # Default to star, will be parsed in main.py if needed
    
    # AI Thresholds
    GAZE_DEVIATION_THRESHOLD_SECONDS: float = 3.0
    AUDIO_ANOMALY_THRESHOLD: float = 0.75
    
    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings()
