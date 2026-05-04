from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class Question(BaseModel):
    questionId: str
    questionText: str
    questionType: str # "mcq" | "short_answer"
    options: Optional[List[str]] = None
    correctAnswer: Optional[str] = None

class ExamBase(BaseModel):
    title: str
    description: str
    scheduledDate: datetime
    durationMinutes: int
    maxStudents: int

class ExamCreate(ExamBase):
    questions: List[Question]

class ExamResponse(ExamBase):
    examId: str
    instructorId: str
    instructorName: str
    status: str # "scheduled" | "active" | "completed" | "cancelled"
    questions: List[Question]
    enrolledStudents: List[str]
    createdAt: datetime
    updatedAt: datetime

class ExamUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    scheduledDate: Optional[datetime] = None
    durationMinutes: Optional[int] = None
    questions: Optional[List[Question]] = None
    status: Optional[str] = None
