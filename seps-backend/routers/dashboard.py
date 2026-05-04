from fastapi import APIRouter, Depends
from utils.helpers import get_current_user, require_role
from firebase.firebase_admin import db

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/instructor")
async def instructor_dashboard(user: dict = Depends(require_role(["instructor"]))):
    # Simplified aggregate query
    exams = db.collection('exams').where('instructorId', '==', user['uid']).get()
    return {
        "totalExams": len(exams),
        "activeExams": len([e for e in exams if e.to_dict()['status'] == 'active']),
        "totalStudentsMonitored": 0,
        "totalAlerts": 0,
        "recentAlerts": [],
        "examStats": []
    }

@router.get("/student")
async def student_dashboard(user: dict = Depends(require_role(["student"]))):
    return {
        "enrolledExams": 0,
        "completedExams": 0,
        "upcomingExams": [],
        "recentScores": []
    }

@router.get("/admin")
async def admin_dashboard(user: dict = Depends(require_role(["admin"]))):
    return {
        "totalUsers": 0,
        "totalInstructors": 0,
        "totalStudents": 0,
        "totalExams": 0,
        "activeExams": 0,
        "totalAlerts": 0,
        "systemHealth": {"status": "ok", "lastChecked": "now"}
    }
