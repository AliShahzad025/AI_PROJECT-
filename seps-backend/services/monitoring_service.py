from ai.monitoring_engine import monitoring_engine
from firebase.firebase_admin import db
import datetime
import uuid

class MonitoringService:
    @staticmethod
    async def process_frame(session_id: str, frame_bytes: bytes):
        session = db.collection('examSessions').document(session_id).get()
        if not session.exists:
            return {"error": "Session not found"}
        
        session_data = session.to_dict()
        return await monitoring_engine.analyze_frame(
            frame_bytes, 
            session_id, 
            session_data['studentId'],
            session_data['examId'],
            session_data['studentName']
        )

    @staticmethod
    async def process_audio(session_id: str, audio_bytes: bytes):
        session = db.collection('examSessions').document(session_id).get()
        if not session.exists:
            return {"error": "Session not found"}
        
        session_data = session.to_dict()
        return await monitoring_engine.analyze_audio_chunk(
            audio_bytes,
            session_id,
            session_data['studentId'],
            session_data['examId'],
            session_data['studentName']
        )

    @staticmethod
    async def log_tab_switch(session_id: str, student_id: str, exam_id: str, student_name: str):
        alert_id = str(uuid.uuid4())
        alert_data = {
            "alertId": alert_id,
            "sessionId": session_id,
            "examId": exam_id,
            "studentId": student_id,
            "studentName": student_name,
            "alertType": "tab_switch",
            "severity": "medium",
            "timestamp": datetime.datetime.now(),
            "description": "Student switched browser tabs or windows.",
            "evidenceImageURL": None,
            "confidenceScore": 1.0,
            "reviewed": False
        }
        db.collection('monitoringAlerts').document(alert_id).set(alert_data)
        return alert_id

monitoring_service = MonitoringService()
