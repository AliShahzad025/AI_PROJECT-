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

@router.post("/gaze")
async def process_gaze(request: GazeRequest):
    try:
        # Perform Inference
        result = inference_engine.process_frame(request.frame)
        
        # If suspicious, log to Firestore (Protected by try-except to prevent 500 errors)
        if result.get("suspicious", False):
            try:
                db = firestore.client()
                doc_data = {
                    "session_id": request.session_id,
                    "type": "gaze_away",
                    "timestamp": firestore.SERVER_TIMESTAMP,
                    "gaze_direction": result["gaze"],
                    "yaw": result["yaw"],
                    "pitch": result["pitch"],
                    "details": f"AI flagged suspicious gaze: {result['gaze']}"
                }
                db.collection("proctoring_events").add(doc_data)
                print(f"DEBUG: Successfully logged violation for {request.session_id}")
            except Exception as db_err:
                # Log the error but DO NOT crash the request
                print(f"DATABASE ERROR: Failed to log violation: {db_err}")
            
        return result
        
    except Exception as e:
        print(f"❌ [GazeRouter] General Error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
