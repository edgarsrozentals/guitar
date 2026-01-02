# Architecture Document

## YouTube Chord Detection & Visualization Player

| Field | Value |
|-------|-------|
| **Document Version** | 2.0 |
| **Date** | 2026-01-02 |
| **Author** | Winston (Architect Agent) |
| **Related BRD** | brd-youtube-chord-player.md |
| **Status** | Approved |

---

## 1. Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                               │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         Next.js Frontend                            │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐    │   │
│  │  │ YouTube      │  │ Playback     │  │ Chord Visualization    │    │   │
│  │  │ IFrame API   │  │ Sync Engine  │  │ (Existing Fretboard)   │    │   │
│  │  └──────┬───────┘  └──────┬───────┘  └───────────▲────────────┘    │   │
│  │         │                 │                      │                  │   │
│  │         └────────────────►├──────────────────────┘                  │   │
│  │                           │                                         │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │   │
│  │  │ Stem Mixer   │  │ Karaoke      │  │ Rabbit Lyrics            │  │   │
│  │  │ (Web Audio)  │  │ Lyrics Panel │  │ (LRC Sync Engine)        │  │   │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │ HTTPS
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NEXT.JS API ROUTES                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │  /api/songs/process    - Initiate song processing                   │   │
│  │  /api/songs/[id]       - Get song data (chords, stems)              │   │
│  │  /api/songs/status     - Check processing status                    │   │
│  │  /api/lyrics/generate  - Trigger lyrics transcription               │   │
│  │  /api/lyrics/[songId]  - Get lyrics (LRC content)                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         HOSTED PROCESSING SERVER                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │  yt-dlp      │  │  Chord       │  │  Stem        │  │  Lyrics      │   │
│  │  (Extract)   │  │  Detection   │  │  Separation  │  │  Transcriber │   │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘   │
│                                                               │            │
│                                                        ┌──────▼─────┐      │
│                                                        │  Whisper   │      │
│                                                        │  (ASR)     │      │
│                                                        └────────────┘      │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                              SUPABASE                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────────────┐  │
│  │  Auth        │  │  Database    │  │  Storage                         │  │
│  │  (Users)     │  │  (Songs,     │  │  (Stems, LRC files)              │  │
│  │              │  │   Chords,    │  │                                  │  │
│  │              │  │   Lyrics)    │  │                                  │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend** | Next.js 15, React 19, TypeScript | Existing stack |
| **Styling** | styled-components | Existing |
| **State** | React Context + URL state | Existing pattern |
| **Lyrics Sync** | Rabbit Lyrics | Karaoke-style LRC playback |
| **Backend** | Next.js API Routes | Serverless, integrated |
| **Processing Server** | Python (self-hosted) | Required for Whisper |
| **Transcription** | lyrics-transcriber + Whisper | Word-level timestamps |
| **Database** | Supabase PostgreSQL | Real-time capabilities |
| **Auth** | Supabase Auth | Integrated |
| **Storage** | Supabase Storage | S3-compatible |

---

## 2. Component Architecture

### 2.1 Frontend Components

```
product/app/chords/
├── ChordsPage.tsx                    # Existing - add YouTube integration
├── youtube/                          # YouTube player module
│   ├── YouTubeChordPlayer.tsx        # Main player container
│   ├── YouTubeURLInput.tsx           # URL input with validation
│   ├── YouTubeEmbed.tsx              # IFrame wrapper with API hooks
│   ├── ProcessingStatus.tsx          # Loading/progress indicator
│   └── hooks/
│       ├── useYouTubePlayer.ts       # YouTube IFrame API integration
│       ├── usePlaybackSync.ts        # Time sync with chord data
│       └── useSongProcessing.ts      # API calls for processing
├── playback/                         # Playback controls module
│   ├── PlaybackControls.tsx          # Play/pause, seek, timeline
│   ├── SpeedControl.tsx              # Playback speed selector
│   ├── LoopSelector.tsx              # A-B loop functionality
│   ├── ChordTimeline.tsx             # Visual chord progression bar
│   └── hooks/
│       └── useLoopControl.ts         # Loop state management
├── stems/                            # Stem separation module
│   ├── StemControls.tsx              # Mute toggles + volume sliders
│   ├── StemMixer.tsx                 # Audio mixing logic
│   └── hooks/
│       └── useStemPlayback.ts        # Web Audio API for stems
├── lyrics/                           # Karaoke lyrics module
│   ├── LyricsPanel.tsx               # Main lyrics container
│   ├── LyricsDisplay.tsx             # Karaoke text display
│   ├── LyricsGenerateButton.tsx      # "Generate Lyrics" trigger
│   ├── AudioSourceToggle.tsx         # Vocals stem vs full audio
│   └── hooks/
│       ├── useLyricsGeneration.ts    # API call for transcription
│       └── useLyricsSync.ts          # Rabbit Lyrics integration
└── state/
    ├── chords.ts                     # Existing chord state
    └── song.ts                       # Song/playback state
```

### 2.2 Component Hierarchy

```
<ChordsPage>
  <ResponsiveFretboardConfigProvider>
    <ChordsProvider>
      <SongProvider>

        <YouTubeURLInput />
        <ProcessingStatus />

        <PlayerLayout>
          <YouTubeEmbed />
          <ChordTimeline />
        </PlayerLayout>

        <ControlsLayout>
          <PlaybackControls />
          <SpeedControl />
          <LoopSelector />
          <StemControls />
        </ControlsLayout>

        <ManagePosition />
        <ChordFretboard />

        <TabsContainer>
          <Tab name="Video">...</Tab>
          <Tab name="Lyrics">
            <LyricsPanel>
              <LyricsGenerateButton />      {/* If no lyrics */}
              <AudioSourceToggle />         {/* If stems available */}
              <LyricsDisplay />             {/* Karaoke view */}
            </LyricsPanel>
          </Tab>
        </TabsContainer>

      </SongProvider>
    </ChordsProvider>
  </ResponsiveFretboardConfigProvider>
</ChordsPage>
```

### 2.3 State Management

```typescript
// product/app/chords/state/song.ts

type SongState = {
  // Song metadata
  song: ProcessedSong | null
  isLoading: boolean
  error: string | null

  // Playback state
  isPlaying: boolean
  currentTime: number           // milliseconds
  duration: number
  playbackSpeed: number         // 0.5, 0.75, 1.0

  // Current chord (derived from currentTime + song.chords)
  currentChord: ChordData | null
  nextChord: ChordData | null

  // Loop state
  loopEnabled: boolean
  loopStart: number | null
  loopEnd: number | null

  // Stem state
  stemVolumes: Record<StemType, number>
  stemMuted: Record<StemType, boolean>

  // Lyrics state
  lyrics: LyricsData | null
  lyricsLoading: boolean
  lyricsError: string | null
}

type ProcessedSong = {
  id: string
  youtubeId: string
  title: string
  artist: string
  duration: number
  key: string
  bpm: number
  chords: ChordData[]
  stems: StemData[]
  hasLyrics: boolean
}

type LyricsData = {
  lrcContent: string            // Raw LRC file content
  hasWordTiming: boolean        // Enhanced LRC or standard
  audioSource: 'vocals_stem' | 'full_audio'
}

type ChordData = {
  timestampMs: number
  chordName: string
  chordRoot: number
  chordQuality: ChordQuality
  confidence: number
}

type StemData = {
  type: StemType
  url: string
}

type StemType = 'vocals' | 'drums' | 'bass' | 'guitar' | 'piano' | 'other'
```

---

## 3. Lyrics Architecture

### 3.1 Lyrics Processing Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     LYRICS GENERATION FLOW                               │
└─────────────────────────────────────────────────────────────────────────┘

[User clicks "Generate Lyrics" in Lyrics tab]
        │
        ▼
[Select audio source]
        │
        ├── Vocals stem available? ──► [Checkbox: "Use vocals for better accuracy"]
        │
        ▼
[POST /api/lyrics/generate]
        │
        ├── songId
        ├── audioSource: 'vocals_stem' | 'full_audio'
        │
        ▼
[Next.js API Route]
        │
        ▼
[Forward to Hosted Processing Server]
        │
        ▼
[lyrics-transcriber]
        │
        ├── Input: audio file (stem or full)
        ├── Engine: Whisper (faster-whisper or whisperX)
        ├── Output: Enhanced LRC with word timestamps
        │
        ▼
[Store LRC in Supabase]
        │
        ├── song_lyrics.lrc_content
        ├── song_lyrics.has_word_timing = true
        ├── song_lyrics.audio_source
        │
        ▼
[Return LRC to client]
        │
        ▼
[Rabbit Lyrics parses LRC]
        │
        ▼
[Karaoke display ready]
```

### 3.2 LRC Format

**Standard LRC (line-level):**
```
[00:12.34]First line of lyrics
[00:15.67]Second line of lyrics
```

**Enhanced LRC (word-level):**
```
[00:12.34]<00:12.50>First <00:12.80>line <00:13.10>of <00:13.40>lyrics
[00:15.67]<00:15.90>Second <00:16.20>line <00:16.50>of <00:16.80>lyrics
```

### 3.3 Lyrics API Design

#### POST /api/lyrics/generate

Trigger lyrics transcription for a song.

```typescript
// Request
{
  songId: string
  audioSource: 'vocals_stem' | 'full_audio'
}

// Response (202 Accepted - processing started)
{
  jobId: string
  status: 'processing'
  estimatedTime: number  // seconds
}

// Response (200 OK - already exists)
{
  status: 'exists'
  lyrics: {
    lrcContent: string
    hasWordTiming: boolean
    audioSource: string
  }
}
```

#### GET /api/lyrics/[songId]

Get lyrics for a song.

```typescript
// Response (200 OK)
{
  lrcContent: string
  hasWordTiming: boolean
  audioSource: 'vocals_stem' | 'full_audio'
  generatedAt: string
}

// Response (404)
{
  error: 'no_lyrics'
  message: 'Lyrics not yet generated for this song'
}
```

#### GET /api/lyrics/status/[jobId]

Poll for lyrics generation status.

```typescript
// Response
{
  jobId: string
  status: 'processing' | 'complete' | 'failed'
  progress: number      // 0-100
  lyrics?: LyricsData   // When complete
  error?: string        // When failed
}
```

### 3.4 Frontend Lyrics Integration

```typescript
// product/app/chords/lyrics/hooks/useLyricsSync.ts

import RabbitLyrics from 'rabbit-lyrics'

export function useLyricsSync(lrcContent: string | null, audioElement: HTMLAudioElement | null) {
  const [currentLine, setCurrentLine] = useState<number>(-1)
  const [currentWord, setCurrentWord] = useState<number>(-1)
  const rabbitLyricsRef = useRef<RabbitLyrics | null>(null)

  useEffect(() => {
    if (!lrcContent || !audioElement) return

    // Initialize Rabbit Lyrics
    rabbitLyricsRef.current = new RabbitLyrics({
      element: document.getElementById('lyrics-display'),
      mediaElement: audioElement,
      lyrics: lrcContent,
      mode: 'karaoke',  // Word-level highlighting
      onLineChange: (lineIndex) => setCurrentLine(lineIndex),
      onWordChange: (wordIndex) => setCurrentWord(wordIndex),
    })

    return () => {
      rabbitLyricsRef.current?.destroy()
    }
  }, [lrcContent, audioElement])

  return { currentLine, currentWord }
}
```

```typescript
// product/app/chords/lyrics/hooks/useLyricsGeneration.ts

export function useLyricsGeneration(songId: string) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const generateLyrics = async (audioSource: 'vocals_stem' | 'full_audio') => {
    setIsGenerating(true)
    setProgress(0)
    setError(null)

    try {
      // Start generation
      const startRes = await fetch('/api/lyrics/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ songId, audioSource })
      })

      const { jobId, status } = await startRes.json()

      if (status === 'exists') {
        setIsGenerating(false)
        return // Already have lyrics
      }

      // Poll for completion
      while (true) {
        await sleep(2000)
        const statusRes = await fetch(`/api/lyrics/status/${jobId}`)
        const statusData = await statusRes.json()

        setProgress(statusData.progress)

        if (statusData.status === 'complete') {
          setIsGenerating(false)
          return statusData.lyrics
        }

        if (statusData.status === 'failed') {
          throw new Error(statusData.error)
        }
      }
    } catch (err) {
      setError(err.message)
      setIsGenerating(false)
    }
  }

  return { generateLyrics, isGenerating, progress, error }
}
```

### 3.5 Lyrics Display Component

```typescript
// product/app/chords/lyrics/LyricsDisplay.tsx

type LyricsDisplayProps = {
  lrcContent: string
  hasWordTiming: boolean
  audioElement: HTMLAudioElement | null
}

export function LyricsDisplay({ lrcContent, hasWordTiming, audioElement }: LyricsDisplayProps) {
  const { currentLine, currentWord } = useLyricsSync(lrcContent, audioElement)

  return (
    <LyricsContainer id="lyrics-display">
      {/* Rabbit Lyrics will render here */}
      {/* CSS handles highlighting via classes:
          .rabbit-lyrics-line-active { ... }
          .rabbit-lyrics-word-active { ... }
      */}
    </LyricsContainer>
  )
}

const LyricsContainer = styled.div`
  height: 300px;
  overflow-y: auto;
  scroll-behavior: smooth;

  .rabbit-lyrics-line {
    padding: 8px 0;
    transition: all 0.2s;
    opacity: 0.5;
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

---

## 4. Processing Server Architecture

### 4.1 Server Components

```
hosted-processing-server/
├── app/
│   ├── main.py                    # FastAPI application
│   ├── routes/
│   │   ├── songs.py               # Song processing endpoints
│   │   ├── lyrics.py              # Lyrics generation endpoints
│   │   └── health.py              # Health check
│   ├── services/
│   │   ├── youtube_extractor.py   # yt-dlp wrapper
│   │   ├── chord_detector.py      # Chord detection
│   │   ├── stem_separator.py      # Stem separation
│   │   └── lyrics_transcriber.py  # Whisper transcription
│   └── models/
│       └── schemas.py             # Pydantic models
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```

### 4.2 Lyrics Transcription Service

```python
# app/services/lyrics_transcriber.py

from lyrics_transcriber import LyricsTranscriber
import os

class LyricsService:
    def __init__(self):
        self.transcriber = LyricsTranscriber(
            whisper_model="large-v2",  # or "medium" for faster processing
            device="cuda" if torch.cuda.is_available() else "cpu"
        )

    async def transcribe(
        self,
        audio_path: str,
        output_format: str = "lrc"
    ) -> dict:
        """
        Transcribe audio to lyrics with word-level timestamps.

        Args:
            audio_path: Path to audio file (vocals stem or full audio)
            output_format: Output format ("lrc" for Enhanced LRC)

        Returns:
            {
                "lrc_content": str,
                "has_word_timing": bool,
                "duration_ms": int
            }
        """
        result = self.transcriber.transcribe(
            audio_path,
            output_format=output_format,
            word_timestamps=True
        )

        return {
            "lrc_content": result.to_lrc(enhanced=True),
            "has_word_timing": True,
            "duration_ms": result.duration_ms
        }
```

### 4.3 Lyrics API Endpoint

```python
# app/routes/lyrics.py

from fastapi import APIRouter, BackgroundTasks
from app.services.lyrics_transcriber import LyricsService

router = APIRouter(prefix="/lyrics")
lyrics_service = LyricsService()

@router.post("/generate")
async def generate_lyrics(
    request: LyricsGenerateRequest,
    background_tasks: BackgroundTasks
):
    """
    Generate lyrics from audio.

    Request body:
    - song_id: str
    - audio_url: str (Supabase signed URL for stem or full audio)
    - audio_source: 'vocals_stem' | 'full_audio'
    """
    job_id = str(uuid.uuid4())

    # Start background task
    background_tasks.add_task(
        process_lyrics,
        job_id,
        request.song_id,
        request.audio_url,
        request.audio_source
    )

    return {
        "job_id": job_id,
        "status": "processing"
    }

async def process_lyrics(job_id: str, song_id: str, audio_url: str, audio_source: str):
    """Background task to process lyrics."""
    try:
        # Download audio from Supabase
        audio_path = await download_audio(audio_url)

        # Transcribe
        result = await lyrics_service.transcribe(audio_path)

        # Store in database via callback to Next.js
        await store_lyrics(song_id, result, audio_source)

        # Update job status
        await update_job_status(job_id, "complete", result)

    except Exception as e:
        await update_job_status(job_id, "failed", error=str(e))

    finally:
        # Cleanup temp file
        if os.path.exists(audio_path):
            os.remove(audio_path)
```

---

## 5. Database Schema

### 5.1 Supabase Tables

```sql
-- Processed songs
CREATE TABLE processed_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  youtube_id VARCHAR(20) UNIQUE,
  file_hash VARCHAR(64) UNIQUE,
  title VARCHAR(500) NOT NULL,
  artist VARCHAR(500),
  duration_seconds INTEGER NOT NULL,
  key VARCHAR(10),
  bpm INTEGER,
  has_lyrics BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Song chords
CREATE TABLE song_chords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES processed_songs(id) ON DELETE CASCADE,
  timestamp_ms INTEGER NOT NULL,
  chord_name VARCHAR(20) NOT NULL,
  chord_root SMALLINT NOT NULL,
  chord_quality VARCHAR(20) NOT NULL,
  confidence REAL
);

CREATE INDEX idx_chords_song_time ON song_chords(song_id, timestamp_ms);

-- Song stems
CREATE TABLE song_stems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES processed_songs(id) ON DELETE CASCADE,
  stem_type VARCHAR(20) NOT NULL,
  storage_path TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL,
  UNIQUE(song_id, stem_type)
);

-- Song lyrics (NEW - updated schema)
CREATE TABLE song_lyrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  song_id UUID NOT NULL REFERENCES processed_songs(id) ON DELETE CASCADE,
  lrc_content TEXT NOT NULL,              -- Full LRC file content
  has_word_timing BOOLEAN DEFAULT TRUE,   -- Enhanced LRC or standard
  audio_source VARCHAR(20) NOT NULL,      -- 'vocals_stem' | 'full_audio'
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generation_duration_ms INTEGER,         -- How long transcription took
  UNIQUE(song_id)                         -- One lyrics entry per song
);

-- User's song library
CREATE TABLE user_songs (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  song_id UUID NOT NULL REFERENCES processed_songs(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  last_played_at TIMESTAMPTZ,
  preferred_position SMALLINT DEFAULT 0,
  PRIMARY KEY (user_id, song_id)
);

-- Processing jobs (for status tracking)
CREATE TABLE processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type VARCHAR(20) NOT NULL,          -- 'song' | 'lyrics'
  song_id UUID REFERENCES processed_songs(id),
  status VARCHAR(20) NOT NULL DEFAULT 'queued',
  progress INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);
```

### 5.2 Storage Structure

```
supabase-storage/
├── stems/
│   └── {song_id}/
│       ├── vocals.mp3
│       ├── drums.mp3
│       ├── bass.mp3
│       ├── guitar.mp3
│       ├── piano.mp3
│       └── other.mp3
└── lyrics/
    └── {song_id}/
        └── lyrics.lrc              # Enhanced LRC file
```

---

## 6. API Design

### 6.1 Next.js API Routes Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/songs/process` | POST | Start song processing |
| `/api/songs/status/[jobId]` | GET | Poll processing status |
| `/api/songs/[songId]` | GET | Get song data |
| `/api/stems/[songId]/[stemType]` | GET | Get signed URL for stem |
| `/api/lyrics/generate` | POST | Start lyrics generation |
| `/api/lyrics/status/[jobId]` | GET | Poll lyrics generation status |
| `/api/lyrics/[songId]` | GET | Get lyrics LRC content |

### 6.2 Processing Server API

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/process/song` | POST | Full song processing |
| `/process/lyrics` | POST | Lyrics-only processing |
| `/status/[jobId]` | GET | Job status |
| `/health` | GET | Health check |

---

## 7. Error Handling

### 7.1 Lyrics-Specific Errors

| Error | User Message | Recovery |
|-------|--------------|----------|
| Transcription timeout | "Lyrics generation took too long. Please try again." | Retry button |
| Low audio quality | "Audio quality too low for accurate lyrics. Try using vocals stem." | Suggest stem |
| No speech detected | "No vocals detected in this track." | Inform user |
| Server unavailable | "Lyrics service temporarily unavailable." | Show estimated recovery |

### 7.2 Graceful Degradation

- If word-level timing fails: Fall back to line-level sync
- If lyrics generation fails: Song still usable for chords/stems
- If vocals stem unavailable: Use full audio (lower accuracy)

---

## 8. Performance Considerations

### 8.1 Lyrics Processing Time

| Audio Length | Estimated Time (GPU) | Estimated Time (CPU) |
|--------------|---------------------|---------------------|
| 3 minutes | ~15 seconds | ~45 seconds |
| 5 minutes | ~25 seconds | ~75 seconds |
| 10 minutes | ~50 seconds | ~150 seconds |

### 8.2 Optimization Strategies

1. **Use vocals stem when available** - Cleaner input = faster/better transcription
2. **Cache aggressively** - LRC files are small (~10KB)
3. **Progressive loading** - Show song immediately, lyrics as available
4. **Background processing** - Don't block UI during generation

---

## 9. Dependencies & Blockers

| Dependency | Status | Impact |
|------------|--------|--------|
| Hosted processing server | In progress | Blocks lyrics feature |
| Python 3.9+ environment | Required | For lyrics-transcriber |
| Whisper model (~3GB) | Required | Download on server setup |
| CUDA (optional) | Recommended | 3x faster transcription |

---

## 10. Implementation Phases

### Phase 1: Core Playback (No Lyrics)
- YouTube URL input + extraction
- Chord detection integration
- Basic playback sync with fretboard
- User authentication

### Phase 2: Stems & Practice Tools
- Stem separation + mixer controls
- Speed control
- Loop sections
- Chord anticipation mode

### Phase 3: Karaoke Lyrics
- Lyrics tab UI with generate button
- Audio source toggle (vocals/full)
- Processing server lyrics endpoint
- lyrics-transcriber integration
- Rabbit Lyrics frontend integration
- Word-level karaoke display

### Phase 4: Polish
- Error handling & edge cases
- Performance optimization
- Mobile responsiveness

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-02 | Initial draft with Musixmatch/Genius lyrics |
| 2.0 | 2026-01-02 | Complete rewrite: Pure transcription via lyrics-transcriber + Whisper; Karaoke-style word-level sync with Rabbit Lyrics; On-demand generation flow; Vocals stem option; Removed external lyrics databases |
