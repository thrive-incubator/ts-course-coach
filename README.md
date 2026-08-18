# TS Course Coach

Interactive faculty course-proposal builder for Thrive Academy — with inline pedagogy coaching (Bloom's, needs-statement critique, assessment ideas) and a launch-ready marketing brief generator (audience personas, positioning, headlines, channels, social copy).

## What it does

Faculty step through the standard Thrive Academy full-course-proposal template as a guided wizard. On each field an AI Coach panel offers:

- **Pedagogy coaching** — Bloom's-aligned learning-objective examples pulled from the course topic, weak-signal detection on needs statements, curriculum outline scaffolding, assessment method ideas that fit the format.
- **Marketing coaching** — audience-first framing, competitive differentiation prompts, recruitment channel ideas.

At the end, one click generates a full marketing brief: audience personas with triggers + objections, positioning statement, 5 headline variants, 4-6 recruitment channels with per-channel angles, ready-to-post LinkedIn/Twitter/Instagram copy, and 3 email subject lines.

Faculty leave with a formatted proposal (markdown export, copy to Google Doc) + a marketing brief they can hand to the enrollment team.

## Stack

- Frontend: Vite + React 19 + TypeScript + Tailwind CSS 3
- Backend: FastAPI + Google Gemini (google-genai SDK)
- Storage: localStorage (v0 — no accounts, drafts stick per browser)
- Deploy target: Cloud Run (via the standard Thrive prototype scaffold)

## Run locally

```
./run-local.sh
```

Backend runs on `${BACKEND_PORT:-8080}`, frontend on `${FRONTEND_PORT:-5173}`, plus a cloudflared tunnel for sharing. Both ports honor env overrides from the prototype runtime.

## Next steps

- **Save-and-resume across devices.** Move localStorage state to Firestore keyed on Google sign-in.
- **Multi-cohort proposals.** Copy-a-proposal for the next intake with the marketing brief kept in sync.
- **Faculty voice fine-tuning.** Learn the faculty member's tone from prior proposals and mirror it in coach suggestions.
- **Reviewer view.** Frances / Anna get a diff view + comment threads on each field.
