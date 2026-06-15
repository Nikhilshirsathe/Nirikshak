"""Centralized configuration for Nirikshak AI backend.

All settings are loaded from environment variables with sensible defaults
for local development. In production (Railway), set these via the dashboard.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


class Settings:
    # ── Environment ─────────────────────────────────────────────────────────
    ENVIRONMENT: str = os.getenv("APP_ENV", "development")
    IS_PRODUCTION: bool = ENVIRONMENT == "production"

    # ── CORS ────────────────────────────────────────────────────────────────
    _raw_cors = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000")
    CORS_ORIGINS: list[str] = [o.strip() for o in _raw_cors.split(",") if o.strip()]

    # ── Model & Data Paths ──────────────────────────────────────────────────
    # In production these are relative to WORKDIR (/app in Docker).
    # In development they resolve relative to the backend/ directory.
    _BACKEND_DIR = Path(__file__).resolve().parent.parent




    MODEL_DIR: Path = Path(os.getenv("MODEL_DIR", str(_BACKEND_DIR.parent / "Models")))
    UPLOAD_DIR: Path = Path(os.getenv("UPLOAD_DIR", str(_BACKEND_DIR / "data" / "uploads")))

    # ── Auth ────────────────────────────────────────────────────────────────
    SUPABASE_JWT_SECRET: str = os.getenv("SUPABASE_JWT_SECRET", "")

    # ── LLM ─────────────────────────────────────────────────────────────────
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")

    # ── Upload Limits ───────────────────────────────────────────────────────
    MAX_UPLOAD_SIZE_MB: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "150"))

    def validate(self) -> list[str]:
        """Return a list of missing critical env vars (empty if all set).

        In production, this raises to fail fast.
        """

        warnings: list[str] = []

        if not self.SUPABASE_JWT_SECRET:
            msg = "SUPABASE_JWT_SECRET is not set"
            if self.IS_PRODUCTION:
                raise RuntimeError(msg + " — refusing to start in production")
            warnings.append(msg + " — auth verification disabled")

        if not self.GROQ_API_KEY:
            msg = "GROQ_API_KEY is not set"
            if self.IS_PRODUCTION:
                raise RuntimeError(msg + " — refusing to start in production")
            warnings.append(msg + " — LLM features disabled")

        return warnings


settings = Settings()

