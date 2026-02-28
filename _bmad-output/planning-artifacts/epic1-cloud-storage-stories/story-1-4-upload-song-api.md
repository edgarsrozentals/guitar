# Story 1.4: API Endpoint for Uploading and Storing Song Audio

**Epic:** Cloud Song Storage
**Priority:** P0 - Critical
**Size:** Large
**Backend Required:** Yes

## User Story

As an authenticated user,
I want to upload a song's audio to my personal cloud library,
So that I can access it later without re-downloading.

## Technical Context

This endpoint handles the complete flow of extracting audio from a video URL, uploading to Supabase Storage, and creating the database record. It must handle large files efficiently and provide proper error recovery.

## Acceptance Criteria

### Song Creation Endpoint

**Given** an authenticated user
**When** they POST to `/api/songs` with body:
```json
{
  "videoId": "abc123",
  "title": "Song Name",
  "artist": "Artist Name"
}
```
**Then** the backend:
1. Validates the video ID format
2. Checks if song already exists for user
3. Extracts audio from the video source
4. Uploads audio to `{user_id}/audio/{video_id}.mp3`
5. Creates record in user_songs table
6. Returns 201 with created song data and signed URL

### Duplicate Prevention

**Given** an authenticated user
**When** they POST to `/api/songs` with a video_id that already exists in their library
**Then** a 409 Conflict response is returned:
```json
{
  "error": "Song already exists in your library",
  "code": "SONG_DUPLICATE",
  "existingSongId": "uuid-here"
}
```

### Invalid Video Handling

**Given** an authenticated user
**When** they POST to `/api/songs` with an invalid or unavailable video_id
**Then** a 400 Bad Request response is returned:
```json
{
  "error": "Unable to process video",
  "code": "VIDEO_INVALID",
  "details": "Video not found or unavailable"
}
```

### Error Recovery

**Given** audio extraction succeeds but storage upload fails
**When** the error is caught
**Then**:
- No database record is created
- Temporary files are cleaned up
- 500 error returned with message "Failed to store audio file"
- Error logged for debugging

### Song Listing Endpoint

**Given** an authenticated user
**When** they GET `/api/songs`
**Then** they receive:
```json
{
  "songs": [
    {
      "id": "uuid",
      "videoId": "abc123",
      "title": "Song Name",
      "artist": "Artist Name",
      "duration": 240,
      "audioUrl": "https://...", // Signed URL, 1-hour expiry
      "hasChords": true,
      "hasStems": false,
      "hasLyrics": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "lastAccessedAt": "2024-01-02T00:00:00Z"
    }
  ],
  "total": 1
}
```

### Pagination Support

**Given** a user has many songs
**When** they GET `/api/songs?page=1&limit=20`
**Then** they receive paginated results with:
- Maximum 20 songs per page
- Total count for pagination
- Songs sorted by lastAccessedAt DESC

## Implementation Notes

### API Implementation
```typescript
// backend/src/routes/songs.ts
import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { extractAudio } from '../utils/audio';
import { uploadToStorage } from '../utils/storage';
import { supabase } from '../config/supabase';

const router = Router();

// POST /api/songs - Create new song
router.post('/', authMiddleware, async (req, res) => {
  const { videoId, title, artist } = req.body;
  const userId = req.user!.id;

  try {
    // Validate input
    if (!videoId || !title) {
      return res.status(400).json({
        error: 'Video ID and title are required',
        code: 'INVALID_INPUT'
      });
    }

    // Check for duplicate
    const { data: existing } = await supabase
      .from('user_songs')
      .select('id')
      .eq('user_id', userId)
      .eq('video_id', videoId)
      .single();

    if (existing) {
      return res.status(409).json({
        error: 'Song already exists in your library',
        code: 'SONG_DUPLICATE',
        existingSongId: existing.id
      });
    }

    // Extract audio
    const audioPath = await extractAudio(videoId);

    // Upload to storage
    const storagePath = `${userId}/audio/${videoId}.mp3`;
    await uploadToStorage('user-songs', storagePath, audioPath);

    // Get audio duration
    const duration = await getAudioDuration(audioPath);

    // Create database record
    const { data: song, error: dbError } = await supabase
      .from('user_songs')
      .insert({
        user_id: userId,
        video_id: videoId,
        title,
        artist,
        duration_seconds: duration,
        audio_storage_path: storagePath
      })
      .select()
      .single();

    if (dbError) {
      // Cleanup storage on DB failure
      await deleteFromStorage('user-songs', storagePath);
      throw dbError;
    }

    // Generate signed URL
    const audioUrl = await generateSignedUrl(userId, storagePath);

    // Cleanup temp file
    await cleanupTempFile(audioPath);

    res.status(201).json({
      ...song,
      audioUrl
    });

  } catch (error) {
    console.error('Song creation failed:', error);

    // Cleanup on failure
    if (audioPath) {
      await cleanupTempFile(audioPath);
    }

    if (error.message?.includes('Video not found')) {
      return res.status(400).json({
        error: 'Unable to process video',
        code: 'VIDEO_INVALID',
        details: 'Video not found or unavailable'
      });
    }

    res.status(500).json({
      error: 'Failed to create song',
      code: 'SONG_CREATE_FAILED'
    });
  }
});

// GET /api/songs - List user's songs
router.get('/', authMiddleware, async (req, res) => {
  const userId = req.user!.id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const offset = (page - 1) * limit;

  try {
    // Get songs with counts
    const { data: songs, error, count } = await supabase
      .from('user_songs')
      .select(`
        *,
        user_song_chords(library),
        user_song_stems(stem_type),
        user_song_lyrics(id)
      `, { count: 'exact' })
      .eq('user_id', userId)
      .order('last_accessed_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // Generate signed URLs for all songs
    const songsWithUrls = await Promise.all(
      songs.map(async (song) => {
        const audioUrl = await generateSignedUrl(
          userId,
          song.audio_storage_path
        );

        return {
          ...song,
          audioUrl,
          hasChords: song.user_song_chords?.length > 0,
          hasStems: song.user_song_stems?.length > 0,
          hasLyrics: song.user_song_lyrics?.length > 0,
          // Remove nested data from response
          user_song_chords: undefined,
          user_song_stems: undefined,
          user_song_lyrics: undefined
        };
      })
    );

    res.json({
      songs: songsWithUrls,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    });

  } catch (error) {
    console.error('Failed to fetch songs:', error);
    res.status(500).json({
      error: 'Failed to load songs',
      code: 'SONGS_FETCH_FAILED'
    });
  }
});
```

### Audio Extraction Utility
```typescript
// backend/src/utils/audio.ts
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);

export const extractAudio = async (videoId: string): Promise<string> => {
  const tempDir = path.join(__dirname, '../../temp');
  const outputPath = path.join(tempDir, `${videoId}.mp3`);

  // Ensure temp directory exists
  await fs.mkdir(tempDir, { recursive: true });

  // Use yt-dlp to extract audio
  const command = `yt-dlp -x --audio-format mp3 -o "${outputPath}" "https://youtube.com/watch?v=${videoId}"`;

  try {
    await execAsync(command, { timeout: 120000 }); // 2 minute timeout
    return outputPath;
  } catch (error) {
    throw new Error(`Audio extraction failed: ${error.message}`);
  }
};

export const getAudioDuration = async (filePath: string): Promise<number> => {
  const command = `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${filePath}"`;
  const { stdout } = await execAsync(command);
  return Math.round(parseFloat(stdout));
};
```

## Testing Checklist
- [ ] Song creation with valid video ID succeeds
- [ ] Duplicate songs are prevented
- [ ] Invalid video IDs are handled gracefully
- [ ] Storage failures trigger cleanup
- [ ] Database failures trigger storage cleanup
- [ ] Signed URLs are generated correctly
- [ ] Pagination works correctly
- [ ] Songs are properly isolated by user
- [ ] Temp files are cleaned up

## Dependencies
- yt-dlp installed on server
- ffmpeg/ffprobe for duration detection
- Sufficient temp storage for audio processing
- Supabase Storage configured

## Definition of Done
- [ ] API endpoints implemented and tested
- [ ] Audio extraction working reliably
- [ ] Storage upload with proper paths
- [ ] Database records created correctly
- [ ] Error handling and cleanup comprehensive
- [ ] API documentation updated
- [ ] Integration tests written