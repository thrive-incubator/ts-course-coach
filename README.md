# TS Course Coach

[Brief description to be filled in]

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | FastAPI + Python 3.11 |
| Frontend | React 19 + TypeScript + Vite |
| Styling | Tailwind CSS v3 |
| Database | Google Firestore |
| Infrastructure | Google Cloud Run |

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- Google Cloud SDK (`gcloud`)

### Local Development

1. Copy the environment template:
   ```bash
   cp backend/.env.example backend/.env
   # Fill in your API keys
   ```

2. Start both services:
   ```bash
   ./run-local.sh
   ```

3. Open http://localhost:5173

### Deploy to Cloud Run

```bash
# First time: set up GCP permissions
./fix_permissions.sh

# Deploy both services
./deploy.sh
```
