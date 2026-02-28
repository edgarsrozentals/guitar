# Story 1.5: API Endpoints for Storing Chord Analysis Results

**Epic:** Cloud Song Storage
**Priority:** P1 - High
**Size:** Medium
**Backend Required:** Yes

## User Story

As an authenticated user,
I want to save chord analysis results for my songs,
So that I don't have to re-analyze songs each time I load them.

## Technical Context

Chord analysis is computationally expensive. We store results in JSONB format to allow flexible schema for different analysis libraries (Essentia, Madmom, BTC) while maintaining query performance.

## Acceptance Criteria

### Create/Update Chord Analysis

**Given** an authenticated user with a song in their library
**When** they POST to `/api/songs/{songId}/chords` with body:
```json
{
  "library": "essentia",
  "chords": [
    { "time": 0.5, "chord": { "root": "A", "quality": "minor" } },
    { "time": 2.0, "chord": { "root": "F", "quality": "major" } }
  ],
  "tempo": {
    "bpm": 120,
    "beats": [0.5, 1.0, 1.5, 2.0]
  },
  "key": {
    "root": "A",
    "scale": "minor",
    "confidence": 0.85
  }
}
```
**Then**:
- If no analysis exists for this library, create new record (201)
- If analysis exists for this library, update existing record (200)
- Return the saved chord analysis

### Ownership Validation

**Given** an authenticated user
**When** they POST to `/api/songs/{songId}/chords` for a song they don't own
**Then** a 404 Not Found response is returned:
```json
{
  "error": "Song not found",
  "code": "SONG_NOT_FOUND"
}
```

### Retrieve Chord Analysis

**Given** an authenticated user with a song that has chord analysis
**When** they GET `/api/songs/{songId}/chords?library=essentia`
**Then** they receive:
```json
{
  "library": "essentia",
  "chords": [...],
  "tempo": {...},
  "key": {...},
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

**Given** an authenticated user
**When** they GET `/api/songs/{songId}/chords` without library parameter
**Then** they receive all available analyses:
```json
{
  "analyses": {
    "essentia": { ... },
    "madmom": { ... },
    "btc": { ... }
  }
}
```

### Delete Chord Analysis

**Given** an authenticated user
**When** they DELETE `/api/songs/{songId}/chords/{library}`
**Then**:
- The chord analysis for that library is deleted
- Returns 204 No Content
- Other library analyses remain unchanged

### Empty State Handling

**Given** an authenticated user
**When** they GET chord analysis for a song with no analysis yet
**Then** a 200 response is returned:
```json
{
  "analyses": {}
}
```

## Implementation Notes

### API Implementation
```typescript
// backend/src/routes/songs.ts (continued)

// POST /api/songs/:songId/chords - Save chord analysis
router.post('/:songId/chords', authMiddleware, async (req, res) => {
  const { songId } = req.params;
  const { library, chords, tempo, key } = req.body;
  const userId = req.user!.id;

  try {
    // Validate library name
    if (!['essentia', 'madmom', 'btc'].includes(library)) {
      return res.status(400).json({
        error: 'Invalid library name',
        code: 'INVALID_LIBRARY',
        validLibraries: ['essentia', 'madmom', 'btc']
      });
    }

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

    // Check if analysis exists
    const { data: existing } = await supabase
      .from('user_song_chords')
      .select('id')
      .eq('user_song_id', songId)
      .eq('library', library)
      .single();

    let result;

    if (existing) {
      // Update existing analysis
      const { data, error } = await supabase
        .from('user_song_chords')
        .update({
          chords,
          tempo,
          key,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();

      if (error) throw error;
      result = data;
      res.status(200);
    } else {
      // Create new analysis
      const { data, error } = await supabase
        .from('user_song_chords')
        .insert({
          user_song_id: songId,
          library,
          chords,
          tempo,
          key
        })
        .select()
        .single();

      if (error) throw error;
      result = data;
      res.status(201);
    }

    res.json(result);

  } catch (error) {
    console.error('Failed to save chord analysis:', error);
    res.status(500).json({
      error: 'Failed to save chord analysis',
      code: 'CHORDS_SAVE_FAILED'
    });
  }
});

// GET /api/songs/:songId/chords - Get chord analysis
router.get('/:songId/chords', authMiddleware, async (req, res) => {
  const { songId } = req.params;
  const { library } = req.query;
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

    if (library) {
      // Get specific library analysis
      const { data, error } = await supabase
        .from('user_song_chords')
        .select('*')
        .eq('user_song_id', songId)
        .eq('library', library)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      res.json(data || null);
    } else {
      // Get all analyses
      const { data, error } = await supabase
        .from('user_song_chords')
        .select('*')
        .eq('user_song_id', songId);

      if (error) throw error;

      // Group by library
      const analyses = data.reduce((acc, analysis) => {
        acc[analysis.library] = {
          library: analysis.library,
          chords: analysis.chords,
          tempo: analysis.tempo,
          key: analysis.key,
          createdAt: analysis.created_at,
          updatedAt: analysis.updated_at
        };
        return acc;
      }, {});

      res.json({ analyses });
    }

  } catch (error) {
    console.error('Failed to fetch chord analysis:', error);
    res.status(500).json({
      error: 'Failed to fetch chord analysis',
      code: 'CHORDS_FETCH_FAILED'
    });
  }
});

// DELETE /api/songs/:songId/chords/:library - Delete chord analysis
router.delete('/:songId/chords/:library', authMiddleware, async (req, res) => {
  const { songId, library } = req.params;
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

    // Delete analysis
    const { error } = await supabase
      .from('user_song_chords')
      .delete()
      .eq('user_song_id', songId)
      .eq('library', library);

    if (error) throw error;

    res.status(204).send();

  } catch (error) {
    console.error('Failed to delete chord analysis:', error);
    res.status(500).json({
      error: 'Failed to delete chord analysis',
      code: 'CHORDS_DELETE_FAILED'
    });
  }
});
```

### JSONB Schema Documentation
```typescript
// Chord Analysis JSONB Schema
interface ChordAnalysis {
  chords: Array<{
    time: number; // seconds
    chord: {
      root: string; // A, B, C, D, E, F, G
      quality: string; // major, minor, dim, aug, 7, etc.
    };
  }>;
  tempo?: {
    bpm: number;
    beats: number[]; // beat timestamps in seconds
  };
  key?: {
    root: string;
    scale: string; // major, minor
    confidence?: number; // 0-1
  };
}
```

## Testing Checklist
- [ ] Create new chord analysis for song
- [ ] Update existing chord analysis
- [ ] Retrieve specific library analysis
- [ ] Retrieve all analyses for song
- [ ] Delete specific library analysis
- [ ] Ownership validation prevents cross-user access
- [ ] Invalid library names rejected
- [ ] JSONB data properly stored and retrieved
- [ ] Empty state handled correctly

## Dependencies
- Supabase with JSONB support
- user_song_chords table created
- Authentication middleware

## Definition of Done
- [ ] All endpoints implemented and tested
- [ ] JSONB schema documented
- [ ] Ownership validation working
- [ ] Multiple library support verified
- [ ] API documentation updated
- [ ] Integration tests written
- [ ] Performance tested with large chord arrays