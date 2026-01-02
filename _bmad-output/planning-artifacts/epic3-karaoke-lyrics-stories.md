# EPIC 3: Karaoke Lyrics - User Stories

| Field | Value |
|-------|-------|
| **Document Version** | 1.0 |
| **Date** | 2026-01-02 |
| **Author** | PM Agent |
| **Related BRD** | brd-youtube-chord-player.md |
| **Related Architecture** | architecture-youtube-chord-player.md (Section 3) |
| **Status** | Ready for Development |

---

## Epic Overview

Add karaoke-style lyrics display with word-level highlighting, synchronized to audio playback. Lyrics are generated on-demand from audio transcription using lyrics-transcriber + Whisper, displayed via Rabbit Lyrics frontend library.

### Epic Goals
- Enable users to sing along with karaoke-style lyrics while playing chords
- Provide word-level highlighting for precise timing
- Allow choice between vocals stem and full audio for transcription
- Integrate seamlessly with existing stem playback system

### Key Technical Decisions (From Architecture)
| Decision | Choice |
|----------|--------|
| Lyrics source | Pure audio-to-text transcription (no external APIs) |
| Transcription engine | lyrics-transcriber + Whisper |
| Frontend sync library | Rabbit Lyrics |
| Output format | Enhanced LRC (word-level timestamps) |
| Processing trigger | On-demand (user clicks "Generate") |

### Dependencies & Blockers
| Dependency | Status | Impact |
|------------|--------|--------|
| Python backend with lyrics-transcriber | Ready (local venv exists) | Required for Stories 3.3, 3.6 |
| Vocals stem available | Ready | Used as transcription input option |
| Rabbit Lyrics npm package | Available | Frontend integration |

> **Note:** Local development on Mac (M4) is fully supported. The same lyrics-transcriber + Whisper stack runs locally or on a hosted server. Production deployment can happen later without code changes.

---

## Story 3.1: Lyrics Tab UI Shell

**Priority:** Must Have
**Backend Dependency:** None (Frontend Only)
**Estimated Complexity:** Small

### User Story

> As a user, I want to see a "Lyrics" tab in the player interface so that I can access lyrics features for the current song.

### Description

Add a new "Lyrics" tab to the existing tabs container in the YouTube Chord Player. The tab should display appropriate UI based on lyrics availability state:
- **No lyrics generated:** Show "Generate Lyrics" button with explanation text
- **Generating:** Show progress indicator with percentage
- **Lyrics available:** Show lyrics display component
- **Error state:** Show error message with retry option

### Acceptance Criteria

**Tab Integration**
- [ ] "Lyrics" tab appears in the tabs container alongside existing tabs (Video, etc.)
- [ ] Tab is selectable and shows active state styling
- [ ] Tab content area respects responsive layout
- [ ] Tab persists selection state during playback

**Empty State (No Lyrics)**
- [ ] Shows prominent "Generate Lyrics" button (centered)
- [ ] Includes helper text: "Generate lyrics from the audio to sing along"
- [ ] Button is styled consistently with existing UI patterns
- [ ] Empty state fills available space appropriately

**Loading State**
- [ ] Progress indicator shows during lyrics generation
- [ ] Progress percentage displayed (0-100%)
- [ ] "Generating lyrics..." message visible
- [ ] Cancel option available (optional for v1)

**Error State**
- [ ] Error message clearly communicates the issue
- [ ] "Try Again" button allows retry
- [ ] Different error messages for different failure types:
  - "Lyrics generation took too long. Please try again."
  - "No vocals detected in this track."
  - "Lyrics service temporarily unavailable."

**State Transitions**
- [ ] UI updates immediately when generation starts
- [ ] UI updates when lyrics become available
- [ ] UI handles network errors gracefully

### Technical Notes

**Files to Create:**
```
product/app/chords/lyrics/
├── LyricsPanel.tsx           # Main container with state handling
├── LyricsEmptyState.tsx      # "Generate Lyrics" button + helper text
├── LyricsLoadingState.tsx    # Progress indicator
└── LyricsErrorState.tsx      # Error message + retry
```

**State Integration:**
- Add `lyrics` state to existing `SongProvider` context
- States: `null` (not generated), `{ loading: true, progress: number }`, `{ lrcContent: string }`, `{ error: string }`

### Definition of Done
- [ ] Component renders in Lyrics tab
- [ ] All four states (empty, loading, error, loaded) display correctly
- [ ] TypeScript types defined for lyrics state
- [ ] Component matches existing styled-components patterns
- [ ] No console errors or warnings

---

## Story 3.2: Audio Source Selection

**Priority:** Must Have
**Backend Dependency:** None (Frontend Only)
**Estimated Complexity:** Small

### User Story

> As a user, I want to choose whether to generate lyrics from the vocals stem or full audio so that I can get more accurate lyrics when vocals are available.

### Description

When a song has a vocals stem available (from stem separation), provide a toggle that lets users choose which audio source to use for lyrics transcription. The vocals stem typically provides cleaner transcription results.

### Acceptance Criteria

**Toggle Visibility**
- [ ] Checkbox/toggle only visible when:
  - Song has been processed with stems
  - Vocals stem exists for the song
- [ ] Hidden when no stems available (full audio is the only option)
- [ ] Hidden after lyrics have been generated (can't change source post-generation)

**Toggle Behavior**
- [ ] Label: "Use vocals stem for better accuracy"
- [ ] Default: Checked (if vocals available)
- [ ] Selecting changes the `audioSource` parameter for API call
- [ ] Visual indicator (info icon/tooltip) explains the option

**State Management**
- [ ] Selection persists while on Lyrics tab
- [ ] Selection value passed to lyrics generation function
- [ ] Selection disabled during generation

**UX Polish**
- [ ] Positioned near the "Generate Lyrics" button
- [ ] Tooltip: "Using the vocals-only track typically produces more accurate lyrics"
- [ ] Checkmark icon or toggle switch (consistent with app patterns)

### Technical Notes

**Component:**
```typescript
// AudioSourceToggle.tsx
type AudioSource = 'vocals_stem' | 'full_audio'

type AudioSourceToggleProps = {
  hasVocalsStem: boolean
  audioSource: AudioSource
  onSourceChange: (source: AudioSource) => void
  disabled: boolean
}
```

**Integration:**
- Check `song.stems` for vocals stem availability
- Pass selected source to `useLyricsGeneration` hook

### Definition of Done
- [ ] Toggle renders when vocals stem exists
- [ ] Toggle hidden when no stems available
- [ ] Selection correctly updates state
- [ ] Toggle disabled during generation
- [ ] Tooltip/info text explains the option

---

## Story 3.3: Lyrics Generation API Integration (Frontend)

**Priority:** Must Have
**Backend Dependency:** Local Python backend (ready)
**Estimated Complexity:** Medium

### User Story

> As a user, I want to click "Generate Lyrics" and see progress while lyrics are being transcribed so that I know the system is working and can estimate wait time.

### Description

Implement the frontend API integration for lyrics generation. This includes:
1. Calling `POST /api/lyrics/generate` to start transcription
2. Polling `GET /api/lyrics/status/[jobId]` for progress
3. Fetching final lyrics via `GET /api/lyrics/[songId]`
4. Updating UI state throughout the process

### Acceptance Criteria

**Generate Button Click**
- [ ] Clicking "Generate Lyrics" triggers API call
- [ ] Button becomes disabled immediately
- [ ] UI transitions to loading state
- [ ] Network errors show appropriate error state

**API Request**
- [ ] `POST /api/lyrics/generate` called with:
  - `songId`: Current song ID
  - `audioSource`: Selected audio source ('vocals_stem' | 'full_audio')
- [ ] Request includes proper headers and authentication
- [ ] Handle 202 (processing started) response
- [ ] Handle 200 (lyrics already exist) response

**Polling Mechanism**
- [ ] Poll `GET /api/lyrics/status/[jobId]` every 2 seconds
- [ ] Update progress percentage in UI (0-100)
- [ ] Stop polling when status is 'complete' or 'failed'
- [ ] Maximum polling duration: 3 minutes (timeout)
- [ ] Clean up polling interval on component unmount

**Completion Handling**
- [ ] On 'complete': Fetch lyrics and update state
- [ ] On 'failed': Show error message from API
- [ ] On timeout: Show "took too long" error with retry

**Error Handling**
- [ ] Network errors: "Unable to connect. Please check your connection."
- [ ] 500 errors: "Something went wrong. Please try again."
- [ ] Timeout: "Lyrics generation took too long. Please try again."
- [ ] All errors show retry button

### Technical Notes

**Hook Implementation:**
```typescript
// useLyricsGeneration.ts
export function useLyricsGeneration(songId: string) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const generateLyrics = async (audioSource: AudioSource) => {
    // Implementation
  }

  return { generateLyrics, isGenerating, progress, error }
}
```

**API Routes (Next.js):**
```
/api/lyrics/generate     POST  - Start generation
/api/lyrics/status/[id]  GET   - Poll status
/api/lyrics/[songId]     GET   - Get lyrics
```

### Definition of Done
- [ ] useLyricsGeneration hook implemented
- [ ] API integration works with local backend
- [ ] Progress updates displayed in UI
- [ ] Error handling covers all failure modes
- [ ] Polling properly cleans up on unmount
- [ ] TypeScript types for API responses

---

## Story 3.4: Karaoke Lyrics Display with Rabbit Lyrics

**Priority:** Must Have
**Backend Dependency:** None (Frontend Only)
**Estimated Complexity:** Medium

### User Story

> As a user, I want to see lyrics displayed in karaoke style with word-by-word highlighting so that I can easily follow along and sing while playing.

### Description

Integrate the Rabbit Lyrics library to parse Enhanced LRC content and display karaoke-style lyrics with:
- Current line prominently displayed
- Current word highlighted within the line
- Auto-scrolling to keep current position visible
- Previous/upcoming lines visible but dimmed

### Acceptance Criteria

**LRC Parsing**
- [ ] Rabbit Lyrics parses Enhanced LRC format correctly
- [ ] Word-level timestamps extracted (`<00:12.50>word`)
- [ ] Line-level timestamps as fallback if word timing unavailable
- [ ] Invalid LRC content shows graceful error

**Visual Display**
- [ ] Lyrics container has fixed height (scrollable)
- [ ] Current line: Full opacity, slightly larger font
- [ ] Previous lines: Visible, 50% opacity, smaller font
- [ ] Upcoming lines: Visible, 50% opacity, smaller font
- [ ] Current word: Highlighted color (accent color), bold
- [ ] Sung words in current line: Normal weight

**Auto-Scroll Behavior**
- [ ] Container auto-scrolls to keep current line visible
- [ ] Scroll behavior is smooth (CSS `scroll-behavior: smooth`)
- [ ] Current line positioned in upper third of container
- [ ] User scroll override: Auto-scroll resumes after 3 seconds idle

**Responsive Layout**
- [ ] Works on desktop (width > 800px)
- [ ] Works on tablet/narrow desktop
- [ ] Font sizes adjust appropriately
- [ ] Container height adjusts to available space

### Technical Notes

**Dependencies:**
```bash
yarn add rabbit-lyrics
```

**Component Structure:**
```typescript
// LyricsDisplay.tsx
type LyricsDisplayProps = {
  lrcContent: string
  hasWordTiming: boolean
}

// CSS classes from Rabbit Lyrics:
// .rabbit-lyrics-line         - Each line
// .rabbit-lyrics-line-active  - Current line
// .rabbit-lyrics-word-active  - Current word
```

**Styling (styled-components):**
```typescript
const LyricsContainer = styled.div`
  height: 300px;
  overflow-y: auto;
  scroll-behavior: smooth;

  .rabbit-lyrics-line {
    padding: 8px 0;
    opacity: 0.5;
    transition: all 0.2s ease;
  }

  .rabbit-lyrics-line-active {
    opacity: 1;
    font-size: 1.2em;
  }

  .rabbit-lyrics-word-active {
    color: var(--accent-color);
    font-weight: bold;
  }
`
```

### Definition of Done
- [ ] Rabbit Lyrics integrated and configured
- [ ] LRC content renders as karaoke display
- [ ] Word highlighting works with Enhanced LRC
- [ ] Line-level fallback works for standard LRC
- [ ] Auto-scroll keeps current line visible
- [ ] Styling matches app design system

---

## Story 3.5: Lyrics Playback Synchronization

**Priority:** Must Have
**Backend Dependency:** None (Frontend Only)
**Estimated Complexity:** Medium

### User Story

> As a user, I want the lyrics to sync with the music when I play, pause, seek, or change speed so that the highlighting always matches what I'm hearing.

### Description

Connect the lyrics display to the audio playback system. The lyrics must stay synchronized regardless of:
- Play/pause state changes
- User seeking to different positions
- Playback speed changes (50%, 75%, 100%)
- Switching between YouTube audio and stem playback

### Acceptance Criteria

**Play/Pause Sync**
- [ ] Lyrics highlighting starts when audio plays
- [ ] Lyrics highlighting pauses when audio pauses
- [ ] Pause at mid-word maintains word highlight
- [ ] Resume continues from paused position

**Seek Sync**
- [ ] Seeking audio updates lyrics position immediately
- [ ] Lyrics jump to correct line/word for new time
- [ ] No visual glitches during seek
- [ ] Handles seeking to positions without lyrics (instrumental sections)

**Speed Control Sync**
- [ ] 50% speed: Lyrics highlight at half speed
- [ ] 75% speed: Lyrics highlight at 75% speed
- [ ] 100% speed: Normal highlighting
- [ ] Speed change mid-playback maintains sync
- [ ] No drift over time at different speeds

**Audio Source Compatibility**
- [ ] Works with stem audio playback (primary)
- [ ] Works with YouTube player time (if stems muted)
- [ ] Handles audio source switches gracefully

**Edge Cases**
- [ ] Song start before first lyric: Display shows first line dimmed
- [ ] Instrumental sections: No highlighting, but scroll position maintained
- [ ] Song end after last lyric: Last line remains visible
- [ ] Very fast tempo: Highlighting keeps up

### Technical Notes

**Hook Implementation:**
```typescript
// useLyricsSync.ts
export function useLyricsSync(
  lrcContent: string | null,
  audioElement: HTMLAudioElement | null,
  playbackSpeed: number
) {
  const rabbitLyricsRef = useRef<RabbitLyrics | null>(null)

  // Initialize Rabbit Lyrics with audio element
  // Handle speed changes
  // Clean up on unmount

  return { currentLine, currentWord, isActive }
}
```

**Integration Points:**
- Connect to `SongProvider` context for playback state
- Access `audioElement` from stem playback system
- Listen to `playbackSpeed` changes

**Rabbit Lyrics Configuration:**
```typescript
new RabbitLyrics({
  element: lyricsContainer,
  mediaElement: audioElement,
  lyrics: lrcContent,
  mode: 'karaoke',
  onLineChange: handleLineChange,
  onWordChange: handleWordChange,
})
```

### Definition of Done
- [ ] useLyricsSync hook implemented
- [ ] Play/pause correctly syncs lyrics
- [ ] Seeking updates lyrics position
- [ ] Speed changes maintain sync
- [ ] Works with stem audio element
- [ ] No console errors during playback

---

## Story 3.6: Backend - Lyrics Transcription Endpoint

**Priority:** Must Have
**Backend Dependency:** None (local Python venv exists)
**Estimated Complexity:** Medium

### User Story

> As the system, I need a lyrics transcription endpoint on the processing server so that the frontend can request lyrics generation and receive LRC content.

### Description

Implement the `/process/lyrics` endpoint on the hosted Python processing server. This endpoint:
1. Receives audio file URL (vocals stem or full audio)
2. Downloads the audio from Supabase storage
3. Runs lyrics-transcriber with Whisper
4. Returns Enhanced LRC with word-level timestamps
5. Stores result in database via callback

### Acceptance Criteria

**API Endpoint**
- [ ] `POST /process/lyrics` accepts:
  - `song_id`: UUID of the song
  - `audio_url`: Signed Supabase URL for audio file
  - `audio_source`: 'vocals_stem' | 'full_audio'
  - `callback_url`: URL to notify on completion
- [ ] Returns 202 Accepted with `job_id`
- [ ] Validates input parameters

**Audio Processing**
- [ ] Downloads audio from Supabase signed URL
- [ ] Supports MP3, WAV input formats
- [ ] Handles download failures gracefully
- [ ] Cleans up temporary files after processing

**Transcription**
- [ ] Uses lyrics-transcriber library
- [ ] Whisper model: large-v2 (or medium for faster)
- [ ] Enables word-level timestamps
- [ ] Outputs Enhanced LRC format
- [ ] GPU acceleration if available, CPU fallback

**Output Format**
- [ ] Enhanced LRC with word timestamps:
  ```
  [00:12.34]<00:12.50>First <00:12.80>line <00:13.10>of <00:13.40>lyrics
  ```
- [ ] Falls back to line-level if word timing fails
- [ ] Includes metadata (total duration)

**Status Tracking**
- [ ] Updates job status: queued → processing → complete/failed
- [ ] Provides progress percentage (0-100)
- [ ] `GET /status/[jobId]` returns current status
- [ ] Calls callback URL on completion/failure

**Error Handling**
- [ ] Audio download failure: Clear error message
- [ ] Transcription timeout (5 min max): Terminate and report
- [ ] Low confidence: Still return result with warning
- [ ] No speech detected: Return empty LRC with message

**Storage**
- [ ] Stores LRC content in `song_lyrics` table
- [ ] Sets `has_word_timing` flag appropriately
- [ ] Records `audio_source` used
- [ ] Records `generation_duration_ms`

### Technical Notes

**Python Implementation:**
```python
# app/services/lyrics_transcriber.py
from lyrics_transcriber import LyricsTranscriber

class LyricsService:
    def __init__(self):
        self.transcriber = LyricsTranscriber(
            whisper_model="large-v2",
            device="cuda" if torch.cuda.is_available() else "cpu"
        )

    async def transcribe(self, audio_path: str) -> dict:
        result = self.transcriber.transcribe(
            audio_path,
            word_timestamps=True
        )
        return {
            "lrc_content": result.to_lrc(enhanced=True),
            "has_word_timing": True,
            "duration_ms": result.duration_ms
        }
```

**Database Schema:**
```sql
-- song_lyrics table (from architecture)
CREATE TABLE song_lyrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES processed_songs(id),
  lrc_content TEXT NOT NULL,
  has_word_timing BOOLEAN DEFAULT TRUE,
  audio_source VARCHAR(20) NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generation_duration_ms INTEGER,
  UNIQUE(song_id)
);
```

**Performance Targets:**
| Audio Length | GPU Time | CPU Time |
|--------------|----------|----------|
| 3 minutes | ~15 sec | ~45 sec |
| 5 minutes | ~25 sec | ~75 sec |

### Definition of Done
- [ ] Endpoint running locally (can deploy to server later)
- [ ] lyrics-transcriber installed in backend venv
- [ ] Whisper model downloaded and cached
- [ ] Job status tracking working
- [ ] LRC output stored in database
- [ ] Integration tests pass
- [ ] Handles 5-minute songs within timeout

### Local Development Note
> Runs on Mac M4 with Metal acceleration. Same code deploys to production server later without changes. Whisper model (~3GB) downloads on first run.

---

## Story Dependencies Graph

```
Story 3.6 (Backend Endpoint) ─────────────────────┐
                                                  │
Story 3.1 (UI Shell)                              │
    │                                             │
    ├──► Story 3.2 (Audio Source Toggle)          │
    │                                             │
    └──► Story 3.3 (API Integration) ◄────────────┘
              │
              └──► Story 3.4 (Rabbit Lyrics Display)
                        │
                        └──► Story 3.5 (Playback Sync)
```

**Recommended parallel tracks:**
- **Track A (Frontend):** 3.1 → 3.2 → 3.4 (with mock data) → 3.5
- **Track B (Backend):** 3.6 → 3.3 (connect frontend to backend)

---

## Implementation Order

### Option A: Sequential (simpler)
1. **Story 3.6** - Backend lyrics endpoint (local)
2. **Story 3.1** - Lyrics Tab UI Shell
3. **Story 3.2** - Audio Source Selection
4. **Story 3.3** - API Integration
5. **Story 3.4** - Karaoke Display
6. **Story 3.5** - Playback Synchronization

### Option B: Parallel Tracks (faster)

**Track A - Frontend (can use mock LRC):**
1. **Story 3.1** - Lyrics Tab UI Shell
2. **Story 3.2** - Audio Source Selection
3. **Story 3.4** - Karaoke Display (mock data)
4. **Story 3.5** - Playback Sync

**Track B - Backend (runs in parallel):**
1. **Story 3.6** - Backend lyrics endpoint

**Integration:**
- **Story 3.3** - Connect frontend to backend (after both tracks complete)

---

## Test Data

### Mock LRC for Frontend Development

**Enhanced LRC (word-level):**
```
[ti:Test Song]
[ar:Test Artist]
[00:05.00]<00:05.00>Hello <00:05.50>world <00:06.00>this <00:06.30>is <00:06.50>a <00:06.70>test
[00:08.00]<00:08.00>Second <00:08.50>line <00:09.00>of <00:09.30>lyrics <00:09.60>here
[00:12.00]<00:12.00>Third <00:12.50>line <00:13.00>continues <00:13.50>on
[00:16.00]<00:16.00>Final <00:16.50>line <00:17.00>of <00:17.30>the <00:17.60>song
```

**Standard LRC (line-level fallback):**
```
[ti:Test Song]
[ar:Test Artist]
[00:05.00]Hello world this is a test
[00:08.00]Second line of lyrics here
[00:12.00]Third line continues on
[00:16.00]Final line of the song
```

---

## Acceptance Criteria Summary

| Story | AC Count | Notes |
|-------|----------|-------|
| 3.1 - UI Shell | 15 | Frontend only |
| 3.2 - Audio Source | 9 | Frontend only |
| 3.3 - API Integration | 16 | Connects FE to BE |
| 3.4 - Karaoke Display | 12 | Frontend only |
| 3.5 - Playback Sync | 14 | Frontend only |
| 3.6 - Backend Endpoint | 20 | Local Python |

**Total:** 86 acceptance criteria
**All stories ready for development** - no blockers

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-02 | Initial user stories for EPIC 3 |
| 1.1 | 2026-01-02 | Removed "blocked" status - local development on Mac M4 fully supported |
