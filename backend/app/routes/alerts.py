"""Alerts API.

Currently uses a module-level in-memory list (demo alerts).
This matches the existing frontend functionality and API contract.

For production persistence, replace this with DB-backed storage.
"""

from fastapi import APIRouter, HTTPException

from pydantic import BaseModel
from typing import List, Literal, Dict, Any

router = APIRouter()


_alerts: List[Dict[str, Any]] = [
    {
        "id": "#AL-9921",
        "accountId": "ACC-0482-11",
        "category": "High Velocity Mule",
        "confidence": 94,
        "detectedTime": "2m ago",
        "status": "Active Alert",
    },
    {
        "id": "#AL-9844",
        "accountId": "ACC-9920-54",
        "category": "Layering Pattern",
        "confidence": 68,
        "detectedTime": "15m ago",
        "status": "Under Review",
    },
    {
        "id": "#AL-9812",
        "accountId": "ACC-7712-30",
        "category": "Smurfing Attempt",
        "confidence": 42,
        "detectedTime": "1h ago",
        "status": "Resolved",
    },
    {
        "id": "#AL-9755",
        "accountId": "ACC-0012-99",
        "category": "Shell Org Signal",
        "confidence": 82,
        "detectedTime": "3h ago",
        "status": "Active Alert",
    },
]


@router.get("/")
def list_alerts():
    return _alerts


@router.patch("/{alert_id}/resolve")
def resolve_alert(alert_id: str):
    for alert in _alerts:
        if alert["id"] == alert_id:
            alert["status"] = "Resolved"
            return {"message": f"Alert {alert_id} resolved.", "alert": alert}
    raise HTTPException(status_code=404, detail="Alert not found.")


@router.patch("/{alert_id}/escalate")
def escalate_alert(alert_id: str):
    for alert in _alerts:
        if alert["id"] == alert_id:
            alert["status"] = "Under Review"
            return {"message": f"Alert {alert_id} escalated to FIU.", "alert": alert}
    raise HTTPException(status_code=404, detail="Alert not found.")

