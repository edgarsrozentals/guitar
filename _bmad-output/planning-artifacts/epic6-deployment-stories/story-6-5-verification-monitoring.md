# Story 6.5: Production Verification and Monitoring Setup

**Epic:** Production Deployment
**Priority:** P1 - High
**Size:** Medium
**Backend Required:** No (Verification only)

## User Story

As a product owner,
I want to verify the production deployment works end-to-end,
So that I have confidence the application is ready for users.

## Technical Context

This story performs comprehensive production verification and sets up monitoring dashboards for ongoing operations. It's the final gate before declaring production ready.

## Acceptance Criteria

### End-to-End Verification Checklist

**Given** both frontend (Vercel) and backend (Cloud Run) are deployed
**When** I perform the production verification checklist
**Then** the following scenarios pass:

1. **Homepage Performance**
   - Loads within 3 seconds
   - No JavaScript errors
   - Responsive on desktop and mobile

2. **Fretboard Functionality**
   - Displays correct chord shapes for C, G, Am, F
   - Scale overlay shows correct intervals
   - Position slider works

3. **Video Chord Player**
   - Accepts video URLs
   - Chord analysis completes for 3-minute test video
   - Chord timeline synchronizes with playback
   - Play/pause/seek work correctly

4. **Authentication**
   - Login flow works (email/password)
   - Logout works
   - Protected pages redirect to login

5. **Optional Features (if deployed)**
   - Stem separation produces results
   - Lyrics sync displays correctly

### Cloud Run Monitoring

**Given** the production environment is live
**When** I configure monitoring
**Then** Cloud Run dashboard shows:
- Request count over time
- Request latency (p50, p95, p99)
- Error rate percentage
- Memory and CPU utilization
- Instance count

### Supabase Monitoring

**Given** Supabase is the database provider
**When** I check the dashboard
**Then**:
- Database connections graph visible
- Query performance metrics available
- Storage usage tracking
- Auth user metrics visible

### Vercel Analytics

**Given** Vercel hosts the frontend
**When** I enable analytics
**Then**:
- Page load times tracked
- Web Vitals (LCP, FID, CLS) visible
- Geographic distribution of users
- Error tracking enabled

### Error Logging

**Given** an error occurs in production
**When** I check the logs
**Then**:
- Cloud Run logs include stack traces
- Request context is logged (URL, method)
- Sensitive data (API keys, credentials) is NOT logged
- Logs are retained for 30 days

### Runbook Documentation

**Given** the production deployment is verified
**When** I document the deployment
**Then** a runbook exists with:
- Service URLs (frontend and backend)
- How to view logs and metrics
- How to redeploy manually
- How to rollback to previous version
- Contact for on-call support
- Common issues and solutions

## Implementation Notes

### Production Verification Script

```bash
#!/bin/bash
# scripts/verify-production.sh

set -e

FRONTEND_URL="${FRONTEND_URL:-https://guitar-app.vercel.app}"
BACKEND_URL="${BACKEND_URL:-https://guitar-app-backend-xxx.run.app}"

echo "🔍 Production Verification"
echo "   Frontend: $FRONTEND_URL"
echo "   Backend: $BACKEND_URL"

# Test counter
PASSED=0
FAILED=0

test_endpoint() {
  local name=$1
  local url=$2
  local expected_status=${3:-200}

  status=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  if [ "$status" == "$expected_status" ]; then
    echo "   ✓ $name ($status)"
    ((PASSED++))
  else
    echo "   ✗ $name (got $status, expected $expected_status)"
    ((FAILED++))
  fi
}

echo -e "\n📡 Backend Health Checks"
test_endpoint "Health endpoint" "$BACKEND_URL/api/health"
test_endpoint "Demo songs list" "$BACKEND_URL/api/demo-songs"

echo -e "\n🌐 Frontend Page Checks"
test_endpoint "Homepage" "$FRONTEND_URL"
test_endpoint "Chords page" "$FRONTEND_URL/chords"
test_endpoint "Demo page" "$FRONTEND_URL/demo"
test_endpoint "How it works" "$FRONTEND_URL/how-it-works"

echo -e "\n📊 Performance Check"
# Measure homepage load time
START=$(date +%s%N)
curl -s "$FRONTEND_URL" > /dev/null
END=$(date +%s%N)
LOAD_TIME=$(( (END - START) / 1000000 ))
if [ $LOAD_TIME -lt 3000 ]; then
  echo "   ✓ Homepage load time: ${LOAD_TIME}ms"
  ((PASSED++))
else
  echo "   ⚠ Homepage load time: ${LOAD_TIME}ms (> 3s)"
  ((FAILED++))
fi

echo -e "\n📋 Summary"
echo "   Passed: $PASSED"
echo "   Failed: $FAILED"

if [ $FAILED -eq 0 ]; then
  echo -e "\n✅ All checks passed!"
  exit 0
else
  echo -e "\n❌ Some checks failed!"
  exit 1
fi
```

### Manual Testing Checklist

```markdown
## Production E2E Testing Checklist

### 1. Homepage
- [ ] Page loads < 3 seconds
- [ ] Fretboard displays correctly
- [ ] Navigation menu works
- [ ] Responsive on mobile (test with DevTools)

### 2. Chord Shapes
- [ ] C major shape correct
- [ ] G major shape correct
- [ ] Am shape correct
- [ ] F barre chord correct
- [ ] CAGED positions work

### 3. Scale Overlay
- [ ] Major scale intervals correct
- [ ] Minor pentatonic displays
- [ ] Blue notes highlighted

### 4. Video Chord Player
Test with a short (2-3 min) video:
- [ ] URL input accepts video
- [ ] Analysis button works
- [ ] Progress indicator during analysis
- [ ] Chord timeline appears
- [ ] Playback syncs with timeline
- [ ] Seek updates fretboard

### 5. Authentication
- [ ] Sign up works (use test email)
- [ ] Login works
- [ ] Logout works
- [ ] Protected pages redirect

### 6. Demo Songs
- [ ] Demo page lists songs
- [ ] Can play demo without login
- [ ] All features work in demo mode

### Tester: ________________
Date: ________________
Result: PASS / FAIL
Notes:
```

### Cloud Run Monitoring Dashboard

```bash
# Create monitoring dashboard (optional)
gcloud monitoring dashboards create --config-from-file=monitoring/cloud-run-dashboard.json

# View logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=guitar-app-backend" \
  --limit=100 \
  --format="table(timestamp, severity, textPayload)"

# View error logs only
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=guitar-app-backend AND severity>=ERROR" \
  --limit=50
```

### Runbook Template

```markdown
# Guitar App Production Runbook

## Service URLs
- **Frontend**: https://guitar-app.vercel.app
- **Backend API**: https://guitar-app-backend-xxx.run.app
- **Supabase Dashboard**: https://app.supabase.com/project/xxx
- **Vercel Dashboard**: https://vercel.com/team/guitar-app

## Quick Commands

### View Backend Logs
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=guitar-app-backend" --limit=100
```

### Redeploy Backend
```bash
./scripts/deploy-backend.sh latest
```

### Rollback Backend
```bash
gcloud run services update-traffic guitar-app-backend \
  --region=us-central1 \
  --to-revisions=PREVIOUS_REVISION=100
```

### Rollback Frontend
1. Go to Vercel Dashboard > Deployments
2. Find last working deployment
3. Click "..." > "Promote to Production"

## Common Issues

### CORS Errors
- Check CORS_ORIGIN secret matches frontend URL
- Verify Cloud Run allows unauthenticated access

### 502 Bad Gateway
- Check Cloud Run logs for startup errors
- Verify all secrets are accessible
- Check memory/CPU limits

### Slow Analysis
- Normal for first request (cold start)
- Check if hitting concurrency limits
- Review Cloud Run instance scaling

## On-Call Contact
- Primary: [Name] - [Phone/Slack]
- Secondary: [Name] - [Phone/Slack]
```

## Testing Checklist
- [ ] All verification script checks pass
- [ ] Manual E2E testing completed
- [ ] Homepage loads < 3 seconds
- [ ] Fretboard displays correctly
- [ ] Chord analysis works end-to-end
- [ ] Authentication flow works
- [ ] Cloud Run logs accessible
- [ ] Supabase dashboard accessible
- [ ] Vercel analytics enabled
- [ ] Runbook documented

## Rollback

If critical issues found:
1. **Frontend**: Revert in Vercel dashboard (instant)
2. **Backend**: Deploy previous image tag or revision
3. **Both**: Follow runbook procedures

## Dependencies
- Stories 6.1-6.4 complete
- All services deployed
- Test user account for auth testing

## Definition of Done
- [ ] Verification script passes
- [ ] Manual testing complete
- [ ] Monitoring dashboards configured
- [ ] Logging verified (no sensitive data)
- [ ] Runbook created and reviewed
- [ ] Team trained on runbook
- [ ] Production declared ready