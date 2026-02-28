# Story 6.1: Backend Containerization with Multi-Runtime Support

**Epic:** Production Deployment
**Priority:** P1 - High
**Size:** Medium
**Backend Required:** Yes

## User Story

As a DevOps engineer,
I want to containerize the backend with Node.js, Python, and ffmpeg,
So that the application can be deployed consistently to Cloud Run.

## Technical Context

The backend requires Node.js for Express, Python for Essentia chord detection, and ffmpeg for audio processing. All must be available in a single container image for Cloud Run deployment.

## Acceptance Criteria

### Multi-Runtime Image

**Given** the backend Express.js application with Python chord detection scripts
**When** I build the Docker image using the Dockerfile
**Then**:
- Image includes Node.js 20 LTS runtime
- Image includes Python 3.11 with Essentia library installed
- Image includes ffmpeg for audio processing
- Image includes yt-dlp for video downloading
- Image size is under 2GB (ideally under 1.5GB)

### Port Configuration

**Given** Cloud Run expects port 8080
**When** the container is configured
**Then**:
- Container exposes port 8080 (Cloud Run default)
- Express server listens on PORT environment variable

### Local Testing

**Given** a built Docker image
**When** I run the container locally
**Then**:
- `docker run -p 4568:8080 guitar-app-backend` starts successfully
- Health check endpoint `/api/health` returns 200 OK
- Chord detection endpoint accepts requests and invokes Python successfully
- Audio extraction endpoint works with yt-dlp and ffmpeg

### Security Configuration

**Given** the Dockerfile is reviewed
**When** checking security best practices
**Then**:
- Non-root user is configured for running the application
- No sensitive data in image layers
- `.dockerignore` excludes unnecessary files

### Build Optimization

**Given** the Dockerfile uses multi-stage build
**When** the image is built
**Then**:
- Build dependencies are not in final image
- Node modules are production-only
- Python virtual environment is optimized
- Layer caching is effective for iterative builds

## Implementation Notes

### Dockerfile

```dockerfile
# Backend Dockerfile
# Multi-stage build for Node.js + Python + ffmpeg

# ==================== BUILDER STAGE ====================
FROM node:20-bookworm AS builder

WORKDIR /app

# Install dependencies
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=false

# Copy source and build
COPY . .
RUN yarn build

# Prune dev dependencies
RUN yarn install --frozen-lockfile --production=true

# ==================== PYTHON STAGE ====================
FROM python:3.11-slim-bookworm AS python-deps

# Install Python dependencies
RUN pip install --no-cache-dir \
    essentia \
    numpy \
    scipy

# ==================== FINAL STAGE ====================
FROM node:20-bookworm-slim

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp
RUN pip3 install --no-cache-dir yt-dlp

# Copy Python packages from python-deps stage
COPY --from=python-deps /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Set working directory
WORKDIR /app

# Copy built application from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Copy Python scripts
COPY --from=builder /app/src/*.py ./src/

# Create temp directory for audio processing
RUN mkdir -p /app/temp && chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Cloud Run expects PORT env var
ENV PORT=8080
ENV NODE_ENV=production

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

# Start command
CMD ["node", "dist/server.js"]
```

### .dockerignore

```
# .dockerignore
node_modules
.git
.gitignore
*.md
!README.md
.env*
.vscode
.idea
coverage
test
tests
__tests__
*.test.ts
*.spec.ts
.nyc_output
*.log
temp
audio
stems
lyrics
songs-metadata.json
Dockerfile*
docker-compose*
.docker
_bmad*
```

### Build and Test Commands

```bash
# Build the image
docker build -t guitar-app-backend:latest -f backend/Dockerfile backend/

# Check image size
docker images guitar-app-backend:latest

# Run locally
docker run -p 4568:8080 \
  -e SUPABASE_URL="$SUPABASE_URL" \
  -e SUPABASE_SERVICE_ROLE_KEY="$SUPABASE_SERVICE_ROLE_KEY" \
  guitar-app-backend:latest

# Test health endpoint
curl http://localhost:4568/api/health

# Test chord detection (requires actual setup)
curl -X POST http://localhost:4568/api/songs/test123/analyze \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TEST_TOKEN"
```

### Verify Python Works

```bash
# Shell into container and test Python
docker run -it guitar-app-backend:latest /bin/bash

# In container
python3 -c "import essentia; print('Essentia:', essentia.__version__)"
python3 -c "import numpy; print('NumPy:', numpy.__version__)"
which ffmpeg
which yt-dlp
```

## Testing Checklist
- [ ] Image builds successfully
- [ ] Image size under 2GB
- [ ] Node.js available and correct version
- [ ] Python 3.11 available
- [ ] Essentia library imports correctly
- [ ] ffmpeg executable works
- [ ] yt-dlp executable works
- [ ] Server starts on port 8080
- [ ] Health endpoint returns 200
- [ ] Non-root user is used
- [ ] Chord detection Python script runs

## Rollback

Remove Dockerfile and revert to local development workflow:
- Delete `backend/Dockerfile`
- Delete `backend/.dockerignore`
- Continue using local `yarn dev` workflow

## Dependencies
- Docker installed locally
- Access to base images (node, python)
- Understanding of multi-stage builds

## Definition of Done
- [ ] Dockerfile created and tested
- [ ] .dockerignore configured
- [ ] Image builds under 2GB
- [ ] All runtimes verified working
- [ ] Health check passes
- [ ] Security best practices followed
- [ ] Documentation for build/run added