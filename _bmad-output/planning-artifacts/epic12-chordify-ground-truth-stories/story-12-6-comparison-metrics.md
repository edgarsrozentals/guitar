# Story 12.6: Comparison Metrics Dashboard

**Epic:** Chordify Ground Truth Integration
**Priority:** P3 - Nice to Have
**Size:** Large
**Backend Required:** Partial (can be frontend-only initially)

## User Story

As a developer/user,
I want to see quantitative comparison between AI detections and Chordify,
So that I can measure and improve detection accuracy.

## Technical Context

With Chordify as ground truth, we can now calculate objective accuracy metrics for our AI chord detection libraries. This enables:
- Benchmarking different libraries
- Identifying systematic detection errors
- Improving our models over time

## Acceptance Criteria

### Metrics Display

**Given** both Chordify and at least one AI library have chords for a song
**When** I view the comparison panel
**Then** I see the following metrics:

| Metric | Description |
|--------|-------------|
| **Overall Agreement** | % of beats where chords match exactly |
| **Root Accuracy** | % correct root note (ignoring quality) |
| **Quality Accuracy** | % correct quality when root matches |
| **Timing Offset** | Average time difference at chord changes |

### Per-Library Comparison

**Given** multiple AI libraries have analyzed the song
**When** viewing the comparison panel
**Then** I see a table comparing each library to Chordify:

| Library | Agreement | Root Acc | Quality Acc |
|---------|-----------|----------|-------------|
| Essentia | 72% | 85% | 84% |
| Madmom | 78% | 89% | 87% |
| BTC | 65% | 82% | 79% |

### Mismatch Highlighting

**Given** I'm viewing the chord timeline with comparison enabled
**When** there's a mismatch between Chordify and selected library
**Then** mismatched sections are highlighted (e.g., red underline)
**And** hovering shows: "Chordify: Cm | Essentia: C"

### Beat-Level Detail

**Given** I click on a specific time in the comparison view
**When** there's a mismatch
**Then** I see:
- What Chordify detected
- What each AI library detected
- The time range of the discrepancy

## Implementation Notes

### Comparison Algorithm

```typescript
interface ComparisonResult {
  totalBeats: number;
  matchingBeats: number;
  rootMatches: number;
  qualityMatches: number;
  mismatches: Mismatch[];
}

interface Mismatch {
  time: number;
  groundTruth: ChordEvent;
  detected: ChordEvent;
  rootMatch: boolean;
  qualityMatch: boolean;
}

function compareChords(
  groundTruth: ChordEvent[],  // Chordify
  detected: ChordEvent[],      // AI library
  bpm: number
): ComparisonResult {
  const beatDuration = 60 / bpm;
  // Sample at each beat and compare
  // ...
}
```

### Root Comparison

```typescript
function rootsMatch(a: string, b: string): boolean {
  // Handle enharmonic equivalents
  const normalize = (root: string) => {
    const enharmonic: Record<string, string> = {
      'Db': 'C#', 'Eb': 'D#', 'Gb': 'F#', 'Ab': 'G#', 'Bb': 'A#',
    };
    return enharmonic[root] || root;
  };
  return normalize(a) === normalize(b);
}
```

### Quality Comparison

```typescript
function qualitiesMatch(a: string, b: string): boolean {
  // Normalize quality names
  const normalize = (q: string) => {
    const aliases: Record<string, string> = {
      'major': 'maj',
      'minor': 'min',
      'dominant7': '7',
      // ...
    };
    return aliases[q] || q;
  };
  return normalize(a) === normalize(b);
}
```

### UI Components

1. **ChordComparison.tsx** - Main comparison dashboard
2. **AccuracyMetrics.tsx** - Display accuracy percentages
3. **MismatchTimeline.tsx** - Visual diff of chord changes

### File Locations

```
product/app/chords/youtube/
├── ChordComparison.tsx      # New component
├── AccuracyMetrics.tsx      # New component

product/core/chords/
├── compareChords.ts         # Comparison logic
```

## Future Enhancements

- Export comparison report as CSV/JSON
- Aggregate statistics across multiple songs
- Confusion matrix (which chords are commonly misdetected)
- Time-alignment analysis

## Testing Checklist

- [ ] Metrics calculate correctly for matching chords
- [ ] Metrics calculate correctly with mismatches
- [ ] Handles enharmonic equivalents (C# = Db)
- [ ] Per-library comparison table renders
- [ ] Mismatch highlighting works on timeline
- [ ] Beat-level detail popup shows correct info

## Definition of Done

- [ ] Comparison algorithm implemented
- [ ] Metrics displayed in UI
- [ ] Per-library comparison table
- [ ] Mismatch highlighting on timeline
- [ ] Tested with real song data
- [ ] Performance acceptable (no lag on long songs)
