# Guitar App Backend

Express.js backend server for the Guitar App, providing API endpoints for song management, chord analysis, stem separation, and lyrics.

## Prerequisites

- Node.js 18+
- Supabase account with a project

## Setup

### 1. Install Dependencies

```bash
cd backend
yarn install
```

### 2. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Fill in your Supabase credentials from [Supabase Dashboard](https://supabase.com/dashboard):
- `SUPABASE_URL`: Project URL from Settings > API
- `SUPABASE_ANON_KEY`: anon/public key from Settings > API
- `SUPABASE_SERVICE_ROLE_KEY`: service_role key from Settings > API
- `SUPABASE_JWT_SECRET`: JWT Secret from Settings > API

### 3. Set Up Database

Run the database migrations in Supabase SQL Editor:

```bash
# Execute in order:
supabase/migrations/20260104000001_user_songs_schema.sql
supabase/migrations/20260104000002_storage_policies.sql
```

Or use Supabase CLI:

```bash
supabase db push
```

### 4. Set Up Storage

Create the storage bucket by running:

```bash
npx tsx supabase/setup-storage.ts
```

This creates the `song-files` bucket with proper RLS policies.

### 5. Start the Server

```bash
npx tsx src/server.ts
```

The server runs on port 4568 by default.

## API Endpoints

### User Songs

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user-songs` | List all songs for current user |
| GET | `/api/user-songs/:songId` | Get song details with signed URLs |
| GET | `/api/user-songs/by-video/:videoId` | Get song by YouTube video ID |
| POST | `/api/user-songs` | Create new song |
| PUT | `/api/user-songs/:songId` | Update song metadata |
| DELETE | `/api/user-songs/:songId` | Delete song and all files |
| POST | `/api/user-songs/:songId/upload-audio` | Upload audio file |
| GET | `/api/user-songs/:songId/audio-url` | Get signed URL for audio |

### Chord Analysis

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user-songs/:songId/chords` | Get all chord analyses |
| GET | `/api/user-songs/:songId/chords?library=essentia` | Get specific library analysis |
| POST | `/api/user-songs/:songId/chords` | Save chord analysis |
| DELETE | `/api/user-songs/:songId/chords/:library` | Delete specific analysis |

### Stems

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user-songs/:songId/stems` | Get all stems with signed URLs |
| POST | `/api/user-songs/:songId/stems` | Upload a stem |
| GET | `/api/user-songs/:songId/stems/:stemType/url` | Get signed URL for stem |
| DELETE | `/api/user-songs/:songId/stems/:stemType` | Delete specific stem |
| DELETE | `/api/user-songs/:songId/stems` | Delete all stems |

### Lyrics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/user-songs/:songId/lyrics` | Get lyrics with signed URL |
| POST | `/api/user-songs/:songId/lyrics` | Save lyrics (LRC format) |
| DELETE | `/api/user-songs/:songId/lyrics` | Delete lyrics |

## Authentication

All `/api/user-songs/*` endpoints require authentication via Supabase JWT token in the Authorization header:

```
Authorization: Bearer <supabase-jwt-token>
```

## Database Schema

### user_songs
Main table for storing song metadata linked to YouTube videos.

### user_song_chords
Chord analysis results from different libraries (essentia, madmom, btc, chordify).

### user_song_stems
References to separated audio stems (vocals, backing, drums, bass, guitar, piano, other).

### user_song_lyrics
Lyrics in LRC format with optional word-level timing.

## Storage Structure

Files are stored in the `song-files` bucket:

```
{userId}/audio/{videoId}.mp3      # Full audio
{userId}/stems/{videoId}/vocals.mp3
{userId}/stems/{videoId}/backing.mp3
{userId}/stems/{videoId}/drums.mp3
{userId}/stems/{videoId}/bass.mp3
{userId}/stems/{videoId}/guitar.mp3
{userId}/stems/{videoId}/piano.mp3
{userId}/stems/{videoId}/other.mp3
{userId}/lyrics/{videoId}.lrc     # LRC lyrics file
```

All files are protected by RLS policies ensuring users can only access their own files.
