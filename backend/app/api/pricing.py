"""Pricing intelligence — comparable university-course benchmarking + recommended tuition band."""

from __future__ import annotations

import logging
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel, Field

from app.core.llm import generate_json

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
    program: str = Field(description="Program name")
    institution: str = Field(description="Institution name")
    format: str = Field(default="", description="in-person / virtual live / async / hybrid")
    duration: str = Field(default="", description="e.g. 8 weeks, 40 contact hours")
    price_range: str = Field(description="$X,XXX-$Y,YYY, or a single price if known")
    why_comparable: str = Field(description="1 sentence on why this is a fair comparable")


class PricingScenario(BaseModel):
    label: str = Field(description="Accessible / Mid-market / Premium")
    price: str = Field(description="$X,XXX")
    tradeoff: str = Field(description="who it opens up + what revenue tradeoff")


class PricingResponse(BaseModel):
    suggested_range_low: str = Field(description="Display string, e.g. $850")
    suggested_range_high: str = Field(description="Display string, e.g. $1,500")
    suggested_low_usd: int = Field(default=0, description="Same low bound as a whole-dollar integer")
    suggested_high_usd: int = Field(default=0, description="Same high bound as a whole-dollar integer")
    positioning_note: str = Field(
        description="1-3 sentences on where this course sits — premium / mid-market / accessible — "
        "and why, in plain language a faculty member can read."
    )
    missing_inputs: list[str] = Field(
        default_factory=list,
        description="Course details that were blank and would change the recommendation "
        "(e.g. 'course format', 'duration'). Empty if enough was provided.",
    )
    comparables: list[Comparable] = Field(default_factory=list, description="4-6 comparables")
    scenarios: list[PricingScenario] = Field(default_factory=list, description="3 scenarios")
    caveats: str = Field(
        default="",
        description="1-2 sentences noting these are estimates from public info, may be dated, "
        "and cohort economics matter.",
    )


# The benchmark lives in a file so the person who owns pricing can edit it without
# opening Python. Its text is injected verbatim; the file's modification date is
# appended so the model (and the log) know how fresh it is.
_BENCHMARK_PATH = Path(__file__).resolve().parent.parent / "prompts" / "pricing_benchmark.md"


def _benchmark_text() -> str:
    try:
        text = _BENCHMARK_PATH.read_text(encoding="utf-8")
        updated = datetime.fromtimestamp(_BENCHMARK_PATH.stat().st_mtime).strftime("%d %b %Y")
        return f"{text.rstrip()}\n(Benchmark file last updated: {updated}.)\n"
    except OSError:
        logger.exception("pricing benchmark file missing: %s", _BENCHMARK_PATH)
        return "(Benchmark data unavailable — rely only on well-known, publicly offered programs.)\n"


def _system_instruction() -> str:
    return (
        "You are a pricing analyst for Thrive Academy — a Georgetown-affiliated adult / "
        "professional-education incubator. You have been given the Thrive Academy Course Pricing "
        "Benchmark (below), compiled August 2026 from published provider rates. TREAT THIS "
        "BENCHMARK AS YOUR PRIMARY SOURCE — pull comparables and summary ranges from it whenever "
        "the course under review matches. Only supplement with programs outside this list when "
        "the course clearly matches nothing in the benchmark; when you do, cite real, publicly-"
        "offered programs and never invent institutions.\n\n"
        f"{_benchmark_text()}\n"
        "When you propose a tuition band, anchor it to the benchmark's summary ranges for the "
        "matching format (async / virtual synchronous / in-person) and duration (hourly / multi-"
        "week). Cite specific benchmark programs in your comparables list, and pull their format, "
        "duration, and price exactly as written above. Flag if the course's audience shifts the "
        "band up (executive / corporate) or down (K–12 teachers).\n\n"
        "If the course format or duration is missing, say so in missing_inputs, widen the band, "
        "and keep the positioning note tentative. Return valid JSON only."
    )


@router.post("/analyze", response_model=PricingResponse)
async def analyze_pricing(req: PricingRequest) -> PricingResponse:
    """Suggest a tuition band and comparable programs for the given course concept."""
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
        "Give the suggested range both as display strings and as whole-dollar integers "
        "(suggested_low_usd / suggested_high_usd). Aim for 4-6 comparables and exactly 3 "
        "scenarios labelled Accessible, Mid-market, Premium."
    )

    result = await generate_json(
        endpoint="pricing/analyze",
        system=_system_instruction(),
        contents=user_text,
        schema=PricingResponse,
        temperature=0.5,
    )
    result.comparables = result.comparables[:8]
    result.scenarios = result.scenarios[:5]
    return result
