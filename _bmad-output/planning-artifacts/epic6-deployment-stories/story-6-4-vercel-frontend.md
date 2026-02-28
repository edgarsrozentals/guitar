# Story 6.4: Frontend Deployment to Vercel

**Epic:** Production Deployment
**Priority:** P1 - High
**Size:** Medium
**Backend Required:** No (Frontend deployment)

## User Story

As a developer,
I want to deploy the Next.js frontend to Vercel,
So that users can access the application from a public URL.

## Technical Context

Vercel is the optimal platform for Next.js deployment, providing automatic builds, preview deployments, and edge caching. The frontend needs to communicate with the Cloud Run backend.

## Acceptance Criteria

### Repository Connection

**Given** the Next.js application in `product/app`
**When** I connect the repository to Vercel
**Then**:
- Automatic deployments are configured for the main branch
- Preview deployments are created for pull requests
- Build command is correctly detected or configured
- Root directory is set to `product/app`

### Build Configuration

**Given** the Vercel project is configured
**When** the build runs
**Then**:
- Build command: `yarn build`
- Output directory: `.next`
- Install command: `yarn install`
- Node.js version: 20.x

### Environment Variables

**Given** the frontend needs API connectivity
**When** I configure environment variables in Vercel
**Then**:
- `NEXT_PUBLIC_API_URL` points to Cloud Run backend URL
- `NEXT_PUBLIC_SUPABASE_URL` points to Supabase project
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` for client-side Supabase
- Variables are set for Production environment
- Sensitive keys are properly secured

### Deployment Success

**Given** the Vercel deployment completes
**When** I access the production URL
**Then**:
- Application loads without JavaScript errors
- Fretboard visualization renders correctly
- Navigation between pages works
- No 500 errors on any page

### API Integration

**Given** a user accesses the chord detection feature
**When** they analyze a video
**Then**:
- Requests are sent to Cloud Run backend
- CORS allows the request
- Chord detection results display correctly
- No network errors in console

### Preview Deployments

**Given** a pull request is opened
**When** Vercel detects the PR
**Then**:
- A preview deployment is created automatically
- Preview URL is posted to the PR
- Preview uses same environment config (or staging)

## Implementation Notes

### Vercel Project Setup

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Link project (run from repo root)
cd product/app
vercel link

# Configure project settings
# - Framework Preset: Next.js
# - Root Directory: product/app
# - Build Command: yarn build
# - Output Directory: .next
# - Install Command: yarn install
```

### vercel.json Configuration

```json
{
  "version": 2,
  "buildCommand": "yarn build",
  "installCommand": "yarn install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "NEXT_PUBLIC_API_URL": "@api-url",
    "NEXT_PUBLIC_SUPABASE_URL": "@supabase-url",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY": "@supabase-anon-key"
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ]
}
```

### Environment Variables Setup

In Vercel Dashboard > Project > Settings > Environment Variables:

| Variable | Value | Environments |
|----------|-------|--------------|
| NEXT_PUBLIC_API_URL | https://guitar-app-backend-xxx.run.app | Production |
| NEXT_PUBLIC_SUPABASE_URL | https://xxx.supabase.co | Production, Preview |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | eyJhbGc... | Production, Preview |

### Deployment Script

```bash
#!/bin/bash
# scripts/deploy-frontend.sh

set -e

echo "🚀 Deploying Frontend to Vercel"

# Navigate to app directory
cd product/app

# Production deployment
echo -e "\n📦 Building and deploying to production..."
vercel --prod

# Get deployment URL
PROD_URL=$(vercel ls --prod 2>/dev/null | grep guitar-app | head -1 | awk '{print $2}')

echo -e "\n✅ Deployment complete!"
echo "   Production URL: https://$PROD_URL"

# Smoke test
echo -e "\n🔍 Running smoke test..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$PROD_URL")

if [ "$HTTP_STATUS" == "200" ]; then
  echo "   ✓ Homepage loads successfully"
else
  echo "   ✗ Homepage failed (status: $HTTP_STATUS)"
  exit 1
fi

# Test chord page
CHORDS_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "https://$PROD_URL/chords")
if [ "$CHORDS_STATUS" == "200" ]; then
  echo "   ✓ Chords page loads successfully"
else
  echo "   ✗ Chords page failed (status: $CHORDS_STATUS)"
fi

echo -e "\n🎉 Frontend deployment successful!"
```

### Custom Domain Setup (Optional)

```bash
# Add custom domain
vercel domains add guitar-app.com

# Verify DNS
vercel domains inspect guitar-app.com

# Configure in Vercel Dashboard:
# 1. Add domain
# 2. Update DNS records as instructed
# 3. Wait for SSL certificate
```

### Git Integration

In Vercel Dashboard:
1. Connect GitHub repository
2. Configure:
   - Production Branch: `main`
   - Preview Branches: All other branches
   - Root Directory: `product/app`
3. Enable automatic deployments

### Environment-Specific Config

```typescript
// product/app/config/env.ts
export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4568',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,

  get isProduction() {
    return process.env.NODE_ENV === 'production';
  },

  get isDevelopment() {
    return process.env.NODE_ENV === 'development';
  }
};
```

## Smoke Test Checklist

```markdown
## Production Verification

### Page Loading
- [ ] Homepage (/) loads
- [ ] Chords page (/chords) loads
- [ ] Library page (/library) loads (redirects if not logged in)
- [ ] Demo page (/demo) loads

### Functionality
- [ ] Fretboard renders correctly
- [ ] Chord shapes display
- [ ] Scale overlay works
- [ ] Responsive on mobile

### API Integration
- [ ] Can load video URL in chord player
- [ ] Chord analysis returns results
- [ ] No CORS errors in console
- [ ] Authentication flow works

### Performance
- [ ] Initial load < 3 seconds
- [ ] No layout shifts
- [ ] Images optimized
```

## Testing Checklist
- [ ] Vercel project connected to repo
- [ ] Build command configured correctly
- [ ] Environment variables set
- [ ] Production deployment succeeds
- [ ] Preview deployments work for PRs
- [ ] Homepage loads without errors
- [ ] API connectivity verified
- [ ] Authentication works
- [ ] No console errors

## Rollback

In Vercel Dashboard:
1. Go to Deployments
2. Find previous working deployment
3. Click "..." menu
4. Select "Promote to Production"

Instant rollback with no downtime.

## Dependencies
- Story 6.2 (Cloud Run) for API URL
- Vercel account
- GitHub repository access
- Environment variable values

## Definition of Done
- [ ] Vercel project configured
- [ ] Automatic deployments working
- [ ] Preview deployments working
- [ ] All environment variables set
- [ ] Production URL accessible
- [ ] API integration verified
- [ ] Smoke test passed
- [ ] Documentation updated