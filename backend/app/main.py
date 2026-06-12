"""Nirikshak AI — FastAPI application entry point."""

import os
import sys
import uuid
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings
from app.routes import upload, prediction, explain, alerts, reports, account, session, chat


# ── Logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("nirikshak")


# ── Request ID middleware ─────────────────────────────────────────────────────
class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4())[:8])
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


# ── Lifespan (startup / shutdown) ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Nirikshak AI API v2.0.0 [%s]", settings.ENVIRONMENT)

    # Ensure directories exist
    settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    settings.MODEL_DIR.mkdir(parents=True, exist_ok=True)

    # Validate config
    warnings = settings.validate()
    for w in warnings:
        logger.warning("CONFIG: %s", w)

    # Fail fast if model artifacts are missing (production reliability).
    model_file = settings.MODEL_DIR / "nirikshak_ai_model.pkl"
    if settings.IS_PRODUCTION and not model_file.exists():
        raise RuntimeError(f"Required model artifact not found: {model_file}")


    # Log model availability
    model_file = settings.MODEL_DIR / "nirikshak_ai_model.pkl"
    if model_file.exists():
        logger.info("Model file found: %s", model_file)
    else:
        logger.error("Model file NOT found: %s — predictions will fail!", model_file)

    yield

    # Shutdown
    logger.info("Shutting down Nirikshak AI API")


# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(
    title="Nirikshak AI API",
    description="Enterprise AML — Mule Account Detection & Fraud Prevention",
    version="2.0.0",
    lifespan=lifespan,
)

# ── Middleware (order matters: outermost = last added) ────────────────────────
app.add_middleware(RequestIDMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ────────────────────────────────────────────────────────────────────
app.include_router(upload.router, prefix="/upload", tags=["Upload"])
app.include_router(prediction.router, prefix="/prediction", tags=["Prediction"])

app.include_router(explain.router, prefix="/explain", tags=["Explainability"])
app.include_router(alerts.router, prefix="/alerts", tags=["Alerts"])
app.include_router(reports.router, prefix="/reports", tags=["Reports"])
app.include_router(account.router, prefix="/account", tags=["Account"])
app.include_router(session.router, prefix="/session", tags=["Session"])
app.include_router(chat.router, prefix="/chat", tags=["Chat"])


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "Nirikshak AI API",
        "version": "2.0.0",
        "environment": settings.ENVIRONMENT,
    }