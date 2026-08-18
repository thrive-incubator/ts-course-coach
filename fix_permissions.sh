#!/bin/bash

################################################################################
# Fix IAM permissions for Cloud Build, Artifact Registry, and Cloud Run
#
# Run this script once before first deployment. Safe to re-run.
################################################################################

set -e

PROJECT_ID="ts-ts-course-coach"

echo "Getting project number for $PROJECT_ID..."
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')

echo "Project ID: $PROJECT_ID"
echo "Project Number: $PROJECT_NUMBER"

gcloud config set project $PROJECT_ID

# ---------------------------------------------------------------------------
# 0. Enable required APIs
# ---------------------------------------------------------------------------
echo ""
echo "=== Enabling required APIs ==="
gcloud services enable \
    cloudbuild.googleapis.com \
    artifactregistry.googleapis.com \
    run.googleapis.com \
    secretmanager.googleapis.com \
    firestore.googleapis.com \
    storage.googleapis.com \
    --quiet

echo "Waiting 10 seconds for service accounts to be created..."
sleep 10

# ---------------------------------------------------------------------------
# 1. Create Artifact Registry repository
# ---------------------------------------------------------------------------
echo ""
echo "=== Creating Artifact Registry repository ==="
gcloud artifacts repositories create gcr.io \
    --repository-format=docker \
    --location=us \
    --project=$PROJECT_ID \
    2>/dev/null || echo "Repository already exists"

# ---------------------------------------------------------------------------
# 2. Cloud Build service account permissions
# ---------------------------------------------------------------------------
echo ""
echo "=== Granting permissions to Cloud Build service account ==="
CLOUDBUILD_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

for ROLE in \
    roles/cloudbuild.builds.builder \
    roles/artifactregistry.admin \
    roles/storage.admin \
    roles/logging.logWriter; do
    echo "  Granting $ROLE to Cloud Build SA..."
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:${CLOUDBUILD_SA}" \
        --role="$ROLE" \
        --quiet 2>/dev/null || true
done

# ---------------------------------------------------------------------------
# 3. Compute service account permissions
# ---------------------------------------------------------------------------
echo ""
echo "=== Granting permissions to Compute service account ==="
COMPUTE_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

for ROLE in \
    roles/artifactregistry.admin \
    roles/storage.admin \
    roles/logging.logWriter; do
    echo "  Granting $ROLE to Compute SA..."
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:${COMPUTE_SA}" \
        --role="$ROLE" \
        --quiet 2>/dev/null || true
done

# ---------------------------------------------------------------------------
# 4. Cloud Run runner service account
# ---------------------------------------------------------------------------
echo ""
echo "=== Setting up Cloud Run service account ==="
SA_NAME="ts-ts-course-coach-runner"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

if ! gcloud iam service-accounts describe $SA_EMAIL > /dev/null 2>&1; then
    echo "  Creating service account ${SA_NAME}..."
    gcloud iam service-accounts create $SA_NAME \
        --display-name="TS Course Coach Cloud Run Service Account"
else
    echo "  Service account ${SA_NAME} already exists"
fi

for ROLE in \
    roles/datastore.user \
    roles/storage.objectAdmin \
    roles/storage.admin \
    roles/secretmanager.secretAccessor \
    roles/secretmanager.viewer \
    roles/logging.logWriter \
    roles/run.admin \
    roles/cloudbuild.builds.builder \
    roles/cloudbuild.builds.editor \
    roles/artifactregistry.writer \
    roles/iam.serviceAccountUser \
    roles/serviceusage.serviceUsageAdmin \
    roles/resourcemanager.projectViewer \
    roles/viewer; do
    echo "  Granting $ROLE to ${SA_NAME}..."
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:${SA_EMAIL}" \
        --role="$ROLE" \
        --quiet 2>/dev/null || true
done

# ---------------------------------------------------------------------------
# 5. Verify secrets exist
# ---------------------------------------------------------------------------
echo ""
echo "=== Checking required secrets ==="
MISSING_SECRETS=()
for SECRET in jwt-secret-key gemini-api-key; do
    if gcloud secrets describe $SECRET > /dev/null 2>&1; then
        echo "  ✓ $SECRET exists"
    else
        echo "  ✗ $SECRET MISSING"
        MISSING_SECRETS+=($SECRET)
    fi
done

if [ ${#MISSING_SECRETS[@]} -gt 0 ]; then
    echo ""
    echo "⚠️  Missing secrets. Create them with:"
    for SECRET in "${MISSING_SECRETS[@]}"; do
        echo "  echo -n 'YOUR_VALUE' | gcloud secrets create $SECRET --data-file=- --replication-policy=automatic"
    done
fi

# ---------------------------------------------------------------------------
# 6. Verify Firestore
# ---------------------------------------------------------------------------
echo ""
echo "=== Checking Firestore ==="
if gcloud firestore databases describe > /dev/null 2>&1; then
    echo "  ✓ Firestore database exists"
else
    echo "  ✗ Firestore database not found"
    echo "  Create it at: https://console.cloud.google.com/firestore/databases?project=$PROJECT_ID"
    echo "  Choose Native mode, us-central1 region"
fi

# ---------------------------------------------------------------------------
# 7. Wait for IAM propagation
# ---------------------------------------------------------------------------
echo ""
echo "Waiting 15 seconds for IAM propagation..."
sleep 15

echo ""
echo "=== Permissions setup complete! ==="
echo ""
echo "You can now run ./deploy.sh to deploy the application."
