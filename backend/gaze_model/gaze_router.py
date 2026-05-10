from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from .gaze_inference import GazeInference
import os
from firebase_admin import firestore
import traceback

router = APIRouter()

# Initialize Inference
MODEL_PATH = os.path.join(os.path.dirname(__file__), "L2CSNet_finetuned.pkl")
inference_engine = GazeInference(MODEL_PATH)

class GazeRequest(BaseModel):
    frame: str
    session_id: str
    student_id: str
    student_name: str
    exam_id: str
    instructor_id: str

class TabSwitchRequest(BaseModel):
    session_id: str
    exam_id: str
    student_id: str
    student_name: str
    instructor_id: str

@router.post("/tab-switch")
async def log_tab_switch(request: TabSwitchRequest):
    try:
        db = firestore.client()
        doc_data = {
            "sessionId": request.session_id,
            "examId": request.exam_id,
            "studentId": request.student_id,
            "studentName": request.student_name,
            "instructorId": request.instructor_id,
            "alertType": "tab_switch",
            "message": "Tab Switch Detected",
            "description": f"Student {request.student_name} switched browser tabs or windows.",
            "timestamp": firestore.SERVER_TIMESTAMP,
            "severity": "high",
            "reviewed": False
        }
        db.collection("monitoringAlerts").add(doc_data)
        return {"status": "success", "message": "Tab switch logged"}
    except Exception as e:
        print(f"Error logging tab switch: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/gaze")
async def process_gaze(request: GazeRequest):
    try:
        # Perform Inference
        result = inference_engine.process_frame(request.frame)
        
        # If suspicious, log to Firestore
        if result.get("suspicious", False):
            try:
                db = firestore.client()
                doc_data = {
                    "sessionId": request.session_id,
                    "studentId": request.student_id,
                    "studentName": request.student_name,
                    "examId": request.exam_id,
                    "instructorId": request.instructor_id,
                    "alertType": "gaze_away",
                    "message": f"Suspicious gaze: {result['gaze']}",
                    "description": f"AI flagged suspicious gaze: {result['gaze']} (Yaw: {result['yaw']:.2f}, Pitch: {result['pitch']:.2f})",
                    "timestamp": firestore.SERVER_TIMESTAMP,
                    "severity": "high",
                    "reviewed": False,
                    "gaze_direction": result["gaze"],
                    "yaw": result["yaw"],
                    "pitch": result["pitch"]
                }
                db.collection("monitoringAlerts").add(doc_data)
                print(f"DEBUG: Successfully logged gaze violation for {request.student_id}")
            except Exception as db_err:
                print(f"DATABASE ERROR: Failed to log gaze violation: {db_err}")
            
        return result
        
    except Exception as e:
        print(f"❌ [GazeRouter] General Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
