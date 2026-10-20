"""Course budget — fills the Thrive Academy Course Budget Worksheet from the user's answers."""

from __future__ import annotations

import io
import re
from pathlib import Path
from typing import Literal

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from openpyxl import load_workbook
from pydantic import BaseModel, Field

from app.api.pricing import ASYNC_RATE_USD, CONTACT_HOURS_PER_CE, SYNC_RATE_USD

router = APIRouter(prefix="/budget", tags=["budget"])

# The worksheet JB shared (FY27, two phases + course type), kept verbatim so the
# download looks exactly like the spreadsheet the management team already uses.
# We only write into its input cells.
_TEMPLATE_PATH = (
    Path(__file__).resolve().parent.parent / "templates" / "course_budget_template.xlsx"
)
SHEET = "Budget Worksheet"

REVENUE_ROWS = {"employer_sponsored": 21, "self_pay": 22, "scholarship": 23}
BUILD_ROWS = {
    "faculty_salaries": 29,
    "subject_matter_experts": 31,
    "instructional_design": 32,
    "media_production": 33,
    "technology": 34,
    "materials_licensing": 35,
    "other": 36,
}
HYBRID_ROWS = {
    "faculty_teaching": 46,
    "guest_speakers": 48,
    "teaching_assistants": 49,
    "in_person_sessions": 50,
    "participant_materials": 51,
    "other": 52,
}
ASYNC_TASK_ROWS = {
    "discussion_boards": 58,
    "learner_questions": 59,
    "grading": 60,
    "office_hours": 61,
    "completion_review": 62,
    "evaluations_review": 63,
    "content_updates": 64,
    "other": 65,
}
FACULTY_ROWS = (87, 88, 89, 90)


class RevenueLine(BaseModel):
    learners: float = 0
    rate: float | None = None  # None = use the worksheet's tuition per participant
    notes: str = ""


class BudgetLine(BaseModel):
    quantity: float | None = None
    rate: float | None = None
    notes: str = ""


class AsyncTask(BaseModel):
    performs: bool | None = None
    hours: float | None = None
    scope: str = ""


class FacultyDirector(BaseModel):
    name: str = ""
    build: float | None = None
    delivery: float | None = None
    role: str = ""


class BudgetRequest(BaseModel):
    course_title: str = ""
    course_format: Literal["Hybrid", "Fully Asynchronous", ""] = ""
    target_launch_date: str = ""
    prepared_by: str = ""
    contact_hours: float | None = None
    tuition: float = 0
    employer_sponsored: RevenueLine = Field(default_factory=RevenueLine)
    self_pay: RevenueLine = Field(default_factory=RevenueLine)
    scholarship: RevenueLine = Field(default_factory=RevenueLine)
    additional_revenue: float | None = None
    additional_revenue_notes: str = ""
    build: dict[str, BudgetLine] = Field(default_factory=dict)
    hybrid: dict[str, BudgetLine] = Field(default_factory=dict)
    async_hourly_rate: float | None = None
    async_tasks: dict[str, AsyncTask] = Field(default_factory=dict)
    faculty_directors: list[FacultyDirector] = Field(default_factory=list)


def _slug(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s[:40] or "course"


def _write_lines(ws, rows: dict[str, int], lines: dict[str, BudgetLine]) -> None:
    for key, row in rows.items():
        line = lines.get(key)
        if not line:
            continue
        ws[f"B{row}"] = line.quantity
        ws[f"C{row}"] = line.rate
        if line.notes:
            ws[f"F{row}"] = line.notes


def build_workbook(req: BudgetRequest) -> bytes:
    wb = load_workbook(_TEMPLATE_PATH)
    ws = wb[SHEET]

    ws["B4"] = req.course_title or None
    names = [fd.name.strip() for fd in req.faculty_directors if fd.name.strip()]
    ws["B5"] = ", ".join(names) or None
    ws["B6"] = req.course_format or None
    ws["B7"] = req.target_launch_date or None
    ws["B8"] = req.prepared_by or None

    # The shared worksheet's tuition cell lost its rate references (#REF!).
    # Rebuild it from the pricing formula so it follows the Course Format dropdown.
    if req.contact_hours:
        ce = req.contact_hours / CONTACT_HOURS_PER_CE
        ws["D17"] = (
            f'=IF($B$6="Hybrid",{SYNC_RATE_USD},'
            f'IF($B$6="Fully Asynchronous",{ASYNC_RATE_USD},0))*{ce:g}'
        )
        ws["F17"] = (
            f"{req.contact_hours:g} contact hours ÷ {CONTACT_HOURS_PER_CE} = {ce:g} CE × "
            f"${SYNC_RATE_USD}/CE (Hybrid) or ${ASYNC_RATE_USD}/CE (Fully Asynchronous). "
            "Feeds the Rate column in Revenue."
        )
    else:
        ws["D17"] = req.tuition

    for key, row in REVENUE_ROWS.items():
        line: RevenueLine = getattr(req, key)
        ws[f"B{row}"] = line.learners or None
        if line.rate is not None:
            ws[f"C{row}"] = line.rate
        if line.notes:
            ws[f"F{row}"] = line.notes
    ws["D25"] = req.additional_revenue
    if req.additional_revenue_notes:
        ws["F25"] = req.additional_revenue_notes

    _write_lines(ws, BUILD_ROWS, req.build)
    _write_lines(ws, HYBRID_ROWS, req.hybrid)

    ws["E55"] = req.async_hourly_rate
    for key, row in ASYNC_TASK_ROWS.items():
        task = req.async_tasks.get(key)
        if not task or task.performs is None:
            continue
        ws[f"B{row}"] = "Yes" if task.performs else "No"
        ws[f"C{row}"] = task.hours if task.performs else None
        ws[f"F{row}"] = task.scope or None

    for row, fd in zip(FACULTY_ROWS, req.faculty_directors[: len(FACULTY_ROWS)]):
        ws[f"A{row}"] = fd.name or None
        ws[f"B{row}"] = fd.build
        ws[f"C{row}"] = fd.delivery
        ws[f"F{row}"] = fd.role or None

    wb.calculation.fullCalcOnLoad = True
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


@router.post("/xlsx")
async def download_budget(req: BudgetRequest) -> StreamingResponse:
    """Return the filled-in course budget worksheet as an .xlsx download."""
    data = build_workbook(req)
    filename = f"{_slug(req.course_title)}-course-budget.xlsx"
    return StreamingResponse(
        io.BytesIO(data),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
