from .face_detector import FaceDetector
from .gaze_tracker import GazeTracker
from .audio_analyzer import AudioAnalyzer
from firebase.firebase_admin import db, bucket
import datetime
import uuid

class MonitoringEngine:
    def __init__(self):
        self.face_detector = FaceDetector()
        self.gaze_tracker = GazeTracker()
        self.audio_analyzer = AudioAnalyzer()

    async def analyze_frame(self, frame_bytes: bytes, session_id: str, student_id: str, exam_id: str, student_name: str) -> dict:
        face_results = self.face_detector.detect(frame_bytes)
        gaze_results = self.gaze_tracker.analyze(frame_bytes, session_id)
        
        alerts = []
        
        # Face detection logic
        if face_results["face_count"] == 0:
            alerts.append({
                "type": "no_face_detected",
                "severity": "high",
                "confidence": 1.0,
                "description": "No face detected in front of webcam."
            })
        elif face_results["face_count"] > 1:
            alerts.append({
                "type": "multiple_faces",
                "severity": "high",
                "confidence": 1.0,
                "description": f"Multiple faces ({face_results['face_count']}) detected."
            })
            
        # Gaze tracking logic
        if gaze_results["is_suspicious"]:
            alerts.append({
                "type": "gaze_deviation",
                "severity": "medium",
                "confidence": gaze_results["confidence"],
                "description": f"Student looking away ({gaze_results['direction']}) for {gaze_results['consecutive_seconds']} seconds."
            })

        # Save alerts to Firestore
        for alert in alerts:
            await self.save_alert({
                **alert,
                "sessionId": session_id,
                "studentId": student_id,
                "studentName": student_name,
                "examId": exam_id,
                "alertType": alert["type"]
            }, frame_bytes if alert["severity"] == "high" else None)

        return {
            "face_count": face_results["face_count"],
            "face_present": face_results["face_count"] > 0,
            "gaze_direction": gaze_results["direction"],
            "gaze_suspicious": gaze_results["is_suspicious"],
            "alerts": alerts
        }

    async def analyze_audio_chunk(self, audio_bytes: bytes, session_id: str, student_id: str, exam_id: str, student_name: str) -> dict:
        audio_results = self.audio_analyzer.analyze(audio_bytes)
        
        if audio_results.get("anomaly_detected"):
            alert_data = {
                "alertType": "audio_anomaly",
                "severity": "medium",
                "confidence": audio_results["confidence"],
                "description": audio_results["description"],
                "sessionId": session_id,
                "studentId": student_id,
                "studentName": student_name,
                "examId": exam_id
            }
            await self.save_alert(alert_data)
            
        return audio_results

    async def save_alert(self, alert_data: dict, frame_bytes: bytes = None) -> str:
        alert_id = str(uuid.uuid4())
        timestamp = datetime.datetime.now()
        
        image_url = None
        if frame_bytes:
            # Upload evidence image to storage
            blob = bucket.blob(f"evidence/images/{alert_data['sessionId']}/{alert_id}.jpg")
            blob.upload_from_string(frame_bytes, content_type='image/jpeg')
            blob.make_public()
            image_url = blob.public_url

        doc_ref = db.collection('monitoringAlerts').document(alert_id)
        doc_ref.set({
            **alert_data,
            "alertId": alert_id,
            "timestamp": timestamp,
            "evidenceImageURL": image_url,
            "reviewed": False,
            "reviewedBy": None,
            "reviewedAt": None,
            "reviewNote": None
        })
        
        return alert_id

monitoring_engine = MonitoringEngine()
