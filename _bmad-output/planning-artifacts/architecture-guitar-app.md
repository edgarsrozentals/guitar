---
title: 'Guitar App - Architecture Document'
version: '3.0'
date: '2026-01-03'
author: 'Winston (Architect Agent)'
related_prd: 'prd-guitar-app.md'
status: 'Draft'
---

# Architecture Document

## Guitar Learning & Chord Visualization App

---

## 1. Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                                    │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                         Next.js Frontend                                 │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────────────────┐         │    │
│  │  │ Video        │  │ Playback     │  │ Chord Visualization    │         │    │
│  │  │ Embed        │  │ Sync Engine  │  │ (CAGED Fretboard)      │         │    │
│  │  └──────┬───────┘  └──────┬───────┘  └───────────▲────────────┘         │    │
│  │         │                 │                      │                       │    │
│  │         └────────────────►├──────────────────────┘                       │    │
│  │                           │                                              │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐       │    │
│  │  │ Stem Mixer   │  │ Karaoke      │  │ Song Library             │       │    │
│  │  │ (Web Audio)  │  │ Lyrics Panel │  │ (User's Songs)           │       │    │
│  │  └──────────────┘  └──────────────┘  └──────────────────────────┘       │    │
│  │                                                                          │    │
│  │  ┌──────────────────────────────────────────────────────────────┐       │    │
│  │  │ Auth Provider │ User Preferences │ Song Settings             │       │    │
│  │  └──────────────────────────────────────────────────────────────┘       │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
└───────────────────────────────────┬─────────────────────────────────────────────┘
                                    │ HTTPS
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Cloud Run)                                      │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                      Express.js API Server                               │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │    │
│  │  │ Song         │  │ Analysis     │  │ Storage      │                   │    │
│  │  │ Processing   │  │ Endpoints    │  │ Proxy        │                   │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                   │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  yt-dlp      │  │  Essentia    │  │  LALAL.ai    │  │  AssemblyAI  │         │
│  │  (Extract)   │  │  (Chords)    │  │  (Stems)     │  │  (Lyrics)    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘         │
└───────────────────────────────────┬─────────────────────────────────────────────┘
                                    │
          ┌─────────────────────────┼─────────────────────────┐
          │                         │                         │
          ▼                         ▼                         ▼
┌──────────────────┐    ┌──────────────────┐    ┌──────────────────┐
│  Cloud Run       │    │  Cloud Run       │    │  LALAL.ai        │
│  Madmom Service  │    │  BTC Service     │    │  API             │
│  (Chord ML)      │    │  (Transformer)   │    │  (Stem Sep)      │
└──────────────────┘    └──────────────────┘    └──────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              SUPABASE                                            │
│  ┌──────────────┐  ┌──────────────────────┐  ┌──────────────────────────────┐   │
│  │  Auth        │  │  PostgreSQL          │  │  Storage                     │   │
│  │              │  │                      │  │                              │   │
│  │  - Email/PW  │  │  - profiles          │  │  Bucket: user-songs          │   │
│  │  - Google    │  │  - user_preferences  │  │  ├── {user_id}/audio/        │   │
│  │  - Sessions  │  │  - user_songs        │  │  ├── {user_id}/stems/        │   │
│  │              │  │  - user_song_chords  │  │  └── {user_id}/lyrics/       │   │
│  │              │  │  - user_song_stems   │  │                              │   │
│  │              │  │  - user_song_lyrics  │  │  Bucket: demo-songs          │   │
│  │              │  │  - song_settings     │  │  ├── audio/                  │   │
│  │              │  │  - demo_songs        │  │  ├── stems/                  │   │
│  │              │  │                      │  │  └── lyrics/                 │   │
│  └──────────────┘  └──────────────────────┘  └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend** | Next.js 15, React 19, TypeScript | Existing stack, SSR capable |
| **Styling** | styled-components | Existing, CSS-in-JS |
| **State** | React Context + Hooks | Existing pattern, no Redux |
| **Audio** | Web Audio API | Stem mixing, volume control |
| **Lyrics Sync** | Rabbit Lyrics | Karaoke-style LRC playback |
| **Backend** | Express.js (TypeScript) | Long-running tasks, Python integration |
| **Chord Detection** | Essentia (local), Madmom, BTC (Cloud Run) | Multiple ML models for accuracy |
| **Stem Separation** | LALAL.ai API | Best quality, managed service |
| **Transcription** | AssemblyAI / Whisper | Word-level timestamps |
| **Database** | Supabase PostgreSQL | Real-time, RLS, managed |
| **Auth** | Supabase Auth | Email + Google OAuth |
| **Storage** | Supabase Storage | S3-compatible, RLS enabled |
| **Backend Hosting** | Google Cloud Run | Stateless, auto-scaling, long timeouts |
| **Frontend Hosting** | Vercel (planned) | Next.js optimized |

### 1.3 Key Architecture Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Backend runtime | Express on Cloud Run | Long-running tasks (60-90s) exceed serverless limits |
| Storage | Supabase Storage | Integrated with auth, RLS policies, simpler than S3 |
| User isolation | Per-user folders + RLS | Clean separation, no cross-user access |
| Chord storage | JSONB per library | Flexible, avoids millions of rows |
| File access | Signed URLs | Secure, time-limited, cacheable |
| Demo songs | Separate bucket | Public read without auth complexity |

---

## 2. Component Architecture

### 2.1 Frontend Components

```
product/app/
├── pages/
│   ├── index.tsx                     # Landing / Dashboard
│   ├── login.tsx                     # Auth: Login
│   ├── signup.tsx                    # Auth: Signup
│   ├── profile.tsx                   # User profile
│   ├── library.tsx                   # Song library (NEW)
│   ├── demo.tsx                      # Demo song selection (NEW)
│   └── auth/
│       └── callback.tsx              # OAuth callback
│
├── chords/
│   ├── ChordsPage.tsx                # Main chord page
│   ├── ChordFretboard.tsx            # Fretboard visualization
│   ├── video/                        # Video player module (renamed from youtube/)
│   │   ├── VideoChordPlayer.tsx      # Main player container (renamed)
│   │   ├── VideoURLInput.tsx         # URL input (renamed)
│   │   ├── VideoEmbed.tsx            # IFrame wrapper (renamed)
│   │   ├── ProcessingStatus.tsx      # Loading indicator
│   │   └── hooks/
│   │       ├── useVideoPlayer.ts     # Player API (renamed)
│   │       ├── usePlaybackSync.ts    # Time sync
│   │       └── useSongProcessing.ts  # API calls
│   ├── playback/
│   │   ├── PlaybackControls.tsx      # Play/pause, seek
│   │   ├── SpeedControl.tsx          # Playback speed
│   │   ├── LoopSelector.tsx          # A-B loop
│   │   └── ChordTimeline.tsx         # Visual timeline
│   ├── stems/
│   │   ├── StemControls.tsx          # Mute/volume per stem
│   │   └── StemMixer.tsx             # Web Audio mixing
│   ├── lyrics/
│   │   ├── LyricsPanel.tsx           # Lyrics container
│   │   ├── LyricsDisplay.tsx         # Karaoke display
│   │   └── LyricsGenerateButton.tsx  # Generate trigger
│   └── state/
│       ├── chords.tsx                # Chord state
│       └── fretboardSettings.tsx     # Fretboard display state
│
├── library/                          # NEW: Song library module
│   ├── SongLibrary.tsx               # Library page component
│   ├── SongCard.tsx                  # Song grid item
│   ├── SongListItem.tsx              # Song list item
│   ├── SongSearch.tsx                # Search/filter bar
│   ├── DeleteSongDialog.tsx          # Confirm delete modal
│   └── hooks/
│       ├── useUserSongs.ts           # Fetch user's songs
│       ├── useDeleteSong.ts          # Delete with cascade
│       └── useSongUpload.ts          # Upload new song
│
├── demo/                             # NEW: Demo songs module
│   ├── DemoSongPicker.tsx            # Demo selection UI
│   ├── DemoSongCard.tsx              # Demo song preview
│   └── hooks/
│       └── useDemoSongs.ts           # Fetch public demos
│
├── state/
│   ├── auth/
│   │   └── AuthProvider.tsx          # Auth context
│   └── settings/
│       ├── useUserPreferences.ts     # Global prefs
│       └── useSongSettings.ts        # Per-song settings
│
├── lib/
│   └── supabase/
│       ├── client.ts                 # Browser client
│       ├── server.ts                 # Server client
│       └── storage.ts                # Storage helpers (NEW)
│
└── components/
    ├── UserAvatar.tsx                # Avatar display
    └── UserDropdown.tsx              # Nav dropdown
```

### 2.2 Component Hierarchy

```
<App>
  <DarkLightThemeProvider>
    <AuthProvider>
      <WebsiteLayout>

        {/* Route: /library */}
        <SongLibrary>
          <SongSearch />
          <SongGrid>
            <SongCard />
          </SongGrid>
        </SongLibrary>

        {/* Route: /chords/[videoId] */}
        <ChordsPage>
          <ResponsiveFretboardConfigProvider>
            <ChordsProvider>
              <SongProvider>

                <VideoURLInput />
                <ProcessingStatus />

                <PlayerLayout>
                  <VideoEmbed />
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
                  <Tab name="Audio">...</Tab>
                  <Tab name="Chords">...</Tab>
                  <Tab name="Stems">...</Tab>
                  <Tab name="Lyrics">
                    <LyricsPanel />
                  </Tab>
                </TabsContainer>

              </SongProvider>
            </ChordsProvider>
          </ResponsiveFretboardConfigProvider>
        </ChordsPage>

        {/* Route: /demo */}
        <DemoSongPicker>
          <DemoSongCard />
        </DemoSongPicker>

      </WebsiteLayout>
    </AuthProvider>
  </DarkLightThemeProvider>
</App>
```

---

## 3. Backend Architecture

### 3.1 Express Server Structure

```
backend/
├── src/
│   ├── server.ts                     # Main Express app
│   ├── config/
│   │   ├── env.ts                    # Environment variables
│   │   └── supabase.ts               # Supabase client (NEW)
│   ├── routes/
│   │   ├── songs.ts                  # Song processing routes
│   │   ├── analysis.ts               # Chord analysis routes
│   │   ├── stems.ts                  # Stem separation routes
│   │   ├── lyrics.ts                 # Lyrics generation routes
│   │   ├── storage.ts                # Storage proxy routes (NEW)
│   │   └── health.ts                 # Health check
│   ├── services/
│   │   ├── videoExtractor.ts         # yt-dlp wrapper (renamed)
│   │   ├── chordDetector.ts          # Essentia Python wrapper
│   │   ├── stemSeparator.ts          # LALAL.ai client
│   │   ├── lyricsTranscriber.ts      # AssemblyAI client
│   │   └── storageService.ts         # Supabase Storage ops (NEW)
│   ├── middleware/
│   │   ├── auth.ts                   # Verify Supabase JWT (NEW)
│   │   ├── cors.ts                   # CORS configuration
│   │   └── errorHandler.ts           # Error handling
│   └── utils/
│       ├── signedUrls.ts             # Generate signed URLs (NEW)
│       └── fileHash.ts               # Content hashing
├── scripts/
│   └── migrate-to-supabase.ts        # Migration script (NEW)
├── Dockerfile                        # Cloud Run container (NEW)
├── .dockerignore                     # Docker ignore
└── package.json
```

### 3.2 API Endpoints

#### Song Management

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/songs` | GET | Required | List user's songs |
| `/api/songs/:id` | GET | Required | Get song details |
| `/api/songs/:id` | DELETE | Required | Delete song + all data |
| `/api/songs/process` | POST | Required | Process new video URL |
| `/api/songs/:id/progress` | GET | Required | Processing progress (SSE) |

#### Chord Analysis

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/songs/:id/analyze` | POST | Required | Run chord analysis |
| `/api/songs/:id/chords` | GET | Required | Get chord data |
| `/api/songs/:id/chords/:library` | DELETE | Required | Delete analysis |

#### Stem Separation

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/songs/:id/stems/separate` | POST | Required | Start separation |
| `/api/songs/:id/stems/progress` | GET | Required | Separation progress |
| `/api/songs/:id/stems` | GET | Required | Get stem URLs |
| `/api/songs/:id/stems` | DELETE | Required | Delete stems |

#### Lyrics

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/songs/:id/lyrics/generate` | POST | Required | Generate lyrics |
| `/api/songs/:id/lyrics` | GET | Required | Get lyrics (LRC) |
| `/api/songs/:id/lyrics` | DELETE | Required | Delete lyrics |

#### Storage Proxy

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/storage/upload-url` | POST | Required | Get signed upload URL |
| `/api/storage/download-url/:path` | GET | Required | Get signed download URL |

#### Demo Songs (Public)

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/demo/songs` | GET | None | List demo songs |
| `/api/demo/songs/:id` | GET | None | Get demo song data |

#### Health

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/health` | GET | None | Health check |

### 3.3 Authentication Middleware

```typescript
// backend/src/middleware/auth.ts

import { createClient } from '@supabase/supabase-js'

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' })
  }

  const token = authHeader.substring(7)

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_ANON_KEY!
  )

  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }

  req.user = user
  next()
}
```

### 3.4 Song Processing Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         SONG PROCESSING FLOW                                     │
└─────────────────────────────────────────────────────────────────────────────────┘

[User submits video URL]
        │
        ▼
[POST /api/songs/process]
        │
        ├── Validate URL format
        ├── Check user quota (future)
        │
        ▼
[Create user_songs record]
        │
        ├── status: 'processing'
        ├── video_id: extracted from URL
        │
        ▼
[Background: Extract audio via yt-dlp]
        │
        ├── Download to temp file
        ├── Extract metadata (title, duration)
        │
        ▼
[Upload audio to Supabase Storage]
        │
        ├── Path: {user_id}/audio/{song_id}.mp3
        ├── Update user_songs.audio_storage_path
        │
        ▼
[Analyze with Essentia (default)]
        │
        ├── Key detection
        ├── BPM detection
        ├── Chord progression
        │
        ▼
[Store analysis in user_song_chords]
        │
        ├── library: 'essentia'
        ├── chords: JSONB array
        │
        ▼
[Update user_songs]
        │
        ├── status: 'ready'
        ├── key_detected, bpm_detected
        ├── Delete temp files
        │
        ▼
[Return song data to client]
```

---

## 4. Database Schema

### 4.1 Complete Schema

```sql
-- ============================================================
-- USER TABLES
-- ============================================================

-- User profiles (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Global user preferences (fretboard settings)
CREATE TABLE public.user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  enabled_shapes TEXT[] DEFAULT ARRAY['C','A','G','E','D'],
  show_all_positions BOOLEAN DEFAULT FALSE,
  highlight_roots BOOLEAN DEFAULT TRUE,
  color_by_shape BOOLEAN DEFAULT TRUE,
  color_by_position BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SONG TABLES (NEW)
-- ============================================================

-- User's song library
CREATE TABLE public.user_songs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  video_id TEXT NOT NULL,                    -- Original source identifier
  title TEXT NOT NULL,
  artist TEXT,
  duration_seconds INTEGER NOT NULL,
  key_detected TEXT,                         -- e.g., 'A minor'
  bpm_detected INTEGER,
  audio_storage_path TEXT NOT NULL,          -- Supabase Storage path
  has_stems BOOLEAN DEFAULT FALSE,
  has_lyrics BOOLEAN DEFAULT FALSE,
  status TEXT DEFAULT 'processing',          -- processing | ready | error
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, video_id)
);

CREATE INDEX idx_user_songs_user ON public.user_songs(user_id);
CREATE INDEX idx_user_songs_last_accessed ON public.user_songs(last_accessed DESC);

-- Chord analysis per library
CREATE TABLE public.user_song_chords (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_song_id UUID REFERENCES public.user_songs(id) ON DELETE CASCADE NOT NULL,
  library TEXT NOT NULL,                     -- 'essentia' | 'madmom' | 'btc'
  chords JSONB NOT NULL,                     -- [{time, chord: {root, quality}}]
  tempo JSONB,                               -- {bpm, confidence, beats[]}
  key_info JSONB,                            -- {root, scale, strength}
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_song_id, library)
);

CREATE INDEX idx_song_chords_song ON public.user_song_chords(user_song_id);

-- Separated stems
CREATE TABLE public.user_song_stems (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_song_id UUID REFERENCES public.user_songs(id) ON DELETE CASCADE NOT NULL,
  stem_type TEXT NOT NULL,                   -- vocals | drums | bass | guitar | piano | other
  storage_path TEXT NOT NULL,                -- Supabase Storage path
  duration_seconds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_song_id, stem_type)
);

CREATE INDEX idx_song_stems_song ON public.user_song_stems(user_song_id);

-- Generated lyrics
CREATE TABLE public.user_song_lyrics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_song_id UUID REFERENCES public.user_songs(id) ON DELETE CASCADE UNIQUE NOT NULL,
  lrc_content TEXT NOT NULL,                 -- Full LRC file content
  has_word_timing BOOLEAN DEFAULT TRUE,
  audio_source TEXT NOT NULL,                -- 'vocals_stem' | 'full_audio'
  storage_path TEXT,                         -- Optional: LRC file in storage
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Per-song settings (existing, unchanged)
CREATE TABLE public.song_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  video_id TEXT NOT NULL,
  active_tab TEXT DEFAULT 'audio',
  selected_stems TEXT[] DEFAULT ARRAY[]::TEXT[],
  stem_volumes JSONB DEFAULT '{}',
  stem_muted JSONB DEFAULT '{}',
  master_stems_volume INTEGER DEFAULT 100,
  active_library TEXT DEFAULT 'essentia',
  enabled_libraries TEXT[] DEFAULT ARRAY['essentia','madmom','btc'],
  use_backing_track BOOLEAN DEFAULT FALSE,
  snap_to_beats BOOLEAN DEFAULT FALSE,
  use_beat_sync_detection BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, video_id)
);

-- ============================================================
-- DEMO SONGS (Admin-managed)
-- ============================================================

CREATE TABLE public.demo_songs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  audio_storage_path TEXT NOT NULL,
  has_stems BOOLEAN DEFAULT FALSE,
  has_lyrics BOOLEAN DEFAULT FALSE,
  duration_seconds INTEGER NOT NULL,
  key_detected TEXT,
  bpm_detected INTEGER,
  chords JSONB,                              -- Pre-computed chord data
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_demo_songs_active ON public.demo_songs(is_active, display_order);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_song_chords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_song_stems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_song_lyrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.song_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_songs ENABLE ROW LEVEL SECURITY;

-- Profiles: users can view/update own
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- User preferences: users manage own
CREATE POLICY "Users can manage own preferences" ON public.user_preferences
  FOR ALL USING (auth.uid() = user_id);

-- User songs: users manage own
CREATE POLICY "Users can manage own songs" ON public.user_songs
  FOR ALL USING (auth.uid() = user_id);

-- Song chords: users manage through song ownership
CREATE POLICY "Users can manage own song chords" ON public.user_song_chords
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_songs
      WHERE id = user_song_id AND user_id = auth.uid()
    )
  );

-- Song stems: users manage through song ownership
CREATE POLICY "Users can manage own song stems" ON public.user_song_stems
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_songs
      WHERE id = user_song_id AND user_id = auth.uid()
    )
  );

-- Song lyrics: users manage through song ownership
CREATE POLICY "Users can manage own song lyrics" ON public.user_song_lyrics
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_songs
      WHERE id = user_song_id AND user_id = auth.uid()
    )
  );

-- Song settings: users manage own
CREATE POLICY "Users can manage own song settings" ON public.song_settings
  FOR ALL USING (auth.uid() = user_id);

-- Demo songs: anyone can read active demos
CREATE POLICY "Anyone can read active demo songs" ON public.demo_songs
  FOR SELECT USING (is_active = TRUE);

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Create profile + preferences on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.user_preferences (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_songs_updated_at
  BEFORE UPDATE ON public.user_songs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_song_settings_updated_at
  BEFORE UPDATE ON public.song_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
```

---

## 5. Storage Architecture

### 5.1 Supabase Storage Buckets

| Bucket | Access | RLS | Purpose |
|--------|--------|-----|---------|
| `user-songs` | Private | Yes | User-owned audio, stems, lyrics |
| `demo-songs` | Public | Read-only | Demo content for anonymous users |

### 5.2 Storage Quotas

| Tier | Quota | Notes |
|------|-------|-------|
| **Free (MVP)** | 1 GB | ~15-20 songs |
| **Paid (Future)** | TBD | Additional storage plans |

**MVP Implementation:** No active quota enforcement. Monitor usage via Supabase dashboard. Implement quota checks in future phase when paid plans are introduced.

### 5.3 Storage Folder Structure

```
Bucket: user-songs
├── {user_uuid}/
│   ├── audio/
│   │   ├── {song_uuid}.mp3           # Original audio
│   │   └── {song_uuid}_backing.mp3   # Backing track (no vocals)
│   ├── stems/
│   │   └── {song_uuid}/
│   │       ├── vocals.mp3
│   │       ├── drums.mp3
│   │       ├── bass.mp3
│   │       ├── guitar.mp3
│   │       ├── piano.mp3
│   │       └── other.mp3
│   └── lyrics/
│       └── {song_uuid}.lrc

Bucket: demo-songs
├── audio/
│   └── {demo_song_id}.mp3
├── stems/
│   └── {demo_song_id}/
│       └── *.mp3
└── lyrics/
    └── {demo_song_id}.lrc
```

### 5.4 Storage RLS Policies

```sql
-- User songs bucket: users can only access their own folder
CREATE POLICY "Users can access own files"
ON storage.objects FOR ALL
USING (
  bucket_id = 'user-songs' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Demo songs bucket: public read access
CREATE POLICY "Anyone can read demo files"
ON storage.objects FOR SELECT
USING (bucket_id = 'demo-songs');

-- Demo songs: only admins can write (via service role)
-- No user-facing policy needed; use service role key for admin operations
```

### 5.5 Signed URL Flow

```typescript
// backend/src/services/storageService.ts

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!  // Service role for admin ops
)

export async function getSignedUploadUrl(
  userId: string,
  songId: string,
  fileType: 'audio' | 'stem' | 'lyrics',
  stemType?: string
): Promise<string> {
  let path: string

  switch (fileType) {
    case 'audio':
      path = `${userId}/audio/${songId}.mp3`
      break
    case 'stem':
      path = `${userId}/stems/${songId}/${stemType}.mp3`
      break
    case 'lyrics':
      path = `${userId}/lyrics/${songId}.lrc`
      break
  }

  const { data, error } = await supabase.storage
    .from('user-songs')
    .createSignedUploadUrl(path)

  if (error) throw error
  return data.signedUrl
}

export async function getSignedDownloadUrl(
  bucket: string,
  path: string,
  expiresIn: number = 3600  // 1 hour
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(path, expiresIn)

  if (error) throw error
  return data.signedUrl
}
```

---

## 6. Migration Strategy

### 6.1 Current State (Local Storage)

| Data | Location | Count |
|------|----------|-------|
| Audio files | `backend/audio/*.mp3` | 17 files |
| Stems | `backend/stems/{videoId}/` | 15 sets |
| Lyrics | `backend/lyrics/*.lrc` | 5 files |
| Metadata | `backend/songs-metadata.json` | All songs |

### 6.2 Migration Script

```typescript
// backend/scripts/migrate-to-supabase.ts

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const OWNER_EMAIL = 'edgars@ideajetlab.com'

async function migrate() {
  // 1. Get owner's user ID
  const { data: users } = await supabase.auth.admin.listUsers()
  const owner = users.users.find(u => u.email === OWNER_EMAIL)
  if (!owner) throw new Error(`User ${OWNER_EMAIL} not found`)

  const userId = owner.id
  console.log(`Migrating to user: ${userId}`)

  // 2. Load existing metadata
  const metadata = JSON.parse(
    fs.readFileSync('songs-metadata.json', 'utf-8')
  )

  // 3. Process each song
  for (const [videoId, song] of Object.entries(metadata)) {
    console.log(`Processing: ${song.title}`)

    // 3a. Create song record
    const { data: songRecord, error: songError } = await supabase
      .from('user_songs')
      .insert({
        user_id: userId,
        video_id: videoId,
        title: song.title,
        duration_seconds: song.duration,
        key_detected: song.key?.root ? `${song.key.root} ${song.key.scale}` : null,
        bpm_detected: song.tempo?.bpm,
        audio_storage_path: `${userId}/audio/${videoId}.mp3`,
        has_stems: fs.existsSync(`stems/${videoId}`),
        has_lyrics: fs.existsSync(`lyrics/${videoId}.lrc`),
        status: 'ready'
      })
      .select()
      .single()

    if (songError) {
      console.error(`Failed to create song record: ${songError.message}`)
      continue
    }

    const songId = songRecord.id

    // 3b. Upload audio file
    const audioPath = `audio/${videoId}.mp3`
    if (fs.existsSync(audioPath)) {
      const audioFile = fs.readFileSync(audioPath)
      await supabase.storage
        .from('user-songs')
        .upload(`${userId}/audio/${songId}.mp3`, audioFile, {
          contentType: 'audio/mpeg'
        })

      // Update path to use song ID
      await supabase
        .from('user_songs')
        .update({ audio_storage_path: `${userId}/audio/${songId}.mp3` })
        .eq('id', songId)
    }

    // 3c. Upload stems
    const stemsDir = `stems/${videoId}`
    if (fs.existsSync(stemsDir)) {
      const stemFiles = fs.readdirSync(stemsDir)
      for (const stemFile of stemFiles) {
        const stemType = path.basename(stemFile, '.mp3')
        const stemData = fs.readFileSync(path.join(stemsDir, stemFile))

        await supabase.storage
          .from('user-songs')
          .upload(`${userId}/stems/${songId}/${stemType}.mp3`, stemData, {
            contentType: 'audio/mpeg'
          })

        await supabase
          .from('user_song_stems')
          .insert({
            user_song_id: songId,
            stem_type: stemType,
            storage_path: `${userId}/stems/${songId}/${stemType}.mp3`
          })
      }
    }

    // 3d. Upload lyrics
    const lyricsPath = `lyrics/${videoId}.lrc`
    if (fs.existsSync(lyricsPath)) {
      const lrcContent = fs.readFileSync(lyricsPath, 'utf-8')

      await supabase.storage
        .from('user-songs')
        .upload(`${userId}/lyrics/${songId}.lrc`, lrcContent, {
          contentType: 'text/plain'
        })

      await supabase
        .from('user_song_lyrics')
        .insert({
          user_song_id: songId,
          lrc_content: lrcContent,
          has_word_timing: lrcContent.includes('<'),
          audio_source: 'full_audio',
          storage_path: `${userId}/lyrics/${songId}.lrc`
        })
    }

    // 3e. Insert chord analysis
    for (const [library, chords] of Object.entries(song.chordsByLibrary || {})) {
      await supabase
        .from('user_song_chords')
        .insert({
          user_song_id: songId,
          library,
          chords,
          tempo: song.tempo,
          key_info: song.key
        })
    }

    console.log(`  ✓ Migrated: ${song.title}`)
  }

  console.log('\n✓ Migration complete!')
}

migrate().catch(console.error)
```

### 6.3 Post-Migration Cleanup

After successful migration:

1. **Verify data integrity**
   - Count songs in Supabase vs local
   - Spot-check audio playback from signed URLs
   - Verify chord data renders correctly

2. **Remove local file serving**
   - Remove Express static file routes
   - Delete local audio/stems/lyrics folders (backup first)
   - Remove songs-metadata.json (backup first)

3. **Update frontend**
   - Switch from local URLs to signed URL fetching
   - Test all playback functionality

---

## 7. Cloud Run Deployment

### 7.1 Dockerfile

```dockerfile
# backend/Dockerfile

FROM node:20-slim

# Install Python for Essentia chord detection
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip3 install --no-cache-dir -r requirements.txt

# Install Node dependencies
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production

# Copy source
COPY src ./src
COPY tsconfig.json ./

# Build TypeScript
RUN yarn build

# Expose port
ENV PORT=8080
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/api/health || exit 1

# Start server
CMD ["node", "dist/server.js"]
```

### 7.2 Cloud Run Configuration

```yaml
# cloud-run-config.yaml (for reference)

service: guitar-app-backend
region: us-central1
platform: managed

spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "0"
        autoscaling.knative.dev/maxScale: "10"
        run.googleapis.com/execution-environment: gen2
    spec:
      containerConcurrency: 10
      timeoutSeconds: 300  # 5 minutes for long processing
      containers:
        - image: gcr.io/PROJECT_ID/guitar-app-backend
          resources:
            limits:
              memory: 2Gi
              cpu: "2"
          env:
            - name: SUPABASE_URL
              valueFrom:
                secretKeyRef:
                  name: supabase-url
            - name: SUPABASE_ANON_KEY
              valueFrom:
                secretKeyRef:
                  name: supabase-anon-key
            - name: SUPABASE_SERVICE_ROLE_KEY
              valueFrom:
                secretKeyRef:
                  name: supabase-service-role-key
            - name: LALALAI_API_KEY
              valueFrom:
                secretKeyRef:
                  name: lalalai-api-key
            - name: ASSEMBLYAI_API_KEY
              valueFrom:
                secretKeyRef:
                  name: assemblyai-api-key
```

### 7.3 Deployment Commands

```bash
# Build and push container
gcloud builds submit --tag gcr.io/PROJECT_ID/guitar-app-backend

# Deploy to Cloud Run
gcloud run deploy guitar-app-backend \
  --image gcr.io/PROJECT_ID/guitar-app-backend \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 300 \
  --concurrency 10 \
  --min-instances 0 \
  --max-instances 10

# Set secrets
gcloud run services update guitar-app-backend \
  --update-secrets=SUPABASE_URL=supabase-url:latest \
  --update-secrets=SUPABASE_ANON_KEY=supabase-anon-key:latest \
  --update-secrets=SUPABASE_SERVICE_ROLE_KEY=supabase-service-role-key:latest
```

---

## 8. Error Handling

### 8.1 Error Categories

| Category | HTTP Code | Handling |
|----------|-----------|----------|
| Authentication | 401 | Redirect to login |
| Authorization | 403 | Show "access denied" |
| Not Found | 404 | Show "song not found" |
| Validation | 400 | Show field errors |
| Processing | 500 | Retry with backoff |
| Storage | 503 | Queue and retry |

### 8.2 Frontend Error Handling

```typescript
// Graceful degradation for storage errors
async function fetchSongAudio(songId: string): Promise<string | null> {
  try {
    const response = await api.get(`/songs/${songId}/audio-url`)
    return response.data.url
  } catch (error) {
    if (error.response?.status === 401) {
      // Session expired, redirect to login
      router.push('/login')
      return null
    }
    if (error.response?.status === 403) {
      // Not owner of song
      toast.error("You don't have access to this song")
      return null
    }
    // Network/server error - show retry option
    toast.error("Failed to load audio. Please try again.")
    return null
  }
}
```

---

## 9. Performance Considerations

### 9.1 Optimization Strategies

| Area | Strategy |
|------|----------|
| **Audio loading** | Signed URLs with 1-hour expiry, cached by browser |
| **Song list** | Paginated (20 per page), infinite scroll |
| **Chord data** | Loaded with song metadata, cached in state |
| **Stems** | Lazy-loaded when user opens Stems tab |
| **Lyrics** | Lazy-loaded when user opens Lyrics tab |
| **Images** | Next.js Image optimization |

### 9.2 Caching Strategy

| Resource | Cache Location | TTL |
|----------|---------------|-----|
| Signed URLs | None (regenerate each request) | 1 hour |
| Song metadata | React state | Session |
| User preferences | React state + Supabase | Real-time |
| Demo songs | CDN edge cache | 24 hours |
| Static assets | CDN | 1 year |

### 9.3 Processing Time Targets

| Operation | Target | Current |
|-----------|--------|---------|
| Song processing (extraction + analysis) | <60s | ~45s |
| Stem separation | <90s | ~60-90s |
| Lyrics generation | <45s | ~30s |
| Cached song load | <2s | <1s |
| Page navigation | <500ms | ~300ms |

---

## 10. Security Considerations

### 10.1 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         AUTHENTICATION FLOW                                      │
└─────────────────────────────────────────────────────────────────────────────────┘

[User visits protected page]
        │
        ▼
[AuthProvider checks session]
        │
        ├── Session valid? ──► [Allow access]
        │
        └── No session? ──► [Redirect to /login]
                │
                ▼
[User submits credentials]
        │
        ├── Email/Password ──► [Supabase signInWithPassword]
        │
        └── Google OAuth ──► [Supabase signInWithOAuth]
                │
                ▼
[Supabase returns JWT + refresh token]
        │
        ├── Stored in httpOnly cookie (SSR)
        │
        ▼
[Redirect to original page]
        │
        ▼
[All API calls include Bearer token]
        │
        ▼
[Backend validates JWT with Supabase]
```

### 10.2 Security Checklist

- [ ] All API endpoints require authentication (except demo & health)
- [ ] RLS policies enforce user isolation
- [ ] Service role key only used server-side
- [ ] Signed URLs expire in 1 hour
- [ ] CORS configured for production domain only
- [ ] Rate limiting on processing endpoints
- [ ] Input validation on all endpoints
- [ ] No sensitive data in error messages
- [ ] HTTPS enforced in production

---

## 11. Monitoring & Observability

### 11.1 Key Metrics

| Metric | Source | Alert Threshold |
|--------|--------|-----------------|
| API latency (p95) | Cloud Run | >5s |
| Error rate | Cloud Run | >1% |
| Song processing time | Custom | >120s |
| Storage usage | Supabase | >80% quota |
| Active users | Supabase Auth | Trending |
| Songs processed | Custom | Trending |

### 11.2 Logging Strategy

```typescript
// Structured logging for Cloud Run
const log = (level: string, message: string, data?: object) => {
  console.log(JSON.stringify({
    severity: level,
    message,
    ...data,
    timestamp: new Date().toISOString()
  }))
}

// Usage
log('INFO', 'Song processing started', { userId, videoId })
log('ERROR', 'Chord detection failed', { userId, videoId, error: err.message })
```

---

---

## Appendix A: Detailed Lyrics Architecture

> *Preserved from v2.0 for implementation reference*

### A.1 Lyrics Processing Flow

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
[Backend API Route]
        │
        ▼
[lyrics-transcriber / AssemblyAI]
        │
        ├── Input: audio file (stem or full)
        ├── Engine: Whisper (faster-whisper or whisperX)
        ├── Output: Enhanced LRC with word timestamps
        │
        ▼
[Store LRC in Supabase]
        │
        ├── user_song_lyrics.lrc_content
        ├── user_song_lyrics.has_word_timing = true
        ├── user_song_lyrics.audio_source
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

### A.2 LRC Format

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

### A.3 Lyrics API Design

#### POST /api/songs/:id/lyrics/generate

```typescript
// Request
{
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

#### GET /api/songs/:id/lyrics

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

### A.4 Frontend Lyrics Integration

```typescript
// product/app/chords/lyrics/hooks/useLyricsSync.ts

import RabbitLyrics from 'rabbit-lyrics'

export function useLyricsSync(lrcContent: string | null, audioElement: HTMLAudioElement | null) {
  const [currentLine, setCurrentLine] = useState<number>(-1)
  const [currentWord, setCurrentWord] = useState<number>(-1)
  const rabbitLyricsRef = useRef<RabbitLyrics | null>(null)

  useEffect(() => {
    if (!lrcContent || !audioElement) return

    rabbitLyricsRef.current = new RabbitLyrics({
      element: document.getElementById('lyrics-display'),
      mediaElement: audioElement,
      lyrics: lrcContent,
      mode: 'karaoke',
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

### A.5 Lyrics Display Component

```typescript
// product/app/chords/lyrics/LyricsDisplay.tsx

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

### A.6 Lyrics-Specific Errors

| Error | User Message | Recovery |
|-------|--------------|----------|
| Transcription timeout | "Lyrics generation took too long. Please try again." | Retry button |
| Low audio quality | "Audio quality too low for accurate lyrics. Try using vocals stem." | Suggest stem |
| No speech detected | "No vocals detected in this track." | Inform user |
| Server unavailable | "Lyrics service temporarily unavailable." | Show estimated recovery |

### A.7 Graceful Degradation

- If word-level timing fails: Fall back to line-level sync
- If lyrics generation fails: Song still usable for chords/stems
- If vocals stem unavailable: Use full audio (lower accuracy)

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-02 | Initial YouTube chord player architecture |
| 2.0 | 2026-01-02 | Added lyrics transcription (Whisper + Rabbit Lyrics) |
| 3.0 | 2026-01-03 | Major update: User song library, Supabase Storage, Cloud Run deployment, debranding, demo songs |
| 3.1 | 2026-01-03 | Merged detailed lyrics architecture from v2.0 as Appendix A |
