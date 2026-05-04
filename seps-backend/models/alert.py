from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class AlertBase(BaseModel):
    sessionId: str
    examId: str
    studentId: str
    studentName: str
    alertType: str # "multiple_faces" | "no_face_detected" | "gaze_deviation" | "audio_anomaly" | "tab_switch" | "face_left_frame"
    severity: str # "low" | "medium" | "high"
    description: str
    confidenceScore: float

class AlertCreate(AlertBase):
    evidenceImageURL: Optional[str] = None
    evidenceAudioURL: Optional[str] = None

class AlertResponse(AlertBase):
    alertId: str
    timestamp: datetime
    evidenceImageURL: Optional[str] = None
    evidenceAudioURL: Optional[str] = None
    reviewed: bool = False
    reviewedBy: Optional[str] = None
    reviewedAt: Optional[datetime] = None
    reviewNote: Optional[str] = None
