"""JWT-based session management using Supabase Auth.

In development (no JWT secret configured), the app falls back to a guest
user so it still works without Supabase.  In production, invalid tokens
are rejected.
"""

import logging
from functools import lru_cache
from typing import Dict, Any, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt

from app.config import settings

logger = logging.getLogger("nirikshak.auth")

security = HTTPBearer(auto_error=False)


@lru_cache(maxsize=1)
def _get_jwt_secret() -> str:
    return settings.SUPABASE_JWT_SECRET


def _decode_token(token: str) -> Optional[Dict[str, Any]]:
    """Try to decode and verify a JWT. Returns None on any failure."""
    secret = _get_jwt_secret()
    if not secret:
        return None
    try:
        return jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            options={"verify_aud": False},
        )
    except JWTError as e:
        logger.debug("JWT decode failed: %s", e)
        return None


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Dict[str, Any]:
    """Dependency that extracts and verifies the Supabase JWT.

    In development (no JWT secret set), falls back to guest user.
    In production, rejects invalid/missing tokens.
    """
    if credentials is None:
        if settings.IS_PRODUCTION:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        # No Authorization header — treat as guest in development
        return {"id": "anonymous", "email": "", "role": "guest"}

    payload = _decode_token(credentials.credentials)
    if payload is None:
        if settings.IS_PRODUCTION:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired token.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        # Token present but invalid — treat as guest in development
        return {"id": "anonymous", "email": "", "role": "guest"}

    return {
        "id": payload.get("sub", "anonymous"),
        "email": payload.get("email", ""),
        "role": payload.get("role", "guest"),
    }