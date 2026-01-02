# PM Handoff: EPIC 3 - Karaoke Lyrics

## Context for PM Agent

This document provides all context needed to plan EPIC 3 (Karaoke Lyrics) for the YouTube Chord Player feature. The Architect has completed research and technical decisions; the PM should create detailed stories with acceptance criteria.

---

## 1. Implementation Status

### Completed (EPIC 1 & 2)

| Feature | Status | Notes |
|---------|--------|-------|
| YouTube URL input | ✅ Done | Validation, processing trigger |
| Chord detection | ✅ Done | AI-powered with timestamps |
| Beat detection | ✅ Done | BPM and beat grid |
| Synchronized playback | ✅ Done | Chords display on fretboard |
| Position selector | ✅ Done | Fretboard position 0-14 |
| CAGED shape selection | ✅ Done | Auto-select best shape |
| Stem separation | ✅ Done | Vocals, drums, bass, guitar, etc. |
| Stem controls | ✅ Done | Mute toggles + volume sliders |
| Speed control | ✅ Done | 50%, 75%, 100% |
| Chord anticipation | ✅ Done | Shows next chord early |
| User accounts | ✅ Done | Email/password auth |
| Song caching | ✅ Done | Stored processed songs |

### Not Yet Implemented

| Feature | EPIC | Priority | Notes |
|---------|------|----------|-------|
| Loop sections (A-B repeat) | 2 | Medium | Deferred, not blocking |
| **Karaoke Lyrics** | **3** | **High** | **This handoff** |
| Polish & Mobile | 4 | Low | Future |

---

## 2. EPIC 3 Scope: Karaoke Lyrics

### 2.1 Feature Overview

Add karaoke-style lyrics display with word-level highlighting, synchronized to audio playback. Lyrics are generated on-demand from audio transcription (no external lyrics databases).

### 2.2 Key Decisions (Already Made by Architect)

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **Lyrics source** | Pure audio-to-text transcription | No external API dependencies (Genius/Musixmatch) |
| **Transcription engine** | lyrics-transcriber + Whisper | Word-level timestamps, open source |
| **Frontend sync library** | Rabbit Lyrics | Karaoke mode, LRC support |
| **Output format** | Enhanced LRC | Word-level timestamps |
| **Processing trigger** | On-demand (user clicks "Generate") | Not automatic on song load |
| **Audio input option** | Vocals stem OR full audio | User choice, stem is more accurate |
| **Fallback** | Line-level sync | If word-level timing problematic |

### 2.3 User Stories to Create

Based on BRD, these user stories need detailed acceptance criteria:

| ID | User Story | Priority |
|----|------------|----------|
| US-10 | As a user, I want to generate lyrics from the audio so that I can sing along | Must Have |
| US-11 | As a user, I want to see lyrics highlighted word-by-word as the song plays (karaoke mode) | Must Have |
| US-12 | As a user, I want the lyrics to sync with the music when I click play | Must Have |

### 2.4 Technical Components (From Architecture)

**Frontend (React/TypeScript):**
```
product/app/chords/lyrics/
├── LyricsPanel.tsx           # Main container with tabs integration
├── LyricsDisplay.tsx         # Karaoke text display (uses Rabbit Lyrics)
├── LyricsGenerateButton.tsx  # "Generate Lyrics" trigger
├── AudioSourceToggle.tsx     # Checkbox: "Use vocals stem"
└── hooks/
    ├── useLyricsGeneration.ts  # API call + polling for transcription
    └── useLyricsSync.ts        # Rabbit Lyrics integration
```

**API Routes (Next.js):**
```
/api/lyrics/generate     POST  - Start lyrics generation
/api/lyrics/status/[id]  GET   - Poll generation status
/api/lyrics/[songId]     GET   - Get lyrics LRC content
```

**Backend (Hosted Processing Server - Python):**
```
/process/lyrics  POST  - Transcribe audio to LRC
```

**Database:**
```sql
song_lyrics (
  song_id UUID,
  lrc_content TEXT,
  has_word_timing BOOLEAN,
  audio_source VARCHAR(20),  -- 'vocals_stem' | 'full_audio'
  generated_at TIMESTAMPTZ
)
```

---

## 3. Dependencies & Blockers

| Dependency | Status | Owner | Impact |
|------------|--------|-------|--------|
| **Hosted processing server** | In progress | Another agent | **BLOCKS backend lyrics endpoint** |
| Python 3.9+ on server | Pending | Server setup | Required for lyrics-transcriber |
| Whisper model (~3GB) | Pending | Server setup | Download during setup |
| Vocals stem available | ✅ Ready | Already implemented | Used as input option |
| Rabbit Lyrics npm package | Available | npm | Frontend integration |

**Critical Blocker:** The lyrics transcription endpoint requires the hosted processing server. Frontend work can proceed independently; backend integration is blocked.

---

## 4. Suggested Story Breakdown

### Story 1: Lyrics Tab UI Shell
- Add "Lyrics" tab to video section
- Empty state with "Generate Lyrics" button
- Loading state during generation
- Error state handling
- **No backend dependency** - can start immediately

### Story 2: Audio Source Selection
- Checkbox: "Use vocals stem for better accuracy"
- Only visible if vocals stem exists for song
- Stores preference for API call
- **No backend dependency**

### Story 3: Lyrics Generation API (Frontend)
- POST /api/lyrics/generate endpoint
- Polling mechanism for status
- Progress indicator in UI
- **Depends on:** Story 1, Processing Server

### Story 4: Lyrics Display with Rabbit Lyrics
- Integrate Rabbit Lyrics library
- Parse Enhanced LRC format
- Word-level highlighting CSS
- Smooth scrolling to current line
- **Depends on:** Story 3

### Story 5: Playback Sync
- Sync lyrics with stem audio playback
- Handle play/pause/seek
- Maintain sync when speed changes
- **Depends on:** Story 4

### Story 6: Processing Server - Lyrics Endpoint
- /process/lyrics endpoint
- lyrics-transcriber integration
- Whisper model loading
- LRC output generation
- **Depends on:** Hosting server being ready

---

## 5. Acceptance Criteria Hints

### Generate Lyrics Button
- [ ] Button visible only when song has no lyrics
- [ ] Button disabled during generation
- [ ] Shows progress percentage during generation
- [ ] Displays error message if generation fails
- [ ] Button hidden once lyrics exist

### Karaoke Display
- [ ] Current line is visually distinct (larger, full opacity)
- [ ] Previous/next lines visible but dimmed
- [ ] Auto-scrolls to keep current line in view
- [ ] Word-level: current word highlighted (color change)
- [ ] Graceful fallback to line-level if no word timing

### Sync Behavior
- [ ] Lyrics start when audio starts
- [ ] Lyrics pause when audio pauses
- [ ] Seeking audio updates lyrics position
- [ ] Speed changes don't break sync
- [ ] Works with stem audio, not just YouTube

---

## 6. Reference Documents

| Document | Path |
|----------|------|
| BRD v2.0 | `_bmad-output/planning-artifacts/brd-youtube-chord-player.md` |
| Architecture v2.0 | `_bmad-output/planning-artifacts/architecture-youtube-chord-player.md` |
| Product Brief | `docs/PRODUCT_BRIEF.md` |

### Key Architecture Sections
- Section 3: Lyrics Architecture (processing flow, API design, components)
- Section 4.2: Lyrics Transcription Service (Python code)
- Section 5.1: Database Schema (song_lyrics table)
- Section 7: Error Handling (lyrics-specific errors)
- Section 8: Performance (processing time estimates)

---

## 7. Research Summary

The Architect researched lyrics extraction libraries. Key findings:

**Backend (Transcription):**
- [lyrics-transcriber](https://pypi.org/project/lyrics-transcriber/) - Full pipeline, outputs LRC
- [WhisperX](https://github.com/m-bain/whisperX) - Word-level timestamps via wav2vec2
- [faster-whisper](https://github.com/SYSTRAN/faster-whisper) - 4x faster than OpenAI Whisper

**Frontend (Playback):**
- [Rabbit Lyrics](https://github.com/guoyunhe/rabbit-lyrics) - Karaoke mode, word highlighting
- [Liricle](https://github.com/mcanam/liricle) - Lightweight alternative

**Decision:** Use lyrics-transcriber (backend) + Rabbit Lyrics (frontend)

---

## 8. How to Use This Handoff

1. **Load this document** when starting PM agent
2. **Reference BRD and Architecture** for full details
3. **Create stories** based on Section 4 breakdown
4. **Use acceptance criteria hints** from Section 5
5. **Note the blocker** on processing server for backend stories

---

*Prepared by: Winston (Architect Agent)*
*Date: 2026-01-02*
