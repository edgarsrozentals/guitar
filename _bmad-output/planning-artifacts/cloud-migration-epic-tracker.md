# Cloud Migration Epic Tracker

**Project:** Guitar Practice App
**Created:** 2026-01-03
**Purpose:** Track progress across all cloud migration and platform preparation epics

---

## Overview

This document tracks the 7 epics required to migrate the guitar app from local file storage to cloud infrastructure, preparing it for production deployment with scalable multi-tenant architecture.

| Epic | Name | Stories | Priority | Status |
|------|------|---------|----------|--------|
| 1 | Cloud Song Storage | 7 | P0 - Critical | Not Started |
| 2 | Existing Song Migration | 4 | P0 - Critical | Not Started |
| 3 | Song Library UI | 5 | P1 - High | Not Started |
| 4 | Demo Songs & Public Access | 5 | P1 - High | Not Started |
| 5 | Platform-Neutral Branding | 4 | P2 - Medium | Not Started |
| 6 | Production Deployment | 5 | P1 - High | Not Started |
| 7 | Admin Panel | 5 | P3 - Low | Deferred |
| 12 | Chordify Ground Truth | 6 | P2 - Medium | **In Progress** |

**Total Stories:** 41 (35 cloud migration + 6 Chordify)

---

## Epic 1: Cloud Song Storage

**Goal:** Replace local file storage with Supabase Storage and database
**Priority:** P0 - Critical (Foundation for all other epics)
**Dependencies:** None
**Location:** `epic1-cloud-storage-stories/`

| Story | Title | Size | Backend | Status |
|-------|-------|------|---------|--------|
| 1.1 | Database Schema & RLS Policies | Medium | Yes | Not Started |
| 1.2 | Supabase Storage Bucket Configuration | Small | Yes | Not Started |
| 1.3 | Authentication Middleware & Signed URLs | Medium | Yes | Not Started |
| 1.4 | Upload Song & List Songs API | Large | Yes | Not Started |
| 1.5 | Chord Analysis CRUD API | Medium | Yes | Not Started |
| 1.6 | Stems & Lyrics Upload/Retrieval API | Medium | Yes | Not Started |
| 1.7 | Frontend Library Integration | Large | No | Not Started |

**Key Deliverables:**
- Supabase database with songs, chord_analyses, stems, lyrics tables
- RLS policies for multi-tenant isolation
- JWT-authenticated API endpoints
- Signed URL generation for secure file access
- React hooks for library operations

---

## Epic 2: Existing Song Migration

**Goal:** Migrate 17 existing songs from local storage to Supabase
**Priority:** P0 - Critical
**Dependencies:** Epic 1 complete
**Location:** `epic2-song-migration-stories/`

| Story | Title | Size | Backend | Status |
|-------|-------|------|---------|--------|
| 2.1 | Migration Script with Dry-Run Mode | Medium | Yes | Not Started |
| 2.2 | Execute Migration Transfer | Medium | Yes | Not Started |
| 2.3 | Verify Migration Data Integrity | Small | Yes | Not Started |
| 2.4 | Remove Local File Serving | Small | Yes | Not Started |

**Key Deliverables:**
- Migration script with dry-run mode
- All 17 songs transferred to Supabase
- Data integrity verification report
- Deprecated endpoints removed

---

## Epic 3: Song Library UI

**Goal:** Full-featured library interface for managing user songs
**Priority:** P1 - High
**Dependencies:** Epic 1.7 complete
**Location:** `epic3-library-ui-stories/`

| Story | Title | Size | Backend | Status |
|-------|-------|------|---------|--------|
| 3.1 | Library Page with Grid/List View | Large | No | Not Started |
| 3.2 | Song Metadata Display & Status Indicators | Medium | No | Not Started |
| 3.3 | Search & Filter Functionality | Medium | No | Not Started |
| 3.4 | Delete Song with Confirmation | Small | Yes | Not Started |
| 3.5 | Recent Songs Tracking & Display | Medium | No | Not Started |

**Key Deliverables:**
- `/library` page with responsive grid/list views
- Search by title/artist with status filters
- Delete with confirmation and cascade
- Recent songs in localStorage with quick access

---

## Epic 4: Demo Songs & Public Access

**Goal:** Showcase features to visitors without requiring signup
**Priority:** P1 - High
**Dependencies:** Epic 1 complete
**Location:** `epic4-demo-songs-stories/`

| Story | Title | Size | Backend | Status |
|-------|-------|------|---------|--------|
| 4.1 | Demo Songs Database Schema & API | Medium | Yes | Not Started |
| 4.2 | Demo Storage Bucket & Content Seeding | Medium | Yes | Not Started |
| 4.3 | Demo Song Selection Page | Medium | No | Not Started |
| 4.4 | Read-Only Demo Player Experience | Medium | No | Not Started |
| 4.5 | Marketing CTAs & Landing Page | Large | No | Not Started |

**Key Deliverables:**
- Demo songs table with public RLS policies
- `/demo` page with song selection
- Read-only player with disabled save features
- Landing page with CTAs and How It Works section

---

## Epic 5: Platform-Neutral Branding

**Goal:** Remove YouTube-specific references for broader platform support
**Priority:** P2 - Medium
**Dependencies:** Can run parallel to other epics
**Location:** `epic5-debranding-stories/`

| Story | Title | Size | Backend | Status |
|-------|-------|------|---------|--------|
| 5.1 | Rename Folder Structure | Small | No | Not Started |
| 5.2 | Update Component & Type Names | Medium | No | Not Started |
| 5.3 | Update User-Facing Text & Placeholders | Small | No | Not Started |
| 5.4 | Update Documentation & Verify | Small | No | Not Started |

**Key Deliverables:**
- `youtube/` folder renamed to `video/`
- All YouTube* components renamed to Video*
- Generic UI text ("Paste video URL" instead of "Paste YouTube URL")
- Updated documentation

---

## Epic 6: Production Deployment

**Goal:** Deploy backend to Cloud Run and frontend to Vercel
**Priority:** P1 - High
**Dependencies:** Epics 1-4 complete
**Location:** `epic6-deployment-stories/`

| Story | Title | Size | Backend | Status |
|-------|-------|------|---------|--------|
| 6.1 | Backend Containerization (Multi-Runtime) | Medium | Yes | Not Started |
| 6.2 | Cloud Run Service Deployment | Medium | Yes | Not Started |
| 6.3 | Secrets & Environment Configuration | Medium | Yes | Not Started |
| 6.4 | Frontend Deployment to Vercel | Medium | No | Not Started |
| 6.5 | Production Verification & Monitoring | Medium | No | Not Started |

**Key Deliverables:**
- Docker image with Node.js + Python + ffmpeg
- Cloud Run deployment with 2GB memory, 2 vCPU
- Secret Manager integration for API keys
- Vercel deployment with environment variables
- Production runbook and monitoring

---

## Epic 7: Admin Panel (Deferred)

**Goal:** Administrative interface for user and content management
**Priority:** P3 - Low (Future Enhancement)
**Dependencies:** Epics 1-6 complete
**Location:** `epic7-admin-panel-stories/`

| Story | Title | Size | Backend | Status |
|-------|-------|------|---------|--------|
| 7.1 | Admin Role & Authentication | Medium | Yes | Deferred |
| 7.2 | User Management Dashboard | Large | Yes | Deferred |
| 7.3 | Song Moderation Interface | Medium | Yes | Deferred |
| 7.4 | Analytics Dashboard | Medium | Yes | Deferred |
| 7.5 | System Settings & Configuration | Medium | Yes | Deferred |

**Key Deliverables (Future):**
- Admin role system with JWT claims
- User list, detail, ban/delete capabilities
- Song moderation with flag/remove/promote
- Platform analytics and usage stats
- Runtime feature flags and settings

---

## Implementation Order (Recommended)

### Phase 1: Foundation (Weeks 1-2)
1. Epic 1: Stories 1.1 → 1.2 → 1.3 → 1.4 → 1.5 → 1.6 → 1.7

### Phase 2: Data Migration (Week 3)
2. Epic 2: Stories 2.1 → 2.2 → 2.3 → 2.4

### Phase 3: User Experience (Weeks 4-5)
3. Epic 3: Stories 3.1 → 3.2 → 3.3 → 3.4 → 3.5
4. Epic 4: Stories 4.1 → 4.2 → 4.3 → 4.4 → 4.5

### Phase 4: Polish & Deploy (Week 6)
5. Epic 5: Stories 5.1 → 5.2 → 5.3 → 5.4 (can run in parallel)
6. Epic 6: Stories 6.1 → 6.2 → 6.3 → 6.4 → 6.5

### Phase 5: Operations (Future)
7. Epic 7: All stories (deferred until post-launch)

---

## Key Technical Decisions

### Storage
- **Supabase Storage** for audio files, stems, lyrics
- **Signed URLs** with 1-hour expiry for secure access
- **File structure:** `{user_id}/{song_id}/audio.mp3`

### Database
- **JSONB columns** for chord analysis data
- **RLS policies** for multi-tenant isolation
- **Foreign keys** with ON DELETE CASCADE

### Authentication
- **Supabase Auth** with JWT tokens
- **Server-side validation** in Express middleware
- **Session refresh** for long operations

### Deployment
- **Cloud Run** for backend (serverless containers)
- **Vercel** for frontend (Next.js optimized)
- **Secret Manager** for API keys

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Large file uploads fail | High | Chunked upload, retry logic |
| Migration data loss | Critical | Dry-run mode, backups, verification |
| Cold start latency | Medium | Minimum instances, health probes |
| Storage costs exceed budget | Medium | User limits, monitoring alerts |
| Auth token expiry during analysis | High | Token refresh, graceful handling |

---

## Success Metrics

- [ ] All 17 existing songs migrated successfully
- [ ] New song upload works end-to-end
- [ ] Chord analysis completes within 4 minutes
- [ ] Demo songs accessible without login
- [ ] Production deployment stable for 24 hours
- [ ] No user data visible to other users (RLS verified)

---

## Story File Locations

```
_bmad-output/planning-artifacts/
├── cloud-migration-epic-tracker.md (this file)
├── epic1-cloud-storage-stories/
│   ├── story-1-1-database-schema.md
│   ├── story-1-2-storage-bucket-config.md
│   ├── story-1-3-auth-middleware.md
│   ├── story-1-4-upload-song-api.md
│   ├── story-1-5-chord-analysis-api.md
│   ├── story-1-6-stems-lyrics-api.md
│   └── story-1-7-frontend-integration.md
├── epic2-song-migration-stories/
│   ├── story-2-1-migration-script.md
│   ├── story-2-2-execute-transfer.md
│   ├── story-2-3-verify-migration.md
│   └── story-2-4-remove-local-files.md
├── epic3-library-ui-stories/
│   ├── story-3-1-library-page.md
│   ├── story-3-2-metadata-display.md
│   ├── story-3-3-search-filter.md
│   ├── story-3-4-delete-song.md
│   └── story-3-5-recent-songs.md
├── epic4-demo-songs-stories/
│   ├── story-4-1-demo-schema-api.md
│   ├── story-4-2-storage-seeding.md
│   ├── story-4-3-demo-selection-page.md
│   ├── story-4-4-demo-player.md
│   └── story-4-5-marketing-ctas.md
├── epic5-debranding-stories/
│   ├── story-5-1-rename-folder-files.md
│   ├── story-5-2-update-component-names.md
│   ├── story-5-3-update-ui-text.md
│   └── story-5-4-update-documentation.md
├── epic6-deployment-stories/
│   ├── story-6-1-containerization.md
│   ├── story-6-2-cloud-run-deploy.md
│   ├── story-6-3-secrets-config.md
│   ├── story-6-4-vercel-frontend.md
│   └── story-6-5-verification-monitoring.md
└── epic7-admin-panel-stories/
    ├── story-7-1-admin-auth.md
    ├── story-7-2-user-management.md
    ├── story-7-3-song-moderation.md
    ├── story-7-4-analytics-dashboard.md
    └── story-7-5-system-settings.md
```
