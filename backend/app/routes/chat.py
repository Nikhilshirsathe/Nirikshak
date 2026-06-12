"""Chatbot endpoint for Explainable AI — ask questions about your data."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
from fastapi.responses import StreamingResponse

from app.state import get_session
from app.auth import get_current_user
from app.services.groq_service import answer_question
from app.services.predictor import _feature_list, _load

router = APIRouter()


class ChatRequest(BaseModel):
    message: str


@router.post("/")
def chat(
    req: ChatRequest,
    user: Dict[str, Any] = Depends(get_current_user),
):
    """Answer a question about the current dataset using Groq LLM."""
    session = get_session(user["id"])

    if not session.latest_results:
        raise HTTPException(status_code=404, detail="No dataset loaded. Upload a dataset first.")

    # Ensure feature list is loaded
    if _feature_list is None:
        _load()

    stats = {
        "total": len(session.latest_results),
        "flagged": sum(1 for t in session.latest_results if t.get("probability", 0) >= 0.5),
        "high_risk": sum(1 for t in session.latest_results if t.get("probability", 0) >= 0.8),
    }

    try:
        answer = answer_question(
            question=req.message,
            transactions=session.latest_results,
            stats=stats,
            feature_list=list(_feature_list) if _feature_list else None,
        )
        return {"answer": answer}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"LLM query failed: {e}")