"""Runtime config for the frontend (esp. api_base_url for tunneled sessions)."""

from __future__ import annotations

import os

from fastapi import APIRouter

router = APIRouter(tags=["config"])


@router.get("/config")
async def runtime_config() -> dict[str, str]:
    """Return values the frontend needs at boot (survives tunnel/deploy moves)."""
    api_base = os.environ.get("PUBLIC_API_BASE_URL") or os.environ.get("FRONTEND_BASE_URL") or ""
    return {"api_base_url": api_base}
