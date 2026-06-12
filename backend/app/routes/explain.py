from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any

from app.state import get_session
from app.auth import get_current_user
from app.services.shap_service import explain_row

router = APIRouter()


@router.get("/{transaction_id}")
def get_shap_explanation(
    transaction_id: str,
    user: Dict[str, Any] = Depends(get_current_user),
):
    session = get_session(user["id"])
    if not session.latest_results:
        raise HTTPException(status_code=404, detail="No data loaded. Upload a dataset first.")

    match = next((r for r in session.latest_results if r["id"] == transaction_id), None)
    if not match:
        raise HTTPException(status_code=404, detail=f"Transaction '{transaction_id}' not found.")

    prob = match["probability"]
    risk_score = match["riskScore"]

    if session.latest_df is None:
        raise HTTPException(status_code=500, detail="No dataframe found for SHAP computation. Upload a dataset and run prediction first.")

    idx = match.get("row_index")
    if idx is None:
        raise HTTPException(status_code=500, detail="No row_index found for this transaction. Prediction results may be incomplete.")

    try:
        row_df = session.latest_df.iloc[[idx]]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to select row for SHAP computation: {e}")

    try:
        shap_values = explain_row(row_df)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"SHAP computation failed for this transaction: {e}")

    if risk_score >= 90:
        risk_level = "Extreme Risk"
    elif risk_score >= 75:
        risk_level = "High Risk"
    elif risk_score >= 50:
        risk_level = "Medium Risk"
    else:
        risk_level = "Low Risk"

    return {
        "transaction_id": transaction_id,
        "shap_values": shap_values,
        "final_risk_score": risk_score,
        "risk_level": risk_level,
        "probability": prob,
    }