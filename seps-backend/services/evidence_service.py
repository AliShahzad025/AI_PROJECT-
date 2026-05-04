from firebase.firebase_admin import db, bucket
from fastapi import HTTPException
import datetime

class EvidenceService:
    @staticmethod
    async def get_alerts(instructor_id: str, exam_id: str = None, student_id: str = None, page: int = 1, limit: int = 20):
        query = db.collection('monitoringAlerts')
        
        if exam_id:
            # Verify instructor owns exam
            exam = db.collection('exams').document(exam_id).get()
            if not exam.exists or exam.to_dict()['instructorId'] != instructor_id:
                raise HTTPException(status_code=403, detail="Access denied to this exam's alerts")
            query = query.where('examId', '==', exam_id)
        
        if student_id:
            query = query.where('studentId', '==', student_id)
            
        # Basic pagination (Firestore doesn't support offset easily, usually use startAfter)
        # For simplicity in this stub, we just take the limit
        docs = query.order_by('timestamp', direction='DESCENDING').limit(limit).get()
        
        alerts = []
        for doc in docs:
            alerts.append(doc.to_dict())
            
        return alerts

    @staticmethod
    async def review_alert(alert_id: str, instructor_id: str, review_note: str):
        alert_ref = db.collection('monitoringAlerts').document(alert_id)
        alert = alert_ref.get()
        if not alert.exists:
            raise HTTPException(status_code=404, detail="Alert not found")
        
        # Verify ownership via exam
        alert_data = alert.to_dict()
        exam = db.collection('exams').document(alert_data['examId']).get()
        if not exam.exists or exam.to_dict()['instructorId'] != instructor_id:
            raise HTTPException(status_code=403, detail="Cannot review this alert")
            
        alert_ref.update({
            "reviewed": True,
            "reviewedBy": instructor_id,
            "reviewedAt": datetime.datetime.now(),
            "reviewNote": review_note
        })
        return {"status": "success"}

evidence_service = EvidenceService()
