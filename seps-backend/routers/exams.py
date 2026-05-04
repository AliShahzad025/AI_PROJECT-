from fastapi import APIRouter, Depends, Query
from services.exam_service import exam_service
from utils.helpers import get_current_user, require_role
from models.exam import ExamCreate, ExamUpdate
from firebase.firebase_admin import db

router = APIRouter(prefix="/exams", tags=["Exams"])

@router.post("/")
async def create_exam(
    exam_data: ExamCreate, 
    user: dict = Depends(require_role(["instructor", "admin"]))
):
    return await exam_service.create_exam(user['uid'], user['displayName'], exam_data.dict())

@router.get("/")
async def list_exams(
    status: str = None, 
    user: dict = Depends(get_current_user)
):
    query = db.collection('exams')
    if user['role'] == 'instructor':
        query = query.where('instructorId', '==', user['uid'])
    elif user['role'] == 'student':
        query = query.where('enrolledStudents', 'array_contains', user['uid'])
        
    if status:
        query = query.where('status', '==', status)
        
    docs = query.get()
    return [doc.to_dict() for doc in docs]

@router.get("/{examId}")
async def get_exam(examId: str, user: dict = Depends(get_current_user)):
    return await exam_service.get_exam(examId)

@router.post("/{examId}/enroll")
async def enroll_exam(examId: str, user: dict = Depends(require_role(["student"]))):
    db.collection('exams').document(examId).update({
        "enrolledStudents": db.collection('exams').document(examId).get().to_dict()['enrolledStudents'] + [user['uid']]
    })
    return {"message": "Enrolled successfully"}

@router.post("/{examId}/start")
async def start_exam(examId: str, user: dict = Depends(require_role(["student"]))):
    return await exam_service.start_session(examId, user['uid'], user['displayName'])

@router.post("/{examId}/submit")
async def submit_exam(
    examId: str, 
    sessionId: str = Body(..., embed=True),
    answers: list = Body(...),
    user: dict = Depends(require_role(["student"]))
):
    return await exam_service.submit_exam(sessionId, user['uid'], answers)
