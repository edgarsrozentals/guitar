# Story 1.6: API Endpoints for Storing Stems and Lyrics

**Epic:** Cloud Song Storage
**Priority:** P1 - High
**Size:** Large
**Backend Required:** Yes

## User Story

As an authenticated user,
I want to save separated stems and synced lyrics for my songs,
So that I can use backing tracks and follow along with lyrics on future sessions.

## Technical Context

Stems are separated audio files (vocals, backing, drums, bass, other) that allow practice with isolated instruments. Lyrics are stored in LRC format with word-level timestamps for karaoke sync.

## Acceptance Criteria

### Upload Stems

**Given** an authenticated user with a song in their library
**When** they POST to `/api/songs/{songId}/stems` with multipart form data containing stem files
**Then**:
- Each stem is uploaded to `{user_id}/stems/{song_id}/{stem_type}.mp3`
- Records are created in user_song_stems for each stem type
- Returns 201 with created stem records including signed URLs

**Response format:**
```json
{
  "stems": [
    {
      "id": "uuid",
      "stemType": "vocals",
      "storagePath": "user-123/stems/song-456/vocals.mp3",
      "url": "https://...", // Signed URL
      "createdAt": "2024-01-01T00:00:00Z"
    },
    {
      "id": "uuid",
      "stemType": "backing",
      "storagePath": "user-123/stems/song-456/backing.mp3",
      "url": "https://...",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Upload Lyrics

**Given** an authenticated user with a song in their library
**When** they POST to `/api/songs/{songId}/lyrics` with body:
```json
{
  "lrcContent": "[00:00.00] First line of lyrics\n[00:05.50] Second line..."
}
```
**Then**:
- The LRC file is uploaded to `{user_id}/lyrics/{song_id}.lrc`
- A record is created in user_song_lyrics with the storage path and raw content
- Returns 201 with the created lyrics record

### Retrieve Stems

**Given** an authenticated user
**When** they GET `/api/songs/{songId}/stems`
**Then** they receive:
```json
{
  "stems": [
    {
      "stemType": "vocals",
      "url": "https://...",
      "createdAt": "2024-01-01T00:00:00Z"
    },
    {
      "stemType": "backing",
      "url": "https://...",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### Retrieve Lyrics

**Given** an authenticated user
**When** they GET `/api/songs/{songId}/lyrics`
**Then** they receive:
```json
{
  "id": "uuid",
  "lrcContent": "[00:00.00] First line...",
  "url": "https://...",
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### Update Existing Stems

**Given** an authenticated user uploads stems for a song that already has stems
**When** stems of the same type are uploaded
**Then**:
- The existing stems are replaced (storage file overwritten, record updated)
- Returns 200 with the updated stem records

### Partial Upload Handling

**Given** stem upload partially fails (some stems uploaded, some failed)
**When** the error is caught
**Then**:
- Successfully uploaded stems are kept
- The response indicates which stems succeeded and which failed
- Returns 207 Multi-Status with detailed results:
```json
{
  "success": [
    { "stemType": "vocals", "url": "https://..." }
  ],
  "failed": [
    { "stemType": "drums", "error": "Upload failed: file too large" }
  ]
}
```

### Delete Stems

**Given** an authenticated user
**When** they DELETE `/api/songs/{songId}/stems/{stemType}`
**Then**:
- The stem file is deleted from storage
- The database record is removed
- Returns 204 No Content

### Delete Lyrics

**Given** an authenticated user
**When** they DELETE `/api/songs/{songId}/lyrics`
**Then**:
- The LRC file is deleted from storage
- The database record is removed
- Returns 204 No Content

## Implementation Notes

### Stems API Implementation
```typescript
// backend/src/routes/songs.ts (continued)
import multer from 'multer';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB per stem
});

const VALID_STEM_TYPES = ['vocals', 'backing', 'drums', 'bass', 'other'];

// POST /api/songs/:songId/stems - Upload stems
router.post(
  '/:songId/stems',
  authMiddleware,
  upload.fields(VALID_STEM_TYPES.map(t => ({ name: t, maxCount: 1 }))),
  async (req, res) => {
    const { songId } = req.params;
    const userId = req.user!.id;
    const files = req.files as { [key: string]: Express.Multer.File[] };

    try {
      // Verify song ownership
      const { data: song } = await supabase
        .from('user_songs')
        .select('id, video_id')
        .eq('id', songId)
        .eq('user_id', userId)
        .single();

      if (!song) {
        return res.status(404).json({
          error: 'Song not found',
          code: 'SONG_NOT_FOUND'
        });
      }

      const success: any[] = [];
      const failed: any[] = [];

      // Process each stem type
      for (const stemType of Object.keys(files)) {
        if (!VALID_STEM_TYPES.includes(stemType)) {
          failed.push({ stemType, error: 'Invalid stem type' });
          continue;
        }

        const file = files[stemType][0];
        const storagePath = `${userId}/stems/${song.video_id}/${stemType}.mp3`;

        try {
          // Upload to storage
          const { error: uploadError } = await supabase.storage
            .from('user-songs')
            .upload(storagePath, file.buffer, {
              contentType: 'audio/mpeg',
              upsert: true
            });

          if (uploadError) throw uploadError;

          // Upsert database record
          const { data: stem, error: dbError } = await supabase
            .from('user_song_stems')
            .upsert({
              user_song_id: songId,
              stem_type: stemType,
              storage_path: storagePath
            }, {
              onConflict: 'user_song_id,stem_type'
            })
            .select()
            .single();

          if (dbError) throw dbError;

          // Generate signed URL
          const url = await generateSignedUrl(userId, storagePath);

          success.push({
            id: stem.id,
            stemType,
            storagePath,
            url,
            createdAt: stem.created_at
          });

        } catch (error) {
          console.error(`Failed to upload stem ${stemType}:`, error);
          failed.push({ stemType, error: error.message });
        }
      }

      // Determine response status
      if (failed.length === 0) {
        res.status(success.length > 0 ? 201 : 400).json({ stems: success });
      } else if (success.length === 0) {
        res.status(400).json({ error: 'All uploads failed', failed });
      } else {
        res.status(207).json({ success, failed });
      }

    } catch (error) {
      console.error('Stems upload failed:', error);
      res.status(500).json({
        error: 'Failed to upload stems',
        code: 'STEMS_UPLOAD_FAILED'
      });
    }
  }
);

// GET /api/songs/:songId/stems - Get stems
router.get('/:songId/stems', authMiddleware, async (req, res) => {
  const { songId } = req.params;
  const userId = req.user!.id;

  try {
    // Verify song ownership
    const { data: song } = await supabase
      .from('user_songs')
      .select('id')
      .eq('id', songId)
      .eq('user_id', userId)
      .single();

    if (!song) {
      return res.status(404).json({
        error: 'Song not found',
        code: 'SONG_NOT_FOUND'
      });
    }

    // Get stems
    const { data: stems, error } = await supabase
      .from('user_song_stems')
      .select('*')
      .eq('user_song_id', songId);

    if (error) throw error;

    // Generate signed URLs
    const stemsWithUrls = await Promise.all(
      stems.map(async (stem) => ({
        id: stem.id,
        stemType: stem.stem_type,
        url: await generateSignedUrl(userId, stem.storage_path),
        createdAt: stem.created_at
      }))
    );

    res.json({ stems: stemsWithUrls });

  } catch (error) {
    console.error('Failed to fetch stems:', error);
    res.status(500).json({
      error: 'Failed to fetch stems',
      code: 'STEMS_FETCH_FAILED'
    });
  }
});

// DELETE /api/songs/:songId/stems/:stemType - Delete stem
router.delete('/:songId/stems/:stemType', authMiddleware, async (req, res) => {
  const { songId, stemType } = req.params;
  const userId = req.user!.id;

  try {
    // Get stem record with ownership check
    const { data: stem } = await supabase
      .from('user_song_stems')
      .select('*, user_songs!inner(user_id)')
      .eq('user_song_id', songId)
      .eq('stem_type', stemType)
      .eq('user_songs.user_id', userId)
      .single();

    if (!stem) {
      return res.status(404).json({
        error: 'Stem not found',
        code: 'STEM_NOT_FOUND'
      });
    }

    // Delete from storage
    await supabase.storage
      .from('user-songs')
      .remove([stem.storage_path]);

    // Delete database record
    await supabase
      .from('user_song_stems')
      .delete()
      .eq('id', stem.id);

    res.status(204).send();

  } catch (error) {
    console.error('Failed to delete stem:', error);
    res.status(500).json({
      error: 'Failed to delete stem',
      code: 'STEM_DELETE_FAILED'
    });
  }
});
```

### Lyrics API Implementation
```typescript
// POST /api/songs/:songId/lyrics - Upload lyrics
router.post('/:songId/lyrics', authMiddleware, async (req, res) => {
  const { songId } = req.params;
  const { lrcContent } = req.body;
  const userId = req.user!.id;

  try {
    // Verify song ownership
    const { data: song } = await supabase
      .from('user_songs')
      .select('id, video_id')
      .eq('id', songId)
      .eq('user_id', userId)
      .single();

    if (!song) {
      return res.status(404).json({
        error: 'Song not found',
        code: 'SONG_NOT_FOUND'
      });
    }

    const storagePath = `${userId}/lyrics/${song.video_id}.lrc`;

    // Upload LRC file to storage
    const { error: uploadError } = await supabase.storage
      .from('user-songs')
      .upload(storagePath, lrcContent, {
        contentType: 'text/plain',
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Upsert database record
    const { data: lyrics, error: dbError } = await supabase
      .from('user_song_lyrics')
      .upsert({
        user_song_id: songId,
        lrc_content: lrcContent,
        storage_path: storagePath
      }, {
        onConflict: 'user_song_id'
      })
      .select()
      .single();

    if (dbError) throw dbError;

    // Generate signed URL
    const url = await generateSignedUrl(userId, storagePath);

    res.status(201).json({
      id: lyrics.id,
      lrcContent: lyrics.lrc_content,
      url,
      createdAt: lyrics.created_at
    });

  } catch (error) {
    console.error('Lyrics upload failed:', error);
    res.status(500).json({
      error: 'Failed to upload lyrics',
      code: 'LYRICS_UPLOAD_FAILED'
    });
  }
});

// GET /api/songs/:songId/lyrics - Get lyrics
router.get('/:songId/lyrics', authMiddleware, async (req, res) => {
  const { songId } = req.params;
  const userId = req.user!.id;

  try {
    // Get lyrics with ownership check
    const { data: lyrics } = await supabase
      .from('user_song_lyrics')
      .select('*, user_songs!inner(user_id)')
      .eq('user_song_id', songId)
      .eq('user_songs.user_id', userId)
      .single();

    if (!lyrics) {
      return res.status(404).json({
        error: 'Lyrics not found',
        code: 'LYRICS_NOT_FOUND'
      });
    }

    const url = await generateSignedUrl(userId, lyrics.storage_path);

    res.json({
      id: lyrics.id,
      lrcContent: lyrics.lrc_content,
      url,
      createdAt: lyrics.created_at
    });

  } catch (error) {
    console.error('Failed to fetch lyrics:', error);
    res.status(500).json({
      error: 'Failed to fetch lyrics',
      code: 'LYRICS_FETCH_FAILED'
    });
  }
});

// DELETE /api/songs/:songId/lyrics - Delete lyrics
router.delete('/:songId/lyrics', authMiddleware, async (req, res) => {
  const { songId } = req.params;
  const userId = req.user!.id;

  try {
    // Get lyrics with ownership check
    const { data: lyrics } = await supabase
      .from('user_song_lyrics')
      .select('*, user_songs!inner(user_id)')
      .eq('user_song_id', songId)
      .eq('user_songs.user_id', userId)
      .single();

    if (!lyrics) {
      return res.status(404).json({
        error: 'Lyrics not found',
        code: 'LYRICS_NOT_FOUND'
      });
    }

    // Delete from storage
    await supabase.storage
      .from('user-songs')
      .remove([lyrics.storage_path]);

    // Delete database record
    await supabase
      .from('user_song_lyrics')
      .delete()
      .eq('id', lyrics.id);

    res.status(204).send();

  } catch (error) {
    console.error('Failed to delete lyrics:', error);
    res.status(500).json({
      error: 'Failed to delete lyrics',
      code: 'LYRICS_DELETE_FAILED'
    });
  }
});
```

## Testing Checklist
- [ ] Upload multiple stems in single request
- [ ] Partial upload failures handled correctly (207 response)
- [ ] Stems replaced when re-uploaded
- [ ] Lyrics upload creates LRC file in storage
- [ ] Lyrics content stored in both storage and database
- [ ] Signed URLs generated for all files
- [ ] Delete stems removes storage and database record
- [ ] Delete lyrics removes storage and database record
- [ ] Cross-user access prevented
- [ ] Invalid stem types rejected

## Dependencies
- Multer for file upload handling
- Supabase Storage configured
- user_song_stems and user_song_lyrics tables
- Authentication middleware

## Definition of Done
- [ ] All stem endpoints implemented and tested
- [ ] All lyrics endpoints implemented and tested
- [ ] Multipart file upload working
- [ ] Partial failure handling with 207 response
- [ ] Storage cleanup on delete
- [ ] API documentation updated
- [ ] Integration tests written