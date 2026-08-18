#!/bin/bash
set -euo pipefail

# ---- Configuration ----
PROJECT_ID="ts-ts-course-coach"
REGION="${REGION:-us-central1}"
BACKEND_SERVICE="ts-ts-course-coach-backend"
FRONTEND_SERVICE="ts-ts-course-coach-frontend"
BACKEND_IMAGE="gcr.io/${PROJECT_ID}/ts-ts-course-coach-backend"
FRONTEND_IMAGE="gcr.io/${PROJECT_ID}/ts-ts-course-coach-frontend"

# ---- Parse arguments ----
DEPLOY_BACKEND=true
DEPLOY_FRONTEND=true
SKIP_BUILD=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --backend-only) DEPLOY_FRONTEND=false ;;
    --frontend-only) DEPLOY_BACKEND=false ;;
    --skip-build) SKIP_BUILD=true ;;
    --region) REGION="$2"; shift ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
  shift
done

# ---- Pre-flight ----
echo "=== Pre-flight checks ==="
gcloud auth print-identity-token > /dev/null 2>&1 || gcloud auth login
gcloud config set project $PROJECT_ID

# ---- Auto-run fix_permissions.sh on first deploy ----
SA_NAME="ts-ts-course-coach-runner"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if ! gcloud iam service-accounts describe $SA_EMAIL > /dev/null 2>&1; then
  echo "First deploy detected — running fix_permissions.sh to set up IAM..."
  if [ -f "${SCRIPT_DIR}/fix_permissions.sh" ]; then
    bash "${SCRIPT_DIR}/fix_permissions.sh"
  else
    echo "ERROR: fix_permissions.sh not found. Run it manually first."
    exit 1
  fi
fi

# ---- Ensure Artifact Registry gcr.io repo exists ----
echo "=== Ensuring Artifact Registry repository exists ==="
if ! gcloud artifacts repositories describe gcr.io --location=us --project=$PROJECT_ID > /dev/null 2>&1; then
  echo "  Creating gcr.io repository in Artifact Registry..."
  gcloud artifacts repositories create gcr.io \
    --repository-format=docker \
    --location=us \
    --project=$PROJECT_ID
  echo "  Done."
else
  echo "  Repository already exists."
fi

# ---- Secrets ----
echo "=== Checking secrets ==="
REQUIRED_SECRETS=("jwt-secret-key" "gemini-api-key")

for SECRET in "${REQUIRED_SECRETS[@]}"; do
  if ! gcloud secrets describe $SECRET > /dev/null 2>&1; then
    echo "Secret '$SECRET' not found. Create it:"
    echo "  gcloud secrets create $SECRET --replication-policy=automatic"
    echo "  echo -n 'VALUE' | gcloud secrets versions add $SECRET --data-file=-"
    exit 1
  fi
done

# ---- Backend Deploy ----
if [ "$DEPLOY_BACKEND" = true ]; then
  echo "=== Deploying Backend ==="

  if [ "$SKIP_BUILD" = false ]; then
    cd backend
    gcloud builds submit --tag $BACKEND_IMAGE .
    cd ..
  fi

  BACKEND_URL=$(gcloud run deploy $BACKEND_SERVICE \
    --image $BACKEND_IMAGE \
    --region $REGION \
    --platform managed \
    --service-account $SA_EMAIL \
    --memory 2Gi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 5 \
    --timeout 300 \
    --allow-unauthenticated \
    --set-secrets="GEMINI_API_KEY=gemini-api-key:latest,JWT_SECRET_KEY=jwt-secret-key:latest" \
    --set-env-vars="FIREBASE_PROJECT_ID=${PROJECT_ID},DEBUG=false" \
    --format='value(status.url)')

  echo "Backend deployed: $BACKEND_URL"
fi

# ---- Frontend Deploy ----
if [ "$DEPLOY_FRONTEND" = true ]; then
  echo "=== Deploying Frontend ==="

  # Get backend URL if not already set
  if [ -z "${BACKEND_URL:-}" ]; then
    BACKEND_URL=$(gcloud run services describe $BACKEND_SERVICE --region $REGION --format='value(status.url)')
  fi

  VITE_API_URL="${BACKEND_URL}/api/v1"

  if [ "$SKIP_BUILD" = false ]; then
    cd frontend
    gcloud builds submit \
      --config=cloudbuild.yaml \
      --substitutions="_VITE_API_URL=${VITE_API_URL},_IMAGE_NAME=${FRONTEND_IMAGE}" .
    cd ..
  fi

  gcloud run deploy $FRONTEND_SERVICE \
    --image $FRONTEND_IMAGE \
    --region $REGION \
    --platform managed \
    --memory 512Mi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 3 \
    --allow-unauthenticated

  FRONTEND_URL=$(gcloud run services describe $FRONTEND_SERVICE --region $REGION --format='value(status.url)')
  echo "Frontend deployed: $FRONTEND_URL"

  # Build the new-format URL (project-number based) that GCP is migrating to
  PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
  FRONTEND_URL_NEW="https://${FRONTEND_SERVICE}-${PROJECT_NUMBER}.${REGION}.run.app"

  # ---- Update CORS (allow both URL formats) ----
  echo "=== Updating backend CORS ==="
  echo "  Old format: $FRONTEND_URL"
  echo "  New format: $FRONTEND_URL_NEW"
  gcloud run services update $BACKEND_SERVICE \
    --region $REGION \
    --update-env-vars "^||^CORS_ORIGINS=${FRONTEND_URL},${FRONTEND_URL_NEW}||FRONTEND_BASE_URL=${FRONTEND_URL_NEW}"
fi

echo "=== Deployment complete ==="
