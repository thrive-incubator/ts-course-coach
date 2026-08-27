"""Marketing-brief generation, proposal export, and save/resume."""

from __future__ import annotations

import json
import logging
import re
import secrets
import time
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel, Field

from app.api.auth import add_proposal_to_user, get_current_email
from app.api.coach import MAX_TEXT_CHARS, MAX_UPLOAD_BYTES, _extract_text
from app.core.llm import generate_json

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/proposal", tags=["proposal"])


class Proposal(BaseModel):
    data: dict[str, Any]


class SaveRequest(BaseModel):
    id: str | None = None
    data: dict[str, Any]


class SaveResponse(BaseModel):
    id: str


class Persona(BaseModel):
    name: str = Field(description="e.g. Mid-career IECMH consultant")
    context: str = Field(description="1-sentence day-in-the-life")
    trigger: str = Field(description="what makes them enroll now")
    objection: str = Field(description="what they will hesitate on")


class ChannelIdea(BaseModel):
    name: str = Field(description="e.g. Zero to Three listserv")
    why: str = Field(description="why this audience is there")
    message_angle: str = Field(description="how to pitch there")


class SocialCopy(BaseModel):
    linkedin_post: str = Field(default="", description="1 short LinkedIn post in the faculty voice")
    twitter_thread_opener: str = Field(default="", description="1 hook post for X/Twitter")
    instagram_caption: str = Field(default="", description="1 Instagram caption")


class MarketingBrief(BaseModel):
    audience_personas: list[Persona] = Field(default_factory=list, description="2-3 personas")
    value_propositions: list[str] = Field(default_factory=list, description="3 crisp value props, learner-outcome framed")
    positioning_statement: str = Field(
        default="",
        description="For [audience] who [struggle/goal], [Course Name] is the [category] that [distinct benefit], unlike [alternative]",
    )
    headlines: list[str] = Field(default_factory=list, description="5 headline options, varied angles")
    channels: list[ChannelIdea] = Field(default_factory=list, description="4-6 concrete channels")
    social_copy: SocialCopy = Field(default_factory=SocialCopy)
    subject_lines: list[str] = Field(default_factory=list, description="3 email subject lines")


class ExportResponse(BaseModel):
    markdown: str


class ImportResponse(BaseModel):
    imported: dict[str, Any]
    fields_extracted: list[str]
    inferred_fields: list[str] = []
    extracted_chars: int


# ---- Save & resume ---------------------------------------------------------

STORAGE_DIR = Path("./data/proposals")
ID_RE = re.compile(r"^[A-Za-z0-9_-]{6,64}$")


def _storage_path(proposal_id: str) -> Path:
    STORAGE_DIR.mkdir(parents=True, exist_ok=True)
    return STORAGE_DIR / f"{proposal_id}.json"


@router.post("/save", response_model=SaveResponse)
async def save_proposal(
    req: SaveRequest,
    signed_in_email: str | None = Depends(get_current_email),
) -> SaveResponse:
    """Persist a proposal to the server and return its id.

    Provide the existing id to update; omit to mint a new one. Payload is
    stored as-is on the filesystem; ids are opaque tokens (treat like share URLs).
    If the caller is signed in (Bearer token), the proposal is also associated
    with their email so it shows up in "My proposals" on any device they use.
    """
    if req.id and not ID_RE.match(req.id):
        raise HTTPException(status_code=400, detail="Invalid id shape")

    proposal_id = req.id or secrets.token_urlsafe(9)
    if not ID_RE.match(proposal_id):
        # secrets.token_urlsafe uses url-safe chars; sanity-check.
        raise HTTPException(status_code=500, detail="Generated id failed validation")

    # Preserve owner across updates: if the file already has an owner and the
    # current caller isn't that owner, keep the original owner.
    owner_email: str | None = signed_in_email
    existing_path = _storage_path(proposal_id)
    if existing_path.exists():
        try:
            existing = json.loads(existing_path.read_text())
            prior_owner = existing.get("owner_email")
            if isinstance(prior_owner, str) and prior_owner:
                owner_email = prior_owner
        except (OSError, json.JSONDecodeError):
            pass

    payload = {
        "id": proposal_id,
        "updated_at": int(time.time()),
        "owner_email": owner_email,
        "data": req.data,
    }
    try:
        existing_path.write_text(json.dumps(payload, ensure_ascii=False))
    except OSError as exc:
        logger.exception("proposal save failed")
        raise HTTPException(status_code=500, detail=f"Save failed: {exc}") from exc

    if signed_in_email:
        try:
            add_proposal_to_user(signed_in_email, proposal_id)
        except Exception:  # noqa: BLE001
            logger.exception("failed to associate proposal %s with user", proposal_id)

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
    "The proposal's own intended audience, needs statement and competitive landscape take "
    "precedence over any general assumption about who Thrive serves; if the course is for a "
    "different audience, follow the course. Return valid JSON only."
)


def _render_for_brief(p: dict[str, Any]) -> str:
    """Marketing-relevant subset of the proposal as labelled prose (not a raw JSON dump)."""
    course = p.get("course_overview", {}) or {}
    rationale = p.get("rationale", {}) or {}
    enrollment = p.get("enrollment", {}) or {}
    design = p.get("design", {}) or {}
    modules = design.get("modules") or []

    def line(label: str, value: Any) -> str:
        v = str(value or "").strip()
        return f"{label}: {v}\n" if v else ""

    out = ""
    out += line("Course name", course.get("course_name"))
    out += line("Description", course.get("course_description"))
    out += line("Type", " / ".join(x for x in [course.get("course_type"), course.get("course_type_other")] if x))
    out += line("Format", " / ".join(x for x in [course.get("course_format"), course.get("course_format_other")] if x))
    out += line("Faculty", course.get("faculty"))
    out += line("Intended audiences", course.get("intended_audiences"))
    out += line("Duration", course.get("duration"))
    out += line("Contact hours", course.get("contact_hours"))
    out += line("Cohort size", course.get("cohort_size"))
    out += line("Tuition", course.get("tuition"))
    out += "\n"
    out += line("Needs statement", rationale.get("needs_statement"))
    out += line("Evidence of demand", rationale.get("evidence_of_demand"))
    out += line("Competitive landscape", rationale.get("competitive_landscape"))
    out += line("Additional notes", rationale.get("additional_notes"))
    recruitment_val = enrollment.get("recruitment") or enrollment.get("recruitment_and_marketing")
    out += line("Recruitment plan so far (where to reach the audience)", recruitment_val)
    out += line("Marketing plan so far (message + proof points)", enrollment.get("marketing"))
    out += line("Admissions criteria", enrollment.get("admissions_criteria"))
    out += "\n"
    out += line("Course essential question", design.get("essential_question"))
    out += line("Course-level learning objectives", design.get("learning_objectives"))
    out += line("Course structure", design.get("course_structure"))
    out += line("Assessment", design.get("assessment_methods"))
    if modules:
        names = [
            f"{i}. {m.get('module_name') or '(untitled)'}"
            + (f" ({m.get('contact_hours')} hrs)" if m.get("contact_hours") else "")
            for i, m in enumerate(modules, start=1)
        ]
        out += "Modules:\n  " + "\n  ".join(names) + "\n"
    return out.strip() or "(proposal is empty so far)"


def _brief_prompt(proposal: dict[str, Any]) -> str:
    return (
        "Below is a faculty-drafted course proposal. Generate a launch-ready marketing brief.\n\n"
        f"PROPOSAL:\n{_render_for_brief(proposal)}\n\n"
        "Return strict JSON with: audience_personas (2-3, each with name / context / trigger / "
        "objection), value_propositions (3, learner-outcome framed), positioning_statement "
        "('For [audience] who [struggle/goal], [Course Name] is the [category] that [distinct "
        "benefit], unlike [alternative]'), headlines (5, varied angles), channels (4-6 concrete "
        "places this audience already is, each with name / why / message_angle), social_copy "
        "(linkedin_post, twitter_thread_opener, instagram_caption) and subject_lines (3). "
        "Pick channels for THIS course's audience — e.g. a professional association listserv, a "
        "state chapter newsletter, a LinkedIn group — not generic ones."
    )


@router.post("/marketing-brief", response_model=MarketingBrief)
async def marketing_brief(req: Proposal) -> MarketingBrief:
    """Turn a full course proposal into a launch-ready marketing brief."""
    return await generate_json(
        endpoint="proposal/marketing-brief",
        system=_BRIEF_SYSTEM,
        contents=_brief_prompt(req.data),
        schema=MarketingBrief,
        temperature=0.6,
    )


# ---- Marketing package (AI-drafted from faculty's content) ----------------

_PACKAGE_SYSTEM = (
    "You are a senior instructional-marketing writer for Thrive Academy — a CEU-accredited "
    "learning platform for early-childhood, mental-health, and workforce practitioners. "
    "You are drafting a complete launch kit for a specific course, using ONLY the content "
    "the faculty member has provided in their proposal (course overview, needs statement, "
    "essential question, module outlines, uploaded conceptualization notes, talking points). "
    "Every claim, outcome, format detail, and audience descriptor must be traceable to what "
    "the faculty wrote. Never invent faculty credentials, endorsements, partner organizations, "
    "or outcomes the proposal does not state. If the proposal is thin on a required element, "
    "use a short bracketed placeholder like [Faculty to add specific example] rather than "
    "fabricating. Write in a warm, confident, human voice — no marketing cliches, no hype, "
    "no em dashes (rewrite any sentence that would need one). Return valid JSON only."
)


class OnePager(BaseModel):
    headline: str = Field(description="6-10 word hook that names the audience and the shift")
    subhead: str = Field(description="1 sentence, 15-25 words, that expands the hook")
    elevator_pitch: str = Field(description="2-4 sentences summarizing why this course exists and what learners walk away with")
    who_its_for: list[str] = Field(default_factory=list, description="3-5 short bullet descriptors of the ideal learner")
    what_youll_leave_with: list[str] = Field(default_factory=list, description="4-6 concrete outcomes / capabilities, learner-first phrasing")
    format_and_dates: str = Field(default="", description="Format, duration, contact-hours summary as one line")
    tuition_line: str = Field(default="", description="Single line covering tuition and any payment / scholarship note")
    faculty_line: str = Field(default="", description="1-2 sentence faculty introduction pulled from the proposal")
    why_now: str = Field(default="", description="1-2 sentence urgency framing rooted in the needs statement")
    cta: str = Field(default="", description="Direct call-to-action line ending in Apply / Register / Contact")


class ChannelDraft(BaseModel):
    channel: str = Field(description="LinkedIn | X/Twitter | Facebook | Instagram | Flyer")
    body: str = Field(description="Full post copy tuned to the channel's norms and length")
    length_note: str = Field(default="", description="One-line reminder about the channel's cadence or use case")


class InfoSessionOutline(BaseModel):
    title: str = ""
    duration_minutes: int = Field(default=45, description="Suggested session length")
    agenda: list[str] = Field(default_factory=list, description="Ordered agenda items with time allotments")
    talking_points: list[str] = Field(default_factory=list, description="4-6 anchor talking points the presenter should hit")
    audience_questions: list[str] = Field(default_factory=list, description="3-5 questions the presenter should anticipate")


class AnnouncementEmail(BaseModel):
    subject: str = Field(description="Email subject line, 6-10 words")
    preview: str = Field(default="", description="Short preview text (30-90 chars)")
    body: str = Field(description="Full email body, Constant-Contact style, plain text with paragraph breaks")


class FaqEntry(BaseModel):
    question: str
    answer: str


class MarketingPackage(BaseModel):
    one_pager: OnePager = Field(default_factory=OnePager)
    channel_drafts: list[ChannelDraft] = Field(default_factory=list, description="LinkedIn, X/Twitter, Facebook, Instagram, Flyer")
    info_session: InfoSessionOutline = Field(default_factory=InfoSessionOutline)
    announcement_email: AnnouncementEmail = Field(default_factory=lambda: AnnouncementEmail(subject="", body=""))
    georgetown_snippet: str = Field(default="", description="Neutral course description paragraph suitable for Georgetown catalog / approval routing")
    faq: list[FaqEntry] = Field(default_factory=list, description="6-8 anticipated learner FAQs answered from the proposal")


def _render_for_package(p: dict[str, Any]) -> str:
    """Everything the writer needs from the faculty's proposal, in labelled prose."""
    course = p.get("course_overview", {}) or {}
    rationale = p.get("rationale", {}) or {}
    enrollment = p.get("enrollment", {}) or {}
    design = p.get("design", {}) or {}
    extras = p.get("marketing_extras", {}) or {}
    contact = p.get("primary_contact", {}) or {}
    pricing_deep = p.get("pricing_deep", {}) or {}
    modules = design.get("modules") or []

    def line(label: str, value: Any) -> str:
        v = str(value or "").strip()
        return f"{label}: {v}\n" if v else ""

    out = "COURSE BASICS:\n"
    out += line("Course name", course.get("course_name"))
    out += line("Description", course.get("course_description"))
    out += line("Type", " / ".join(x for x in [course.get("course_type"), course.get("course_type_other")] if x))
    out += line("Format", " / ".join(x for x in [course.get("course_format"), course.get("course_format_other")] if x))
    out += line("Faculty", course.get("faculty"))
    out += line("Intended audiences", course.get("intended_audiences"))
    out += line("Duration", course.get("duration"))
    out += line("Total contact hours", course.get("contact_hours"))
    out += line("Live contact hours", course.get("contact_hours_live"))
    out += line("Virtual-sync contact hours", course.get("contact_hours_virtual_sync"))
    out += line("Async contact hours", course.get("contact_hours_async"))
    out += line("Cohort size", course.get("cohort_size"))
    out += line("Tuition", course.get("tuition"))
    out += line("Primary contact name", contact.get("name"))
    out += line("Primary contact email", contact.get("email"))

    out += "\nRATIONALE:\n"
    out += line("Needs statement", rationale.get("needs_statement"))
    out += line("Evidence of demand", rationale.get("evidence_of_demand"))
    out += line("Competitive landscape", rationale.get("competitive_landscape"))
    out += line("Additional notes", rationale.get("additional_notes"))

    out += "\nENROLLMENT:\n"
    out += line("Recruitment plan", enrollment.get("recruitment"))
    out += line("Marketing plan", enrollment.get("marketing"))
    if not enrollment.get("admissions_skip"):
        out += line("Admissions criteria", enrollment.get("admissions_criteria"))

    out += "\nFACULTY MESSAGING (talking points the faculty wants amplified):\n"
    out += line("Talking points", extras.get("messaging_talking_points"))
    out += line("Outreach places the faculty already listed", extras.get("outreach_places"))
    out += line("One-pager working notes", extras.get("one_pager_notes"))

    out += "\nCOURSE DESIGN:\n"
    out += line("Course essential question", design.get("essential_question"))
    out += line("Course-level learning objectives", design.get("learning_objectives"))
    out += line("Course structure / arc", design.get("course_structure"))
    out += line("Assessment methods", design.get("assessment_methods"))
    out += line("Student support", design.get("student_support"))

    if modules:
        out += "\nMODULES (in order):\n"
        for i, m in enumerate(modules, start=1):
            name = m.get("module_name") or f"Module {i}"
            out += f"  {i}. {name}"
            hrs = m.get("contact_hours")
            if hrs:
                out += f" ({hrs} contact hrs)"
            out += "\n"
            eq = m.get("essential_question")
            if eq:
                out += f"     Essential Q: {eq}\n"
            objs = m.get("objectives") or []
            for o in objs[:4]:
                text = (o.get("text") or "").strip()
                if text:
                    bloom = o.get("bloom") or ""
                    out += f"     - [{bloom}] {text}\n" if bloom else f"     - {text}\n"
            crit = (m.get("critical_information") or "").strip()
            if crit:
                out += f"     Critical info: {crit[:250]}\n"
            eng = (m.get("engagement_opportunities") or "").strip()
            if eng:
                out += f"     Engagement: {eng[:200]}\n"
            feats = m.get("interactive_features") or []
            if feats:
                out += f"     Interactive: {', '.join(feats)}\n"

    if any(pricing_deep.values() if isinstance(pricing_deep, dict) else []):
        out += "\nPRICING NOTES:\n"
        out += line("Fair-market notes", pricing_deep.get("fair_market_notes"))
        out += line("Budget notes", pricing_deep.get("budget_notes"))
        out += line("Ability-to-pay notes", pricing_deep.get("ability_to_pay_notes"))
        out += line("Affordability plan", pricing_deep.get("affordability_gap_plan"))

    return out.strip() or "(proposal is empty so far)"


def _package_prompt(proposal: dict[str, Any]) -> str:
    return (
        "Below is the faculty member's course proposal — everything they have "
        "written and uploaded so far. From THIS content alone, draft a complete "
        "launch marketing package. Every asset should read as if the faculty "
        "member wrote it themselves; use their language and examples where you "
        "can. Do not invent facts.\n\n"
        f"PROPOSAL CONTENT:\n{_render_for_package(proposal)}\n\n"
        "Return strict JSON with:\n"
        "- one_pager: headline (6-10 word hook), subhead (15-25 words), "
        "elevator_pitch (2-4 sentences), who_its_for (3-5 short bullets), "
        "what_youll_leave_with (4-6 outcome bullets in learner-first phrasing), "
        "format_and_dates (one line), tuition_line, faculty_line (grounded in the "
        "faculty field), why_now (rooted in the needs statement), cta.\n"
        "- channel_drafts: exactly 5 entries, one each for LinkedIn (120-180 words, "
        "professional voice, ends with a clear CTA and 2-3 hashtags), X/Twitter "
        "(under 280 chars including a link placeholder), Facebook (80-150 words, "
        "warmer tone, invitation-style), Instagram (60-120 word caption ending in "
        "3-5 hashtags), Flyer (print-friendly copy: title, one-line hook, 3-4 "
        "bullet outcomes, format & dates line, tuition line, apply / contact line — "
        "use plain text formatting suitable for a designer to paste into a layout). "
        "Include a one-line length_note per channel.\n"
        "- info_session: title, duration_minutes (30, 45, or 60), agenda (5-7 items "
        "with time in minutes like '10 min — welcome + who's in the room'), "
        "talking_points (4-6 anchor points), audience_questions (3-5 likely learner "
        "questions).\n"
        "- announcement_email: subject (6-10 words, no clickbait), preview (30-90 "
        "chars), body (Constant-Contact style plain-text email, greeting, 3-4 "
        "paragraphs, sign-off in the faculty's name or [Faculty] if unavailable).\n"
        "- georgetown_snippet: one neutral 100-140 word paragraph suitable for the "
        "Georgetown course catalog or internal approval routing. Formal register.\n"
        "- faq: 6-8 entries. Cover the questions this specific audience will ask — "
        "who is this for, prerequisites, format and time commitment, live vs "
        "async breakdown, CEUs / credits, cost and scholarships if mentioned, "
        "faculty background, how to apply."
    )


@router.post("/marketing-package", response_model=MarketingPackage)
async def marketing_package(req: Proposal) -> MarketingPackage:
    """Draft a full marketing launch kit from the faculty's proposal content."""
    return await generate_json(
        endpoint="proposal/marketing-package",
        system=_PACKAGE_SYSTEM,
        contents=_package_prompt(req.data),
        schema=MarketingPackage,
        temperature=0.65,
    )


# ---- Social media marketing plan ------------------------------------------

_SOCIAL_PLAN_SYSTEM = (
    "You are a senior instructional-marketing strategist producing a multi-week "
    "social-media content calendar for a Thrive Academy course launch. You write "
    "in a warm, confident, non-hype voice grounded in the course's audience and "
    "specifics. Never invent facts about faculty, endorsements, or partnerships that "
    "the proposal does not state. Do not use em dashes; rewrite any sentence that "
    "would need one. Match the phase arc: Awareness (weeks 1 to about a third of the "
    "campaign) establishes the gap. Outcomes (next third) shows the future state. "
    "Differentiators (next third) shows faculty, curriculum, and unique elements. "
    "Urgency (final weeks) drives applications before the deadline. Return valid JSON only."
)


class SocialPost(BaseModel):
    channel: str = Field(description="LinkedIn | Instagram | X/Twitter | Facebook")
    body: str = Field(description="Post copy tuned to the channel's norms and length")


class CanvaSpec(BaseModel):
    headline: str = ""
    subhead: str = ""
    details: str = ""
    cta: str = ""
    design_note: str = Field(default="", description="Visual/style direction, one line")


class SocialWeek(BaseModel):
    week_number: int
    phase: str = Field(description="Awareness | Outcomes | Differentiators | Urgency")
    theme: str = Field(description="Short theme label, e.g. 'The Gap' or 'Faculty Leadership'")
    hook: str = Field(description="One-line concept for the week's message")
    posts: list[SocialPost] = Field(default_factory=list, description="One post per channel in the campaign")
    canva: CanvaSpec = Field(default_factory=CanvaSpec)


class SocialPlan(BaseModel):
    campaign_title: str = ""
    campaign_summary: str = Field(default="", description="2-3 sentence read of the arc")
    weeks: list[SocialWeek] = Field(default_factory=list)
    usage_notes: list[str] = Field(
        default_factory=list,
        description="Short reminders for the marketing team (link swaps, tone rules, scheduling caveats)",
    )


def _render_for_social_plan(p: dict[str, Any]) -> str:
    course = p.get("course_overview", {}) or {}
    rationale = p.get("rationale", {}) or {}
    enrollment = p.get("enrollment", {}) or {}
    design = p.get("design", {}) or {}
    social = p.get("social_plan", {}) or {}

    def line(label: str, value: Any) -> str:
        v = str(value or "").strip()
        return f"{label}: {v}\n" if v else ""

    out = "COURSE:\n"
    out += line("Course name", course.get("course_name"))
    out += line("Description", course.get("course_description"))
    out += line("Faculty", course.get("faculty"))
    out += line("Intended audiences", course.get("intended_audiences"))
    out += line("Duration", course.get("duration"))
    out += line("Contact hours", course.get("contact_hours"))
    out += line("Cohort size", course.get("cohort_size"))
    out += line("Tuition", course.get("tuition"))
    out += "\nPOSITIONING INPUTS:\n"
    out += line("Needs statement", rationale.get("needs_statement"))
    out += line("Evidence of demand", rationale.get("evidence_of_demand"))
    out += line("Competitive landscape", rationale.get("competitive_landscape"))
    out += line("Recruitment plan", enrollment.get("recruitment"))
    out += line("Marketing plan (message + proof points)", enrollment.get("marketing"))
    out += line("Course essential question", design.get("essential_question"))
    out += line("Course-level learning objectives", design.get("learning_objectives"))
    out += "\nSOCIAL PLAN INPUTS:\n"
    out += line("Campaign length (weeks)", social.get("campaign_weeks"))
    out += line("Start date", social.get("start_date"))
    out += line("Application deadline", social.get("application_deadline"))
    out += line("Landing page URL", social.get("landing_url"))
    out += line("Contact email", social.get("contact_email"))
    out += line("Channels", social.get("channels"))
    out += line("Hashtags", social.get("hashtags"))
    out += line("Awareness hook (the gap or problem)", social.get("awareness_hook"))
    out += line("Outcomes promise (future state after enrolling)", social.get("outcomes_promise"))
    out += line("Audience segments to spotlight in Outcomes phase", social.get("audience_segments"))
    out += line("Differentiators (faculty, curriculum, capstone, endorsement, etc.)", social.get("differentiators"))
    out += line("Proof points (accreditation, endorsement crosswalks, alumni outcomes)", social.get("proof_points"))
    out += line("Urgency reason (deadline pressure, cohort cap)", social.get("urgency_reason"))
    out += line("Tone notes / rules (e.g. no em dashes, avoid jargon X)", social.get("tone_notes"))
    return out.strip()


def _social_plan_prompt(proposal: dict[str, Any]) -> str:
    social = proposal.get("social_plan", {}) or {}
    try:
        weeks = int(str(social.get("campaign_weeks") or "12").strip() or "12")
    except ValueError:
        weeks = 12
    weeks = max(4, min(weeks, 16))
    channels_raw = str(social.get("channels") or "LinkedIn, Instagram, X/Twitter, Facebook")
    channels = [c.strip() for c in channels_raw.split(",") if c.strip()]
    return (
        "Build a social-media content calendar for the course launch below. "
        f"Produce exactly {weeks} weeks. For each week, include one post per channel "
        f"({', '.join(channels)}) plus a Canva design spec (headline, subhead, details, cta, "
        "design_note). Vary hooks across weeks — do not repeat the same opener. Post copy "
        "should be tuned to the channel: LinkedIn 120-180 words in a professional voice; "
        "Instagram 60-120 words with warm framing; X/Twitter under 280 characters; Facebook "
        "80-150 words in a slightly warmer voice. Always include the landing URL where the "
        "post asks the reader to act, and end with hashtags on channels where they belong "
        "(LinkedIn, Instagram, X/Twitter). Rotate which audience segment each Outcomes-phase "
        "week focuses on when segments are given. Phase distribution: split the weeks roughly "
        "into quarters across Awareness, Outcomes, Differentiators, Urgency in that order.\n\n"
        f"INPUTS:\n{_render_for_social_plan(proposal)}\n\n"
        "Return strict JSON matching the SocialPlan schema."
    )


@router.post("/social-plan", response_model=SocialPlan)
async def social_plan(req: Proposal) -> SocialPlan:
    """Generate a multi-week social-media marketing calendar from a proposal."""
    return await generate_json(
        endpoint="proposal/social-plan",
        system=_SOCIAL_PLAN_SYSTEM,
        contents=_social_plan_prompt(req.data),
        schema=SocialPlan,
        temperature=0.7,
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
        ("Additional Notes", "additional_notes"),
    ]:
        md += _fmt(label, rationale.get(key))

    md += "## 3. Course Enrollment & Marketing\n\n"
    recruitment_export = enrollment.get("recruitment") or enrollment.get("recruitment_and_marketing")
    md += _fmt("Recruitment", recruitment_export)
    md += _fmt("Marketing", enrollment.get("marketing"))
    md += _fmt("Admissions Criteria and Selection Process", enrollment.get("admissions_criteria"))

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

# Must match the dropdown options in frontend/src/pages/Marketing.tsx / Pedagogy.tsx
# exactly, or an imported value shows as "Select…" in the UI.
COURSE_TYPES = ["Year-Long Certificate", "Semester-Long Certificate", "Mini-Course", "Microlearning", "Other"]
COURSE_FORMATS = ["In-Person", "Virtual Sync", "Async", "Other"]

_IMPORT_SYSTEM = (
    "You extract structured course-proposal data from a Thrive Academy 'Course "
    "Conceptualization Tool' response that a faculty member submitted (or from their "
    "raw course notes). Preserve the faculty member's exact wording — do not rewrite, "
    "summarize, or invent content. If a field is not present, leave it as an empty "
    "string. Return valid JSON only."
)


class _ImportContact(BaseModel):
    name: str = ""
    email: str = ""


class _ImportOverview(BaseModel):
    course_name: str = ""
    course_description: str = ""
    course_type: str = Field(default="", description="One of: " + ", ".join(COURSE_TYPES) + " — or empty")
    course_type_other: str = Field(default="", description="The faculty's own wording when course_type is 'Other'")
    course_format: str = Field(default="", description="One of: " + ", ".join(COURSE_FORMATS) + " — or empty")
    course_format_other: str = Field(default="", description="The faculty's own wording when course_format is 'Other'")
    faculty: str = ""
    intended_audiences: str = ""
    cohort_size: str = ""
    duration: str = ""
    contact_hours: str = ""
    tuition: str = ""


class _ImportRationale(BaseModel):
    needs_statement: str = ""
    evidence_of_demand: str = ""
    competitive_landscape: str = ""
    additional_notes: str = Field(default="", description="The form's 'Anything Else' answer, verbatim")


class _ImportLLM(BaseModel):
    primary_contact: _ImportContact = Field(default_factory=_ImportContact)
    course_overview: _ImportOverview = Field(default_factory=_ImportOverview)
    rationale: _ImportRationale = Field(default_factory=_ImportRationale)
    inferred_fields: list[str] = Field(
        default_factory=list,
        description="Dotted keys (e.g. 'course_overview.course_type') whose value you had to infer, "
        "normalise or map rather than quote verbatim from the text. Empty if everything was quoted.",
    )


def _import_prompt(text: str) -> str:
    return (
        "Below is the extracted text from a completed Course Conceptualization form "
        "(or faculty course notes). Map the content into the JSON schema. "
        "Preserve wording verbatim in each field (do not paraphrase). If a field is "
        "not present in the text, use an empty string ''. Do not invent content.\n\n"
        f"EXTRACTED TEXT:\n---\n{text}\n---\n\n"
        "Notes on specific fields:\n"
        f"  - course_type: map the form's answer to exactly one of {COURSE_TYPES!r}. "
        "The form's labels may be longer (e.g. 'Year-Long Certificate Course' -> 'Year-Long Certificate', "
        "'Microlearning Course' -> 'Microlearning'). If it matches none, use 'Other' and put the "
        "faculty's wording in course_type_other.\n"
        f"  - course_format: pick exactly one of {COURSE_FORMATS!r} — the primary format if several "
        "were ticked ('In-Person Synchronous' -> 'In-Person', 'Virtual Synchronous' -> 'Virtual Sync', "
        "'Asynchronous' -> 'Async'). If several were ticked, list all of them verbatim in "
        "course_format_other so nothing is lost.\n"
        "  - primary_thrive_domain, if present, should be appended to course_description as "
        "'(Primary Thrive Domain: <domain>)' so it isn't lost.\n"
        "  - 'Anything Else' content, if present, goes verbatim into rationale.additional_notes.\n"
        "  - inferred_fields: list every dotted key where you mapped, normalised, or guessed "
        "rather than copied — course_type and course_format almost always belong here."
    )


def _clean_section(section: BaseModel) -> dict[str, str]:
    return {k: str(v).strip() for k, v in section.model_dump().items() if isinstance(v, str) and str(v).strip()}


@router.post("/import", response_model=ImportResponse)
async def import_proposal(
    file: UploadFile | None = File(None),
    text: str = Form(""),
) -> ImportResponse:
    """Parse a completed Course Conceptualization form (file upload or pasted text) into proposal fields."""
    body_text = text or ""
    if file is not None and file.filename:
        raw = await file.read()
        if len(raw) > MAX_UPLOAD_BYTES:
            raise HTTPException(status_code=413, detail=f"File too large ({len(raw) // (1024*1024)} MB). Max is 15 MB.")
        body_text = _extract_text(file.filename, raw)

    body_text = re.sub(r"\n{3,}", "\n\n", body_text or "").strip()
    if not body_text:
        raise HTTPException(status_code=422, detail="No text found to import — upload a file or paste content.")

    truncated = body_text[:MAX_TEXT_CHARS]

    data = await generate_json(
        endpoint="proposal/import",
        system=_IMPORT_SYSTEM,
        contents=_import_prompt(truncated),
        schema=_ImportLLM,
        temperature=0.1,
        # Extraction is verbatim mapping — low thinking is enough and faster.
        thinking_level="low",
    )

    # Enforce the dropdown vocabulary regardless of what the model did.
    ov = data.course_overview
    if ov.course_type and ov.course_type not in COURSE_TYPES:
        ov.course_type_other = ov.course_type_other or ov.course_type
        ov.course_type = "Other"
    if ov.course_format and ov.course_format not in COURSE_FORMATS:
        ov.course_format_other = ov.course_format_other or ov.course_format
        ov.course_format = "Other"

    imported: dict[str, Any] = {}
    fields_extracted: list[str] = []
    for key, section in (
        ("primary_contact", data.primary_contact),
        ("course_overview", data.course_overview),
        ("rationale", data.rationale),
    ):
        cleaned = _clean_section(section)
        if cleaned:
            imported[key] = cleaned
            fields_extracted.extend(f"{key}.{k}" for k in cleaned)

    inferred = [f for f in data.inferred_fields if f in fields_extracted]

    return ImportResponse(
        imported=imported,
        fields_extracted=fields_extracted,
        inferred_fields=inferred,
        extracted_chars=len(body_text),
    )
