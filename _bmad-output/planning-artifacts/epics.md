---
stepsCompleted: ['step-01-validate-prerequisites', 'step-02-design-epics', 'step-03-create-stories', 'step-04-final-validation']
status: 'Complete'
inputDocuments:
  - '_bmad-output/planning-artifacts/prd-guitar-app.md'
  - '_bmad-output/planning-artifacts/architecture-guitar-app.md'
---

# Guitar App - Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for Guitar App Cloud Migration, decomposing the requirements from the PRD and Architecture into implementable stories organized by implementation phase.

## Requirements Inventory

### Functional Requirements

**Epic 1: Fretboard Visualization (Existing - Implemented)**
- FR-1.1: Interactive guitar fretboard with 6 strings, 22 frets
- FR-1.2: CAGED chord shape system with moveable positions
- FR-1.3: Scale overlay with Roman numeral degrees
- FR-1.4: Blue note highlighting for blues scales
- FR-1.5: Responsive layout (desktop + mobile)
- FR-1.6: Position slider with logarithmic spacing

**Epic 2: Video Chord Player (Existing - Implemented)**
- FR-2.1: Video URL input with validation
- FR-2.2: Audio extraction from video sources
- FR-2.3: AI chord detection with timestamps
- FR-2.4: Beat detection (BPM, beat grid)
- FR-2.5: Synchronized playback with fretboard
- FR-2.6: Chord timeline visualization
- FR-2.7: Multi-library chord analysis (Essentia, Madmom, BTC)
- FR-2.8: File upload as secondary input method

**Epic 3: Practice Tools (Partial)**
- FR-3.1: Speed control (50%, 75%, 100%) - Implemented
- FR-3.2: Loop section selection (A-B repeat) - Partial
- FR-3.3: Chord anticipation mode (show next chord early) - Not started
- FR-3.4: Metronome synchronized to detected BPM - Not started

**Epic 4: Stem Separation (Existing - Implemented)**
- FR-4.1: Separate audio into stems (vocals, drums, bass, guitar, piano)
- FR-4.2: Individual stem volume controls
- FR-4.3: Mute/solo toggles per stem
- FR-4.4: Master stems volume control
- FR-4.5: Option to analyze chords from backing track

**Epic 5: Karaoke Lyrics (Existing - Implemented)**
- FR-5.1: On-demand lyrics generation from audio
- FR-5.2: Word-level timestamp sync (karaoke mode)
- FR-5.3: Option to use vocals stem for better accuracy
- FR-5.4: Scrolling lyrics display with highlighting
- FR-5.5: LRC format storage and playback

**Epic 6: User Authentication (Existing - Implemented)**
- FR-6.1: Email/password registration and login
- FR-6.2: Google OAuth login
- FR-6.3: Email verification for new accounts
- FR-6.4: Password reset flow
- FR-6.5: User profile management (display name, avatar)
- FR-6.6: Session persistence across browser sessions

**Epic 7: Settings Persistence (Existing - Implemented)**
- FR-7.1: Global user preferences (fretboard display settings)
- FR-7.2: Per-song settings (stem volumes, library preference, tab state)
- FR-7.3: Auto-save on change with debouncing
- FR-7.4: Auto-load settings when opening song
- FR-7.5: Graceful fallback when offline

**Epic 8: User Song Library (NEW - Phase 1 & 3)**
- FR-8.1: Personal song library per user
- FR-8.2: Store audio files in cloud storage (Supabase)
- FR-8.3: Store stems per user in cloud storage
- FR-8.4: Store lyrics (LRC) per user in cloud storage
- FR-8.5: Store chord analysis per user in database
- FR-8.6: Song list view with search/filter
- FR-8.7: Delete song from library (cascades to all data)
- FR-8.8: Song metadata display (title, duration, key, BPM)
- FR-8.9: Last accessed timestamp for recent songs

**Epic 9: Demo Songs & Public Access (NEW - Phase 4)**
- FR-9.1: Pre-seeded demo songs accessible without login
- FR-9.2: Demo songs have full functionality (chords, stems, lyrics)
- FR-9.3: "Try without account" flow for marketing
- FR-9.4: Public marketing pages (how it works, FAQ)
- FR-9.5: Demo songs cannot be modified by anonymous users

**Epic 10: Admin Panel (Future - Phase 7)**
- FR-10.1: Super admin authentication (separate from regular users)
- FR-10.2: User management (view, disable, delete accounts)
- FR-10.3: Song management (mark as public demo, remove)
- FR-10.4: Usage analytics dashboard
- FR-10.5: System configuration (feature flags, limits)

**Epic 11: Codebase Debranding (NEW - Phase 5)**
- FR-11.1: Replace "YouTube" references with "Video Player" in UI
- FR-11.2: Rename code identifiers (YouTubePlayer → VideoPlayer, etc.)
- FR-11.3: Update documentation to remove platform-specific branding
- FR-11.4: Ensure video embed works without exposing source platform

**Epic 12: Chordify Ground Truth Integration (NEW)**
- FR-12.1: Import chord data from Chordify as ground truth reference
- FR-12.2: Extract metadata (BPM, key, time signature) from Chordify
- FR-12.3: Calculate first beat offset from empty bars
- FR-12.4: Display Chordify as selectable chord library
- FR-12.5: Compare AI chord detection accuracy against Chordify ground truth

### Non-Functional Requirements

**Performance**
- NFR-P1: Initial song processing (chords + key + tempo) <60 seconds for 4-min song
- NFR-P2: Stem separation <90 seconds for 4-min song
- NFR-P3: Lyrics generation <45 seconds for 4-min song
- NFR-P4: Cached song load time <2 seconds
- NFR-P5: Playback sync accuracy <100ms latency
- NFR-P6: Settings save latency <500ms (debounced)
- NFR-P7: Cloud file upload <30 seconds for 10MB

**Scalability**
- NFR-S1: Concurrent users: 100 (MVP), 1,000 (Growth)
- NFR-S2: Songs per user: 50 (MVP), 500 (Growth)
- NFR-S3: Total songs stored: 5,000 (MVP), 100,000 (Growth)
- NFR-S4: Storage per user: 2GB (MVP), 10GB (Growth)
- NFR-S5: Total storage: 500GB (MVP), 10TB (Growth)

**Security**
- NFR-SEC1: Authentication via Supabase Auth (email + OAuth)
- NFR-SEC2: Authorization via Row Level Security (RLS) policies
- NFR-SEC3: Data isolation - users can only access own data
- NFR-SEC4: API protection - service role keys server-side only
- NFR-SEC5: File access via signed URLs with expiration
- NFR-SEC6: Data encryption - HTTPS in transit, encrypted at rest

**Availability**
- NFR-A1: Frontend uptime 99.9%
- NFR-A2: Backend API uptime 99.5%
- NFR-A3: Storage availability 99.9% (Supabase SLA)
- NFR-A4: Database availability 99.9% (Supabase SLA)

**Compatibility**
- NFR-C1: Chrome (latest 2 versions) - Full support
- NFR-C2: Firefox (latest 2 versions) - Full support
- NFR-C3: Safari (latest 2 versions) - Full support
- NFR-C4: Edge (latest 2 versions) - Full support
- NFR-C5: Mobile browsers - Responsive, touch-optimized
- NFR-C6: Internet Explorer - Not supported

### Additional Requirements (from Architecture)

- AR-1: Express.js backend on Cloud Run (not Next.js API routes) for long-running tasks (5-min timeout)
- AR-2: Supabase Storage with RLS-enabled per-user folders (`{user_id}/audio/`, `{user_id}/stems/`, `{user_id}/lyrics/`)
- AR-3: JSONB storage for chord data in `user_song_chords` table (flexible, avoids millions of rows)
- AR-4: Signed URLs for secure, time-limited file access (1-hour expiry)
- AR-5: Separate `demo-songs` bucket for public content (public read, admin write)
- AR-6: Migration script required for 17 existing songs to owner's account (edgars@ideajetlab.com)
- AR-7: Backend auth middleware must validate Supabase JWT on protected endpoints
- AR-8: Cascading deletes: when song deleted, remove all chords, stems, lyrics, and storage files
- AR-9: Database triggers for auto-profile and user_preferences creation on signup
- AR-10: Song processing flow: extract audio → upload to storage → analyze → store results
- AR-11: Storage quota: 1GB per user (MVP), no active enforcement in MVP phase

### FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR-8.1 | Epic 1 | Personal song library per user |
| FR-8.2 | Epic 1 | Store audio in Supabase Storage |
| FR-8.3 | Epic 1 | Store stems in Supabase Storage |
| FR-8.4 | Epic 1 | Store lyrics in Supabase Storage |
| FR-8.5 | Epic 1 | Store chords in database |
| FR-8.6 | Epic 3 | Song list with search/filter |
| FR-8.7 | Epic 3 | Delete song with cascade |
| FR-8.8 | Epic 3 | Song metadata display |
| FR-8.9 | Epic 3 | Last accessed timestamp |
| FR-9.1 | Epic 4 | Demo songs without login |
| FR-9.2 | Epic 4 | Demo songs full functionality |
| FR-9.3 | Epic 4 | Try without account flow |
| FR-9.4 | Epic 4 | Public marketing pages |
| FR-9.5 | Epic 4 | Demo songs read-only |
| FR-11.1 | Epic 5 | Replace YouTube in UI |
| FR-11.2 | Epic 5 | Rename code identifiers |
| FR-11.3 | Epic 5 | Update documentation |
| FR-11.4 | Epic 5 | Video embed works cleanly |
| AR-6 | Epic 2 | Migration script for 17 songs |
| AR-1 | Epic 6 | Cloud Run deployment |

## Epic List

### Epic 1: Cloud Song Storage
**User Outcome:** Users' processed songs are securely stored in their personal cloud library

**FRs covered:** FR-8.1, FR-8.2, FR-8.3, FR-8.4, FR-8.5

**Scope:**
- Database schema (user_songs, user_song_chords, user_song_stems, user_song_lyrics)
- Supabase Storage buckets (user-songs with RLS)
- RLS policies for data isolation
- Backend API updates for file upload/download
- Processing flow integration (save to user's storage)

---

### Epic 2: Existing Song Migration
**User Outcome:** Owner (Edgars) can access all 17 previously processed songs in the new system

**FRs covered:** AR-6

**Scope:**
- Migration script to read songs-metadata.json
- Upload audio files to Supabase Storage
- Upload stems to Supabase Storage
- Upload lyrics to Supabase Storage
- Insert metadata and chords into database
- Assign all data to owner account (edgars@ideajetlab.com)
- Verify migration completeness
- Remove local file serving from backend

---

### Epic 3: Song Library UI
**User Outcome:** Users can browse, search, and manage their personal song collection

**FRs covered:** FR-8.6, FR-8.7, FR-8.8, FR-8.9

**Scope:**
- Library page with grid/list view
- Song search and filtering
- Song deletion with cascade
- Recent songs section
- Song metadata display (duration, key, BPM)
- Loading states and error handling

---

### Epic 4: Demo Songs & Public Access
**User Outcome:** Visitors can try the app with demo songs before signing up

**FRs covered:** FR-9.1, FR-9.2, FR-9.3, FR-9.4, FR-9.5

**Scope:**
- demo_songs table and seed data
- demo-songs Storage bucket (public read)
- Demo song selection page (no login required)
- Read-only mode for demo songs
- "Sign up to save your own songs" CTAs
- Public marketing pages

---

### Epic 5: Platform-Neutral Branding
**User Outcome:** App presents professional identity without platform-specific branding

**FRs covered:** FR-11.1, FR-11.2, FR-11.3, FR-11.4

**Scope:**
- Audit all "YouTube" references in codebase
- Rename components (YouTubePlayer → VideoPlayer)
- Update UI text and labels
- Update documentation
- Verify video embed still functions correctly

---

### Epic 6: Production Deployment
**User Outcome:** App is publicly available with reliable performance

**FRs covered:** AR-1, AR-8

**Scope:**
- Dockerfile for backend
- Cloud Run service configuration
- Environment variables and secrets
- CORS for production frontend
- Deployment and smoke testing
- Frontend deployment to Vercel
- Monitoring setup

---

### Epic 7: Admin Panel (Future)
**User Outcome:** Admin can manage users, content, and system configuration

**FRs covered:** FR-10.1, FR-10.2, FR-10.3, FR-10.4, FR-10.5

**Status:** Deferred to future phase

---

### Epic 12: Chordify Ground Truth Integration
**User Outcome:** Users can import professional chord analysis from Chordify to compare against AI detection accuracy

**FRs covered:** FR-12.1, FR-12.2, FR-12.3, FR-12.4, FR-12.5

**Scope:**
- Backend API endpoint to scrape and import Chordify data
- Extract chords, BPM, key, time signature from public HTML
- Calculate first beat offset from "N" (no chord) entries
- Store Chordify chords in `chordsByLibrary.chordify`
- Frontend integration with library selector
- Comparison metrics dashboard (optional)

**Technical Discovery:**
- No authentication required - data is public in HTML
- First beat offset encoded as "N" entries at song start
- Time signature available as CSS class `barlength-X`
- Simple HTTP + cheerio parsing (no browser automation needed)

**Stories:**
- 12.1: Backend API Endpoint for Chordify Import
- 12.2: Extract Song Metadata (BPM, Key, Time Signature)
- 12.3: Calculate First Beat Offset from Empty Bars
- 12.4: Parse Chord Sequence from HTML
- 12.5: Frontend Integration - Chordify as Comparison Source
- 12.6: Comparison Metrics Dashboard

---

## Epic 1: Cloud Song Storage - Stories

### Story 1.1: Create User Songs Database Schema and RLS Policies

As a developer,
I want to set up the database schema for user song storage with proper security policies,
So that user data is isolated and secure from the start.

**Acceptance Criteria:**

**Given** access to the Supabase project
**When** I run the database migration
**Then** the `user_songs` table is created with columns: id (uuid), user_id (uuid, FK to auth.users), video_id (text), title (text), artist (text), duration_seconds (integer), audio_storage_path (text), created_at (timestamptz), updated_at (timestamptz)
**And** the `user_song_chords` table is created with columns: id (uuid), user_song_id (uuid, FK), library (text), chords (jsonb), tempo (jsonb), key (jsonb), created_at (timestamptz)
**And** the `user_song_stems` table is created with columns: id (uuid), user_song_id (uuid, FK), stem_type (text), storage_path (text), created_at (timestamptz)
**And** the `user_song_lyrics` table is created with columns: id (uuid), user_song_id (uuid, FK), lrc_content (text), storage_path (text), created_at (timestamptz)
**And** RLS is enabled on all tables with policies that restrict SELECT, INSERT, UPDATE, DELETE to rows where user_id matches auth.uid()
**And** appropriate indexes exist on user_id and user_song_id foreign keys

**Given** a user with id "user-123"
**When** they attempt to query another user's songs
**Then** the query returns zero rows due to RLS policy enforcement

**Given** a user is not authenticated
**When** they attempt to access any user_songs data
**Then** the request is denied with a 401 error

---

### Story 1.2: Configure Supabase Storage Bucket with RLS

As a developer,
I want to configure the Supabase Storage bucket for user song files,
So that audio files, stems, and lyrics are securely stored with proper access controls.

**Acceptance Criteria:**

**Given** access to the Supabase project
**When** I configure the storage bucket
**Then** a bucket named `user-songs` is created with private access
**And** folder structure supports paths: `{user_id}/audio/`, `{user_id}/stems/`, `{user_id}/lyrics/`
**And** RLS policies allow authenticated users to upload files only to their own `{user_id}/` prefix
**And** RLS policies allow authenticated users to read/delete only files within their own `{user_id}/` prefix
**And** maximum file size is set to 100MB for audio files

**Given** an authenticated user with id "user-123"
**When** they attempt to upload a file to path "user-456/audio/song.mp3"
**Then** the upload is rejected with a 403 forbidden error

**Given** an authenticated user with id "user-123"
**When** they upload a file to path "user-123/audio/song.mp3"
**Then** the upload succeeds and the file is accessible via signed URL

**Given** an unauthenticated request
**When** attempting to access any file in the bucket
**Then** the request is denied with a 401 error

---

### Story 1.3: Backend Auth Middleware and Signed URL Generation

As a developer,
I want to implement backend authentication middleware that validates Supabase JWTs,
So that all API endpoints can securely identify users and generate signed URLs for file access.

**Acceptance Criteria:**

**Given** a request with a valid Supabase JWT in the Authorization header
**When** the request passes through the auth middleware
**Then** the user's id is extracted from the token and attached to the request context
**And** the request proceeds to the route handler

**Given** a request with an expired JWT
**When** the request passes through the auth middleware
**Then** a 401 Unauthorized response is returned with message "Token expired"

**Given** a request with an invalid or malformed JWT
**When** the request passes through the auth middleware
**Then** a 401 Unauthorized response is returned with message "Invalid token"

**Given** a request with no Authorization header to a protected endpoint
**When** the request is processed
**Then** a 401 Unauthorized response is returned with message "Authentication required"

**Given** an authenticated user requests a signed URL for their file
**When** the `generateSignedUrl(userId, storagePath)` function is called
**Then** a signed URL is returned with 1-hour expiry
**And** the URL only works for files within the user's storage path

**Given** a user attempts to generate a signed URL for another user's file
**When** the function validates the path
**Then** an error is thrown with message "Access denied to requested resource"

---

### Story 1.4: API Endpoint for Uploading and Storing Song Audio

As an authenticated user,
I want to upload a song's audio to my personal cloud library,
So that I can access it later without re-downloading.

**Acceptance Criteria:**

**Given** an authenticated user
**When** they POST to `/api/songs` with body `{ videoId: "abc123", title: "Song Name", artist: "Artist Name" }`
**Then** the backend extracts audio from the video
**And** uploads the audio file to `{user_id}/audio/{video_id}.mp3` in Supabase Storage
**And** creates a record in `user_songs` table with the user_id, video_id, title, artist, duration, and storage path
**And** returns 201 with the created song record including a signed URL for the audio

**Given** an authenticated user
**When** they POST to `/api/songs` with a video_id that already exists in their library
**Then** a 409 Conflict response is returned with message "Song already exists in your library"
**And** no duplicate record is created

**Given** an authenticated user
**When** they POST to `/api/songs` with an invalid or unavailable video_id
**Then** a 400 Bad Request response is returned with message "Unable to process video"
**And** no record is created and no file is uploaded

**Given** audio extraction succeeds but storage upload fails
**When** the error is caught
**Then** no database record is created
**And** a 500 error is returned with message "Failed to store audio file"
**And** any partial uploads are cleaned up

**Given** an authenticated user
**When** they GET `/api/songs`
**Then** they receive a list of all their songs with signed URLs (1-hour expiry)
**And** songs from other users are not included

---

### Story 1.5: API Endpoints for Storing Chord Analysis Results

As an authenticated user,
I want to save chord analysis results for my songs,
So that I don't have to re-analyze songs each time I load them.

**Acceptance Criteria:**

**Given** an authenticated user with a song in their library
**When** they POST to `/api/songs/{songId}/chords` with body `{ library: "essentia", chords: [...], tempo: {...}, key: {...} }`
**Then** a record is created in `user_song_chords` with the analysis data
**And** returns 201 with the created chord analysis record

**Given** an authenticated user
**When** they POST chord analysis for a library that already has results for that song
**Then** the existing record is updated with the new analysis data
**And** returns 200 with the updated record

**Given** an authenticated user
**When** they POST to `/api/songs/{songId}/chords` for a song they don't own
**Then** a 404 Not Found response is returned
**And** no record is created

**Given** an authenticated user with a song that has chord analysis
**When** they GET `/api/songs/{songId}/chords?library=essentia`
**Then** they receive the chord analysis for the specified library
**And** if no library parameter is provided, all available analyses are returned

**Given** an authenticated user
**When** they DELETE `/api/songs/{songId}/chords/essentia`
**Then** the chord analysis for that library is deleted
**And** returns 204 No Content

**Given** an authenticated user
**When** they GET chord analysis for a song with no analysis yet
**Then** a 200 response is returned with an empty array

---

### Story 1.6: API Endpoints for Storing Stems and Lyrics

As an authenticated user,
I want to save separated stems and synced lyrics for my songs,
So that I can use backing tracks and follow along with lyrics on future sessions.

**Acceptance Criteria:**

**Given** an authenticated user with a song in their library
**When** they POST to `/api/songs/{songId}/stems` with stem files (vocals, backing, drums, bass, other)
**Then** each stem is uploaded to `{user_id}/stems/{song_id}/{stem_type}.mp3`
**And** records are created in `user_song_stems` for each stem type
**And** returns 201 with the created stem records including signed URLs

**Given** an authenticated user with a song in their library
**When** they POST to `/api/songs/{songId}/lyrics` with LRC content
**Then** the LRC file is uploaded to `{user_id}/lyrics/{song_id}.lrc`
**And** a record is created in `user_song_lyrics` with the storage path and raw content
**And** returns 201 with the created lyrics record

**Given** an authenticated user
**When** they GET `/api/songs/{songId}/stems`
**Then** they receive a list of available stems with signed URLs

**Given** an authenticated user
**When** they GET `/api/songs/{songId}/lyrics`
**Then** they receive the lyrics record with LRC content and signed URL

**Given** an authenticated user uploads stems for a song that already has stems
**When** stems of the same type are uploaded
**Then** the existing stems are replaced (storage file overwritten, record updated)
**And** returns 200 with the updated stem records

**Given** stem upload partially fails (some stems uploaded, some failed)
**When** the error is caught
**Then** successfully uploaded stems are kept
**And** the response indicates which stems succeeded and which failed
**And** returns 207 Multi-Status with detailed results

**Given** an authenticated user
**When** they DELETE `/api/songs/{songId}/stems/{stemType}`
**Then** the stem file is deleted from storage and the database record is removed
**And** returns 204 No Content

---

### Story 1.7: Frontend Integration for Personal Song Library

As an authenticated user,
I want to view and manage my personal song library in the app,
So that I can easily access my previously processed songs.

**Acceptance Criteria:**

**Given** an authenticated user navigates to the song library page
**When** the page loads
**Then** a list of their saved songs is displayed with title, artist, and processing status indicators (has chords, has stems, has lyrics)
**And** songs are sorted by most recently added
**And** a loading state is shown while fetching

**Given** an authenticated user views the song library
**When** they click on a song
**Then** they are navigated to the chord player with the song loaded
**And** the audio plays from cloud storage (signed URL) instead of re-downloading
**And** any existing chord analysis, stems, and lyrics are loaded automatically

**Given** an authenticated user on the chord player page
**When** they analyze chords for a new video and the analysis completes
**Then** a "Save to Library" button becomes visible
**And** clicking it saves the song with its analysis to their library
**And** a success toast notification confirms the save

**Given** an authenticated user views a song from their library
**When** they perform additional analysis (different chord library, stem separation, lyrics)
**Then** the new results are automatically saved to their library
**And** no manual save action is required for incremental updates

**Given** an authenticated user views the song library
**When** they click the delete button on a song
**Then** a confirmation modal appears
**And** upon confirmation, the song and all associated data (audio, chords, stems, lyrics) are deleted
**And** the song is removed from the list immediately

**Given** an unauthenticated user
**When** they navigate to the song library page
**Then** they are redirected to the login page
**And** after successful login, they are returned to the library page

**Given** the API returns an error when fetching the library
**When** the error is caught
**Then** an error message is displayed with a retry button
**And** the error is logged for debugging

---

## Epic 2: Existing Song Migration - Stories

### Story 2.1: Create Migration Script for Existing Songs

As a developer,
I want a migration script that reads local song data and uploads it to Supabase Storage,
So that all 17 existing songs can be transferred to the cloud infrastructure.

**Acceptance Criteria:**

**Given** the migration script exists and has access to backend/songs-metadata.json
**When** the script is executed in dry-run mode
**Then** it lists all 17 songs with their associated files (audio, stems, lyrics)
**And** reports the total data size to be migrated
**And** validates that all referenced files exist locally

**Given** the script has Supabase admin credentials configured
**When** the script connects to Supabase
**Then** it verifies the storage buckets exist (user-songs)
**And** confirms write permissions for the owner's user_id path

**Given** the owner's user_id is resolved from email edgars@ideajetlab.com
**When** the script prepares upload paths
**Then** all files are mapped to {bucket}/{user_id}/{videoId}/ structure
**And** a migration manifest JSON is generated listing all source→destination mappings

**Verification:**
- Script runs without errors in dry-run mode
- Migration manifest accurately reflects all 17 songs and their files
- No files are uploaded during dry-run

**Rollback:**
- Script is idempotent; can be re-run safely
- Manifest file preserved for audit trail

---

### Story 2.2: Execute Data Transfer to Supabase Storage

As a system owner,
I want all 17 songs migrated to Supabase Storage under my user account,
So that my existing song library is accessible in the new cloud system.

**Acceptance Criteria:**

**Given** the migration script from Story 2.1 is complete and tested
**When** the script is executed in migration mode
**Then** all audio files from backend/audio/*.mp3 are uploaded to user-songs bucket
**And** all stem files from backend/stems/{videoId}/*.mp3 are uploaded to user-songs bucket
**And** all lyrics files from backend/lyrics/*.lrc are uploaded to user-songs bucket

**Given** the Supabase database has the user_songs table
**When** each song is migrated
**Then** a record is inserted in the user_songs table with correct metadata
**And** the record includes video_id, title, chord analysis, tempo, and key information
**And** the record references the owner's user_id

**Given** a file upload fails during migration
**When** the script encounters the error
**Then** the error is logged with file path and error details
**And** the script continues with remaining files
**And** a summary of failed uploads is reported at completion

**Verification:**
- All 17 songs appear in Supabase Storage under correct paths
- All 17 song records exist in database with complete metadata
- File sizes in Supabase match original local files
- Migration log shows 100% success rate

**Rollback:**
- Migration script supports --rollback flag to delete uploaded files
- Local files remain untouched until Story 2.4

---

### Story 2.3: Verify Migrated Data Integrity and Accessibility

As a system owner,
I want to verify that all migrated songs are complete and accessible,
So that I can confirm the migration was successful before removing local files.

**Acceptance Criteria:**

**Given** Story 2.2 migration has completed
**When** a verification script runs
**Then** it compares file counts: local vs Supabase for each song
**And** it compares file sizes (byte-level) for all uploaded files
**And** it reports any discrepancies with specific file paths

**Given** the owner is logged into the application
**When** navigating to the song library
**Then** all 17 songs are listed with correct titles and metadata
**And** each song can be selected and played

**Given** a migrated song is selected in the chord player
**When** the song loads
**Then** the audio file streams correctly from Supabase
**And** stems are available if separation was previously completed
**And** lyrics display in sync with playback
**And** chord timeline shows all analyzed chords from all libraries (essentia, madmom, btc)

**Given** the verification report is complete
**When** the owner reviews the report
**Then** a summary shows: total songs, total files, success rate, any failures
**And** the report is saved to _bmad-output/migration-verification.json

**Verification:**
- 100% file count match between local and Supabase
- 100% file size match for all files
- Manual playback test of at least 3 songs confirms functionality
- All chord analysis data preserved and displayed correctly

**Rollback:**
- If verification fails, re-run Story 2.2 for failed items only
- Local files serve as authoritative source until verification passes

---

### Story 2.4: Remove Local File Serving and Clean Up Backend

As a developer,
I want to remove local file serving code from the backend,
So that the system exclusively uses Supabase Storage and reduces server complexity.

**Acceptance Criteria:**

**Given** Story 2.3 verification has passed with 100% success
**When** reviewing the backend codebase
**Then** all static file serving routes for audio, stems, and lyrics are identified
**And** a list of files/directories to be removed is documented

**Given** the local file serving code is removed
**When** the backend server starts
**Then** it no longer serves files from backend/audio/, backend/stems/, or backend/lyrics/
**And** all file requests are redirected to Supabase Storage URLs
**And** the server starts without errors

**Given** the application requests a song's audio file
**When** the backend handles the request
**Then** it returns a signed Supabase Storage URL
**And** the client successfully streams audio from the signed URL

**Given** the migration is confirmed complete
**When** performing final cleanup
**Then** local audio, stems, and lyrics directories can be archived (not deleted immediately)
**And** archive is stored outside the repository (e.g., external backup)
**And** a cleanup completion record is added to migration log

**Verification:**
- Backend passes all existing tests after file serving removal
- Application functions correctly using only Supabase Storage
- No 404 errors when accessing migrated songs
- Local development setup documentation updated

**Rollback:**
- Local files archived (not deleted) for 30 days
- Git commit for backend changes can be reverted
- Environment variable toggle to switch between local/Supabase file serving

---

## Epic 3: Song Library UI - Stories

### Story 3.1: Create Song Library Page with Grid/List View

As an authenticated user,
I want to view my song collection on a dedicated library page,
So that I can easily browse all my saved songs.

**Acceptance Criteria:**

**Given** I am logged in and have songs in my library
**When** I navigate to /library
**Then** I see a page header with "My Library" title
**And** I see my songs displayed in a grid layout by default
**And** each song card shows the song title, artist (if available), duration, and thumbnail
**And** I see a toggle to switch between grid and list view

**Given** I am logged in and toggle to list view
**When** the view switches to list mode
**Then** I see songs displayed as horizontal list items with compact metadata

**Given** I am logged in but have no songs in my library
**When** I navigate to /library
**Then** I see an empty state with a message "No songs yet"
**And** I see a call-to-action button linking to the chord player page to add songs

**Given** my songs are loading
**When** I first visit the library page
**Then** I see skeleton loading placeholders for song cards/items

**Given** the song fetch fails due to a network error
**When** the page attempts to load
**Then** I see an error message "Failed to load your songs"
**And** I see a "Retry" button to attempt loading again

**Technical Notes:**
- Create `/product/app/pages/library.tsx` page
- Create `/product/app/library/SongLibrary.tsx` component
- Create `/product/app/library/SongCard.tsx` for grid view
- Create `/product/app/library/SongListItem.tsx` for list view
- Create `/product/app/library/hooks/useUserSongs.ts` hook to fetch from `GET /api/songs`
- Page requires authentication (redirect to /login if not authenticated)

---

### Story 3.2: Display Song Metadata and Status Indicators

As an authenticated user,
I want to see detailed metadata and status indicators for each song,
So that I can quickly understand what data is available for each song.

**Acceptance Criteria:**

**Given** I am viewing my song library
**When** I look at a song card or list item
**Then** I see the song title prominently displayed
**And** I see the duration formatted as MM:SS
**And** I see the detected key (e.g., "A minor") if available, or a dash if not
**And** I see the detected BPM if available, or a dash if not

**Given** a song has stems separated
**When** I view that song's card/item
**Then** I see a visual indicator (icon or badge) showing stems are available

**Given** a song has lyrics generated
**When** I view that song's card/item
**Then** I see a visual indicator (icon or badge) showing lyrics are available

**Given** I am viewing a song in the library
**When** I click on the song card or list item
**Then** I am navigated to the chord player page for that song (`/chords/youtube?v={videoId}`)

**Technical Notes:**
- Extend `SongCard` and `SongListItem` to display key, BPM, hasStems, hasLyrics
- Use icons from existing icon set for stems/lyrics indicators
- Format duration using existing time formatting utilities
- Songs with status "processing" should show a loading indicator instead of metadata

---

### Story 3.3: Search and Filter Songs

As an authenticated user,
I want to search and filter my song library,
So that I can quickly find specific songs.

**Acceptance Criteria:**

**Given** I am on the library page with multiple songs
**When** I type into the search input field
**Then** the song list filters in real-time to show only songs matching the search text
**And** the search matches against song title and artist name (case-insensitive)

**Given** I have typed a search query with no matching results
**When** the filter is applied
**Then** I see a message "No songs match your search"
**And** I see a button to clear the search

**Given** I am on the library page
**When** I click the "Filter" button
**Then** I see filter options for: Key (dropdown with all detected keys), Has Stems (toggle), Has Lyrics (toggle)

**Given** I select a key filter (e.g., "A minor")
**When** the filter is applied
**Then** only songs with that detected key are shown

**Given** I enable the "Has Stems" filter
**When** the filter is applied
**Then** only songs that have separated stems are shown

**Given** I have multiple filters active
**When** I click "Clear Filters"
**Then** all filters are reset and all songs are displayed

**Technical Notes:**
- Create `/product/app/library/SongSearch.tsx` component with search input and filter controls
- Filtering happens client-side on the fetched song list
- Search is debounced (300ms) to avoid excessive re-renders
- Filter state managed with React useState
- Extract unique keys from song list for key filter dropdown

---

### Story 3.4: Delete Song from Library

As an authenticated user,
I want to delete songs from my library,
So that I can remove songs I no longer need and free up storage.

**Acceptance Criteria:**

**Given** I am viewing a song in my library
**When** I click the delete/trash icon on the song card or list item
**Then** a confirmation dialog appears with the message "Delete [Song Title]?"
**And** the dialog explains "This will permanently delete the song and all associated data (audio, stems, lyrics, chord analysis)."

**Given** the delete confirmation dialog is open
**When** I click "Cancel"
**Then** the dialog closes and no deletion occurs

**Given** the delete confirmation dialog is open
**When** I click "Delete"
**Then** the dialog shows a loading state
**And** the song is deleted from the backend
**And** the dialog closes
**And** the song is removed from the library view
**And** I see a success toast notification "Song deleted"

**Given** I confirm deletion but the delete request fails
**When** the error occurs
**Then** the dialog shows an error message "Failed to delete song. Please try again."
**And** the "Delete" button becomes active again to retry

**Given** I am on a song's chord player page
**When** I delete the song from the library (via a menu option)
**Then** I am redirected to the library page after successful deletion

**Technical Notes:**
- Create `/product/app/library/DeleteSongDialog.tsx` component
- Create `/product/app/library/hooks/useDeleteSong.ts` hook calling `DELETE /api/songs/:videoId`
- Backend must cascade delete: audio file, stems, lyrics, chord analysis records
- Add delete option to song card context menu or as icon button
- Use existing dialog/modal patterns from `@lib/ui`

---

### Story 3.5: Track and Display Recently Accessed Songs

As an authenticated user,
I want to see my recently accessed songs prominently,
So that I can quickly continue where I left off.

**Acceptance Criteria:**

**Given** I am on the library page
**When** the page loads
**Then** I see a "Recent Songs" section at the top showing up to 5 most recently accessed songs
**And** recent songs are displayed in a horizontal scrollable row

**Given** I open a song in the chord player
**When** the chord player page loads
**Then** the song's `last_accessed` timestamp is updated in the backend

**Given** I have no songs in my library
**When** I view the library page
**Then** the "Recent Songs" section is not displayed

**Given** I have fewer than 5 songs in my library
**When** I view the library page
**Then** the "Recent Songs" section shows all my songs (no duplicates in main list)

**Given** I am viewing the full library list below recent songs
**When** I look at the song display
**Then** songs are sorted by last accessed date (most recent first) by default
**And** I see a sort dropdown to change sorting (Recent, Title A-Z, Title Z-A, Duration)

**Technical Notes:**
- Update `useUserSongs` hook to fetch songs sorted by `last_accessed DESC`
- Create a separate "Recent Songs" section component in SongLibrary
- Update chord player page to call `PATCH /api/songs/:videoId/accessed` on load
- Backend needs to update `last_accessed` timestamp when song is accessed
- Add sorting controls to the library page (client-side sort on loaded data)

---

## Epic 4: Demo Songs & Public Access - Stories

### Story 4.1: Demo Songs Database Schema and API

As a developer,
I want a demo songs table and read-only API endpoints,
So that demo song data can be stored and retrieved without authentication.

**Acceptance Criteria:**

**Given** the Supabase database is accessible
**When** migrations are applied
**Then** a `demo_songs` table is created with columns: id (uuid), video_id (text unique), title (text), artist (text), description (text), display_order (integer), is_active (boolean default true), audio_storage_path (text), chords (jsonb), stems (jsonb), lyrics (jsonb), tempo (jsonb), key_signature (jsonb), created_at (timestamptz), updated_at (timestamptz)
**And** RLS policies allow public SELECT access without authentication
**And** RLS policies restrict INSERT/UPDATE/DELETE to admin role only

**Given** the demo_songs table exists with data
**When** an anonymous user calls GET `/api/demo-songs`
**Then** they receive a list of active demo songs ordered by display_order
**And** each song includes video_id, title, artist, and description

**Given** a valid demo song video_id exists
**When** an anonymous user calls GET `/api/demo-songs/:videoId`
**Then** they receive the full demo song data including chords, stems, lyrics, tempo, and key
**And** no authentication token is required

---

### Story 4.2: Demo Songs Storage Bucket and Content Seeding

As a product owner,
I want demo songs pre-loaded with full analysis data,
So that visitors can immediately experience all app features.

**Acceptance Criteria:**

**Given** Supabase storage is configured
**When** the demo-songs bucket is created
**Then** the bucket has public read access enabled
**And** write access is restricted to service role only

**Given** the demo-songs bucket exists
**When** admin seeds demo content
**Then** 3 curated demo songs are uploaded with audio files at `demo-songs/{videoId}/audio.mp3`
**And** backing tracks are stored at `demo-songs/{videoId}/backing.mp3`
**And** stems are stored at `demo-songs/{videoId}/stems/` directory

**Given** demo audio files are uploaded
**When** admin runs the seeding script
**Then** demo_songs table is populated with pre-analyzed chord data in JSONB format
**And** tempo and beat information is included
**And** key signature detection results are included
**And** lyrics with timestamps are included
**And** stem separation paths reference the demo-songs bucket

**Given** demo songs are seeded
**When** any user visits the demo player
**Then** all demo songs load within 2 seconds
**And** no analysis or processing is required

---

### Story 4.3: Demo Song Selection Page

As a visitor,
I want to browse available demo songs,
So that I can choose one to try the app's features.

**Acceptance Criteria:**

**Given** an anonymous user navigates to `/demo`
**When** the page loads
**Then** they see a grid of demo song cards showing title, artist, and description
**And** each card displays album art or thumbnail
**And** the page loads without requiring authentication

**Given** the demo selection page is displayed
**When** a visitor clicks on a demo song card
**Then** they are navigated to `/demo/:videoId`
**And** the demo player loads with the selected song

**Given** no demo songs are active in the database
**When** a visitor navigates to `/demo`
**Then** they see a friendly message explaining demos are temporarily unavailable
**And** a CTA to sign up is prominently displayed

**Given** a visitor is on the demo selection page
**When** they view the page header
**Then** they see explanatory text: "Try our chord detection and learning tools with these sample songs"
**And** a "Sign up for unlimited songs" button is visible

---

### Story 4.4: Read-Only Demo Player Experience

As a visitor,
I want to use the full chord player with demo songs,
So that I can evaluate the app's features before signing up.

**Acceptance Criteria:**

**Given** an anonymous user navigates to `/demo/:videoId`
**When** the demo song exists and is active
**Then** the chord player loads with full functionality: video playback, chord timeline, fretboard visualization
**And** stem playback controls are available (vocals, backing, drums, bass)
**And** synchronized lyrics display is visible
**And** no login is required

**Given** the demo player is loaded
**When** a visitor attempts to re-analyze chords, change detection library, or modify settings
**Then** the action buttons are disabled or hidden
**And** a tooltip explains "Sign up to customize analysis settings"

**Given** the demo player is loaded
**When** a visitor interacts with playback controls
**Then** play/pause, seek, and volume controls function normally
**And** stem mixer controls function normally
**And** chord timeline navigation functions normally

**Given** a visitor navigates to `/demo/:videoId` with an invalid or inactive videoId
**When** the page loads
**Then** they see a "Demo not found" message
**And** a link back to `/demo` is provided
**And** a CTA to sign up is displayed

**Given** the demo player is displayed
**When** a visitor views any settings or configuration panels
**Then** all controls are in read-only or disabled state
**And** the current settings are visible but not editable

---

### Story 4.5: Marketing CTAs and Public Pages

As a marketing team,
I want strategic sign-up prompts throughout the demo experience,
So that visitors convert to registered users.

**Acceptance Criteria:**

**Given** a visitor is on the demo selection page (`/demo`)
**When** they view the page
**Then** a prominent "Sign Up Free" button is visible in the header
**And** a secondary CTA appears below the demo song grid: "Ready for your own songs? Create a free account"

**Given** a visitor is using the demo player
**When** they have watched for more than 60 seconds
**Then** a non-intrusive banner appears: "Enjoying the demo? Sign up to analyze your own songs"
**And** the banner can be dismissed and won't reappear in the same session

**Given** a visitor is on the demo player
**When** they attempt a restricted action (re-analyze, add song, save settings)
**Then** a modal appears explaining the feature requires an account
**And** the modal includes "Sign Up" and "Maybe Later" buttons
**And** clicking "Sign Up" navigates to `/auth/signup?redirect=/demo/:videoId`

**Given** the public site exists
**When** a visitor navigates to `/how-it-works`
**Then** they see a page explaining: chord detection, stem separation, lyrics sync, and learning features
**And** each section includes a CTA to try the demo or sign up

**Given** the public site exists
**When** a visitor navigates to `/faq`
**Then** they see frequently asked questions about the app
**And** questions cover: supported songs, accuracy, pricing, account features
**And** a "Still have questions? Sign up and try it free" CTA is at the bottom

**Given** a visitor clicks any "Sign Up" CTA
**When** they complete registration
**Then** they are redirected back to their previous location (demo player or demo selection)
**And** they now see the full authenticated experience with their demo song

---

## Epic 5: Platform-Neutral Branding - Stories

### Story 5.1: Rename Video Player Folder and Core Component Files

As a developer,
I want the youtube folder and files renamed to use platform-neutral naming,
So that the codebase does not reference specific video platforms.

**Acceptance Criteria:**

**Given** the folder `product/app/chords/youtube/` exists with YouTube-named files
**When** I rename the folder and files to platform-neutral names
**Then** the folder is renamed to `product/app/chords/video/`
**And** `YouTubeChordPlayer.tsx` is renamed to `VideoChordPlayer.tsx`
**And** `YouTubePlayer.tsx` is renamed to `VideoPlayer.tsx`
**And** `YouTubeUrlInput.tsx` is renamed to `VideoUrlInput.tsx`
**And** `hooks/useYouTubePlayer.ts` is renamed to `hooks/useVideoPlayer.ts`
**And** `utils/parseYouTubeUrl.ts` is renamed to `utils/parseVideoUrl.ts`
**And** `index.ts` exports are updated to use new component names
**And** all internal imports within the video folder reference new file names
**And** `yarn typecheck` passes with no errors
**And** `yarn lint` passes with no errors

**Regression Testing:**
- Run `yarn dev` and verify the application loads without errors
- Navigate to /chords and verify the video player section renders

---

### Story 5.2: Update Component Names and Type Definitions

As a developer,
I want all component names, type definitions, and function names updated to platform-neutral naming,
So that the internal code identifiers do not reference specific video platforms.

**Acceptance Criteria:**

**Given** Story 5.1 is complete with files renamed
**When** I update all component and type names within the video folder
**Then** `YouTubeChordPlayer` component is renamed to `VideoChordPlayer`
**And** `YouTubePlayer` component is renamed to `VideoPlayer`
**And** `YouTubeUrlInput` component is renamed to `VideoUrlInput`
**And** `useYouTubePlayer` hook is renamed to `useVideoPlayer`
**And** `YouTubePlayerState` type is renamed to `VideoPlayerState`
**And** `YouTubePlayerControls` type is renamed to `VideoPlayerControls`
**And** `YouTubePlayerProps` type is renamed to `VideoPlayerProps`
**And** `YouTubeUrlInputProps` type is renamed to `VideoUrlInputProps`
**And** `YouTubeChordPlayerProps` type is renamed to `VideoChordPlayerProps`
**And** `parseYouTubeUrl` function is renamed to `parseVideoUrl`
**And** `getYouTubeThumbnail` function is renamed to `getVideoThumbnail`
**And** `loadYouTubeAPI` function is renamed to `loadVideoAPI`
**And** `YouTubeLink` styled component is renamed to `VideoSourceLink`
**And** `handleYouTubeSeek` callback is renamed to `handleVideoSeek`
**And** all references in `ChordsPage.tsx` are updated to import from `./video`
**And** `yarn typecheck` passes with no errors
**And** `yarn lint` passes with no errors

**Regression Testing:**
- Run `yarn dev` and navigate to /chords
- Verify video URL input accepts and loads a video
- Verify chord timeline and playback controls function correctly

---

### Story 5.3: Update User-Facing UI Text to Platform-Neutral Language

As a user,
I want the application to use generic video terminology in the interface,
So that I am not confused by platform-specific branding.

**Acceptance Criteria:**

**Given** Stories 5.1 and 5.2 are complete
**When** I update all user-facing text strings
**Then** placeholder text "Paste YouTube URL (e.g., https://youtube.com/watch?v=...)" is changed to "Paste video URL"
**And** help text "Enter a YouTube URL to detect chords and play along" is changed to "Enter a video URL to detect chords and play along"
**And** error message "Please enter a YouTube URL" is changed to "Please enter a video URL"
**And** error message "Invalid YouTube URL. Please enter a valid YouTube video link." is changed to "Invalid video URL. Please enter a valid video link."
**And** link title "Open on YouTube" is changed to "Open original video"
**And** comments referencing "YouTube" in `useLyricsSync.ts` are updated to use "video player"
**And** comments in `useVideoPlayer.ts` referencing "YouTube IFrame API" remain accurate (as they describe the technical implementation)
**And** the application builds without errors

**Regression Testing:**
- Run `yarn dev` and navigate to /chords
- Verify all visible text uses platform-neutral language
- Verify error messages display correctly when entering invalid URLs
- Verify the external link to the original video still functions

---

### Story 5.4: Update Documentation and Verify Complete Branding Migration

As a developer,
I want documentation updated to reflect the platform-neutral architecture,
So that future developers understand the current component structure.

**Acceptance Criteria:**

**Given** Stories 5.1, 5.2, and 5.3 are complete
**When** I update the CLAUDE.md documentation
**Then** the "YouTube Chord Detection System" section heading is renamed to "Video Chord Detection System"
**And** references to `/chords/youtube` page are updated to `/chords/video` (if route changes) or clarified as the video player feature
**And** the "Key Files" section updates paths from `product/app/chords/youtube/` to `product/app/chords/video/`
**And** `YouTubeChordPlayer.tsx` reference is updated to `VideoChordPlayer.tsx`
**And** `YouTubePlayer` component reference is updated to `VideoPlayer`
**And** any other markdown files in the project root referencing YouTube components are updated
**And** `lib/ui/icons/YouTubeIcon.tsx` and `YouTubeColoredIcon.tsx` remain unchanged (these are legitimate platform icons)
**And** running `grep -r "YouTubeChordPlayer\|YouTubePlayer\|YouTubeUrlInput" product/` returns no results
**And** running `grep -r "YouTube" product/app/chords/` returns only comments explaining the underlying API implementation
**And** `yarn build` completes successfully
**And** `yarn typecheck` passes with no errors

**Regression Testing:**
- Run full build with `yarn build`
- Run `yarn dev` and perform end-to-end test: load video URL, analyze chords, play with timeline sync
- Verify stem separation and backing track analysis still function
- Verify lyrics sync feature still functions

---

## Epic 6: Production Deployment - Stories

### Story 6.1: Backend Containerization with Multi-Runtime Support

As a DevOps engineer,
I want to containerize the backend with Node.js, Python, and ffmpeg,
So that the application can be deployed consistently to Cloud Run.

**Acceptance Criteria:**

**Given** the backend Express.js application with Python chord detection scripts
**When** I build the Docker image using the Dockerfile
**Then** the image includes Node.js 20 LTS runtime
**And** the image includes Python 3.11 with Essentia library installed
**And** the image includes ffmpeg for audio processing
**And** the image size is under 2GB
**And** the container exposes port 8080 (Cloud Run default)

**Given** a built Docker image
**When** I run the container locally with `docker run -p 4568:8080`
**Then** the health check endpoint `/api/health` returns 200 OK
**And** the chord detection endpoint accepts requests and invokes Python successfully

**Given** the Dockerfile in the repository
**When** I review the build configuration
**Then** multi-stage build is used to minimize final image size
**And** non-root user is configured for security
**And** `.dockerignore` excludes node_modules, .git, and test files

**Rollback:** Remove Dockerfile and revert to local development workflow.

---

### Story 6.2: Cloud Run Service Deployment

As a DevOps engineer,
I want to deploy the containerized backend to Cloud Run,
So that the API is accessible from the internet with appropriate resource limits.

**Acceptance Criteria:**

**Given** a Docker image pushed to Google Container Registry or Artifact Registry
**When** I deploy to Cloud Run using gcloud CLI or Cloud Console
**Then** the service is created with 2GB memory allocation
**And** the service is configured with 2 vCPU
**And** the request timeout is set to 300 seconds (5 minutes)
**And** maximum concurrent requests per instance is set to 10
**And** minimum instances is set to 0 (scale to zero)
**And** maximum instances is set to 5 (cost control)

**Given** the Cloud Run service is deployed
**When** I access the service URL
**Then** the `/api/health` endpoint returns 200 OK within 5 seconds
**And** HTTPS is automatically configured by Cloud Run

**Given** a long-running chord analysis request
**When** the analysis takes up to 4 minutes
**Then** the request completes successfully without timeout
**And** Cloud Run logs show the request duration

**Smoke Test:** `curl https://[SERVICE_URL]/api/health` returns `{"status":"ok"}`

**Rollback:** Delete Cloud Run service via `gcloud run services delete backend --region=us-central1`

---

### Story 6.3: Secrets and Environment Configuration

As a DevOps engineer,
I want to configure secrets securely in Cloud Run,
So that API keys and database credentials are not exposed in code or logs.

**Acceptance Criteria:**

**Given** the following secrets need to be configured: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, LALALAI_API_KEY, ASSEMBLYAI_API_KEY
**When** I create secrets in Google Secret Manager
**Then** each secret is stored with appropriate IAM permissions
**And** the Cloud Run service account has `secretAccessor` role for each secret

**Given** secrets exist in Secret Manager
**When** I update the Cloud Run service configuration
**Then** each secret is mounted as an environment variable
**And** the application can read secrets via `process.env`
**And** secrets are not visible in Cloud Run YAML exports or logs

**Given** the backend needs to connect to the production frontend
**When** I configure the CORS_ORIGIN environment variable
**Then** CORS is restricted to the Vercel production domain (e.g., `https://guitar-app.vercel.app`)
**And** requests from other origins receive 403 Forbidden

**Given** a secret needs to be rotated
**When** I update the secret in Secret Manager and redeploy
**Then** the new secret value is available to the application
**And** no code changes are required for rotation

**Rollback:** Remove secret references from Cloud Run service; secrets remain in Secret Manager for audit.

---

### Story 6.4: Frontend Deployment to Vercel

As a developer,
I want to deploy the Next.js frontend to Vercel,
So that users can access the application from a public URL.

**Acceptance Criteria:**

**Given** the Next.js application in `product/app`
**When** I connect the repository to Vercel
**Then** automatic deployments are configured for the main branch
**And** preview deployments are created for pull requests
**And** the build command is set to `yarn build`
**And** the output directory is correctly detected

**Given** the frontend needs to communicate with the Cloud Run backend
**When** I configure environment variables in Vercel
**Then** `NEXT_PUBLIC_API_URL` points to the Cloud Run service URL
**And** environment variables are set for Production environment
**And** preview deployments use a separate staging backend URL (or same if acceptable)

**Given** the Vercel deployment completes successfully
**When** I access the production URL
**Then** the application loads without JavaScript errors
**And** the fretboard visualization renders correctly
**And** navigation between pages works (chords, scales, library)

**Given** a user accesses the chord detection feature
**When** they analyze a video
**Then** requests are sent to the Cloud Run backend
**And** chord detection results are displayed on the timeline

**Smoke Test:** Navigate to `/chords`, load a test video, verify API connectivity.

**Rollback:** Revert to previous deployment in Vercel dashboard; takes effect immediately.

---

### Story 6.5: Production Verification and Monitoring Setup

As a product owner,
I want to verify the production deployment works end-to-end,
So that I have confidence the application is ready for users.

**Acceptance Criteria:**

**Given** both frontend (Vercel) and backend (Cloud Run) are deployed
**When** I perform the production verification checklist
**Then** the following scenarios pass:
- Homepage loads within 3 seconds
- Fretboard displays correct chord shapes for C, G, Am, F
- Scale overlay shows correct intervals
- Chord player page loads and accepts video URLs
- Chord analysis completes for a 3-minute test video
- Chord timeline synchronizes with video playback
- Authentication flow works (login/logout via Supabase)

**Given** the production environment is live
**When** I configure monitoring
**Then** Cloud Run metrics dashboard shows request count, latency, and error rate
**And** Supabase dashboard shows database connections and query performance
**And** Vercel analytics shows page load times and web vitals

**Given** an error occurs in production
**When** I check the Cloud Run logs
**Then** errors include stack traces and request context
**And** sensitive data (API keys, user credentials) is not logged
**And** logs are retained for 30 days

**Given** the production deployment is verified
**When** I document the deployment
**Then** a runbook exists with:
- Service URLs (frontend and backend)
- How to view logs and metrics
- How to redeploy (manual trigger)
- How to rollback to previous version
- Contact for on-call support

**Rollback:** If critical issues found, revert Vercel to previous deployment and/or Cloud Run to previous revision.
