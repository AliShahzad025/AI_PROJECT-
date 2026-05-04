from firebase.firebase_admin import db
from fastapi import HTTPException
import datetime
import uuid

class ExamService:
    @staticmethod
    async def create_exam(instructor_id: str, instructor_name: str, exam_data: dict):
        exam_id = str(uuid.uuid4())
        now = datetime.datetime.now()
        
        final_data = {
            **exam_data,
            "examId": exam_id,
            "instructorId": instructor_id,
            "instructorName": instructor_name,
            "status": "scheduled",
            "enrolledStudents": [],
            "createdAt": now,
            "updatedAt": now
        }
        
        db.collection('exams').document(exam_id).set(final_data)
        return final_data

    @staticmethod
    async def get_exam(exam_id: str):
        doc = db.collection('exams').document(exam_id).get()
        if not doc.exists:
            raise HTTPException(status_code=404, detail="Exam not found")
        return doc.to_dict()

    @staticmethod
    async def start_session(exam_id: str, student_id: str, student_name: str):
        # Verify exam exists and student is enrolled
        exam = await ExamService.get_exam(exam_id)
        if student_id not in exam.get('enrolledStudents', []):
             raise HTTPException(status_code=403, detail="Student not enrolled in this exam")
             
        session_id = str(uuid.uuid4())
        now = datetime.datetime.now()
        
        session_data = {
            "sessionId": session_id,
            "examId": exam_id,
            "studentId": student_id,
            "studentName": student_name,
            "startTime": now,
            "endTime": None,
            "status": "in_progress",
            "answers": [],
            "submittedAt": None
        }
        
        db.collection('examSessions').document(session_id).set(session_data)
        
        # Update exam status to active if scheduled
        if exam['status'] == 'scheduled':
            db.collection('exams').document(exam_id).update({"status": "active"})
            
        return {
            "sessionId": session_id,
            "startTime": now,
            "questions": exam.get('questions', [])
        }

    @staticmethod
    async def submit_exam(session_id: str, student_id: str, answers: list):
        session_ref = db.collection('examSessions').document(session_id)
        session_doc = session_ref.get()
        
        if not session_doc.exists:
            raise HTTPException(status_code=404, detail="Session not found")
            
        session_data = session_doc.to_dict()
        if session_data['studentId'] != student_id:
            raise HTTPException(status_code=403, detail="Not your session")
            
        now = datetime.datetime.now()
        session_ref.update({
            "status": "submitted",
            "submittedAt": now,
            "endTime": now,
            "answers": answers
        })
        
        return {"message": "submitted", "sessionId": session_id}

exam_service = ExamService()
