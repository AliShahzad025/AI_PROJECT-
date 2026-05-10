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
    sessionId: Optional[str] = None
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
    
    # Calculate Marks (for MCQs)
    score = 0
    total_questions = 0
    
    try:
        # Fetch the exam to get correct answers
        if db:
            exam_ref = db.collection('exams').document(sub.examId).get()
            if exam_ref.exists:
                exam_data = exam_ref.to_dict()
                questions = exam_data.get("questions", [])
                total_questions = len(questions)
                
                for idx, q in enumerate(questions):
                    correct_ans = str(q.get("correctAnswer", "")).strip()
                    student_ans = str(sub.answers.get(str(idx), "")).strip()
                    
                    print(f"Q{idx}: Correct={correct_ans}, Student={student_ans}")
                    
                    if correct_ans and student_ans.upper() == correct_ans.upper():
                        score += 1
                print(f"Final Score: {score}/{total_questions}")
        else:
            # Fallback for mock_exams
            exam = next((e for e in mock_exams if e.get("id") == sub.examId), None)
            if exam:
                questions = exam.get("questions", [])
                total_questions = len(questions)
                for idx, q in enumerate(questions):
                    if q.get("correctAnswer") == sub.answers.get(str(idx)):
                        score += 1
    except Exception as e:
        print(f"Error calculating score: {e}")

    # Calculate Violations
    gaze_alerts = [i for i in sub.incidents if "gaze" in (i.get("alertType") or i.get("type") or "").lower()]
    tab_alerts = [i for i in sub.incidents if "tab" in (i.get("alertType") or i.get("type") or "").lower()]
    other_alerts = [i for i in sub.incidents if i not in gaze_alerts and i not in tab_alerts]
    
    violation_count = (len(gaze_alerts) // 4) + (len(tab_alerts) // 2) + len(other_alerts)
    sub_data["violationCount"] = violation_count
    sub_data["trustScore"] = max(0, 100 - (violation_count * 10))

    sub_data["score"] = score
    sub_data["totalQuestions"] = total_questions
    sub_data["status"] = "graded" if total_questions > 0 else "pending_review"
    
    if not db:
        sub_data["id"] = str(uuid.uuid4())
        mock_submissions.append(sub_data)
        return {"id": sub_data["id"], "score": score}
    
    doc_ref = db.collection('submissions').document()
    doc_ref.set(sub_data)
    
    # Also update a student summary collection for easier dashboard access
    try:
        student_summary_ref = db.collection('student_performance').document(sub.studentId)
        summary_snap = student_summary_ref.get()
        if summary_snap.exists:
            summary_data = summary_snap.to_dict()
            exams_taken = summary_data.get("examsTaken", 0) + 1
            total_score = summary_data.get("totalScore", 0) + score
            student_summary_ref.update({
                "examsTaken": exams_taken,
                "totalScore": total_score,
                "lastExam": sub_data["submittedAt"],
                "studentName": sub.studentName
            })
        else:
            student_summary_ref.set({
                "studentId": sub.studentId,
                "studentName": sub.studentName,
                "examsTaken": 1,
                "totalScore": score,
                "lastExam": sub_data["submittedAt"]
            })
    except Exception as e:
        print(f"Error updating summary: {e}")

    return {"id": doc_ref.id, "score": score}

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
