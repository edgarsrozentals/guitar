# Story 6.2: Cloud Run Service Deployment

**Epic:** Production Deployment
**Priority:** P1 - High
**Size:** Medium
**Backend Required:** Yes

## User Story

As a DevOps engineer,
I want to deploy the containerized backend to Cloud Run,
So that the API is accessible from the internet with appropriate resource limits.

## Technical Context

Cloud Run provides serverless container deployment with automatic scaling. The backend requires specific resource configuration for CPU-intensive chord analysis tasks.

## Acceptance Criteria

### Container Registry Push

**Given** a Docker image built from Story 6.1
**When** I push to Google Artifact Registry
**Then**:
- Image is tagged with version and latest
- Image is accessible for Cloud Run deployment
- Registry is in the same region as Cloud Run service

### Cloud Run Service Configuration

**Given** the image is in Artifact Registry
**When** I deploy to Cloud Run
**Then**:
- Service is created with 2GB memory allocation
- Service is configured with 2 vCPU
- Request timeout is set to 300 seconds (5 minutes)
- Maximum concurrent requests per instance is 10
- Minimum instances is 0 (scale to zero)
- Maximum instances is 5 (cost control)

### Service Accessibility

**Given** the Cloud Run service is deployed
**When** I access the service URL
**Then**:
- `/api/health` endpoint returns 200 OK within 5 seconds
- HTTPS is automatically configured by Cloud Run
- Service URL is stable and can be used by frontend

### Long-Running Request Support

**Given** a long-running chord analysis request
**When** the analysis takes up to 4 minutes
**Then**:
- Request completes successfully without timeout
- Cloud Run logs show the request duration
- No premature connection termination

### Deployment Commands

**Given** the gcloud CLI is configured
**When** I run deployment commands
**Then**:
- Deployment completes without errors
- Service status shows "Ready"
- Revision is active and serving traffic

## Implementation Notes

### Artifact Registry Setup

```bash
# Create Artifact Registry repository (one-time)
gcloud artifacts repositories create guitar-app \
  --repository-format=docker \
  --location=us-central1 \
  --description="Guitar App container images"

# Configure Docker authentication
gcloud auth configure-docker us-central1-docker.pkg.dev

# Tag and push image
docker tag guitar-app-backend:latest \
  us-central1-docker.pkg.dev/PROJECT_ID/guitar-app/backend:latest

docker push us-central1-docker.pkg.dev/PROJECT_ID/guitar-app/backend:latest

# Also tag with version
docker tag guitar-app-backend:latest \
  us-central1-docker.pkg.dev/PROJECT_ID/guitar-app/backend:v1.0.0

docker push us-central1-docker.pkg.dev/PROJECT_ID/guitar-app/backend:v1.0.0
```

### Cloud Run Deployment

```bash
# Deploy to Cloud Run
gcloud run deploy guitar-app-backend \
  --image=us-central1-docker.pkg.dev/PROJECT_ID/guitar-app/backend:latest \
  --region=us-central1 \
  --platform=managed \
  --memory=2Gi \
  --cpu=2 \
  --timeout=300s \
  --concurrency=10 \
  --min-instances=0 \
  --max-instances=5 \
  --port=8080 \
  --allow-unauthenticated \
  --set-env-vars="NODE_ENV=production"
```

### Cloud Run Service YAML

```yaml
# cloud-run-service.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: guitar-app-backend
  labels:
    cloud.googleapis.com/location: us-central1
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "0"
        autoscaling.knative.dev/maxScale: "5"
        run.googleapis.com/cpu-throttling: "false"
    spec:
      containerConcurrency: 10
      timeoutSeconds: 300
      containers:
        - image: us-central1-docker.pkg.dev/PROJECT_ID/guitar-app/backend:latest
          ports:
            - containerPort: 8080
          resources:
            limits:
              memory: 2Gi
              cpu: "2"
          env:
            - name: NODE_ENV
              value: production
            - name: PORT
              value: "8080"
```

### Deployment Script

```bash
#!/bin/bash
# scripts/deploy-backend.sh

set -e

PROJECT_ID="your-project-id"
REGION="us-central1"
SERVICE_NAME="guitar-app-backend"
IMAGE_TAG="${1:-latest}"

echo "🚀 Deploying Guitar App Backend"
echo "   Project: $PROJECT_ID"
echo "   Region: $REGION"
echo "   Image Tag: $IMAGE_TAG"

# Build and push image
echo -e "\n📦 Building Docker image..."
docker build -t guitar-app-backend:$IMAGE_TAG -f backend/Dockerfile backend/

echo -e "\n📤 Pushing to Artifact Registry..."
docker tag guitar-app-backend:$IMAGE_TAG \
  us-central1-docker.pkg.dev/$PROJECT_ID/guitar-app/backend:$IMAGE_TAG

docker push us-central1-docker.pkg.dev/$PROJECT_ID/guitar-app/backend:$IMAGE_TAG

# Deploy to Cloud Run
echo -e "\n☁️ Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image=us-central1-docker.pkg.dev/$PROJECT_ID/guitar-app/backend:$IMAGE_TAG \
  --region=$REGION \
  --platform=managed \
  --memory=2Gi \
  --cpu=2 \
  --timeout=300s \
  --concurrency=10 \
  --min-instances=0 \
  --max-instances=5 \
  --port=8080 \
  --allow-unauthenticated \
  --quiet

# Get service URL
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
  --region=$REGION \
  --format='value(status.url)')

echo -e "\n✅ Deployment complete!"
echo "   Service URL: $SERVICE_URL"

# Smoke test
echo -e "\n🔍 Running smoke test..."
HEALTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SERVICE_URL/api/health")

if [ "$HEALTH_STATUS" == "200" ]; then
  echo "   ✓ Health check passed"
else
  echo "   ✗ Health check failed (status: $HEALTH_STATUS)"
  exit 1
fi

echo -e "\n🎉 Deployment successful!"
```

### Smoke Test

```bash
# Get service URL
SERVICE_URL=$(gcloud run services describe guitar-app-backend \
  --region=us-central1 \
  --format='value(status.url)')

# Test health endpoint
curl -v "$SERVICE_URL/api/health"
# Expected: {"status":"ok"}

# Test with timing
time curl -s "$SERVICE_URL/api/health"
# Expected: < 5 seconds
```

## Testing Checklist
- [ ] Image pushed to Artifact Registry
- [ ] Cloud Run service created
- [ ] Memory configured to 2GB
- [ ] CPU configured to 2
- [ ] Timeout configured to 300s
- [ ] Concurrency configured to 10
- [ ] Min instances = 0
- [ ] Max instances = 5
- [ ] Health endpoint returns 200
- [ ] HTTPS working automatically
- [ ] Long request (4 min) completes

## Rollback

Delete Cloud Run service:
```bash
gcloud run services delete guitar-app-backend \
  --region=us-central1 \
  --quiet
```

Or rollback to previous revision:
```bash
gcloud run services update-traffic guitar-app-backend \
  --region=us-central1 \
  --to-revisions=PREVIOUS_REVISION=100
```

## Dependencies
- Story 6.1 (Containerization) complete
- GCP project with Cloud Run enabled
- gcloud CLI configured
- Artifact Registry repository created

## Definition of Done
- [ ] Image in Artifact Registry
- [ ] Cloud Run service deployed
- [ ] Resource limits configured
- [ ] Health check passes
- [ ] Service URL accessible
- [ ] Long-running requests work
- [ ] Deployment script created
- [ ] Service URL documented