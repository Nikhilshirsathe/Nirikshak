"""Session store facade.

Routers import:
  from app.state import get_session, clear_session

We keep this module as the stable import location and delegate
to a Redis-backed implementation.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

import pandas as pd

from app.state_redis import get_session, clear_session, SessionStore

__all__ = ["get_session", "clear_session", "SessionStore"]

