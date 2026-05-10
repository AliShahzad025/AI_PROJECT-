from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import base64
import json
from ai_engine.proctor import process_frame
import time

router = APIRouter()

# Store active connections: (exam_id, student_id) -> WebSocket
active_connections = {}

# Cooldown dictionary to prevent spamming the same alert
# (student_id, alert_type) -> last_timestamp
alert_cooldowns = {}
COOLDOWN_SECONDS = 5

@router.websocket("/monitor/{exam_id}/{student_id}/{session_id}")
async def websocket_endpoint(websocket: WebSocket, exam_id: str, student_id: str, session_id: str):
    await websocket.accept()
    conn_key = f"{exam_id}_{student_id}_{session_id}"
    active_connections[conn_key] = websocket
    print(f"Client connected: {conn_key}")
    
    # Fetch names once for efficiency
    student_name = "Student"
    exam_name = "Exam"
    instructor_id = ""
    try:
        from firebase_admin import firestore
        db = firestore.client()
        # Student Name
        student_doc = db.collection('users').document(student_id).get()
        if student_doc.exists:
            student_name = student_doc.to_dict().get("name", "Student")
            
        # Exam Name & Instructor ID
        exam_doc = db.collection('exams').document(exam_id).get()
        if exam_doc.exists:
            exam_data = exam_doc.to_dict()
            exam_name = exam_data.get("title") or exam_data.get("name", "Exam")
            instructor_id = exam_data.get("instructorId") or exam_data.get("createdBy", "")
    except Exception as e:
        print(f"Error fetching metadata for monitor: {e}")

    try:
        while True:
            data = await websocket.receive_text()
            try:
                payload = json.loads(data)
                # FIX: Frontend sends "data", not "image"
                img_raw = payload.get("data") or payload.get("image")
                
                if img_raw:
                    img_data = img_raw.split(",")[1] if "," in img_raw else img_raw
                    frame_bytes = base64.b64decode(img_data)
                    
                    alerts = process_frame(frame_bytes, student_id, exam_id)
                    current_time = time.time()
                    sent_alerts = []
                    
                    for alert in alerts:
                        cooldown_key = f"{student_id}_{alert}"
                        last_time = alert_cooldowns.get(cooldown_key, 0)
                        
                        if current_time - last_time > COOLDOWN_SECONDS:
                            sent_alerts.append(alert)
                            alert_cooldowns[cooldown_key] = current_time
                            
                            # LOG TO FIRESTORE WITH METADATA
                            try:
                                db.collection("monitoringAlerts").add({
                                    "sessionId": session_id,
                                    "examId": exam_id,
                                    "examName": exam_name,
                                    "studentId": student_id,
                                    "studentName": student_name,
                                    "instructorId": instructor_id,
                                    "alertType": alert.lower().replace(" ", "_"),
                                    "message": alert,
                                    "description": f"AI detected: {alert} for student {student_name}",
                                    "timestamp": firestore.SERVER_TIMESTAMP,
                                    "severity": "high",
                                    "reviewed": False
                                })
                            except Exception as log_err:
                                print(f"Failed to log alert: {log_err}")
                    
                    if sent_alerts:
                        # Send alerts back to frontend
                        for alert in sent_alerts:
                            await websocket.send_json({
                                "type": "alert",
                                "message": alert,
                                "timestamp": current_time
                            })
                            
            except json.JSONDecodeError:
                pass
            except Exception as e:
                print(f"Error processing frame: {e}")
                
    except WebSocketDisconnect:
        print(f"Client disconnected: {conn_key}")
        if conn_key in active_connections:
            del active_connections[conn_key]
