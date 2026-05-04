from fastapi import APIRouter, Depends, File, UploadFile, Form
from services.monitoring_service import monitoring_service
from utils.helpers import get_current_user
from pydantic import BaseModel

router = APIRouter(prefix="/monitoring", tags=["Monitoring"])

@router.post("/frame")
async def process_frame(
    sessionId: str = Form(...),
    frame: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    frame_bytes = await frame.read()
    return await monitoring_service.process_frame(sessionId, frame_bytes)

@router.post("/audio")
async def process_audio(
    sessionId: str = Form(...),
    audio: UploadFile = File(...),
    user: dict = Depends(get_current_user)
):
    audio_bytes = await audio.read()
    return await monitoring_service.process_audio(sessionId, audio_bytes)

class TabSwitchRequest(BaseModel):
    sessionId: str
    studentId: str
    examId: str

@router.post("/tab-switch")
async def log_tab_switch(req: TabSwitchRequest, user: dict = Depends(get_current_user)):
    alert_id = await monitoring_service.log_tab_switch(
        req.sessionId, req.studentId, req.examId, user['displayName']
    )
    return {"alertId": alert_id, "message": "Tab switch logged"}
