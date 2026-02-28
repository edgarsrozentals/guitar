# Story 4.1: Demo Songs Database Schema and API

**Epic:** Demo Songs & Public Access
**Priority:** P1 - High
**Size:** Medium
**Backend Required:** Yes

## User Story

As a developer,
I want a demo songs table and read-only API endpoints,
So that demo song data can be stored and retrieved without authentication.

## Technical Context

Demo songs are pre-analyzed songs that allow visitors to experience the app without signing up. They have their own table and storage bucket with public read access.

## Acceptance Criteria

### Database Schema

**Given** the Supabase database is accessible
**When** migrations are applied
**Then** the `demo_songs` table is created with columns:

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| video_id | text (unique) | Video identifier |
| title | text | Song title |
| artist | text | Artist name |
| description | text | Short description for selection page |
| display_order | integer | Order in demo list |
| is_active | boolean (default true) | Whether demo is available |
| audio_storage_path | text | Path in demo-songs bucket |
| chords | jsonb | Pre-analyzed chord data (all libraries) |
| stems | jsonb | Stem paths in demo-songs bucket |
| lyrics | jsonb | Lyrics data with LRC content |
| tempo | jsonb | BPM and beat grid |
| key_signature | jsonb | Detected key |
| duration_seconds | integer | Song duration |
| created_at | timestamptz | Creation timestamp |
| updated_at | timestamptz | Update timestamp |

### RLS Policies

**Given** the demo_songs table exists
**When** RLS policies are applied
**Then**:
- Public SELECT access without authentication
- INSERT/UPDATE/DELETE restricted to service role only

```sql
-- Public read access
CREATE POLICY "Anyone can view demo songs"
  ON demo_songs FOR SELECT
  USING (is_active = true);

-- Admin-only write access
CREATE POLICY "Only service role can modify demo songs"
  ON demo_songs FOR ALL
  USING (auth.role() = 'service_role');
```

### List Demo Songs Endpoint

**Given** the demo_songs table exists with data
**When** an anonymous user calls GET `/api/demo-songs`
**Then**:
- Returns list of active demo songs ordered by display_order
- No authentication required
- Response includes: video_id, title, artist, description, duration

```json
{
  "songs": [
    {
      "videoId": "abc123",
      "title": "Demo Song 1",
      "artist": "Artist Name",
      "description": "A great song for practicing blues scales",
      "duration": 240
    }
  ]
}
```

### Get Demo Song Details Endpoint

**Given** a valid demo song video_id exists
**When** an anonymous user calls GET `/api/demo-songs/:videoId`
**Then**:
- Returns full demo song data
- No authentication required
- Response includes: chords, stems, lyrics, tempo, key

```json
{
  "videoId": "abc123",
  "title": "Demo Song 1",
  "artist": "Artist Name",
  "duration": 240,
  "audioUrl": "https://...", // Public URL from demo-songs bucket
  "chords": {
    "essentia": [...],
    "madmom": [...],
    "btc": [...]
  },
  "stems": {
    "vocals": "https://...",
    "backing": "https://...",
    "drums": "https://...",
    "bass": "https://..."
  },
  "lyrics": {
    "lrcContent": "[00:00.00] First line..."
  },
  "tempo": {
    "bpm": 120,
    "beats": [...]
  },
  "key": {
    "root": "A",
    "scale": "minor"
  }
}
```

### Demo Not Found

**Given** an invalid video_id is requested
**When** calling GET `/api/demo-songs/:videoId`
**Then**:
- Returns 404 Not Found
- Response: `{ "error": "Demo song not found", "code": "DEMO_NOT_FOUND" }`

## Implementation Notes

### Migration Script
```sql
-- Create demo_songs table
CREATE TABLE demo_songs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  video_id text UNIQUE NOT NULL,
  title text NOT NULL,
  artist text,
  description text,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  audio_storage_path text NOT NULL,
  chords jsonb,
  stems jsonb,
  lyrics jsonb,
  tempo jsonb,
  key_signature jsonb,
  duration_seconds integer,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE demo_songs ENABLE ROW LEVEL SECURITY;

-- Public read policy
CREATE POLICY "Public read access for active demos"
  ON demo_songs FOR SELECT
  USING (is_active = true);

-- Create index for ordering
CREATE INDEX idx_demo_songs_display_order ON demo_songs(display_order);
CREATE INDEX idx_demo_songs_is_active ON demo_songs(is_active);
```

### API Endpoints
```typescript
// backend/src/routes/demo-songs.ts
import { Router } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// GET /api/demo-songs - List all active demo songs
router.get('/', async (req, res) => {
  try {
    const { data: songs, error } = await supabase
      .from('demo_songs')
      .select('video_id, title, artist, description, duration_seconds')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;

    res.json({
      songs: songs.map(song => ({
        videoId: song.video_id,
        title: song.title,
        artist: song.artist,
        description: song.description,
        duration: song.duration_seconds
      }))
    });

  } catch (error) {
    console.error('Failed to fetch demo songs:', error);
    res.status(500).json({
      error: 'Failed to load demo songs',
      code: 'DEMO_FETCH_FAILED'
    });
  }
});

// GET /api/demo-songs/:videoId - Get demo song details
router.get('/:videoId', async (req, res) => {
  const { videoId } = req.params;

  try {
    const { data: song, error } = await supabase
      .from('demo_songs')
      .select('*')
      .eq('video_id', videoId)
      .eq('is_active', true)
      .single();

    if (error || !song) {
      return res.status(404).json({
        error: 'Demo song not found',
        code: 'DEMO_NOT_FOUND'
      });
    }

    // Get public URL for audio
    const { data: audioUrl } = supabase.storage
      .from('demo-songs')
      .getPublicUrl(song.audio_storage_path);

    // Get public URLs for stems
    const stemUrls: Record<string, string> = {};
    if (song.stems) {
      for (const [type, path] of Object.entries(song.stems)) {
        const { data } = supabase.storage
          .from('demo-songs')
          .getPublicUrl(path as string);
        stemUrls[type] = data.publicUrl;
      }
    }

    res.json({
      videoId: song.video_id,
      title: song.title,
      artist: song.artist,
      description: song.description,
      duration: song.duration_seconds,
      audioUrl: audioUrl.publicUrl,
      chords: song.chords,
      stems: stemUrls,
      lyrics: song.lyrics,
      tempo: song.tempo,
      key: song.key_signature
    });

  } catch (error) {
    console.error('Failed to fetch demo song:', error);
    res.status(500).json({
      error: 'Failed to load demo song',
      code: 'DEMO_FETCH_FAILED'
    });
  }
});

export default router;
```

### Register Routes
```typescript
// backend/src/server.ts
import demoSongsRouter from './routes/demo-songs';

// No auth middleware - public access
app.use('/api/demo-songs', demoSongsRouter);
```

## Testing Checklist
- [ ] demo_songs table created with correct schema
- [ ] RLS policies allow public read
- [ ] RLS policies block public write
- [ ] GET /api/demo-songs returns list without auth
- [ ] GET /api/demo-songs/:videoId returns full details
- [ ] 404 returned for invalid video_id
- [ ] Only active demos returned
- [ ] Songs ordered by display_order

## Dependencies
- Supabase project configured
- demo-songs storage bucket (Story 4.2)
- Database migration tooling

## Definition of Done
- [ ] Database migration script created
- [ ] RLS policies implemented
- [ ] API endpoints created
- [ ] No authentication required for access
- [ ] Endpoints tested with curl/Postman
- [ ] Error handling complete