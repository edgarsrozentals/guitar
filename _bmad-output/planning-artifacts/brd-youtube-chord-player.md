# Business Requirements Document (BRD)

## YouTube Chord Detection & Visualization Player

| Field | Value |
|-------|-------|
| **Document Version** | 2.0 |
| **Date** | 2026-01-02 |
| **Author** | Winston (Architect Agent) |
| **Stakeholder** | Edgars |
| **Status** | Approved |

---

## 1. Executive Summary

### 1.1 Problem Statement

Guitar learners who want to play along with their favorite songs face significant friction:
- Finding accurate chord charts is time-consuming and often unreliable
- Existing solutions like Chordify have poor fretboard visualization (static chord boxes only)
- No ability to choose which fretboard position/fingering to use for each chord
- Difficult to practice at slower speeds or isolate specific instruments
- No karaoke-style lyrics sync for singing along while playing

### 1.2 Proposed Solution

Integrate YouTube video playback with AI-powered chord detection into the existing guitar-app, displaying real-time chord changes on the interactive CAGED fretboard visualization. Key features include:
- Stem separation for practice (mute guitar, isolate vocals, etc.)
- **Karaoke-style lyrics with word-level highlighting** generated from audio transcription
- Speed control and loop sections for difficult passages
- User-selected fretboard positions with appropriate CAGED shapes

### 1.3 Business Value

| Benefit | Impact |
|---------|--------|
| **Differentiation** | Superior fretboard visualization + karaoke lyrics vs. competitors |
| **Monetization potential** | Pay-per-song or subscription model |
| **Cost efficiency** | Process once, serve many users (shared cache) |
| **User retention** | Compelling reason to return daily for practice |

---

## 2. Objectives & Success Metrics

### 2.1 Business Objectives

| ID | Objective | Priority |
|----|-----------|----------|
| BO-1 | Enable users to learn any song from YouTube with accurate chord visualization | Critical |
| BO-2 | Provide superior UX compared to Chordify through CAGED position selection | Critical |
| BO-3 | Offer karaoke-style lyrics sync for singing while playing | High |
| BO-4 | Build foundation for future monetization (freemium/subscription) | High |
| BO-5 | Create shareable song cache to optimize processing costs | High |

### 2.2 Success Metrics (KPIs)

| Metric | Target | Measurement |
|--------|--------|-------------|
| Songs processed successfully | >95% | API success rate |
| Chord detection accuracy | 70-80% | User feedback / comparison |
| Lyrics transcription accuracy | >85% | Manual spot-check |
| User engagement | >3 songs/user/week | Analytics |
| Cache hit rate | >30% after 3 months | Database analytics |

---

## 3. Scope

### 3.1 In Scope (MVP)

| ID | Feature | Description |
|----|---------|-------------|
| F-1 | YouTube URL input | User pastes YouTube URL to process a song |
| F-2 | Chord detection | AI-powered chord recognition with timestamps |
| F-3 | Beat detection | BPM and beat grid for accurate synchronization |
| F-4 | Synchronized playback | Chords display on fretboard as song plays |
| F-5 | Position selector | User chooses fretboard position (0-14) |
| F-6 | CAGED shape selection | Auto-select best chord shape for chosen position |
| F-7 | Stem separation | Isolate vocals, drums, bass, guitar, etc. |
| F-8 | Stem controls | Mute toggles + volume sliders per stem |
| F-9 | **Karaoke lyrics** | On-demand transcription with word-level sync |
| F-10 | Speed control | Adjust playback speed (50%, 75%, 100%) |
| F-11 | Loop sections | A-B repeat for practicing difficult parts |
| F-12 | Chord anticipation | Optional mode showing next chord 1-2 beats early |
| F-13 | User accounts | Email/password authentication |
| F-14 | Song caching | Store processed songs to avoid re-processing |
| F-15 | File upload | Secondary input method for local audio files |

### 3.2 Lyrics Feature Details

| Aspect | Decision |
|--------|----------|
| **Source** | Pure audio-to-text transcription (no external lyrics databases) |
| **Processing** | On-demand when user clicks "Generate Lyrics" in Lyrics tab |
| **Audio input** | Option to use vocals stem (if available) or full audio |
| **Sync level** | Word-level timestamps for karaoke-style highlighting |
| **Fallback** | Line-level sync if word-level proves problematic |
| **Display** | Scrolling lyrics with current word/line highlighted |

### 3.3 Out of Scope (v2 / Future)

| Feature | Reason |
|---------|--------|
| External lyrics databases (Genius, Musixmatch) | Using transcription instead |
| Transpose / Capo simulation | Deferred to v2 |
| Google OAuth | Post-MVP authentication enhancement |
| Community chord corrections | Requires moderation system |
| Mobile app | Web-first approach |
| Offline mode | Requires significant architecture changes |

### 3.4 Assumptions

1. Self-hosted processing server can run lyrics-transcriber (Python/Whisper)
2. YouTube IFrame API allows synchronized playback control
3. Users accept that AI transcription isn't 100% accurate
4. Vocals stem improves transcription accuracy over mixed audio
5. Word-level timing is achievable with acceptable accuracy

### 3.5 Constraints

| Constraint | Impact |
|------------|--------|
| YouTube ToS | Cannot download/store YouTube audio permanently |
| Processing time | Lyrics generation adds ~30 seconds per song |
| Transcription quality | Varies by audio clarity, accent, genre |
| Hosting server | Lyrics feature blocked until server is deployed |

### 3.6 Dependencies

| Dependency | Status | Owner |
|------------|--------|-------|
| Hosting server implementation | In progress | Another agent |
| Python environment with Whisper | Pending | Hosting server |
| lyrics-transcriber package | Available | PyPI |

---

## 4. Functional Requirements

### 4.1 User Stories

#### Epic: Song Processing

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-1 | As a user, I want to paste a YouTube URL so that I can learn the chords of any song | - URL validation<br>- Processing status indicator<br>- Error handling for invalid/unavailable videos |
| US-2 | As a user, I want to upload an audio file so that I can analyze songs not on YouTube | - Support MP3, WAV, FLAC<br>- File size limit (150MB)<br>- Progress indicator |
| US-3 | As a user, I want to see a previously processed song instantly so that I don't wait for re-processing | - Cache lookup by YouTube video ID<br>- Immediate playback if cached |

#### Epic: Playback & Visualization

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-4 | As a user, I want to see chords change on the fretboard as the song plays so that I can play along | - Chord name displayed<br>- Fretboard shows correct shape<br>- Sync within 100ms of audio |
| US-5 | As a user, I want to choose my preferred fretboard position so that I can play chords where I'm comfortable | - Position slider (0-14)<br>- Shapes update immediately<br>- Persist preference |
| US-6 | As a user, I want to see the next chord before it changes so that I can prepare my fingers | - Toggle for anticipation mode<br>- Configurable lead time (1-2 beats)<br>- Visual distinction for upcoming chord |

#### Epic: Practice Tools

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-7 | As a user, I want to slow down the song so that I can practice difficult sections | - Speed options: 50%, 75%, 100%<br>- Pitch maintained<br>- Smooth transitions |
| US-8 | As a user, I want to loop a section so that I can repeat it until I master it | - Click/drag to select loop region<br>- Visual markers on timeline<br>- Easy clear/reset |
| US-9 | As a user, I want to mute certain instruments so that I can hear my own playing | - Individual stem toggles<br>- Volume sliders per stem |

#### Epic: Karaoke Lyrics

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-10 | As a user, I want to generate lyrics from the audio so that I can sing along | - "Generate Lyrics" button in Lyrics tab<br>- Progress indicator during transcription<br>- Option to use vocals stem or full audio |
| US-11 | As a user, I want to see lyrics highlighted word-by-word as the song plays (karaoke mode) | - Current word highlighted<br>- Smooth scrolling to current position<br>- Play button syncs lyrics with audio |
| US-12 | As a user, I want the lyrics to sync with the music when I click play | - Lyrics panel has its own play control<br>- Syncs with stem audio or YouTube playback<br>- Pause/resume maintains sync |

#### Epic: Account Management

| ID | User Story | Acceptance Criteria |
|----|------------|---------------------|
| US-13 | As a user, I want to create an account so that my processed songs are saved | - Email/password registration<br>- Email verification<br>- Secure password requirements |
| US-14 | As a user, I want to see my song history so that I can quickly access songs I've practiced | - List of processed songs<br>- Sort by date/name<br>- Quick play action |

---

## 5. Non-Functional Requirements

### 5.1 Performance

| Requirement | Target |
|-------------|--------|
| Initial song processing (chords + stems) | <60 seconds for 4-min song |
| Lyrics generation | <45 seconds for 4-min song |
| Cached song load time | <2 seconds |
| Playback sync accuracy | <100ms latency |
| Lyrics word sync accuracy | <200ms |

### 5.2 Scalability

| Requirement | Target |
|-------------|--------|
| Concurrent users | 100 (MVP) |
| Processed songs storage | 10,000 songs (initial) |
| Stem file storage | 500GB (initial) |
| Lyrics (LRC files) | Minimal (~10KB per song) |

### 5.3 Security

| Requirement | Implementation |
|-------------|----------------|
| Authentication | Supabase Auth (email/password) |
| API key protection | Server-side only, never exposed to client |
| Data encryption | HTTPS, encrypted at rest |
| Rate limiting | Prevent abuse of processing API |

---

## 6. Integration Requirements

### 6.1 External Systems

| System | Purpose | Integration Type |
|--------|---------|------------------|
| **Hosted Processing Server** | Chord detection, stem separation, lyrics transcription | REST API |
| **YouTube IFrame API** | Video playback, time sync | JavaScript SDK |
| **Supabase** | Database, auth, file storage | SDK + REST |
| **yt-dlp** | YouTube audio extraction | Server-side CLI |

### 6.2 Lyrics Processing Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Transcription** | lyrics-transcriber (Python) | Audio-to-text with word timestamps |
| **Speech Recognition** | Whisper (via lyrics-transcriber) | Core transcription engine |
| **Output Format** | Enhanced LRC | Word-level timestamps |
| **Frontend Playback** | Rabbit Lyrics (JavaScript) | Karaoke-style sync display |

### 6.3 Internal Systems

| System | Integration Point |
|--------|-------------------|
| Existing ChordsPage | Add YouTube input, maintain current chord visualization |
| CAGED shape system | Use existing `findShapeForPosition()` logic |
| Fretboard component | Receive chord changes from playback sync engine |

---

## 7. Data Requirements

### 7.1 Core Entities

```
processed_songs
├── id (uuid)
├── youtube_id (string, unique)
├── title (string)
├── artist (string)
├── duration_seconds (int)
├── key (string)
├── bpm (int)
├── has_lyrics (boolean)
├── processed_at (timestamp)
└── created_by (user_id)

song_chords
├── id (uuid)
├── song_id (fk)
├── timestamp_ms (int)
├── chord_name (string)
├── chord_root (int)
├── chord_quality (string)
└── confidence (float)

song_stems
├── id (uuid)
├── song_id (fk)
├── stem_type (enum)
├── storage_path (string)
└── duration_seconds (int)

song_lyrics
├── id (uuid)
├── song_id (fk)
├── lrc_content (text)         -- Full LRC file content
├── has_word_timing (boolean)  -- Enhanced LRC or standard
├── audio_source (enum)        -- 'vocals_stem' | 'full_audio'
├── generated_at (timestamp)
└── generation_duration_ms (int)

user_songs
├── user_id (fk)
├── song_id (fk)
├── added_at (timestamp)
├── last_played_at (timestamp)
├── preferred_position (int)
└── notes (text)
```

---

## 8. User Experience Requirements

### 8.1 UI Integration

The feature integrates into the existing `/chords` page with:

1. **YouTube URL input** - Prominent input field at top
2. **Processing status** - Progress indicator during analysis
3. **Video player** - Embedded YouTube player
4. **Chord timeline** - Visual chord progression bar
5. **Fretboard** - Existing visualization, driven by playback
6. **Controls panel** - Speed, loop, stem controls
7. **Lyrics tab** - Karaoke display with generate button

### 8.2 Lyrics Tab UI

| Element | Behavior |
|---------|----------|
| Generate Lyrics button | Visible when no lyrics exist; triggers transcription |
| Audio source toggle | "Use vocals stem" checkbox (if stem available) |
| Progress indicator | Shows during transcription |
| Lyrics display | Scrolling text with word/line highlighting |
| Play button | Starts audio + lyrics sync |
| Sync indicator | Shows current position in song |

---

## 9. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Word-level timing inaccurate | Medium | Medium | Fall back to line-level sync |
| Transcription quality poor for some genres | Medium | Medium | Set user expectations; allow regeneration |
| Hosting server delays | Medium | High | Lyrics feature can be added post-MVP |
| Whisper GPU requirements | Low | Medium | Use CPU fallback (slower but functional) |

---

## 10. Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Product Owner | Edgars | 2026-01-02 | Approved |
| Technical Lead | Winston (Architect) | 2026-01-02 | Drafted v2.0 |

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-02 | Initial draft |
| 2.0 | 2026-01-02 | Updated lyrics to pure transcription (removed Genius/Musixmatch); added karaoke-style word-level sync; added lyrics-transcriber + Rabbit Lyrics stack; added on-demand generation flow; added vocals stem option |
