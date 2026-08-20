"""Marketing-brief generation, proposal export, and save/resume."""

from __future__ import annotations

import json
import logging
import re
import secrets
import time
from pathlib import Path
from typing import Any

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from google import genai
from google.genai import types
from pydantic import BaseModel

from app.api.coach import MAX_TEXT_CHARS, MAX_UPLOAD_BYTES, _extract_text
from app.core.config import get_settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/proposal", tags=["proposal"])


class Proposal(BaseModel):
    data: dict[str, Any]


class SaveRequest(BaseModel):
    id: str | None = None
    data: dict[str, Any]


class SaveResponse(BaseModel):
    id: str


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


class ImportResponse(BaseModel):
    imported: dict[str, Any]
    fields_extracted: list[str]
    extracted_chars: int


# ---- Save & resume ---------------------------------------------------------

STORAGE_DIR = Path("./data/proposals")
ID_RE = re.compile(r"^[A-Za-z0-9_-]{6,64}$")


def _storage_path(proposal_id: str) -> Path:
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    return STORAGE_DIR / f"{proposal_id}.json"


@router.post("/save", response_model=SaveResponse)
async def save_proposal(req: SaveRequest) -> SaveResponse:
    """Persist a proposal to the server and return its id.

    Provide the existing id to update; omit to mint a new one. Payload is
    stored as-is on the filesystem; ids are opaque tokens (treat like share URLs).
    """
    if req.id and not ID_RE.match(req.id):
        raise HTTPException(status_code=400, detail="Invalid id shape")

    proposal_id = req.id or secrets.token_urlsafe(9)
    if not ID_RE.match(proposal_id):
        # secrets.token_urlsafe uses url-safe chars; sanity-check.
        raise HTTPException(status_code=500, detail="Generated id failed validation")

    payload = {
        "id": proposal_id,
        "updated_at": int(time.time()),
        "data": req.data,
    }
    try:
        _storage_path(proposal_id).write_text(json.dumps(payload, ensure_ascii=False))
    except OSError as exc:
        logger.exception("proposal save failed")
        raise HTTPException(status_code=500, detail=f"Save failed: {exc}") from exc

    return SaveResponse(id=proposal_id)


@router.get("/load/{proposal_id}")
async def load_proposal(proposal_id: str) -> dict[str, Any]:
    if not ID_RE.match(proposal_id):
        raise HTTPException(status_code=400, detail="Invalid id shape")
    path = _storage_path(proposal_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail="Proposal not found")
    try:
        payload = json.loads(path.read_text())
    except (OSError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=500, detail=f"Load failed: {exc}") from exc
    return payload.get("data", {})


# ---- Marketing brief ------------------------------------------------------

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


# ---- Export ---------------------------------------------------------------


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


def _render_module(idx: int, mod: dict[str, Any]) -> str:
    lines: list[str] = []
    name = mod.get("module_name") or f"Module {idx}"
    lines.append(f"### Module {idx}: {name}\n")
    meta_bits: list[str] = []
    if mod.get("contact_hours"):
        meta_bits.append(f"{mod['contact_hours']} contact hours")
    if mod.get("format"):
        meta_bits.append(mod["format"])
    if mod.get("faculty"):
        meta_bits.append(f"Faculty: {mod['faculty']}")
    if meta_bits:
        lines.append("_" + " · ".join(meta_bits) + "_\n")

    if mod.get("essential_question"):
        lines.append(f"**Essential question.** {mod['essential_question']}\n")

    objectives = mod.get("objectives") or []
    if objectives:
        lines.append("**Learning objectives.**")
        for o in objectives:
            bloom = o.get("bloom") or "—"
            text = o.get("text") or ""
            lines.append(f"- _[{bloom}]_ {text}")
        lines.append("")

    if mod.get("critical_information"):
        lines.append(f"**Critical information.**\n{mod['critical_information']}\n")

    if mod.get("engagement_opportunities"):
        lines.append(f"**Opportunities for engagement.**\n{mod['engagement_opportunities']}\n")

    features = mod.get("interactive_features") or []
    if features or mod.get("interactive_features_notes"):
        feature_line = "**Interactive features.** " + (
            ", ".join(features) if features else "(none selected)"
        )
        lines.append(feature_line)
        if mod.get("interactive_features_notes"):
            lines.append(mod["interactive_features_notes"])
        lines.append("")

    if mod.get("required_readings"):
        lines.append(f"**Required readings.** {mod['required_readings']}\n")
    if mod.get("recommended_readings"):
        lines.append(f"**Recommended readings.** {mod['recommended_readings']}\n")
    if mod.get("assignments"):
        lines.append(f"**Assignments.** {mod['assignments']}\n")

    materials = mod.get("materials") or []
    if materials:
        lines.append("**Uploaded materials (with coach feedback).**")
        for mat in materials:
            fname = mat.get("filename") or "(file)"
            lines.append(f"- {fname}")
            if mat.get("feedback"):
                # Indent the feedback under the file.
                for fline in str(mat["feedback"]).splitlines():
                    lines.append(f"  > {fline}")
        lines.append("")

    return "\n".join(lines) + "\n"


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
    md += _fmt("Course Essential Question", design.get("essential_question"))
    md += _fmt("Course-Level Learning Objectives", design.get("learning_objectives"))
    md += _fmt("Course Structure / Arc", design.get("course_structure"))

    modules = design.get("modules") or []
    if modules:
        md += "### Modules\n\n"
        for i, mod in enumerate(modules, start=1):
            md += _render_module(i, mod)

    for label, key in [
        ("Technology Needs", "technology_needs"),
        ("Grading Scheme and Assessment Methods", "assessment_methods"),
        ("Student Support", "student_support"),
        ("Evaluation and Outcomes", "evaluation_outcomes"),
        ("CQI & Staying Current", "cqi"),
    ]:
        md += _fmt(label, design.get(key))

    md += "## 5. Financials\n\n"
    md += _fmt("Financial Overview / Business Plan", financials.get("financial_overview"))

    return ExportResponse(markdown=md)


# ---- Import from Course Conceptualization Tool ----------------------------

_IMPORT_SYSTEM = (
    "You extract structured course-proposal data from a Thrive Academy 'Course "
    "Conceptualization Tool' response that a faculty member submitted (or from their "
    "raw course notes). Preserve the faculty member's exact wording — do not rewrite, "
    "summarize, or invent content. If a field is not present, leave it as an empty "
    "string. Return valid JSON only."
)


def _import_prompt(text: str) -> str:
    return (
        "Below is the extracted text from a completed Course Conceptualization form "
        "(or faculty course notes). Map the content into the JSON schema shown. "
        "Preserve wording verbatim in each field (do not paraphrase). If a field is "
        "not present in the text, use an empty string ''. Do not invent content.\n\n"
        f"EXTRACTED TEXT:\n---\n{text}\n---\n\n"
        "Notes on specific fields:\n"
        "  - course_type: pick the exact label from the form when present: "
        "'Year-Long Certificate Course', 'Semester-Long Certificate Course', "
        "'Mini-Course', 'Microlearning Course', or the faculty's 'Other' answer verbatim.\n"
        "  - course_format: comma-separated list of the selected formats from: "
        "'In-Person Synchronous', 'Virtual Synchronous', 'Asynchronous', plus any 'Other' verbatim.\n"
        "  - primary_thrive_domain, if present, should be appended to course_description as "
        "'(Primary Thrive Domain: <domain>)' so it isn't lost.\n"
        "  - 'Anything Else' content, if present, should be appended to competitive_landscape "
        "as a new paragraph prefixed 'Additional notes: '.\n\n"
        "Return strict JSON with this shape:\n"
        "{\n"
        '  "primary_contact": {"name": "", "email": ""},\n'
        '  "course_overview": {\n'
        '    "course_name": "",\n'
        '    "course_description": "",\n'
        '    "course_type": "",\n'
        '    "course_format": "",\n'
        '    "faculty": "",\n'
        '    "intended_audiences": "",\n'
        '    "cohort_size": "",\n'
        '    "duration": "",\n'
        '    "contact_hours": "",\n'
        '    "tuition": ""\n'
        "  },\n"
        '  "rationale": {\n'
        '    "needs_statement": "",\n'
        '    "evidence_of_demand": "",\n'
        '    "competitive_landscape": ""\n'
        "  }\n"
        "}"
    )


_ALLOWED_CONTACT = {"name", "email"}
_ALLOWED_OVERVIEW = {
    "course_name", "course_description", "course_type", "course_format",
    "faculty", "intended_audiences", "cohort_size", "duration",
    "contact_hours", "tuition",
}
_ALLOWED_RATIONALE = {"needs_statement", "evidence_of_demand", "competitive_landscape"}


def _filter_section(section: Any, allowed: set[str]) -> dict[str, str]:
    if not isinstance(section, dict):
        return {}
    out: dict[str, str] = {}
    for k, v in section.items():
        if k in allowed and isinstance(v, (str, int, float)) and str(v).strip():
            out[k] = str(v).strip()
    return out


@router.post("/import", response_model=ImportResponse)
async def import_proposal(
    file: UploadFile | None = File(None),
    text: str = Form(""),
) -> ImportResponse:
    """Parse a completed Course Conceptualization form (file upload or pasted text) into proposal fields."""
    settings = get_settings()
    if not settings.gemini_api_key:
        raise HTTPException(status_code=503, detail="Gemini API key not configured")

    body_text = text or ""
    if file is not None and file.filename:
        raw = await file.read()
        if len(raw) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail=f"File too large: {len(raw)} bytes (max 15MB)")
        body_text = _extract_text(file.filename, raw)

    body_text = re.sub(r"\n{3,}", "\n\n", body_text or "").strip()
    if not body_text:
        raise HTTPException(status_code=422, detail="No text found to import — upload a file or paste content.")

    truncated = body_text[:MAX_TEXT_CHARS]

    client = genai.Client(api_key=settings.gemini_api_key)
    try:
        response = client.models.generate_content(
            model=settings.gemini_model_flash,
            contents=_import_prompt(truncated),
            config=types.GenerateContentConfig(
                system_instruction=_IMPORT_SYSTEM,
                response_mime_type="application/json",
                temperature=0.1,
            ),
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("gemini import call failed")
        raise HTTPException(status_code=502, detail=f"Gemini error: {exc}") from exc

    resp_text = (response.text or "").strip()
    try:
        data = json.loads(resp_text)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail=f"Gemini returned non-JSON: {resp_text[:200]}") from exc

    imported: dict[str, Any] = {}
    fields_extracted: list[str] = []

    contact = _filter_section(data.get("primary_contact"), _ALLOWED_CONTACT)
    if contact:
        imported["primary_contact"] = contact
        fields_extracted.extend(f"primary_contact.{k}" for k in contact)

    overview = _filter_section(data.get("course_overview"), _ALLOWED_OVERVIEW)
    if overview:
        imported["course_overview"] = overview
        fields_extracted.extend(f"course_overview.{k}" for k in overview)

    rationale = _filter_section(data.get("rationale"), _ALLOWED_RATIONALE)
    if rationale:
        imported["rationale"] = rationale
        fields_extracted.extend(f"rationale.{k}" for k in rationale)

    return ImportResponse(
        imported=imported,
        fields_extracted=fields_extracted,
        extracted_chars=len(body_text),
    )
