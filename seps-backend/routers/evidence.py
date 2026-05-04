from fastapi import APIRouter, Depends, Query
from services.evidence_service import evidence_service
from utils.helpers import require_role
from pydantic import BaseModel

router = APIRouter(prefix="/evidence", tags=["Evidence"])

class ReviewRequest(BaseModel):
    reviewNote: str

@router.get("/alerts")
async def get_alerts(
    examId: str = None,
    studentId: str = None,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1),
    user: dict = Depends(require_role(["instructor", "admin"]))
):
    return await evidence_service.get_alerts(user['uid'], examId, studentId, page, limit)

@router.patch("/alerts/{alertId}/review")
async def review_alert(
    alertId: str,
    req: ReviewRequest,
    user: dict = Depends(require_role(["instructor", "admin"]))
):
    return await evidence_service.review_alert(alertId, user['uid'], req.reviewNote)

@router.get("/report/{examId}")
async def get_report(examId: str, user: dict = Depends(require_role(["instructor", "admin"]))):
    # Stub for summary report
    return {"totalAlerts": 0, "byStudent": [], "byType": {}, "severityBreakdown": {}}
