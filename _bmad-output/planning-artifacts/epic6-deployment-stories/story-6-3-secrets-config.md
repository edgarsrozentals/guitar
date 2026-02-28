# Story 6.3: Secrets and Environment Configuration

**Epic:** Production Deployment
**Priority:** P1 - High
**Size:** Medium
**Backend Required:** Yes

## User Story

As a DevOps engineer,
I want to configure secrets securely in Cloud Run,
So that API keys and database credentials are not exposed in code or logs.

## Technical Context

Production secrets must be stored in Google Secret Manager and accessed by Cloud Run at runtime. This ensures secure credential management without hardcoding sensitive values.

## Acceptance Criteria

### Secret Manager Setup

**Given** the following secrets need to be configured:
- SUPABASE_URL
- SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- LALALAI_API_KEY (stem separation)
- ASSEMBLYAI_API_KEY (lyrics transcription)

**When** I create secrets in Google Secret Manager
**Then**:
- Each secret is stored with appropriate IAM permissions
- Secrets are created in the same project as Cloud Run
- Secret values are not logged during creation

### IAM Configuration

**Given** secrets exist in Secret Manager
**When** I configure IAM permissions
**Then**:
- Cloud Run service account has `secretAccessor` role for each secret
- No other service accounts have access to production secrets
- Least privilege principle is followed

### Cloud Run Secret Mounting

**Given** IAM is configured correctly
**When** I update the Cloud Run service configuration
**Then**:
- Each secret is mounted as an environment variable
- Application can read secrets via `process.env`
- Secrets are not visible in Cloud Run YAML exports
- Secrets are not visible in Cloud Run logs

### CORS Configuration

**Given** the backend needs to connect to the production frontend
**When** I configure the CORS_ORIGIN environment variable
**Then**:
- CORS is restricted to the Vercel production domain
- Requests from other origins receive 403 Forbidden
- Development origins are NOT allowed in production

### Secret Rotation Support

**Given** a secret needs to be rotated
**When** I update the secret in Secret Manager and redeploy
**Then**:
- The new secret value is available to the application
- No code changes are required for rotation
- Minimal downtime during rotation

## Implementation Notes

### Create Secrets in Secret Manager

```bash
#!/bin/bash
# scripts/setup-secrets.sh

PROJECT_ID="your-project-id"

# Create secrets (one-time setup)
echo "Creating secrets in Secret Manager..."

# Supabase URL
echo -n "your-supabase-url" | gcloud secrets create SUPABASE_URL \
  --project=$PROJECT_ID \
  --replication-policy="automatic" \
  --data-file=-

# Supabase Anon Key
echo -n "your-anon-key" | gcloud secrets create SUPABASE_ANON_KEY \
  --project=$PROJECT_ID \
  --replication-policy="automatic" \
  --data-file=-

# Supabase Service Role Key
echo -n "your-service-role-key" | gcloud secrets create SUPABASE_SERVICE_ROLE_KEY \
  --project=$PROJECT_ID \
  --replication-policy="automatic" \
  --data-file=-

# LALAL.AI API Key
echo -n "your-lalalai-key" | gcloud secrets create LALALAI_API_KEY \
  --project=$PROJECT_ID \
  --replication-policy="automatic" \
  --data-file=-

# AssemblyAI API Key
echo -n "your-assemblyai-key" | gcloud secrets create ASSEMBLYAI_API_KEY \
  --project=$PROJECT_ID \
  --replication-policy="automatic" \
  --data-file=-

# Frontend URL for CORS
echo -n "https://guitar-app.vercel.app" | gcloud secrets create CORS_ORIGIN \
  --project=$PROJECT_ID \
  --replication-policy="automatic" \
  --data-file=-

echo "✓ Secrets created"
```

### Grant IAM Permissions

```bash
#!/bin/bash
# scripts/grant-secret-access.sh

PROJECT_ID="your-project-id"
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

SECRETS=(
  "SUPABASE_URL"
  "SUPABASE_ANON_KEY"
  "SUPABASE_SERVICE_ROLE_KEY"
  "LALALAI_API_KEY"
  "ASSEMBLYAI_API_KEY"
  "CORS_ORIGIN"
)

echo "Granting secret access to Cloud Run service account..."

for SECRET in "${SECRETS[@]}"; do
  gcloud secrets add-iam-policy-binding $SECRET \
    --project=$PROJECT_ID \
    --member="serviceAccount:$SERVICE_ACCOUNT" \
    --role="roles/secretmanager.secretAccessor"
  echo "  ✓ $SECRET"
done

echo "✓ IAM permissions granted"
```

### Deploy with Secrets

```bash
# Deploy with secrets mounted as environment variables
gcloud run deploy guitar-app-backend \
  --image=us-central1-docker.pkg.dev/PROJECT_ID/guitar-app/backend:latest \
  --region=us-central1 \
  --platform=managed \
  --memory=2Gi \
  --cpu=2 \
  --timeout=300s \
  --concurrency=10 \
  --set-secrets="\
SUPABASE_URL=SUPABASE_URL:latest,\
SUPABASE_ANON_KEY=SUPABASE_ANON_KEY:latest,\
SUPABASE_SERVICE_ROLE_KEY=SUPABASE_SERVICE_ROLE_KEY:latest,\
LALALAI_API_KEY=LALALAI_API_KEY:latest,\
ASSEMBLYAI_API_KEY=ASSEMBLYAI_API_KEY:latest,\
CORS_ORIGIN=CORS_ORIGIN:latest"
```

### CORS Configuration in Express

```typescript
// backend/src/middleware/cors.ts
import cors from 'cors';

const corsOptions = {
  origin: (origin: string | undefined, callback: Function) => {
    // Get allowed origin from environment
    const allowedOrigin = process.env.CORS_ORIGIN;

    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) {
      return callback(null, true);
    }

    // Check if origin matches
    if (origin === allowedOrigin) {
      return callback(null, true);
    }

    // Development override (only if not production)
    if (process.env.NODE_ENV !== 'production' &&
        origin.includes('localhost')) {
      return callback(null, true);
    }

    // Reject other origins
    return callback(new Error('Not allowed by CORS'), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

export const corsMiddleware = cors(corsOptions);
```

### Secret Rotation Procedure

```bash
#!/bin/bash
# scripts/rotate-secret.sh

SECRET_NAME=$1
NEW_VALUE=$2
PROJECT_ID="your-project-id"

if [ -z "$SECRET_NAME" ] || [ -z "$NEW_VALUE" ]; then
  echo "Usage: ./rotate-secret.sh SECRET_NAME NEW_VALUE"
  exit 1
fi

echo "Rotating secret: $SECRET_NAME"

# Add new secret version
echo -n "$NEW_VALUE" | gcloud secrets versions add $SECRET_NAME \
  --project=$PROJECT_ID \
  --data-file=-

echo "✓ New secret version created"

# Force Cloud Run to pick up new secret
# (Cloud Run uses :latest which auto-updates, but a redeploy ensures it)
echo "Redeploying Cloud Run service..."
gcloud run services update guitar-app-backend \
  --region=us-central1 \
  --update-secrets="$SECRET_NAME=$SECRET_NAME:latest"

echo "✓ Secret rotated and deployed"
```

### Verify Secrets Not Exposed

```bash
# Export service YAML and verify no secret values
gcloud run services describe guitar-app-backend \
  --region=us-central1 \
  --format=yaml

# Should show something like:
# env:
#   - name: SUPABASE_URL
#     valueFrom:
#       secretKeyRef:
#         name: SUPABASE_URL
#         key: latest

# NOT:
# env:
#   - name: SUPABASE_URL
#     value: "actual-secret-value"  # BAD!
```

## Testing Checklist
- [ ] All secrets created in Secret Manager
- [ ] IAM permissions granted correctly
- [ ] Cloud Run mounts secrets as env vars
- [ ] App reads secrets from process.env
- [ ] Secrets not visible in YAML export
- [ ] Secrets not logged anywhere
- [ ] CORS restricts to production frontend
- [ ] Development CORS works locally
- [ ] Secret rotation procedure tested

## Rollback

Remove secret references:
```bash
gcloud run services update guitar-app-backend \
  --region=us-central1 \
  --clear-secrets
```

Secrets remain in Secret Manager for audit purposes.

## Dependencies
- Story 6.2 (Cloud Run Deployment) complete
- GCP Secret Manager API enabled
- Production secret values available

## Definition of Done
- [ ] All secrets in Secret Manager
- [ ] IAM permissions configured
- [ ] Cloud Run uses secrets correctly
- [ ] CORS properly configured
- [ ] Secrets not exposed in logs
- [ ] Rotation procedure documented
- [ ] Security review passed