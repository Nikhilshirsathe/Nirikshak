"""Session endpoints.

Used by the frontend to load/clear per-user session state.
"""

from fastapi import APIRouter, Depends
from typing import Dict, Any

from app.auth import get_current_user
from app.state import get_session, clear_session

router = APIRouter()


@router.get("/me")
def me(user: Dict[str, Any] = Depends(get_current_user)):
    session = get_session(user["id"])
    has_data = bool(session.latest_results)
    return {
        "user_id": user["id"],
        "email": user.get("email", ""),
        "role": user.get("role", "guest"),
        "has_data": has_data,
    }


@router.post("/logout")
def logout(user: Dict[str, Any] = Depends(get_current_user)):
    clear_session(user["id"])
    return {"message": "Signed out and session cleared."}

