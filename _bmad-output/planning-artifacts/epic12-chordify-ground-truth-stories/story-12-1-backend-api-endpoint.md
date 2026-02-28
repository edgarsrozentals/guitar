# Story 12.1: Backend API Endpoint for Chordify Import

**Epic:** Chordify Ground Truth Integration
**Priority:** P1 - High
**Size:** Medium
**Backend Required:** Yes

## User Story

As a user analyzing a song,
I want to import chord data from Chordify,
So that I can use it as ground truth for comparing detection accuracy.

## Technical Context

Chordify provides professionally-analyzed, beat-synchronized chord data that is publicly accessible in their HTML pages. We need to create a backend endpoint that scrapes this data and stores it alongside our AI-detected chords for comparison.

### Key Discovery

- **No authentication required** - Chord data is public in HTML
- **URL Pattern**: `https://chordify.net/chords/{artist}-songs/{song}-chords?version=youtube:{videoId}`
- **Data Format**: HTML elements with `data-handle="G:min"` and `data-i="0"` (beat index)
- **First Beat Offset**: Encoded as "N" (no chord) entries at song start

## Acceptance Criteria

### Successful Import

**Given** a valid YouTube video ID that exists on Chordify
**When** I call `POST /api/songs/:videoId/import-chordify`
**Then** the backend:
1. Searches Chordify for the video ID
2. Scrapes the Chordify page HTML
3. Extracts: chords with beat indices, BPM, key, time signature, duration
4. Calculates first beat offset from "N" entries
5. Calculates timestamps using: `time = (beatIndex × 60 / BPM)`
6. Stores the result in `songs-metadata.json` under `chordsByLibrary.chordify`
7. Returns 200 with the extracted chord data

### Song Not Found

**Given** a YouTube video that doesn't exist on Chordify
**When** I call the import endpoint
**Then** a 404 response is returned with message "Song not found on Chordify"

### Parse Error Handling

**Given** Chordify page structure changes unexpectedly
**When** parsing fails
**Then** a 500 response is returned with message "Failed to parse Chordify data"
**And** the error is logged with details for debugging

## Implementation Notes

### Files to Create

```
backend/src/chordify/
├── types.ts         # TypeScript types for Chordify data
├── scraper.ts       # HTML fetching and parsing
└── transformer.ts   # Convert Chordify format to our format
```

### Scraper Logic

```typescript
// 1. Search for video on Chordify
const searchUrl = `https://chordify.net/search/youtube:${videoId}`;

// 2. Extract song page URL from search results
// 3. Fetch song page HTML
// 4. Parse using cheerio:
//    - Chords: div[data-handle][data-i]
//    - BPM: <dt>bpm</dt><dd>97</dd>
//    - Key: <dt>Key</dt><dd>Gₘ</dd>
//    - Time Signature: class="chords barlength-4"
```

### First Beat Offset Calculation

```typescript
function calculateFirstBeatOffset(chords: RawChord[], bpm: number): number {
  const firstRealChordIndex = chords.findIndex(c => c.handle !== 'N');
  if (firstRealChordIndex <= 0) return 0;
  return firstRealChordIndex * (60 / bpm);
}
```

### Response Format

```json
{
  "success": true,
  "data": {
    "videoId": "YaMH_s7I7Mo",
    "source": "chordify",
    "metadata": {
      "bpm": 81,
      "key": { "root": "Eb", "quality": "major" },
      "timeSignature": { "beatsPerBar": 3 },
      "firstBeatOffset": 8.15
    },
    "chords": [
      { "time": 8.15, "chord": { "root": "Eb", "quality": "major" } },
      { "time": 8.89, "chord": { "root": "Eb", "quality": "maj7" } }
    ]
  }
}
```

### Dependencies

- `cheerio` - HTML parsing (add to package.json if not present)
- `node-fetch` or native fetch - HTTP requests

## Testing Checklist

- [ ] Successfully imports known song (e.g., youtube:yMNWC57yqNg)
- [ ] Correctly calculates first beat offset from "N" entries
- [ ] Handles 404 when song not found on Chordify
- [ ] Handles parse errors gracefully
- [ ] Stores data in songs-metadata.json correctly
- [ ] Chords appear in chordsByLibrary.chordify

## Definition of Done

- [ ] Endpoint `/api/songs/:videoId/import-chordify` implemented
- [ ] Chordify scraper extracts all required data
- [ ] First beat offset calculated from "N" entries
- [ ] Data stored in songs-metadata.json
- [ ] Error handling for missing songs and parse failures
- [ ] Manual testing with 2-3 different songs
