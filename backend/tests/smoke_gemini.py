"""Smoke test: hit every Gemini-backed endpoint with realistic payloads and check the
response parses. Run from backend/:  source venv/bin/activate && python tests/smoke_gemini.py
Set GEMINI_MODEL_FLASH=... to test a different model."""
import io, json, sys, time
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import get_settings

c = TestClient(app)
CTX = {
    "course_name": "Reflective Supervision for Infant Mental Health Practitioners",
    "course_type": "Semester-Long Certificate Course",
    "course_format": "Virtual Synchronous",
    "intended_audiences": "Mid-career IECMH consultants and home visitors seeking Endorsement renewal",
    "duration": "12 weeks", "contact_hours": "24", "cohort_size": "20",
}
MODULE = {
    "module_name": "Foundations of Reflective Practice", "contact_hours": "2", "format": "Virtual Synchronous",
    "essential_question": "Why does it feel so hard to slow down with a family in crisis?",
    "objectives": [{"bloom": "understand", "text": "Understand the parallel process"},
                   {"bloom": "apply", "text": "Practice a reflective check-in with a peer"}],
    "critical_information": "Parallel process; holding; regulation before reasoning",
    "engagement_opportunities": "Small-group role play", "interactive_features": ["case study"],
    "interactive_features_notes": "", "assignments": "Reflective journal entry",
}
results = []

def run(name, fn):
    t = time.time()
    try:
        r = fn(); dt = time.time() - t
        ok = r.status_code == 200
        body = r.json()
        results.append((name, ok, dt, r.status_code, body))
        print(f"{'OK ' if ok else 'FAIL'} {name:18s} {dt:5.1f}s  {r.status_code}  {json.dumps(body)[:160]}")
    except Exception as e:
        results.append((name, False, time.time()-t, 0, str(e)))
        print(f"EXC  {name:18s} {e}")

print("model:", get_settings().gemini_model_flash)
run("coach/field", lambda: c.post("/api/v1/coach", json={"section": "design", "field": "essential_question",
    "current_value": "Understand reflective supervision", "course_context": CTX}))
run("coach/field-empty", lambda: c.post("/api/v1/coach", json={"section": "overview", "field": "course_description",
    "current_value": "", "course_context": CTX}))
run("coach/module", lambda: c.post("/api/v1/coach/module", json={"module": MODULE,
    "course_essential_question": "What does it take to stay present with a family in crisis?", "course_context": CTX,
    "course_learning_objectives": "Apply reflective supervision principles; Evaluate their own regulation in session",
    "sibling_modules": [{"index": 1, "module_name": "Foundations of Reflective Practice", "contact_hours": "2", "is_current": True},
                        {"index": 2, "module_name": "Parallel Process in Depth", "contact_hours": "2", "is_current": False}]}))
txt = ("Slide 1: Reflective Supervision 101\nDefinition of reflective supervision. Three components: reflection, "
       "collaboration, regularity.\nSlide 2: The parallel process\nLecture on how supervisor-supervisee mirrors "
       "practitioner-family.\nSlide 3: Quiz\n1. Define parallel process. 2. List three components.\n") * 3
run("coach/material", lambda: c.post("/api/v1/coach/material",
    files={"file": ("lesson.txt", io.BytesIO(txt.encode()), "text/plain")},
    data={"module": json.dumps(MODULE), "course_essential_question": "x", "course_context": json.dumps(CTX)}))
# minimal hand-written PDF with one line of text, to exercise the native-PDF path
def _mini_pdf(text):
    objs=[b"<< /Type /Catalog /Pages 2 0 R >>", b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
          b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
          None, b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"]
    stream=("BT /F1 14 Tf 72 720 Td (%s) Tj ET" % text).encode()
    objs[3]=b"<< /Length %d >>stream\n" % len(stream) + stream + b"\nendstream"
    out=b"%PDF-1.4\n"; offs=[]
    for i,o in enumerate(objs,1):
        offs.append(len(out)); out+=b"%d 0 obj\n" % i + o + b"\nendobj\n"
    xref=len(out)
    out+=b"xref\n0 %d\n0000000000 65535 f \n" % (len(objs)+1) + b"".join(b"%010d 00000 n \n" % o for o in offs)
    out+=b"trailer\n<< /Size %d /Root 1 0 R >>\nstartxref\n%d\n%%%%EOF" % (len(objs)+1, xref)
    return out
run("coach/material-pdf", lambda: c.post("/api/v1/coach/material",
    files={"file": ("deck.pdf", io.BytesIO(_mini_pdf("Slide 1: Reflective Supervision 101 - definition and three components. Slide 2: Quiz.")), "application/pdf")},
    data={"module": json.dumps(MODULE), "course_essential_question": "x", "course_context": json.dumps(CTX)}))
run("pricing/analyze", lambda: c.post("/api/v1/pricing/analyze", json={**CTX, "course_description": "A 12-week live cohort for IECMH practitioners.", "current_tuition": "$900"}))
run("marketing-brief", lambda: c.post("/api/v1/proposal/marketing-brief", json={"data": {
    "course_overview": {**CTX, "course_description": "A 12-week live cohort for IECMH practitioners."},
    "rationale": {"needs_statement": "Endorsement renewal requires reflective supervision hours; few affordable options exist."},
    "design": {"essential_question": "What does it take to stay present with a family in crisis?", "modules": [MODULE]}}}))
imp = ("Course Conceptualization Tool\nName: Dana Rivera\nEmail: dana@example.org\nCourse name: Reflective Supervision "
       "for IECMH Practitioners\nCourse type: Semester-Long Certificate Course\nFormat: Virtual Synchronous\n"
       "Who is this for? Mid-career home visitors.\nWhy is this needed? Endorsement renewal requires RS hours.\n"
       "Anything else? We could partner with the state AIMH chapter.\n")
run("proposal/import", lambda: c.post("/api/v1/proposal/import", data={"text": imp}))

# Deeper checks
by = {n: b for n, ok, dt, s, b in results if ok}
def check(cond, msg): print(("  ✓ " if cond else "  ✗ ") + msg)
print("\n--- content checks ---")
if "coach/field" in by: check(len(by["coach/field"]["examples"]) >= 2, "coach: >=2 examples")
if "coach/module" in by: check(all(by["coach/module"][k] for k in ("strengths","gaps","suggestions","bloom_diagnosis")), "module: all sections filled")
if "pricing/analyze" in by:
    p = by["pricing/analyze"]; check(4 <= len(p["comparables"]) <= 6, f"pricing: {len(p['comparables'])} comparables")
    names = [x["institution"] for x in p["comparables"]]; print("    institutions:", names)
    check(len(p["scenarios"]) == 3, "pricing: 3 scenarios")
    check(isinstance(p.get("suggested_low_usd"), int) and p["suggested_low_usd"] > 0, f"pricing: integer bounds {p.get('suggested_low_usd')}-{p.get('suggested_high_usd')}")
if "marketing-brief" in by:
    b = by["marketing-brief"]; check(len(b["headlines"]) == 5 and len(b["channels"]) >= 4, "brief: 5 headlines, >=4 channels")
    check(all(isinstance(x, dict) and x.get("name") for x in b["audience_personas"]), "brief: personas well-formed")
if "coach/material-pdf" in by: check(bool(by["coach/material-pdf"]["summary"]), "material: native PDF reviewed")
if "proposal/import" in by:
    i = by["proposal/import"]; print("    extracted:", i["fields_extracted"])
    check(i["imported"].get("primary_contact", {}).get("email") == "dana@example.org", "import: email verbatim")
    check(bool(i["imported"].get("rationale", {}).get("additional_notes")), "import: 'anything else' -> additional_notes")
    ov = i["imported"].get("course_overview", {})
    check(ov.get("course_type") == "Semester-Long Certificate" and ov.get("course_format") == "Virtual Sync", f"import: dropdown vocab {ov.get('course_type')!r} / {ov.get('course_format')!r}")
    print("    inferred:", i.get("inferred_fields"))
sys.exit(0 if all(r[1] for r in results) else 1)
