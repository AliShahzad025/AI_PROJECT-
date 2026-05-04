from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class Answer(BaseModel):
    questionId: str
    answer: str
    answeredAt: datetime

class SessionBase(BaseModel):
    examId: str
    studentId: str
    studentName: str

class SessionCreate(SessionBase):
    pass

class SessionResponse(SessionBase):
    sessionId: str
    startTime: datetime
    endTime: Optional[datetime] = None
    status: str # "in_progress" | "submitted" | "terminated"
    answers: List[Answer] = []
    submittedAt: Optional[datetime] = None
