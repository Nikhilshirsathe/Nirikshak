"""Redis-backed session store.

This module is introduced to replace the current in-memory session store.
It preserves the existing interface used by routers:
  - session.latest_results
  - session.latest_df

Implementation notes:
- `latest_results` is stored as JSON (list[dict]).
- `latest_df` is serialized via pickle to bytes and stored in Redis.
  This keeps SHAP/report functionality working because they rely on dataframe
  row selection via `row_index`.

If Redis is not configured, the code falls back to the in-memory store.
"""

from __future__ import annotations

import json
import os
import pickle
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import pandas as pd

try:
    import redis  # type: ignore
except Exception:  # pragma: no cover
    redis = None  # type: ignore


@dataclass
class SessionStore:
    latest_results: List[Dict[str, Any]]
    latest_df: Optional[pd.DataFrame]


_in_memory_sessions: Dict[str, SessionStore] = {}


def _get_redis_url() -> str:
    return os.getenv("REDIS_URL", "")


def _get_redis_client():
    if redis is None:
        return None
    url = _get_redis_url()
    if not url:
        return None
    return redis.Redis.from_url(url, decode_responses=False)


def _key(user_id: str) -> str:
    return f"nirikshak:session:{user_id}"


def get_session(user_id: str) -> SessionStore:
    """Return a session for user_id, creating it if missing."""
    # Fallback to in-memory if Redis isn't available.
    r = _get_redis_client()
    if r is None:
        if user_id not in _in_memory_sessions:
            _in_memory_sessions[user_id] = SessionStore(latest_results=[], latest_df=None)
        return _in_memory_sessions[user_id]

    raw = r.hgetall(_key(user_id))
    if not raw:
        sess = SessionStore(latest_results=[], latest_df=None)
        _persist(r, user_id, sess)
        return sess

    latest_results_b = raw.get(b"latest_results")
    latest_df_b = raw.get(b"latest_df")

    latest_results: List[Dict[str, Any]] = []
    if latest_results_b:
        latest_results = json.loads(latest_results_b.decode("utf-8"))

    latest_df: Optional[pd.DataFrame] = None
    if latest_df_b:
        try:
            latest_df = pickle.loads(latest_df_b)
        except Exception:
            latest_df = None

    return SessionStore(latest_results=latest_results, latest_df=latest_df)


def _persist(r, user_id: str, sess: SessionStore) -> None:
    payload = {
        "latest_results": json.dumps(sess.latest_results),
        "latest_df": pickle.dumps(sess.latest_df) if sess.latest_df is not None else b"",
    }
    # Store as hash fields.
    h = _key(user_id)
    # Redis-py wants bytes for binary; json field can be str.
    r.hset(
        h,
        mapping={
            "latest_results": payload["latest_results"],
            "latest_df": payload["latest_df"],
        },
    )


def clear_session(user_id: str) -> None:
    r = _get_redis_client()
    if r is None:
        _in_memory_sessions.pop(user_id, None)
        return
    r.delete(_key(user_id))

