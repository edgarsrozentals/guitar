---
title: 'Guitar App - Product Requirements Document'
version: '1.0'
date: '2026-01-03'
author: 'Winston (Architect Agent)'
stakeholder: 'Edgars'
status: 'Draft'
---

# Product Requirements Document

## Guitar Learning & Chord Visualization App

---

## 1. Executive Summary

### 1.1 Vision

A comprehensive guitar learning application that enables musicians to learn any song by visualizing real-time chord changes on an interactive CAGED fretboard, with stem separation for practice, karaoke-style lyrics, and cloud-synced user libraries.

### 1.2 Problem Statement

Guitar learners who want to play along with their favorite songs face significant friction:

| Problem | Impact |
|---------|--------|
| Finding accurate chord charts is unreliable | Wasted time, frustration |
| Existing solutions have poor fretboard visualization | Static chord boxes don't show fingering options |
| No ability to choose fretboard position/fingering | Forces uncomfortable hand positions |
| Difficult to practice at slower speeds | Can't master difficult passages |
| No instrument isolation | Can't hear your own playing clearly |
| No synchronized lyrics | Hard to sing while playing |
| Settings not saved across devices | Lose personalized preferences |
| Song libraries are global, not personal | No ownership, privacy concerns |

### 1.3 Solution

An integrated platform combining:

1. **AI-Powered Chord Detection** — Analyze audio from video URLs or uploaded files
2. **Interactive CAGED Fretboard** — Real-time chord visualization with position selection
3. **Stem Separation** — Isolate vocals, drums, bass, guitar for practice
4. **Karaoke Lyrics** — Word-level synchronized lyrics display
5. **Cloud User Library** — Personal song collection with synced settings
6. **Practice Tools** — Speed control, loop sections, chord anticipation

### 1.4 Two Core Use Cases

| Use Case | Description | Key Features |
|----------|-------------|--------------|
| **Guitar Training** | Learn songs at your own pace, master difficult sections, understand chord progressions | Chord visualization, speed control, loop sections, fretboard positions |
| **Home Performance** | Be the guitarist in any band — mute the original guitar from famous recordings and play your own part with a full backing band | Stem separation, lyrics display, full playback sync |

The "Home Performance" concept transforms the app from a learning tool into a personal concert experience. Users can take any famous live recording, separate the stems, mute the guitar track, and perform as if they're on stage with a world-class rhythm section. No drummer or bass player needed — just you, your guitar, and the backing band of your favorite artists.

This positioning appeals to:
- **Hobbyists** who want to jam along with their heroes
- **Solo performers** practicing for gigs without a full band
- **Content creators** making cover videos with professional backing tracks

### 1.5 Business Value

| Benefit | Impact |
|---------|--------|
| **Differentiation** | Superior fretboard visualization + practice tools vs. competitors |
| **Dual positioning** | Learning tool AND performance companion |
| **Monetization** | Freemium model with premium features |
| **Cost efficiency** | Process once per user, potential future sharing |
| **User retention** | Personal library creates stickiness |
| **Scalability** | Cloud-native architecture supports growth |

---

## 2. User Personas

### 2.1 Primary: Hobbyist Guitarist

- **Age**: 25-45
- **Skill**: Beginner to intermediate
- **Goal**: Learn to play favorite songs
- **Pain**: Can't find accurate chords, struggles with tempo
- **Tech**: Comfortable with web apps, uses mobile and desktop

### 2.2 Secondary: Music Teacher

- **Age**: 30-55
- **Skill**: Advanced
- **Goal**: Create teaching materials, demonstrate songs to students
- **Pain**: Needs to isolate instruments, adjust tempo for students
- **Tech**: Uses laptop/tablet in teaching sessions

### 2.3 Future: Content Creator

- **Age**: 20-35
- **Skill**: Intermediate to advanced
- **Goal**: Create guitar covers, tutorials
- **Pain**: Needs accurate chord transcriptions quickly
- **Tech**: Power user, values efficiency

---

## 3. Goals & Success Metrics

### 3.1 Business Goals

| ID | Goal | Priority |
|----|------|----------|
| BG-1 | Enable users to learn any song with accurate chord visualization | Critical |
| BG-2 | Build personal song libraries with cloud sync | Critical |
| BG-3 | Provide superior UX vs. competitors through CAGED position selection | High |
| BG-4 | Offer karaoke-style lyrics for singing while playing | High |
| BG-5 | Foundation for freemium monetization | High |
| BG-6 | Admin capabilities for content management | Medium |

### 3.2 Success Metrics (KPIs)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Song processing success rate | >95% | API metrics |
| Chord detection accuracy | 70-80% | User feedback |
| Lyrics transcription accuracy | >85% | Manual spot-check |
| User engagement | >3 songs/user/week | Analytics |
| Settings persistence reliability | >99.9% | Error rate |
| Cloud storage uptime | >99.5% | Monitoring |

---

## 4. Functional Requirements

### Epic 1: Fretboard Visualization (Existing)

| ID | Requirement | Status | Priority |
|----|-------------|--------|----------|
| FR-1.1 | Interactive guitar fretboard with 6 strings, 22 frets | Implemented | Critical |
| FR-1.2 | CAGED chord shape system with moveable positions | Implemented | Critical |
| FR-1.3 | Scale overlay with Roman numeral degrees | Implemented | High |
| FR-1.4 | Blue note highlighting for blues scales | Implemented | Medium |
| FR-1.5 | Responsive layout (desktop + mobile) | Implemented | High |
| FR-1.6 | Position slider with logarithmic spacing | Implemented | Medium |

### Epic 2: Video Chord Player

| ID | Requirement | Status | Priority |
|----|-------------|--------|----------|
| FR-2.1 | Video URL input with validation | Implemented | Critical |
| FR-2.2 | Audio extraction from video sources | Implemented | Critical |
| FR-2.3 | AI chord detection with timestamps | Implemented | Critical |
| FR-2.4 | Beat detection (BPM, beat grid) | Implemented | High |
| FR-2.5 | Synchronized playback with fretboard | Implemented | Critical |
| FR-2.6 | Chord timeline visualization | Implemented | High |
| FR-2.7 | Multi-library chord analysis (Essentia, Madmom, BTC) | Implemented | High |
| FR-2.8 | File upload as secondary input method | Partial | Medium |

### Epic 3: Practice Tools

| ID | Requirement | Status | Priority |
|----|-------------|--------|----------|
| FR-3.1 | Speed control (50%, 75%, 100%) | Implemented | High |
| FR-3.2 | Loop section selection (A-B repeat) | Partial | High |
| FR-3.3 | Chord anticipation mode (show next chord early) | Not started | Medium |
| FR-3.4 | Metronome synchronized to detected BPM | Not started | Low |

### Epic 4: Stem Separation

| ID | Requirement | Status | Priority |
|----|-------------|--------|----------|
| FR-4.1 | Separate audio into stems (vocals, drums, bass, guitar, piano) | Implemented | High |
| FR-4.2 | Individual stem volume controls | Implemented | High |
| FR-4.3 | Mute/solo toggles per stem | Implemented | High |
| FR-4.4 | Master stems volume control | Implemented | Medium |
| FR-4.5 | Option to analyze chords from backing track (stems minus vocals) | Implemented | Medium |

### Epic 5: Karaoke Lyrics

| ID | Requirement | Status | Priority |
|----|-------------|--------|----------|
| FR-5.1 | On-demand lyrics generation from audio | Implemented | High |
| FR-5.2 | Word-level timestamp sync (karaoke mode) | Implemented | High |
| FR-5.3 | Option to use vocals stem for better accuracy | Implemented | Medium |
| FR-5.4 | Scrolling lyrics display with highlighting | Implemented | High |
| FR-5.5 | LRC format storage and playback | Implemented | Medium |

### Epic 6: User Authentication

| ID | Requirement | Status | Priority |
|----|-------------|--------|----------|
| FR-6.1 | Email/password registration and login | Implemented | Critical |
| FR-6.2 | Google OAuth login | Implemented | High |
| FR-6.3 | Email verification for new accounts | Implemented | High |
| FR-6.4 | Password reset flow | Implemented | High |
| FR-6.5 | User profile management (display name, avatar) | Implemented | Medium |
| FR-6.6 | Session persistence across browser sessions | Implemented | High |

### Epic 7: Settings Persistence

| ID | Requirement | Status | Priority |
|----|-------------|--------|----------|
| FR-7.1 | Global user preferences (fretboard display settings) | Implemented | High |
| FR-7.2 | Per-song settings (stem volumes, library preference, tab state) | Implemented | High |
| FR-7.3 | Auto-save on change with debouncing | Implemented | High |
| FR-7.4 | Auto-load settings when opening song | Implemented | High |
| FR-7.5 | Graceful fallback when offline | Implemented | Medium |

### Epic 8: User Song Library (NEW)

| ID | Requirement | Status | Priority |
|----|-------------|--------|----------|
| FR-8.1 | Personal song library per user | Not started | Critical |
| FR-8.2 | Store audio files in cloud storage (Supabase) | Not started | Critical |
| FR-8.3 | Store stems per user in cloud storage | Not started | Critical |
| FR-8.4 | Store lyrics (LRC) per user in cloud storage | Not started | Critical |
| FR-8.5 | Store chord analysis per user in database | Not started | Critical |
| FR-8.6 | Song list view with search/filter | Not started | High |
| FR-8.7 | Delete song from library (cascades to all data) | Not started | High |
| FR-8.8 | Song metadata display (title, duration, key, BPM) | Not started | Medium |
| FR-8.9 | Last accessed timestamp for recent songs | Not started | Medium |

### Epic 9: Demo Songs & Public Access (NEW)

| ID | Requirement | Status | Priority |
|----|-------------|--------|----------|
| FR-9.1 | Pre-seeded demo songs accessible without login | Not started | High |
| FR-9.2 | Demo songs have full functionality (chords, stems, lyrics) | Not started | High |
| FR-9.3 | "Try without account" flow for marketing | Not started | High |
| FR-9.4 | Public marketing pages (how it works, FAQ) | Not started | Medium |
| FR-9.5 | Demo songs cannot be modified by anonymous users | Not started | High |

### Epic 10: Admin Panel (Future Phase)

| ID | Requirement | Status | Priority |
|----|-------------|--------|----------|
| FR-10.1 | Super admin authentication (separate from regular users) | Not started | Medium |
| FR-10.2 | User management (view, disable, delete accounts) | Not started | Medium |
| FR-10.3 | Song management (mark as public demo, remove) | Not started | Medium |
| FR-10.4 | Usage analytics dashboard | Not started | Low |
| FR-10.5 | System configuration (feature flags, limits) | Not started | Low |

### Epic 11: Codebase Debranding (NEW)

| ID | Requirement | Status | Priority |
|----|-------------|--------|----------|
| FR-11.1 | Replace "YouTube" references with "Video Player" in UI | Not started | High |
| FR-11.2 | Rename code identifiers (YouTubePlayer → VideoPlayer, etc.) | Not started | Medium |
| FR-11.3 | Update documentation to remove platform-specific branding | Not started | Medium |
| FR-11.4 | Ensure video embed works without exposing source platform | Not started | Medium |

---

## 5. Non-Functional Requirements

### 5.1 Performance

| Requirement | Target |
|-------------|--------|
| Initial song processing (chords + key + tempo) | <60 seconds for 4-min song |
| Stem separation | <90 seconds for 4-min song |
| Lyrics generation | <45 seconds for 4-min song |
| Cached song load time | <2 seconds |
| Playback sync accuracy | <100ms latency |
| Settings save latency | <500ms (debounced) |
| Cloud file upload | <30 seconds for 10MB |

### 5.2 Scalability

| Requirement | Target (MVP) | Target (Growth) |
|-------------|--------------|-----------------|
| Concurrent users | 100 | 1,000 |
| Songs per user | 50 | 500 |
| Total songs stored | 5,000 | 100,000 |
| Storage per user | 2GB | 10GB |
| Total storage | 500GB | 10TB |

### 5.3 Security

| Requirement | Implementation |
|-------------|----------------|
| Authentication | Supabase Auth (email + OAuth) |
| Authorization | Row Level Security (RLS) policies |
| Data isolation | Users can only access own data |
| API protection | Service role keys server-side only |
| File access | Signed URLs with expiration |
| Data encryption | HTTPS in transit, encrypted at rest |

### 5.4 Availability

| Requirement | Target |
|-------------|--------|
| Frontend uptime | 99.9% |
| Backend API uptime | 99.5% |
| Storage availability | 99.9% (Supabase SLA) |
| Database availability | 99.9% (Supabase SLA) |

### 5.5 Compatibility

| Platform | Support Level |
|----------|---------------|
| Chrome (latest 2 versions) | Full |
| Firefox (latest 2 versions) | Full |
| Safari (latest 2 versions) | Full |
| Edge (latest 2 versions) | Full |
| Mobile browsers | Responsive, touch-optimized |
| Internet Explorer | Not supported |

---

## 6. Data Architecture

### 6.1 Database Schema (Supabase PostgreSQL)

```
profiles
├── id (uuid, PK, FK → auth.users)
├── display_name (text)
├── avatar_url (text)
├── created_at (timestamptz)
└── updated_at (timestamptz)

user_preferences
├── id (uuid, PK)
├── user_id (uuid, FK → profiles, unique)
├── enabled_shapes (text[])
├── show_all_positions (boolean)
├── highlight_roots (boolean)
├── color_by_shape (boolean)
├── color_by_position (boolean)
├── created_at (timestamptz)
└── updated_at (timestamptz)

user_songs (NEW)
├── id (uuid, PK)
├── user_id (uuid, FK → profiles)
├── video_id (text) -- original source identifier
├── title (text)
├── artist (text, nullable)
├── duration_seconds (integer)
├── key_detected (text, nullable)
├── bpm_detected (integer, nullable)
├── audio_storage_path (text) -- Supabase Storage path
├── has_stems (boolean)
├── has_lyrics (boolean)
├── is_public (boolean, default false) -- for demo songs
├── created_at (timestamptz)
├── updated_at (timestamptz)
├── last_accessed (timestamptz)
└── UNIQUE(user_id, video_id)

user_song_chords (NEW)
├── id (uuid, PK)
├── user_song_id (uuid, FK → user_songs)
├── library (text) -- 'essentia' | 'madmom' | 'btc'
├── chords (jsonb) -- array of {time, chord: {root, quality}}
├── created_at (timestamptz)
└── UNIQUE(user_song_id, library)

user_song_stems (NEW)
├── id (uuid, PK)
├── user_song_id (uuid, FK → user_songs)
├── stem_type (text) -- 'vocals' | 'drums' | 'bass' | 'guitar' | 'piano' | 'other'
├── storage_path (text) -- Supabase Storage path
├── duration_seconds (integer)
├── created_at (timestamptz)
└── UNIQUE(user_song_id, stem_type)

user_song_lyrics (NEW)
├── id (uuid, PK)
├── user_song_id (uuid, FK → user_songs, unique)
├── lrc_content (text)
├── has_word_timing (boolean)
├── audio_source (text) -- 'vocals_stem' | 'full_audio'
├── storage_path (text) -- Supabase Storage path for LRC file
├── created_at (timestamptz)
└── updated_at (timestamptz)

song_settings (existing)
├── id (uuid, PK)
├── user_id (uuid, FK → profiles)
├── video_id (text)
├── active_tab (text)
├── selected_stems (text[])
├── stem_volumes (jsonb)
├── stem_muted (jsonb)
├── master_stems_volume (integer)
├── active_library (text)
├── enabled_libraries (text[])
├── use_backing_track (boolean)
├── snap_to_beats (boolean)
├── use_beat_sync_detection (boolean)
├── created_at (timestamptz)
├── updated_at (timestamptz)
└── last_accessed (timestamptz)

demo_songs (NEW - admin managed)
├── id (uuid, PK)
├── video_id (text, unique)
├── title (text)
├── artist (text)
├── description (text)
├── display_order (integer)
├── is_active (boolean)
├── audio_storage_path (text)
├── created_at (timestamptz)
└── updated_at (timestamptz)
```

### 6.2 Storage Structure (Supabase Storage)

```
Bucket: user-songs (private, RLS enabled)
├── {user_id}/
│   ├── audio/
│   │   └── {song_id}.mp3
│   ├── stems/
│   │   └── {song_id}/
│   │       ├── vocals.mp3
│   │       ├── drums.mp3
│   │       ├── bass.mp3
│   │       ├── guitar.mp3
│   │       ├── piano.mp3
│   │       └── other.mp3
│   └── lyrics/
│       └── {song_id}.lrc

Bucket: demo-songs (public read, admin write)
├── audio/
│   └── {demo_song_id}.mp3
├── stems/
│   └── {demo_song_id}/
│       └── *.mp3
└── lyrics/
    └── {demo_song_id}.lrc
```

### 6.3 Row Level Security Policies

```sql
-- User songs: users can only access their own
CREATE POLICY "Users can manage own songs" ON user_songs
  FOR ALL USING (auth.uid() = user_id);

-- Demo songs: public read, no user modification
CREATE POLICY "Anyone can read demo songs" ON demo_songs
  FOR SELECT USING (is_active = true);

-- Storage: users can only access own folder
CREATE POLICY "Users can access own files" ON storage.objects
  FOR ALL USING (
    bucket_id = 'user-songs' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

-- Demo storage: public read
CREATE POLICY "Anyone can read demo files" ON storage.objects
  FOR SELECT USING (bucket_id = 'demo-songs');
```

---

## 7. Implementation Phases

### Phase 1: User Song Library Foundation

**Goal:** Enable users to own their songs in Supabase

| Task | Description |
|------|-------------|
| 1.1 | Create Supabase Storage buckets (user-songs, demo-songs) |
| 1.2 | Create database tables (user_songs, user_song_chords, user_song_stems, user_song_lyrics) |
| 1.3 | Implement RLS policies for data isolation |
| 1.4 | Create backend API endpoints for file upload to Supabase |
| 1.5 | Update song processing flow to save to user's storage |
| 1.6 | Create song library list view in frontend |

**Deliverable:** New songs created by logged-in users are stored in their personal library.

### Phase 2: Data Migration

**Goal:** Migrate existing local data to Supabase

| Task | Description |
|------|-------------|
| 2.1 | Create migration script to read songs-metadata.json |
| 2.2 | Upload existing audio files to Supabase Storage |
| 2.3 | Upload existing stems to Supabase Storage |
| 2.4 | Upload existing lyrics to Supabase Storage |
| 2.5 | Insert song metadata into user_songs table |
| 2.6 | Insert chord analysis into user_song_chords table |
| 2.7 | Assign all migrated data to owner account (edgars@ideajetlab.com) |
| 2.8 | Verify migration completeness and data integrity |
| 2.9 | Remove local file serving from backend |

**Deliverable:** All 17 existing songs migrated to owner's Supabase account.

### Phase 3: Frontend Song Library UI

**Goal:** Full song management experience

| Task | Description |
|------|-------------|
| 3.1 | Song library page with grid/list view |
| 3.2 | Song search and filtering |
| 3.3 | Song deletion with cascade |
| 3.4 | Recent songs section |
| 3.5 | Song metadata display (duration, key, BPM) |
| 3.6 | Loading states and error handling |

**Deliverable:** Users can browse, search, and manage their song library.

### Phase 4: Demo Songs & Public Access

**Goal:** Enable try-before-register experience

| Task | Description |
|------|-------------|
| 4.1 | Create demo_songs table and seed data |
| 4.2 | Upload 3-5 demo songs with full data |
| 4.3 | Demo song selection page (no login required) |
| 4.4 | Restrict demo songs to read-only |
| 4.5 | "Sign up to save your own songs" prompts |
| 4.6 | Public marketing pages |

**Deliverable:** Anonymous users can try the app with demo songs.

### Phase 5: Codebase Debranding

**Goal:** Remove platform-specific branding

| Task | Description |
|------|-------------|
| 5.1 | Audit all "YouTube" references in codebase |
| 5.2 | Rename components (YouTubePlayer → VideoPlayer) |
| 5.3 | Update UI text and labels |
| 5.4 | Update documentation |
| 5.5 | Ensure embed still functions correctly |

**Deliverable:** No branded platform names in user-facing UI or code.

### Phase 6: Backend Cloud Deployment

**Goal:** Deploy backend to Cloud Run

| Task | Description |
|------|-------------|
| 6.1 | Create Dockerfile for backend |
| 6.2 | Configure Cloud Run service |
| 6.3 | Set up environment variables and secrets |
| 6.4 | Configure CORS for production frontend |
| 6.5 | Set up Cloud Run service account with Supabase access |
| 6.6 | Deploy and smoke test |
| 6.7 | Update frontend to use production backend URL |
| 6.8 | Monitor and iterate |

**Deliverable:** Backend running on Cloud Run, frontend deployed to Vercel/similar.

### Phase 7: Admin Panel (Future)

**Goal:** Super admin capabilities

| Task | Description |
|------|-------------|
| 7.1 | Admin authentication (separate or role-based) |
| 7.2 | User management dashboard |
| 7.3 | Demo song management |
| 7.4 | Usage analytics |
| 7.5 | System configuration |

**Deliverable:** Admin can manage users and content.

---

## 8. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Supabase Storage limits exceeded | Low | High | Monitor usage, upgrade plan proactively |
| Migration data corruption | Low | Critical | Full backup before migration, verify checksums |
| RLS policy gaps | Medium | High | Thorough testing with multiple accounts |
| Backend Cloud Run cold starts | Medium | Medium | Keep-alive pings, optimize container size |
| Debranding breaks video playback | Low | High | Test thoroughly before deploying |
| User confusion during migration | Medium | Medium | Clear communication, no downtime if possible |

---

## 9. Dependencies

| Dependency | Status | Owner | Blocks |
|------------|--------|-------|--------|
| Supabase Cloud project | Configured | Edgars | Phase 1 |
| Supabase Storage buckets | Not created | Implementation | Phase 1 |
| Cloud Run project | Not configured | Implementation | Phase 6 |
| Demo song content | Not selected | Edgars | Phase 4 |
| Admin design decisions | Not started | Future | Phase 7 |

---

## 10. Decisions (Resolved)

| # | Question | Decision | Notes |
|---|----------|----------|-------|
| 1 | Demo song count | **3 songs** | Curated by owner when admin panel is ready |
| 2 | Demo song selection | **Curated by owner** | Will select songs later via admin panel |
| 3 | Storage quota per user | **1 GB (MVP)** | Paid plans for extra storage later; no quota monitoring in MVP |
| 4 | Song sharing | **Not planned** | No user-to-user sharing; future optimization: reuse processed files across users without reprocessing |
| 5 | Admin panel architecture | **Same codebase (Option A)** | Role-based access; may separate later if needed |

---

## 11. Acceptance Criteria Summary

### Phase 1 Complete When:
- [ ] Logged-in user can process a new song
- [ ] Audio file stored in Supabase Storage under user's folder
- [ ] Song metadata stored in user_songs table
- [ ] Chord analysis stored in user_song_chords table
- [ ] User can only see their own songs

### Phase 2 Complete When:
- [ ] All 17 existing songs migrated to edgars@ideajetlab.com account
- [ ] All stems migrated to Supabase Storage
- [ ] All lyrics migrated to Supabase Storage
- [ ] Local backend file serving removed
- [ ] No data loss verified

### Phase 3 Complete When:
- [ ] Song library page displays all user's songs
- [ ] User can search/filter songs
- [ ] User can delete a song (cascades to all related data)
- [ ] Recent songs shown on dashboard

### Phase 4 Complete When:
- [ ] 3+ demo songs available without login
- [ ] Anonymous users can play demos with full features
- [ ] Demo songs are read-only
- [ ] Clear CTAs to sign up

### Phase 5 Complete When:
- [ ] Zero "YouTube" references in UI
- [ ] Code identifiers renamed
- [ ] Documentation updated
- [ ] Video playback still functional

### Phase 6 Complete When:
- [ ] Backend deployed to Cloud Run
- [ ] Frontend connects to production backend
- [ ] All features working in production
- [ ] Monitoring in place

---

## 12. Approval

| Role | Name | Date | Status |
|------|------|------|--------|
| Product Owner | Edgars | — | Pending |
| Architect | Winston | 2026-01-03 | Drafted |

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-03 | Initial PRD created from BRD + new storage requirements |
