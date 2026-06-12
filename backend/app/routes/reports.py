"""Report generation — dataset-level or account-level with Groq LLM summary."""

import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.state import get_session
from app.auth import get_current_user
from app.services.groq_service import generate_report_summary
from app.services.shap_service import explain_row

router = APIRouter()


class ReportRequest(BaseModel):
    report_type: str  # "dataset" or "account"
    account_id: Optional[str] = None
    include_risk_analysis: bool = True
    include_shap: bool = True
    include_transaction_table: bool = True
    pii_redaction: bool = True


@router.post("/generate")
def generate_report(
    req: ReportRequest,
    user: Dict[str, Any] = Depends(get_current_user),
):
    """Generate a comprehensive audit report with LLM summary."""
    session = get_session(user["id"])

    if not session.latest_results:
        raise HTTPException(status_code=404, detail="No dataset loaded. Upload a dataset first.")

    # --- Determine which transactions to include ---
    if req.report_type == "account":
        if not req.account_id:
            raise HTTPException(status_code=400, detail="account_id required for account report.")
        transactions = [
            t for t in session.latest_results
            if t.get("accountSource") == req.account_id or t.get("id") == req.account_id
        ]
        if not transactions:
            raise HTTPException(status_code=404, detail=f"Account '{req.account_id}' not found.")
    else:
        transactions = session.latest_results

    # --- Stats ---
    risk_scores = [t.get("riskScore", 0) for t in transactions]
    stats = {
        "total": len(transactions),
        "flagged": sum(1 for t in transactions if t.get("probability", 0) >= 0.5),
        "high_risk": sum(1 for t in transactions if t.get("probability", 0) >= 0.8),
        "max_risk": round(max(risk_scores), 2) if risk_scores else 0,
        "avg_risk": round(
            sum(risk_scores) / max(len(transactions), 1), 2
        ),
    }

    # --- Build category distribution chart data ---
    category_dist = {}
    for t in transactions:
        cat = t.get("category", "Unknown")
        category_dist[cat] = category_dist.get(cat, 0) + 1

    # --- Build status distribution ---
    status_dist = {"Active Alert": 0, "Under Review": 0, "Resolved": 0}
    for t in transactions:
        s = t.get("status", "Resolved")
        status_dist[s] = status_dist.get(s, 0) + 1

    # --- Risk buckets (for the bar chart) ---
    risk_buckets = {"0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0}
    for t in transactions:
        rs = t.get("riskScore", 0)
        if rs <= 20:
            risk_buckets["0-20"] += 1
        elif rs <= 40:
            risk_buckets["21-40"] += 1
        elif rs <= 60:
            risk_buckets["41-60"] += 1
        elif rs <= 80:
            risk_buckets["61-80"] += 1
        else:
            risk_buckets["81-100"] += 1

    # --- SHAP data for one representative transaction ---
    shap_data = None
    if req.include_shap and session.latest_df is not None and transactions:
        # Pick the highest-risk transaction
        top_tx = max(transactions, key=lambda t: t.get("riskScore", 0))
        idx = top_tx.get("row_index")
        if idx is not None:
            try:
                row_df = session.latest_df.iloc[[idx]]
                shap_data = explain_row(row_df)
            except Exception:
                shap_data = None

    # --- Generate LLM summary ---
    try:
        llm_summary = generate_report_summary(
            report_type=req.report_type,
            account_id=req.account_id,
            transactions=transactions,
            stats=stats,
            shap_data=shap_data,
            include_risk=req.include_risk_analysis,
            include_shap=req.include_shap,
            pii_redact=req.pii_redaction,
        )
    except Exception as e:
        llm_summary = f"AI summary unavailable: {e}"

    # --- Build the report ---
    report_id = f"RPT-{datetime.now().year}-{uuid.uuid4().hex[:8].upper()}"

    # Transaction rows for the table (respecting PII)
    tx_rows = []
    for t in transactions:
        row = {
            "id": t.get("id", ""),
            "accountSource": "***REDACTED***" if req.pii_redaction else t.get("accountSource", ""),
            "destination": "***REDACTED***" if req.pii_redaction else t.get("destination", ""),
            "amount": t.get("amount", 0),
            "riskScore": t.get("riskScore", 0),
            "category": t.get("category", ""),
            "status": t.get("status", ""),
        }
        tx_rows.append(row)

    return {
        "report_id": report_id,
        "generated_at": datetime.utcnow().isoformat(),
        "report_type": req.report_type,
        "account_id": req.account_id,
        "stats": stats,
        "category_distribution": category_dist,
        "status_distribution": status_dist,
        "risk_buckets": risk_buckets,
        "shap_data": shap_data,
        "llm_summary": llm_summary,
        "transactions": tx_rows if req.include_transaction_table else [],
        "pii_redaction": req.pii_redaction,
        "message": "Report generated successfully.",
    }