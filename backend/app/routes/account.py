from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Dict, Any

from app.services.predictor import predict, _load, _feature_list
from app.state import get_session
from app.auth import get_current_user
import pandas as pd
import numpy as np

router = APIRouter()


class AccountRequest(BaseModel):
    account_id: str


@router.post("/analyze")
def analyze_single_account(
    req: AccountRequest,
    user: Dict[str, Any] = Depends(get_current_user),
):
    """Analyze a single account from already-loaded dataset by account ID."""
    session = get_session(user["id"])
    if not session.latest_results:
        raise HTTPException(status_code=404, detail="No dataset loaded. Upload a dataset first.")

    # Search in latest results by account source or transaction id
    matches = [r for r in session.latest_results
               if r.get("accountSource") == req.account_id or r.get("id") == req.account_id]

    if not matches:
        raise HTTPException(status_code=404, detail=f"Account '{req.account_id}' not found in the loaded dataset.")

    # Return all transactions for this account
    return {
        "account_id": req.account_id,
        "transactions": matches,
        "total": len(matches),
        "max_risk_score": max(r["riskScore"] for r in matches),
        "avg_risk_score": round(sum(r["riskScore"] for r in matches) / len(matches), 2),
        "is_suspected_mule": any(r["probability"] >= 0.5 for r in matches),
        "verdict": "Suspected Mule Account" if any(r["probability"] >= 0.5 for r in matches) else "Low Risk Account",
    }