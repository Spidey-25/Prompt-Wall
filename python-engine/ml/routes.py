from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ml.classifier import classifier
from audit_store import append_events
import time
import uuid

router = APIRouter(prefix="/ml", tags=["ML"])


class TextRequest(BaseModel):
    text: str


class FeedbackRequest(TextRequest):
    label: str


@router.post("/predict")
def predict(request: TextRequest):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="text must not be empty")
    result = classifier.predict(request.text)
    append_events([{
        "id": f"ml-{uuid.uuid4().hex[:8]}",
        "timestamp": time.time(),
        "event_type": "ML_PREDICTION",
        "description": f"ML prediction completed with status {result['status']}.",
        "severity": "INFO",
        "decision": result.get("prediction") or "UNTRAINED",
        "evidence": "User-submitted evaluation input processed by local classifier.",
        "rule": "ML-001 · Local Model Inference",
        "tool": "ml.predict",
        "risk_score": 5,
        "ip_address": "127.0.0.1",
    }])
    return {"success": True, "result": result}


@router.post("/feedback")
def feedback(request: FeedbackRequest):
    if not request.text.strip():
        raise HTTPException(status_code=400, detail="text must not be empty")
    try:
        result = classifier.learn(request.text, request.label)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    append_events([{
        "id": f"ml-{uuid.uuid4().hex[:8]}",
        "timestamp": time.time(),
        "event_type": "ML_FEEDBACK_RECORDED",
        "description": f"Reviewer labelled an input as {result['label_recorded']}.",
        "severity": "INFO",
        "decision": result["label_recorded"],
        "evidence": "Explicit reviewer feedback added to local training data.",
        "rule": "ML-002 · Incremental Model Update",
        "tool": "ml.feedback",
        "risk_score": 5,
        "ip_address": "127.0.0.1",
    }])
    return {"success": True, "result": result}
