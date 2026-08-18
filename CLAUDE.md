# CLAUDE.md

## Project Overview

**TS Course Coach** - [Brief description to be filled in]

- **GCP Project**: `ts-ts-course-coach`

## Tech Stack

### Backend
- **FastAPI** - Python web framework
- **Google Firestore** - NoSQL database
- **Gemini AI** - Google AI

### Frontend
- **React 19** + **TypeScript**
- **Tailwind CSS v3** - Styling
- **Vite** - Build tool

### Infrastructure
- **Google Cloud Run** - Deployment via `deploy.sh`

## Commands

### Backend
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8080    # Run dev server (port 8080)
```

### Frontend
```bash
cd frontend
npm run dev      # Dev server (port 5173, proxies /api to backend)
npm run build    # Production build (tsc + vite)
npm run lint     # Lint
```

### Deployment
```bash
./deploy.sh                  # Deploy both services
./deploy.sh --backend-only   # Backend only
./deploy.sh --frontend-only  # Frontend only
```

## API Endpoints

All endpoints prefixed with `/api/v1/`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/health` | Health check (at root, not under /api/v1) |

## Deployment

- **GCP Project**: `ts-ts-course-coach`
- **Region**: `us-central1`
- **Services**: `ts-ts-course-coach-backend`, `ts-ts-course-coach-frontend`
- **Secrets**: - `jwt-secret-key`, `gemini-api-key`

## Code Conventions

- Backend: `snake_case` (Python)
- Frontend: `camelCase` (TypeScript)
- API responses: `camelCase`

## Important Guidelines

### Dependencies
Always check PyPI for the latest dependency versions before adding to `requirements.txt`.

### What NOT to Do
- Don't implement more than requested
- Don't delete code without discussion
- Don't make definitive claims about bugs without testing
- Don't skip checking for existing patterns in the codebase
