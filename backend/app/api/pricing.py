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


_BENCHMARK_DATA = """
THRIVE ACADEMY COURSE PRICING BENCHMARK (compiled Aug 2026 from published provider rates).
These are the CANONICAL comparables — prefer them over anything else you know. Only reach
outside this list when the course clearly matches none of these formats.

--- HOURLY / SHORT-DURATION COURSES ---
- College Board AP Summer Institute (via Northwestern): virtual, 30 hrs, $730 (~$24/hr).
  Content-heavy, credit-adjacent hourly anchor.
- Univ. of Oklahoma — Training & Development cert.: in-person, 4 days (32 hrs), $1,795 (~$56/hr).
- Michigan State — Workplace Investigations cert.: live online, 2 × 4-hr (8 hrs), $1,200 (~$150/hr).
- MIT Professional Education — short courses: classroom or live virtual, $1,050–$5,850
  (~$900–$1,000/day).
- Market guidance — half-day intensive (any format): $99–$249.
- Market guidance — full-day masterclass (any format): $199–$499.
Note: university-affiliated offerings sit at or above the top of independent-provider ranges.
Independent 60–90 min sessions run $29–$49; universities price higher for the same duration.

--- VIRTUAL ASYNCHRONOUS (self-paced) — the lowest-priced format ---
- Idaho State University — self-paced teacher PD: 3-credit, 8-module async course, $165.
- University of Phoenix — CE for teachers: from $175/credit.
- Market range — paid CE courses: $20–$495 depending on topic/credits.
- Market sweet spot — non-credit CE: $59–$79 per standalone course.
Pattern: online courses and webinars are the most affordable; in-person workshops and
credit-bearing university courses cost significantly more for equivalent content.

--- VIRTUAL SYNCHRONOUS (live online, cohort-based) — premium over async ---
- USC iSchool — Certificate in Library Studies: 5-month cohort, monthly live mtgs, non-credit, $495.
- CU Denver — ECE Coaching Certificate: online + weekly synchronous Zoom, per 3-cr course, $1,440.
- MIT Executive — online certificate course: 6 weeks, 6–8 hrs/week, $3,250.
- MIT Executive — live online intensive: 2 days, 8 hrs/day, $4,900.
Non-credit cohort programs stay in the hundreds; credit-bearing or executive offerings
scale into the thousands.

--- SEMESTER- / YEAR-LONG PROFESSIONAL DEVELOPMENT PROGRAMS ---
- USC iSchool — Library Studies (5 months, non-credit cohort): $495.
- University of Georgia — instructional design cert. (university budget pick): ~$1,600.
- University of Illinois — ID MasterTrack (credit toward a master's): ~$2,384.
- ATD — Instructional Design Certificate: 21 hrs, live online / in person, $2,245–$2,545.
- CU Denver — coaching certificate (3 courses, credit-bearing): $1,440 per 3-cr course.
Per-credit tuition range: roughly $180/credit (Florida State, in-state online) up to
$480/credit (CU Denver's $1,440 per 3-credit course).

--- SUMMARY RANGES TO PRICE AGAINST ---
- Live in-person synchronous — short/hourly: ~$56–$150/hr.
  Live in-person synchronous — multi-week/program: $500–$1,800 multi-day intensives.
- Virtual synchronous — short/hourly: ~$150/hr for short live.
  Virtual synchronous — multi-week/program: $1,400–$3,250 per cohort course.
- Virtual asynchronous — short/hourly: $20–$495 per course.
  Virtual asynchronous — multi-week/program: $55–$175 per credit; $59–$79 CE sweet spot.

--- KEY PRICING DRIVERS ---
- Credit-bearing vs. non-credit is the single biggest price driver.
- CEUs / licensure / certification value: courses satisfying renewal or credentialing
  requirements support higher prices.
- Target audience: K–12 teachers pay far less than corporate or executive professionals for
  the same format.
- Delivery cost: live instructor time and small cohorts justify a premium over self-paced.
"""


_SYSTEM_INSTRUCTION = (
    "You are a pricing analyst for Thrive Academy — a Georgetown-affiliated adult / "
    "professional-education incubator. You have been given the Thrive Academy Course Pricing "
    "Benchmark (below), compiled August 2026 from published provider rates. TREAT THIS "
    "BENCHMARK AS YOUR PRIMARY SOURCE — pull comparables and summary ranges from it whenever "
    "the course under review matches. Only supplement with programs outside this list when "
    "the course clearly matches nothing in the benchmark; when you do, cite real, publicly-"
    "offered programs and never invent institutions.\n\n"
    f"{_BENCHMARK_DATA}\n"
    "When you propose a tuition band, anchor it to the benchmark's summary ranges for the "
    "matching format (async / virtual synchronous / in-person) and duration (hourly / multi-"
    "week). Cite specific benchmark programs in your comparables list, and pull their format, "
    "duration, and price exactly as written above. Flag if the course's audience shifts the "
    "band up (executive / corporate) or down (K–12 teachers).\n\n"
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
