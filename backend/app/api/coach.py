"""Inline pedagogy coaching for course-proposal fields."""

from __future__ import annotations

import logging
from typing import Any

from fastapi import APIRouter, HTTPException
from google import genai
from google.genai import types
from pydantic import BaseModel

from app.core.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/coach", tags=["coach"])


class CoachRequest(BaseModel):
    section: str
    field: str
    current_value: str = ""
    course_context: dict[str, Any] = {}


class CoachResponse(BaseModel):
    suggestion: str
    examples: list[str] = []
    tone: str = "encouraging"


# ---- Field-specific coaching prompts ----------------------------------------
# Keep prompts short and grounded in innovative-pedagogy + marketing framing.

FIELD_PROMPTS: dict[str, str] = {
    "course_description": (
        "You are coaching a faculty member writing a course description for Thrive Academy. "
        "Read what they've written and offer one focused suggestion that improves clarity of "
        "value-to-learner AND that a prospective enrollee could scan in 15 seconds. "
        "If empty, propose a strong 2-3 sentence opener based on the course name and audience. "
        "Then offer 2 short example sentences they could remix."
    ),
    "needs_statement": (
        "You are coaching a faculty member on their Needs Statement. The best needs statements "
        "name a specific practitioner or systemic gap and cite (or gesture toward) evidence. "
        "Weak ones describe the topic instead of demand. Read the draft. If it's a topic "
        "description rather than a demand claim, say so plainly and rewrite one sentence to "
        "show the shape. If it's already strong, name one sharpening move. "
        "Give 2 example openers grounded in the course topic."
    ),
    "evidence_of_demand": (
        "Coach the faculty on Evidence of Demand. Strong evidence cites: prior waitlists, survey "
        "data, workforce reports, employer requests, or CEU-requirement changes. If the draft "
        "is vague, ask (in your suggestion) which of those sources they could add. "
        "Suggest 2 concrete evidence types that would fit this course topic."
    ),
    "competitive_landscape": (
        "Coach the faculty on Competitive Landscape. The trap is 'no competitors' — every "
        "learner has alternatives (a YouTube series, a $5K CEU program, a webinar). Push them "
        "to name 2-3 real alternatives and their positioning. Then help them articulate the "
        "distinct wedge Thrive Academy offers. Suggest 2 sample alternative-plus-differentiator lines."
    ),
    "recruitment_and_marketing": (
        "Coach the faculty on Recruitment & Marketing. Focus on: (1) where the audience already "
        "gathers (listservs, associations, LinkedIn groups, conferences), (2) the one line that "
        "would make someone in that audience stop scrolling, (3) proof points that unlock trust. "
        "Suggest 2 candidate one-liners tuned to the intended audience."
    ),
    "learning_objectives": (
        "Coach the faculty on Learning Objectives using Bloom's Revised Taxonomy. Objectives "
        "should start with an observable verb at the appropriate cognitive level "
        "(remember/understand/apply/analyze/evaluate/create). Read their draft. If any objective "
        "uses vague verbs ('know', 'understand', 'appreciate'), name it and rewrite one with a "
        "sharper Bloom's verb. Suggest 3 example objectives at varying Bloom levels for this course."
    ),
    "course_structure": (
        "Coach the faculty on Course Structure. Strong structures show how the learning journey "
        "arcs (foundational -> applied -> synthesized), match the format (async/sync/live), and "
        "surface where practice + feedback loops live. Give one specific structural suggestion "
        "based on the format and duration."
    ),
    "assessment_methods": (
        "Coach the faculty on Grading Scheme & Assessment. Innovative pedagogy favors: authentic "
        "assessments (real-world artifacts), formative feedback loops, peer review, and rubrics "
        "shared upfront. Ambient-lecture-plus-quiz is the weakest form. Suggest 2 assessment "
        "methods that would fit this course type and be more engaging than a final quiz."
    ),
    "student_support": (
        "Coach the faculty on Student Support. Faculty often under-describe support. Prompt them "
        "to name: office hours cadence, cohort community mechanisms (Slack? forum?), 1:1 access, "
        "and any TA/coach layer. Suggest 2 support elements that match the course format."
    ),
    "cqi": (
        "Coach the faculty on CQI & Staying Current. Ask them to name: mid-course pulse survey, "
        "end-of-cohort NPS, an update cadence for materials (quarterly? per-cohort?), and how "
        "they'll incorporate emergent research. Suggest 2 concrete CQI mechanisms."
    ),
    "financial_overview": (
        "Coach the faculty on Financial Overview. Ask: what's the tuition, cohort size, break-even "
        "cohort size, major cost drivers (faculty time, platform, marketing), and 3-cohort revenue "
        "projection? If any are missing, name them. If the plan feels thin, suggest one "
        "sensitivity to test (e.g., 'what if cohort fills at 70%?')."
    ),
}

_GENERIC_PROMPT = (
    "You are coaching a faculty member on their course proposal. Read the draft field content, "
    "consider the course context, and offer one focused, actionable suggestion that improves "
    "either pedagogical strength or marketability. Then offer 2 short examples they could remix."
)


def _system_instruction() -> str:
    return (
        "You are the Course Coach for Thrive Academy — an experienced learning designer + "
        "instructional marketer. Your voice is: warm, concise, concrete. You NEVER lecture. "
        "You give ONE main suggestion per response, then 2 short examples. You reference "
        "innovative-pedagogy principles (Bloom's, authentic assessment, active learning, "
        "cohort community) without name-dropping them mechanically. When marketing, you focus "
        "on audience-first framing, not feature lists. Return valid JSON only."
    )


def _prompt_for(field: str) -> str:
    return FIELD_PROMPTS.get(field, _GENERIC_PROMPT)


@router.post("", response_model=CoachResponse)
async def coach(req: CoachRequest) -> CoachResponse:
    """Return an inline coaching suggestion for a single proposal field."""
    settings = get_settings()
    if not settings.gemini_api_key:
        raise HTTPException(status_code=503, detail="Gemini API key not configured")

    field_prompt = _prompt_for(req.field)
    context_lines = "\n".join(f"  {k}: {v}" for k, v in (req.course_context or {}).items() if v)
    user_text = (
        f"Field: {req.field} (in section: {req.section})\n\n"
        f"Course context so far:\n{context_lines or '  (none yet)'}\n\n"
        f"Current draft of this field:\n---\n{req.current_value or '(empty — no draft yet)'}\n---\n\n"
        f"{field_prompt}\n\n"
        'Reply with strict JSON: {"suggestion": "...", "examples": ["...", "..."], "tone": "encouraging|challenging|celebratory"}'
    )

    client = genai.Client(api_key=settings.gemini_api_key)
    try:
        response = client.models.generate_content(
            model=settings.gemini_model_flash,
            contents=user_text,
            config=types.GenerateContentConfig(
                system_instruction=_system_instruction(),
                response_mime_type="application/json",
                temperature=0.7,
            ),
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("gemini coach call failed")
        raise HTTPException(status_code=502, detail=f"Gemini error: {exc}") from exc

    text = (response.text or "").strip()
    import json

    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return CoachResponse(suggestion=text[:1200] or "(no suggestion returned)", examples=[])

    return CoachResponse(
        suggestion=str(data.get("suggestion", ""))[:2000],
        examples=[str(e)[:500] for e in (data.get("examples") or [])][:5],
        tone=str(data.get("tone", "encouraging")),
    )
