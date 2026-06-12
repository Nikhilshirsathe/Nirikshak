"""Prediction retrieval endpoint — returns latest results for the current user."""

from fastapi import APIRouter, Depends
from typing import Dict, Any

from app.state import get_session
from app.auth import get_current_user

router = APIRouter()


@router.get("/results")
def get_latest_results(user: Dict[str, Any] = Depends(get_current_user)):

    session = get_session(user["id"])
    if not session.latest_results:
        return {"results": [], "total": 0, "message": "No results yet. Upload a dataset first."}
    return {"results": session.latest_results, "total": len(session.latest_results)}

