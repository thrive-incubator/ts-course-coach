"""Inline pedagogy coaching for course-proposal fields and modules."""

from __future__ import annotations

import io
import json
import logging
import re
from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
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


class ModuleReviewRequest(BaseModel):
    module: dict[str, Any]
    course_essential_question: str = ""
    course_context: dict[str, Any] = {}


class ModuleReviewResponse(BaseModel):
    strengths: list[str] = []
    gaps: list[str] = []
    suggestions: list[str] = []
    bloom_diagnosis: str = ""
    interactive_ideas: list[str] = []


class MaterialReviewResponse(BaseModel):
    summary: str = ""
    strengths: list[str] = []
    improvements: list[str] = []
    bloom_diagnosis: str = ""
    engagement_ideas: list[str] = []
    extracted_chars: int = 0


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
    "essential_question": (
        "Coach the faculty on their COURSE-LEVEL Essential Question. A strong essential "
        "question is: (a) open, not answerable with a fact; (b) provocative — it invites "
        "wrestling; (c) durable — worth returning to across many modules; (d) rooted in what "
        "makes the practitioner community actually change. Read the draft. If it's really a "
        "learning objective in disguise (starts with 'Understand…' or 'Know…'), name it and "
        "rewrite as a genuine question. Give 3 example essential questions tuned to this "
        "course's audience and topic, at varying levels of provocation."
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


def _module_system_instruction() -> str:
    return (
        "You are the Course Coach for Thrive Academy — a senior learning designer who reviews "
        "individual course modules with a pedagogy-first lens. You look at essential questions, "
        "learning objectives (Bloom's alignment), critical information, engagement, and "
        "interactive features together. You are warm, concrete, and specific. You never lecture. "
        "You never say 'consider adding…' — you show an example. Return valid JSON only."
    )


def _material_system_instruction() -> str:
    return (
        "You are the Course Coach for Thrive Academy reviewing a lesson-plan or slide deck a "
        "faculty member uploaded for a specific module. You read the extracted text and evaluate "
        "how it lands as a learning experience: Are learning objectives clear? Do activities go "
        "beyond passive consumption? Where does Bloom's stall at 'remember/understand'? What "
        "engagement moves could deepen learning? You are warm, concrete, non-preachy. Return "
        "valid JSON only."
    )


def _prompt_for(field: str) -> str:
    return FIELD_PROMPTS.get(field, _GENERIC_PROMPT)


def _gemini_client():
    settings = get_settings()
    if not settings.gemini_api_key:
        raise HTTPException(status_code=503, detail="Gemini API key not configured")
    return genai.Client(api_key=settings.gemini_api_key), settings


@router.post("", response_model=CoachResponse)
async def coach(req: CoachRequest) -> CoachResponse:
    """Return an inline coaching suggestion for a single proposal field."""
    client, settings = _gemini_client()

    field_prompt = _prompt_for(req.field)
    context_lines = "\n".join(f"  {k}: {v}" for k, v in (req.course_context or {}).items() if v)
    user_text = (
        f"Field: {req.field} (in section: {req.section})\n\n"
        f"Course context so far:\n{context_lines or '  (none yet)'}\n\n"
        f"Current draft of this field:\n---\n{req.current_value or '(empty — no draft yet)'}\n---\n\n"
        f"{field_prompt}\n\n"
        'Reply with strict JSON: {"suggestion": "...", "examples": ["...", "..."], "tone": "encouraging|challenging|celebratory"}'
    )

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
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return CoachResponse(suggestion=text[:1200] or "(no suggestion returned)", examples=[])

    return CoachResponse(
        suggestion=str(data.get("suggestion", ""))[:2000],
        examples=[str(e)[:500] for e in (data.get("examples") or [])][:5],
        tone=str(data.get("tone", "encouraging")),
    )


def _module_summary(mod: dict[str, Any]) -> str:
    objectives = mod.get("objectives") or []
    obj_lines = "\n".join(
        f"    - [{(o.get('bloom') or '?')}] {o.get('text') or '(blank)'}"
        for o in objectives
    ) or "    (none written yet)"
    features = ", ".join(mod.get("interactive_features") or []) or "(none selected)"
    return (
        f"Module name: {mod.get('module_name') or '(untitled)'}\n"
        f"Contact hours: {mod.get('contact_hours') or '?'}\n"
        f"Format: {mod.get('format') or '?'}\n"
        f"Module essential question: {mod.get('essential_question') or '(none written)'}\n"
        f"Learning objectives (with Bloom's level):\n{obj_lines}\n"
        f"Critical information: {mod.get('critical_information') or '(none)'}\n"
        f"Engagement opportunities: {mod.get('engagement_opportunities') or '(none)'}\n"
        f"Interactive features selected: {features}\n"
        f"Notes on interactive features: {mod.get('interactive_features_notes') or '(none)'}\n"
        f"Assignments: {mod.get('assignments') or '(none)'}\n"
    )


@router.post("/module", response_model=ModuleReviewResponse)
async def coach_module(req: ModuleReviewRequest) -> ModuleReviewResponse:
    """Holistic review of a single module in context of the course."""
    client, settings = _gemini_client()

    context_lines = "\n".join(f"  {k}: {v}" for k, v in (req.course_context or {}).items() if v)
    user_text = (
        f"COURSE CONTEXT:\n{context_lines or '  (none)'}\n\n"
        f"COURSE ESSENTIAL QUESTION: {req.course_essential_question or '(not yet written)'}\n\n"
        f"MODULE DRAFT:\n{_module_summary(req.module)}\n\n"
        "Review this module holistically. Focus on:\n"
        "  1) Does the module essential question ladder up to the course essential question?\n"
        "  2) Do the learning objectives use observable Bloom's verbs? Are they at appropriate levels?\n"
        "  3) Is 'critical information' concept-rich or just topic-listy?\n"
        "  4) Do engagement opportunities create wrestle, or is this passive consumption?\n"
        "  5) Do the selected interactive features (simulation, case study, generative chat, etc.) match the objectives?\n\n"
        "Return strict JSON with this shape:\n"
        "{\n"
        '  "strengths": ["2-4 specific things that are working — cite exact language when possible"],\n'
        '  "gaps": ["2-4 specific things missing or weak — be direct, not preachy"],\n'
        '  "suggestions": ["2-4 concrete moves the faculty could make this session"],\n'
        '  "bloom_diagnosis": "1-2 sentences on where objectives cluster on Bloom\'s and one specific rewrite showing sharper verbs",\n'
        '  "interactive_ideas": ["2-3 specific interactive-feature ideas grounded in THIS module\'s content"]\n'
        "}"
    )

    try:
        response = client.models.generate_content(
            model=settings.gemini_model_flash,
            contents=user_text,
            config=types.GenerateContentConfig(
                system_instruction=_module_system_instruction(),
                response_mime_type="application/json",
                temperature=0.6,
            ),
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("gemini module-review call failed")
        raise HTTPException(status_code=502, detail=f"Gemini error: {exc}") from exc

    text = (response.text or "").strip()
    try:
        data = json.loads(text)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail=f"Gemini returned non-JSON: {text[:200]}") from exc

    def _list(k: str, cap: int = 500, n: int = 6) -> list[str]:
        return [str(x)[:cap] for x in (data.get(k) or [])][:n]

    return ModuleReviewResponse(
        strengths=_list("strengths"),
        gaps=_list("gaps"),
        suggestions=_list("suggestions"),
        bloom_diagnosis=str(data.get("bloom_diagnosis", ""))[:1200],
        interactive_ideas=_list("interactive_ideas"),
    )


# ---- File extraction ---------------------------------------------------------

MAX_UPLOAD_BYTES = 15 * 1024 * 1024  # 15MB
MAX_TEXT_CHARS = 40000  # cap on what we send to Gemini


def _extract_pdf(data: bytes) -> str:
    from pypdf import PdfReader

    reader = PdfReader(io.BytesIO(data))
    parts: list[str] = []
    for page in reader.pages:
        try:
            parts.append(page.extract_text() or "")
        except Exception:  # noqa: BLE001
            continue
    return "\n\n".join(p for p in parts if p.strip())


def _extract_pptx(data: bytes) -> str:
    from pptx import Presentation

    prs = Presentation(io.BytesIO(data))
    slides: list[str] = []
    for i, slide in enumerate(prs.slides, start=1):
        chunks: list[str] = []
        for shape in slide.shapes:
            if not hasattr(shape, "text_frame"):
                continue
            if shape.has_text_frame:
                for para in shape.text_frame.paragraphs:
                    line = "".join(run.text for run in para.runs).strip()
                    if line:
                        chunks.append(line)
        try:
            notes = slide.notes_slide.notes_text_frame.text if slide.has_notes_slide else ""
        except Exception:  # noqa: BLE001
            notes = ""
        body = "\n".join(chunks)
        if notes:
            body += f"\n\n[Speaker notes]\n{notes}"
        slides.append(f"--- Slide {i} ---\n{body}")
    return "\n\n".join(slides)


def _extract_docx(data: bytes) -> str:
    from docx import Document

    doc = Document(io.BytesIO(data))
    parts: list[str] = []
    for para in doc.paragraphs:
        if para.text.strip():
            parts.append(para.text)
    for table in doc.tables:
        for row in table.rows:
            cells = [cell.text.strip() for cell in row.cells if cell.text.strip()]
            if cells:
                parts.append(" | ".join(cells))
    return "\n\n".join(parts)


def _extract_text(filename: str, data: bytes) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    try:
        if ext == "pdf":
            return _extract_pdf(data)
        if ext == "pptx":
            return _extract_pptx(data)
        if ext == "docx":
            return _extract_docx(data)
        if ext in {"txt", "md", "markdown"}:
            return data.decode("utf-8", errors="replace")
    except Exception as exc:  # noqa: BLE001
        logger.exception("text extraction failed for %s", filename)
        raise HTTPException(status_code=415, detail=f"Could not read {filename}: {exc}") from exc
    raise HTTPException(status_code=415, detail=f"Unsupported file type: .{ext or '?'}")


@router.post("/material", response_model=MaterialReviewResponse)
async def coach_material(
    file: UploadFile = File(...),
    module: str = Form("{}"),
    course_essential_question: str = Form(""),
    course_context: str = Form("{}"),
) -> MaterialReviewResponse:
    """Extract text from an uploaded lesson plan / slide deck and return coach feedback."""
    client, settings = _gemini_client()

    raw = await file.read()
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail=f"File too large: {len(raw)} bytes (max 15MB)")

    text = _extract_text(file.filename or "upload", raw)
    text = re.sub(r"\n{3,}", "\n\n", text).strip()
    if not text:
        raise HTTPException(status_code=422, detail="No readable text extracted from file")
    truncated = text[:MAX_TEXT_CHARS]
    was_truncated = len(text) > MAX_TEXT_CHARS

    try:
        module_dict = json.loads(module) if module else {}
        ctx_dict = json.loads(course_context) if course_context else {}
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail=f"Bad JSON in form field: {exc}") from exc

    context_lines = "\n".join(f"  {k}: {v}" for k, v in (ctx_dict or {}).items() if v)
    user_text = (
        f"COURSE CONTEXT:\n{context_lines or '  (none)'}\n\n"
        f"COURSE ESSENTIAL QUESTION: {course_essential_question or '(not yet written)'}\n\n"
        f"MODULE THIS MATERIAL IS FOR:\n{_module_summary(module_dict)}\n\n"
        f"UPLOADED MATERIAL: {file.filename}\n"
        f"{'(text truncated at 40k chars — reviewing what we could read)' if was_truncated else ''}\n"
        f"--- Extracted text ---\n{truncated}\n--- End of text ---\n\n"
        "Review this material as a coach would. Focus on whether it stretches learners "
        "beyond passive consumption, whether it lands the module's essential question, and "
        "where Bloom's is stalling.\n\n"
        "Return strict JSON with this shape:\n"
        "{\n"
        '  "summary": "1-2 sentence read of what this material is doing right now (not what it should do)",\n'
        '  "strengths": ["2-4 things the material does well — cite specific slides/sections when possible"],\n'
        '  "improvements": ["2-4 concrete pedagogy improvements — each specific enough to act on"],\n'
        '  "bloom_diagnosis": "1-2 sentences on where the material lives on Bloom\'s and how to push it up one level",\n'
        '  "engagement_ideas": ["2-3 specific engagement moves that would work with THIS content"]\n'
        "}"
    )

    try:
        response = client.models.generate_content(
            model=settings.gemini_model_flash,
            contents=user_text,
            config=types.GenerateContentConfig(
                system_instruction=_material_system_instruction(),
                response_mime_type="application/json",
                temperature=0.6,
            ),
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("gemini material-review call failed")
        raise HTTPException(status_code=502, detail=f"Gemini error: {exc}") from exc

    resp_text = (response.text or "").strip()
    try:
        data = json.loads(resp_text)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail=f"Gemini returned non-JSON: {resp_text[:200]}") from exc

    def _list(k: str, cap: int = 500, n: int = 6) -> list[str]:
        return [str(x)[:cap] for x in (data.get(k) or [])][:n]

    return MaterialReviewResponse(
        summary=str(data.get("summary", ""))[:1200],
        strengths=_list("strengths"),
        improvements=_list("improvements"),
        bloom_diagnosis=str(data.get("bloom_diagnosis", ""))[:1200],
        engagement_ideas=_list("engagement_ideas"),
        extracted_chars=len(text),
    )
