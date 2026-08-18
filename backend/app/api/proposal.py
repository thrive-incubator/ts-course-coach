"""Marketing-brief generation + proposal export."""

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

router = APIRouter(prefix="/proposal", tags=["proposal"])


class Proposal(BaseModel):
    data: dict[str, Any]


class MarketingBrief(BaseModel):
    audience_personas: list[dict[str, str]]
    value_propositions: list[str]
    positioning_statement: str
    headlines: list[str]
    channels: list[dict[str, str]]
    social_copy: dict[str, str]
    subject_lines: list[str]


class ExportResponse(BaseModel):
    markdown: str


_BRIEF_SYSTEM = (
    "You are a senior instructional-marketing strategist for Thrive Academy — a CEU-accredited "
    "learning platform for early-childhood, mental-health, and workforce practitioners. You "
    "translate a course proposal into a launch-ready marketing brief. Be specific — no generic "
    "'lifelong learners' language. Ground everything in the course's actual audience and value. "
    "Return valid JSON only."
)


def _brief_prompt(proposal: dict[str, Any]) -> str:
    return (
        "Below is a faculty-drafted course proposal. Generate a launch-ready marketing brief.\n\n"
        f"PROPOSAL:\n{json.dumps(proposal, indent=2)}\n\n"
        "Return strict JSON with this shape:\n"
        "{\n"
        '  "audience_personas": [\n'
        '    {"name": "e.g. Mid-career IECMH consultant", "context": "1-sentence day-in-the-life", "trigger": "what makes them enroll now", "objection": "what they will hesitate on"}\n'
        "  ],  // 2-3 personas\n"
        '  "value_propositions": ["...", "...", "..."],  // 3 crisp value props, learner-outcome framed\n'
        '  "positioning_statement": "For [audience] who [struggle/goal], [Course Name] is the [category] that [distinct benefit], unlike [alternative]",\n'
        '  "headlines": ["...", "...", "...", "...", "..."],  // 5 headline options, varied angles\n'
        '  "channels": [\n'
        '    {"name": "e.g. Zero to Three listserv", "why": "why this audience is there", "message_angle": "how to pitch there"}\n'
        "  ],  // 4-6 concrete channels\n"
        '  "social_copy": {\n'
        '    "linkedin_post": "1 short LinkedIn post from the faculty voice",\n'
        '    "twitter_thread_opener": "1 hook tweet",\n'
        '    "instagram_caption": "1 IG caption"\n'
        "  },\n"
        '  "subject_lines": ["...", "...", "..."]  // 3 email subject lines\n'
        "}"
    )


@router.post("/marketing-brief", response_model=MarketingBrief)
async def marketing_brief(req: Proposal) -> MarketingBrief:
    """Turn a full course proposal into a launch-ready marketing brief."""
    settings = get_settings()
    if not settings.gemini_api_key:
        raise HTTPException(status_code=503, detail="Gemini API key not configured")

    client = genai.Client(api_key=settings.gemini_api_key)
    try:
        response = client.models.generate_content(
            model=settings.gemini_model_flash,
            contents=_brief_prompt(req.data),
            config=types.GenerateContentConfig(
                system_instruction=_BRIEF_SYSTEM,
                response_mime_type="application/json",
                temperature=0.6,
            ),
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("gemini brief call failed")
        raise HTTPException(status_code=502, detail=f"Gemini error: {exc}") from exc

    text = (response.text or "").strip()
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail=f"Gemini returned non-JSON: {text[:200]}") from exc

    return MarketingBrief(
        audience_personas=data.get("audience_personas", []),
        value_propositions=data.get("value_propositions", []),
        positioning_statement=data.get("positioning_statement", ""),
        headlines=data.get("headlines", []),
        channels=data.get("channels", []),
        social_copy=data.get("social_copy", {}),
        subject_lines=data.get("subject_lines", []),
    )


def _fmt(label: str, value: Any) -> str:
    if value is None or value == "":
        return f"**{label}:** _(not provided)_\n\n"
    if isinstance(value, list):
        if not value:
            return f"**{label}:** _(none)_\n\n"
        if isinstance(value[0], dict):
            rows = "\n".join(f"- " + ", ".join(f"{k}: {v}" for k, v in item.items()) for item in value)
            return f"**{label}:**\n{rows}\n\n"
        return f"**{label}:**\n" + "\n".join(f"- {v}" for v in value) + "\n\n"
    return f"**{label}:** {value}\n\n"


@router.post("/export", response_model=ExportResponse)
async def export_proposal(req: Proposal) -> ExportResponse:
    """Render the proposal as a clean markdown document."""
    p = req.data or {}
    course = p.get("course_overview", {}) or {}
    rationale = p.get("rationale", {}) or {}
    enrollment = p.get("enrollment", {}) or {}
    design = p.get("design", {}) or {}
    financials = p.get("financials", {}) or {}
    contact = p.get("primary_contact", {}) or {}

    md = f"# {course.get('course_name') or '(Untitled course)'}\n\n"
    md += f"*Course proposal — Thrive Academy*\n\n---\n\n"
    md += "## Primary Contact\n\n"
    md += _fmt("Name", contact.get("name"))
    md += _fmt("Email", contact.get("email"))

    md += "## 1. Course Overview\n\n"
    for label, key in [
        ("Course Name", "course_name"),
        ("Course Description", "course_description"),
        ("Course Type", "course_type"),
        ("Course Format", "course_format"),
        ("Faculty", "faculty"),
        ("Intended Audiences", "intended_audiences"),
        ("Cohort Size", "cohort_size"),
        ("Course Dates / Duration", "duration"),
        ("Cumulative Contact Hours", "contact_hours"),
        ("Tuition", "tuition"),
    ]:
        md += _fmt(label, course.get(key))

    md += "## 2. Course Rationale & Competitive Landscape\n\n"
    for label, key in [
        ("Needs Statement", "needs_statement"),
        ("Evidence of Demand", "evidence_of_demand"),
        ("Competitive Landscape", "competitive_landscape"),
    ]:
        md += _fmt(label, rationale.get(key))

    md += "## 3. Course Enrollment & Marketing\n\n"
    for label, key in [
        ("Recruitment and Marketing", "recruitment_and_marketing"),
        ("Admissions Criteria and Selection Process", "admissions_criteria"),
    ]:
        md += _fmt(label, enrollment.get(key))

    md += "## 4. Course Design\n\n"
    for label, key in [
        ("Learning Objectives", "learning_objectives"),
        ("Course Structure", "course_structure"),
        ("Technology Needs", "technology_needs"),
        ("Grading Scheme and Assessment Methods", "assessment_methods"),
        ("Student Support", "student_support"),
        ("Evaluation and Outcomes", "evaluation_outcomes"),
        ("CQI & Staying Current", "cqi"),
    ]:
        md += _fmt(label, design.get(key))

    outline = design.get("curriculum_outline") or []
    if outline:
        md += "### Preliminary Curriculum Outline\n\n"
        md += "| Module | Hours | Faculty | Format | Topics | Required Readings | Recommended | Assignments |\n"
        md += "|---|---|---|---|---|---|---|---|\n"
        for row in outline:
            cells = [
                str(row.get(k, "")).replace("|", "\\|").replace("\n", " ")
                for k in [
                    "module_name",
                    "contact_hours",
                    "faculty",
                    "format",
                    "topics",
                    "required_readings",
                    "recommended_readings",
                    "assignments",
                ]
            ]
            md += "| " + " | ".join(cells) + " |\n"
        md += "\n"

    md += "## 5. Financials\n\n"
    md += _fmt("Financial Overview / Business Plan", financials.get("financial_overview"))

    return ExportResponse(markdown=md)
