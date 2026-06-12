"""Dataset upload endpoint — parses CSV/Excel and runs model inference."""

import io
import os
import logging

import numpy as np
import pandas as pd
from fastapi import APIRouter, UploadFile, File, Depends, HTTPException
from typing import Dict, Any

from app.services.predictor import predict
from app.state import get_session
from app.auth import get_current_user
from app.config import settings

router = APIRouter()
logger = logging.getLogger("nirikshak.upload")


def _risk_status(score: float) -> str:
    if score >= 0.8:
        return "Active Alert"
    if score >= 0.5:
        return "Under Review"
    return "Resolved"


def _risk_category(score: float) -> str:
    if score >= 0.9:
        return "High Velocity Mule"
    if score >= 0.75:
        return "Layering Pattern"
    if score >= 0.5:
        return "Smurfing Attempt"
    return "Low Risk"


@router.post("/")
async def upload_dataset(
    file: UploadFile = File(...),
    user: Dict[str, Any] = Depends(get_current_user),
):
    allowed = {".csv", ".xlsx", ".xls"}
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in allowed:
        raise HTTPException(status_code=400, detail="Only CSV and Excel files are supported.")

    # Read file contents
    contents = await file.read()

    # Enforce upload size limit
    max_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    if len(contents) > max_bytes:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE_MB}MB.",
        )

    # Save to upload directory
    upload_dir = settings.UPLOAD_DIR
    upload_dir.mkdir(parents=True, exist_ok=True)
    dest = os.path.join(str(upload_dir), file.filename or "upload.csv")
    with open(dest, "wb") as f:
        f.write(contents)

    logger.info("Uploaded file: %s (%d bytes) by user %s", file.filename, len(contents), user["id"])

    # Parse file
    try:
        if ext == ".csv":
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
        df_model = df.copy()
    except Exception as e:
        raise HTTPException(status_code=422, detail=f"Could not parse file: {e}")

    # Run model inference
    try:
        scores = predict(df_model)
    except Exception as e:
        logger.error("Model inference failed: %s", e)
        raise HTTPException(status_code=500, detail=f"Model inference failed: {e}")

    # Build results
    results = []
    for i, score in enumerate(scores):
        tx_id = str(df.iloc[i].get("id", f"TXN_{i+1}")) if "id" in df.columns else f"TXN_{i+1}"
        account = str(df.iloc[i].get("accountSource", f"ACC-{i+1:04d}")) if "accountSource" in df.columns else f"ACC-{i+1:04d}"
        destination = str(df.iloc[i].get("destination", "Unknown")) if "destination" in df.columns else "Unknown"
        amount = float(df.iloc[i].get("amount", 0.0)) if "amount" in df.columns else 0.0
        timestamp = str(df.iloc[i].get("timestamp", "")) if "timestamp" in df.columns else ""

        prob = float(score)
        results.append({
            "id": tx_id,
            "accountSource": account,
            "destination": destination,
            "amount": amount,
            "timestamp": timestamp,
            "riskScore": round(prob * 100, 2),
            "probability": round(prob, 4),
            "category": _risk_category(prob),
            "status": _risk_status(prob),
            "velocityFlag": "HIGH_RISK" if prob >= 0.75 else ("SUSPICIOUS" if prob >= 0.5 else "NORMAL"),
            "row_index": i,
            "filename": file.filename,
        })

    # Store in per-user session
    sess = get_session(user["id"])
    sess.latest_results = results
    sess.latest_df = df.copy()
    sess.persist()


    flagged = sum(1 for r in results if r["probability"] >= 0.5)
    logger.info("Processed %d transactions, %d flagged, by user %s", len(results), flagged, user["id"])

    return {
        "message": f"File '{file.filename}' processed successfully.",
        "filename": file.filename,
        "records": len(results),
        "flagged": flagged,
        "results": results,
    }