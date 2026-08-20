"""Email-based sign-in for save/resume across devices.

Prototype-grade: no password, no magic link. Anyone who knows an email can sign
in as that user. Matches the current 'anyone with the share link can view/edit'
security posture, with the improvement that faculty can come back on any device
by remembering their email instead of a bookmarked URL.
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
import secrets
import time
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])

SESSIONS_DIR = Path("./data/sessions")
USERS_DIR = Path("./data/users")

EMAIL_RE = re.compile(r"^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$")


def _norm_email(email: str) -> str:
    return (email or "").strip().lower()


def _email_hash(email: str) -> str:
    return hashlib.sha256(_norm_email(email).encode("utf-8")).hexdigest()[:24]


def _session_path(token: str) -> Path:
    SESSIONS_DIR.mkdir(parents=True, exist_ok=True)
    return SESSIONS_DIR / f"{token}.json"


def _user_path(email: str) -> Path:
    USERS_DIR.mkdir(parents=True, exist_ok=True)
    return USERS_DIR / f"{_email_hash(email)}.json"


def _load_user(email: str) -> dict[str, Any]:
    p = _user_path(email)
    if not p.exists():
        return {"email": _norm_email(email), "proposals": [], "created_at": int(time.time())}
    try:
        return json.loads(p.read_text())
    except (OSError, json.JSONDecodeError):
        logger.exception("failed to read user file %s", p)
        return {"email": _norm_email(email), "proposals": [], "created_at": int(time.time())}


def _save_user(user: dict[str, Any]) -> None:
    p = _user_path(user["email"])
    p.write_text(json.dumps(user, ensure_ascii=False))


def add_proposal_to_user(email: str, proposal_id: str) -> None:
    """Associate a proposal id with the signed-in user. Idempotent."""
    user = _load_user(email)
    ids = user.setdefault("proposals", [])
    if proposal_id not in ids:
        ids.append(proposal_id)
        user["last_seen"] = int(time.time())
        _save_user(user)


class SignInRequest(BaseModel):
    email: str


class SignInResponse(BaseModel):
    token: str
    email: str


class MeResponse(BaseModel):
    email: str


class ProposalSummary(BaseModel):
    id: str
    course_name: str
    updated_at: int


class MyProposalsResponse(BaseModel):
    proposals: list[ProposalSummary]


def get_current_email(authorization: str | None = Header(default=None)) -> str | None:
    """Return the email associated with the Bearer token, or None if absent/invalid.

    Returns None (not 401) when there's no token — signed-out use is allowed.
    """
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    token = authorization.split(" ", 1)[1].strip()
    if not re.match(r"^[A-Za-z0-9_-]{16,128}$", token):
        return None
    p = _session_path(token)
    if not p.exists():
        return None
    try:
        payload = json.loads(p.read_text())
    except (OSError, json.JSONDecodeError):
        return None
    email = payload.get("email")
    return email if isinstance(email, str) and email else None


def require_email(email: str | None = Depends(get_current_email)) -> str:
    if not email:
        raise HTTPException(status_code=401, detail="Not signed in")
    return email


@router.post("/signin", response_model=SignInResponse)
async def signin(req: SignInRequest) -> SignInResponse:
    email = _norm_email(req.email)
    if not EMAIL_RE.match(email):
        raise HTTPException(status_code=400, detail="Enter a valid email address.")
    token = secrets.token_urlsafe(24)
    payload = {"email": email, "created_at": int(time.time())}
    try:
        _session_path(token).write_text(json.dumps(payload, ensure_ascii=False))
    except OSError as exc:
        logger.exception("session write failed")
        raise HTTPException(status_code=500, detail=f"Sign-in failed: {exc}") from exc

    # Bootstrap or touch the user record.
    user = _load_user(email)
    user["last_seen"] = int(time.time())
    _save_user(user)

    return SignInResponse(token=token, email=email)


@router.post("/signout")
async def signout(authorization: str | None = Header(default=None)) -> dict[str, bool]:
    if authorization and authorization.lower().startswith("bearer "):
        token = authorization.split(" ", 1)[1].strip()
        if re.match(r"^[A-Za-z0-9_-]{16,128}$", token):
            p = _session_path(token)
            if p.exists():
                try:
                    p.unlink()
                except OSError:
                    logger.warning("session unlink failed %s", p)
    return {"ok": True}


@router.get("/me", response_model=MeResponse)
async def me(email: str = Depends(require_email)) -> MeResponse:
    return MeResponse(email=email)


@router.get("/proposals", response_model=MyProposalsResponse)
async def my_proposals(email: str = Depends(require_email)) -> MyProposalsResponse:
    """List proposals owned by the signed-in user."""
    user = _load_user(email)
    ids: list[str] = user.get("proposals", []) or []
    proposals_dir = Path("./data/proposals")
    out: list[ProposalSummary] = []
    live_ids: list[str] = []
    for pid in ids:
        pth = proposals_dir / f"{pid}.json"
        if not pth.exists():
            continue
        try:
            payload = json.loads(pth.read_text())
        except (OSError, json.JSONDecodeError):
            continue
        data = payload.get("data") or {}
        course = (data.get("course_overview") or {}) if isinstance(data, dict) else {}
        name = str(course.get("course_name") or "").strip() or "(Untitled course)"
        updated = int(payload.get("updated_at") or 0)
        out.append(ProposalSummary(id=pid, course_name=name, updated_at=updated))
        live_ids.append(pid)

    # Prune dangling ids so the list stays accurate.
    if len(live_ids) != len(ids):
        user["proposals"] = live_ids
        _save_user(user)

    out.sort(key=lambda p: p.updated_at, reverse=True)
    return MyProposalsResponse(proposals=out)
