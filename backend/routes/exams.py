from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import firebase_admin
from firebase_admin import firestore
import uuid
import datetime

router = APIRouter()

class ExamCreate(BaseModel):
    name: str
    date: str
    time: str
    createdBy: str
    questions: List[Dict[str, Any]]

class SubmissionCreate(BaseModel):
    examId: str
    studentId: str
    studentName: str
    studentEmail: str
    answers: Dict[str, Any]
    incidents: List[Dict[str, Any]]
    trustScore: int

def get_db():
    try:
        return firestore.client()
    except:
        return None

# In-memory fallback if Firestore fails
mock_exams = []
mock_submissions = []

@router.get("/")
def get_exams():
    db = get_db()
    if not db:
        return mock_exams
    docs = db.collection('exams').stream()
    return [{"id": doc.id, **doc.to_dict()} for doc in docs]

@router.post("/")
def create_exam(exam: ExamCreate):
    db = get_db()
    exam_data = exam.dict()
    exam_data["createdAt"] = datetime.datetime.utcnow().isoformat()
    if not db:
        exam_data["id"] = str(uuid.uuid4())
        mock_exams.append(exam_data)
        return {"id": exam_data["id"]}
    
    doc_ref = db.collection('exams').document()
    doc_ref.set(exam_data)
    return {"id": doc_ref.id}

@router.delete("/{exam_id}")
def delete_exam(exam_id: str):
    db = get_db()
    if not db:
        global mock_exams
        mock_exams = [e for e in mock_exams if e.get("id") != exam_id]
        return {"status": "success"}
    db.collection('exams').document(exam_id).delete()
    return {"status": "success"}

@router.get("/{exam_id}")
def get_exam(exam_id: str):
    db = get_db()
    if not db:
        for e in mock_exams:
            if e.get("id") == exam_id:
                return e
        raise HTTPException(status_code=404, detail="Exam not found")
    
    doc = db.collection('exams').document(exam_id).get()
    if not doc.exists:
        raise HTTPException(status_code=404, detail="Exam not found")
    return {"id": doc.id, **doc.to_dict()}

@router.post("/submit")
def submit_exam(sub: SubmissionCreate):
    db = get_db()
    sub_data = sub.dict()
    sub_data["submittedAt"] = datetime.datetime.utcnow().isoformat()
    sub_data["status"] = "pending_review"
    
    if not db:
        sub_data["id"] = str(uuid.uuid4())
        mock_submissions.append(sub_data)
        return {"id": sub_data["id"]}
    
    doc_ref = db.collection('submissions').document()
    doc_ref.set(sub_data)
    return {"id": doc_ref.id}

@router.get("/submissions/{student_id}")
def get_student_submissions(student_id: str):
    db = get_db()
    if not db:
        return [s for s in mock_submissions if s.get("studentId") == student_id]
    
    docs = db.collection('submissions').where('studentId', '==', student_id).stream()
    return [{"id": doc.id, **doc.to_dict()} for doc in docs]

@router.get("/admin/submissions")
def get_all_submissions():
    db = get_db()
    if not db:
        return mock_submissions
    
    docs = db.collection('submissions').stream()
    return [{"id": doc.id, **doc.to_dict()} for doc in docs]
