# Story 12.4: Parse Chord Sequence from HTML

**Epic:** Chordify Ground Truth Integration
**Priority:** P1 - High
**Size:** Medium
**Backend Required:** Yes

## User Story

As a developer,
I want to parse all chord elements from the Chordify HTML,
So that I can build a complete chord timeline for comparison.

## Technical Context

Chordify embeds chord data in HTML div elements with data attributes. Each beat has its own element, and consecutive identical chords need to be collapsed for efficient storage.

### HTML Structure

```html
<div id="chords" class="chords ch4b5h barlength-4">
  <div class="chord currentChord" data-handle="G:min" data-i="0">...</div>
  <div class="chord nolabel" data-handle="G:min" data-i="1">...</div>
  <div class="chord" data-handle="C:min" data-i="40">...</div>
</div>
```

## Acceptance Criteria

### Element Extraction

**Given** a Chordify page HTML
**When** parsing chord elements
**Then** all `<div>` elements with `data-handle` and `data-i` are extracted
**And** `data-handle` provides chord name (e.g., "G:min", "D:7", "Bb:maj", "N")
**And** `data-i` provides beat index (0, 1, 2, ...)

### Chord Format Transformation

**Given** chord data in Chordify format
**When** transforming to our format
**Then** the following conversions apply:

| Chordify | Our Format |
|----------|------------|
| `G:min` | `{ root: "G", quality: "minor" }` |
| `D:7` | `{ root: "D", quality: "7" }` |
| `Bb:maj` | `{ root: "Bb", quality: "major" }` |
| `A:min7` | `{ root: "A", quality: "min7" }` |
| `E:maj7` | `{ root: "E", quality: "maj7" }` |
| `F#:dim` | `{ root: "F#", quality: "dim" }` |
| `N` | Skip (no chord / silence) |

### Chord Collapsing

**Given** consecutive beats with the same chord
**When** building the chord timeline
**Then** only the first occurrence is stored with its timestamp
**And** data size is minimized

**Example:**
```typescript
// Input (from HTML):
[
  { handle: "G:min", beatIndex: 0 },
  { handle: "G:min", beatIndex: 1 },  // Same as previous - skip
  { handle: "G:min", beatIndex: 2 },  // Same as previous - skip
  { handle: "C:min", beatIndex: 40 }, // New chord - keep
  { handle: "C:min", beatIndex: 41 }, // Same as previous - skip
]

// Output:
[
  { time: 0.00, chord: { root: "G", quality: "minor" } },
  { time: 24.74, chord: { root: "C", quality: "minor" } },
]
```

## Implementation Notes

### Cheerio Selector

```typescript
import * as cheerio from 'cheerio';

function parseChords($: cheerio.CheerioAPI): RawChord[] {
  const chords: RawChord[] = [];

  $('[data-handle][data-i]').each((_, el) => {
    const $el = $(el);
    chords.push({
      handle: $el.attr('data-handle')!,
      beatIndex: parseInt($el.attr('data-i')!, 10),
    });
  });

  // Sort by beat index (should already be sorted, but ensure)
  return chords.sort((a, b) => a.beatIndex - b.beatIndex);
}
```

### Chord Handle Parser

```typescript
function parseChordHandle(handle: string): { root: string; quality: string } | null {
  // Skip "N" (no chord)
  if (handle === 'N') return null;

  // Format: "Root:Quality" e.g., "G:min", "Bb:maj7"
  const [root, quality] = handle.split(':');

  // Map Chordify quality names to our format
  const qualityMap: Record<string, string> = {
    'maj': 'major',
    'min': 'minor',
    '7': '7',
    'maj7': 'maj7',
    'min7': 'min7',
    'dim': 'dim',
    'aug': 'aug',
    'sus4': 'sus4',
    'sus2': 'sus2',
    // Add more as discovered
  };

  return {
    root,
    quality: qualityMap[quality] || quality,
  };
}
```

### Collapse Consecutive Chords

```typescript
function collapseChords(
  rawChords: RawChord[],
  bpm: number
): ChordEvent[] {
  const beatDuration = 60 / bpm;
  const result: ChordEvent[] = [];
  let lastHandle: string | null = null;

  for (const raw of rawChords) {
    // Skip "N" and consecutive duplicates
    if (raw.handle === 'N') continue;
    if (raw.handle === lastHandle) continue;

    const parsed = parseChordHandle(raw.handle);
    if (parsed) {
      result.push({
        time: raw.beatIndex * beatDuration,
        chord: parsed,
      });
      lastHandle = raw.handle;
    }
  }

  return result;
}
```

### Extended Chord Types

Chordify uses extended chord vocabulary. Common types observed:

- Basic: `maj`, `min`, `7`, `dim`, `aug`
- Extended: `maj7`, `min7`, `7sus4`, `add9`
- Slash: May appear as `G:min/Bb` (bass note)

## Testing Checklist

- [ ] All chord elements extracted from HTML
- [ ] Beat indices parsed correctly
- [ ] Chord handles parsed into root + quality
- [ ] "N" entries filtered out
- [ ] Consecutive duplicates collapsed
- [ ] Timestamps calculated from beat index and BPM
- [ ] Extended chord types handled (maj7, min7, etc.)
- [ ] Flat/sharp roots preserved (Bb, F#)

## Definition of Done

- [ ] Chord parsing extracts all elements
- [ ] Chordify notation converted to our format
- [ ] Consecutive duplicates collapsed
- [ ] "N" entries handled (filtered from output)
- [ ] Edge cases handled (slash chords, extended types)
- [ ] Unit tests for chord parsing
