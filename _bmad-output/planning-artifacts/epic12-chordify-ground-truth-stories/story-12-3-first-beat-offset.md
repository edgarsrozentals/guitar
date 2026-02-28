# Story 12.3: Calculate First Beat Offset from Empty Bars

**Epic:** Chordify Ground Truth Integration
**Priority:** P1 - High
**Size:** Small
**Backend Required:** Yes
**Status:** Investigation Complete - Solution Confirmed

## User Story

As a developer,
I want to accurately determine when the first beat occurs in the video,
So that chord timestamps align correctly with playback.

## Technical Context

### Discovery Summary

Songs don't always start at 0:00 - there's often silence or intro before the music begins. Chordify handles this elegantly by using "N" (no chord) entries at the beginning.

**How Chordify encodes intro silence:**
```
data-i="0"  → data-handle="N"      ← intro silence
data-i="1"  → data-handle="N"      ← intro silence
...
data-i="10" → data-handle="N"      ← intro silence
data-i="11" → data-handle="Eb:maj" ← FIRST ACTUAL CHORD
```

### Verified Example

**Song:** Larry Carlton & Robben Ford - I Put A Spell On You
- Empty beats at start: 11 (indices 0-10 are "N")
- BPM: 81
- Time Signature: 3/4 (barlength-3)
- **Calculated Offset:** `11 × (60/81) = 8.15 seconds`

## Acceptance Criteria

### Song with Intro Silence

**Given** a song has silence at the beginning
**When** chords are extracted
**Then** the parser counts consecutive "N" (no chord) entries from beat index 0
**And** calculates `firstBeatOffset = firstNonEmptyBeatIndex × (60 / BPM)`
**And** stores this offset in the metadata

### Song with Immediate Start

**Given** a song starts immediately with music (no intro silence)
**When** chords are extracted
**Then** the first chord has `data-i="0"` and is NOT "N"
**And** `firstBeatOffset` is set to 0

### Timestamp Calculation

**Given** a first beat offset of 8.15 seconds and BPM of 81
**When** calculating chord timestamps
**Then** chord at beat index 11 has time = 8.15 seconds
**And** chord at beat index 12 has time = 8.89 seconds (8.15 + 60/81)

## Implementation Notes

### Core Function

```typescript
interface RawChord {
  handle: string;  // "G:min", "N", "Bb:maj"
  beatIndex: number;
}

function calculateFirstBeatOffset(chords: RawChord[], bpm: number): number {
  // Find first non-N chord
  const firstRealChordIndex = chords.findIndex(c => c.handle !== 'N');

  // If no N chords at start, or all N, offset is 0
  if (firstRealChordIndex <= 0) return 0;

  // Calculate time offset
  return firstRealChordIndex * (60 / bpm);
}
```

### Timestamp Calculation

```typescript
function calculateChordTimestamps(
  chords: RawChord[],
  bpm: number,
  firstBeatOffset: number
): ChordEvent[] {
  const beatDuration = 60 / bpm;

  return chords
    .filter(c => c.handle !== 'N')  // Exclude empty bars
    .map(c => ({
      time: c.beatIndex * beatDuration,  // Offset is implicit in beat index
      chord: parseChordHandle(c.handle),
    }));
}
```

### Important Note

The `firstBeatOffset` is **informational** - it tells us when music starts in the video. The actual chord timestamps are calculated from beat indices, which already account for the offset since beat 0 starts at video time 0.

**For playback sync:**
- Beat index 0 = video time 0:00 (even if it's silence)
- Beat index 11 = video time 8.15 seconds (first chord)

## Testing Checklist

- [ ] Correctly counts consecutive "N" entries from start
- [ ] Returns 0 offset when first chord is at index 0
- [ ] Calculates offset correctly with different BPMs
- [ ] Handles edge case: all "N" entries (instrumental break sections)
- [ ] firstBeatOffset stored in metadata

## Definition of Done

- [ ] `calculateFirstBeatOffset()` function implemented
- [ ] Offset calculation tested with known songs
- [ ] Offset stored in `tempo.firstBeatOffset` in metadata
- [ ] Documentation updated with offset discovery
