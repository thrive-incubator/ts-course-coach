"""Pricing intelligence — comparable university-course benchmarking + recommended tuition band."""

from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from google import genai
from google.genai import types
from pydantic import BaseModel

from app.core.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pricing", tags=["pricing"])


class PricingRequest(BaseModel):
    course_name: str = ""
    course_description: str = ""
    course_type: str = ""
    course_format: str = ""
    intended_audiences: str = ""
    duration: str = ""
    contact_hours: str = ""
    cohort_size: str = ""
    current_tuition: str = ""


class Comparable(BaseModel):
    program: str
    institution: str
    format: str = ""
    duration: str = ""
    price_range: str
    why_comparable: str


class PricingScenario(BaseModel):
    label: str
    price: str
    tradeoff: str


class PricingResponse(BaseModel):
    suggested_range_low: str
    suggested_range_high: str
    positioning_note: str
    comparables: list[Comparable] = []
    scenarios: list[PricingScenario] = []
    caveats: str = ""


_SYSTEM_INSTRUCTION = (
    "You are a pricing analyst for Thrive Academy — a Georgetown-affiliated adult / "
    "professional-education incubator. You know the continuing-education, executive-education, "
    "and professional-certificate landscape across US universities (Georgetown SCS, Harvard "
    "Extension / DCE, Wharton Executive Education, Stanford Continuing Studies, Northwestern "
    "SPS, GW GSPM, MIT Professional Ed, UC Berkeley Extension, Columbia SPS, NYU SPS, "
    "Cornell eCornell, etc.) as well as major non-university players (Coursera specializations, "
    "edX MicroMasters, LinkedIn Learning paths, boutique institutes). "
    "Given a course concept, propose a defensible tuition band by comparing to real, "
    "publicly-offered programs whose format, duration, and audience most closely match. "
    "You never invent institutions or programs. If you are uncertain about a specific "
    "price, give a plausible band and say so. Be concrete: cite program names when you can. "
    "Return valid JSON only."
)


def _gemini_client():
    settings = get_settings()
    if not settings.gemini_api_key:
        raise HTTPException(status_code=503, detail="Gemini API key not configured")
    return genai.Client(api_key=settings.gemini_api_key), settings


@router.post("/analyze", response_model=PricingResponse)
async def analyze_pricing(req: PricingRequest) -> PricingResponse:
    """Suggest a tuition band and comparable programs for the given course concept."""
    client, settings = _gemini_client()

    fields = [
        ("Course name", req.course_name),
        ("Course description", req.course_description),
        ("Course type", req.course_type),
        ("Course format", req.course_format),
        ("Intended audience(s)", req.intended_audiences),
        ("Duration", req.duration),
        ("Cumulative contact hours", req.contact_hours),
        ("Cohort size", req.cohort_size),
        ("Current draft tuition (if any)", req.current_tuition),
    ]
    context_block = "\n".join(f"  {label}: {value}" for label, value in fields if value.strip())

    user_text = (
        "COURSE UNDER REVIEW:\n"
        f"{context_block or '  (no details provided yet)'}\n\n"
        "Task: propose a defensible tuition band for this course based on comparable, "
        "publicly-offered university and professional-education programs. Focus on programs "
        "that match on FORMAT (in-person / virtual live / asynchronous), DURATION (mini-course, "
        "semester, year-long, certificate), and AUDIENCE (executives, mid-career practitioners, "
        "new-to-field, etc.). Cite real programs by name when you can — do not invent "
        "institutions.\n\n"
        "Return strict JSON with this shape:\n"
        "{\n"
        '  "suggested_range_low": "$X,XXX",\n'
        '  "suggested_range_high": "$Y,YYY",\n'
        '  "positioning_note": "1-3 sentences on where this course sits — premium / mid-market / accessible — and why, in plain language a faculty member can read.",\n'
        '  "comparables": [\n'
        '    { "program": "Program name", "institution": "Institution name",\n'
        '      "format": "in-person / virtual live / async / hybrid",\n'
        '      "duration": "e.g. 8 weeks, 40 contact hours",\n'
        '      "price_range": "$X,XXX-$Y,YYY (or single price if known)",\n'
        '      "why_comparable": "1 sentence on why this is a fair comparable" }\n'
        "  ],\n"
        '  "scenarios": [\n'
        '    { "label": "Accessible", "price": "$X,XXX",\n'
        '      "tradeoff": "who it opens up + what revenue tradeoff" },\n'
        '    { "label": "Mid-market", "price": "$Y,YYY", "tradeoff": "..." },\n'
        '    { "label": "Premium", "price": "$Z,ZZZ", "tradeoff": "..." }\n'
        "  ],\n"
        '  "caveats": "1-2 sentences noting these are estimates from public info, may be dated, and cohort economics matter."\n'
        "}\n\n"
        "Aim for 4-6 comparables. Aim for 3 scenarios."
    )

    try:
        response = client.models.generate_content(
            model=settings.gemini_model_flash,
            contents=user_text,
            config=types.GenerateContentConfig(
                system_instruction=_SYSTEM_INSTRUCTION,
                response_mime_type="application/json",
                temperature=0.5,
            ),
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("gemini pricing call failed")
        raise HTTPException(status_code=502, detail=f"Gemini error: {exc}") from exc

    text = (response.text or "").strip()
    try:
        data: dict[str, Any] = json.loads(text)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail=f"Gemini returned non-JSON: {text[:200]}") from exc

    comparables_raw = data.get("comparables") or []
    scenarios_raw = data.get("scenarios") or []

    comparables = [
        Comparable(
            program=str(c.get("program", ""))[:200],
            institution=str(c.get("institution", ""))[:200],
            format=str(c.get("format", ""))[:120],
            duration=str(c.get("duration", ""))[:120],
            price_range=str(c.get("price_range", ""))[:120],
            why_comparable=str(c.get("why_comparable", ""))[:400],
        )
        for c in comparables_raw[:8]
        if isinstance(c, dict) and c.get("program")
    ]

    scenarios = [
        PricingScenario(
            label=str(s.get("label", ""))[:60],
            price=str(s.get("price", ""))[:60],
            tradeoff=str(s.get("tradeoff", ""))[:400],
        )
        for s in scenarios_raw[:5]
        if isinstance(s, dict) and s.get("label")
    ]

    return PricingResponse(
        suggested_range_low=str(data.get("suggested_range_low", ""))[:60],
        suggested_range_high=str(data.get("suggested_range_high", ""))[:60],
        positioning_note=str(data.get("positioning_note", ""))[:1000],
        comparables=comparables,
        scenarios=scenarios,
        caveats=str(data.get("caveats", ""))[:500],
    )
