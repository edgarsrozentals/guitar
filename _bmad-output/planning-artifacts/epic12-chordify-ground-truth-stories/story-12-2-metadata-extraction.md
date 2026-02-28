# Story 12.2: Extract Song Metadata (BPM, Key, Time Signature)

**Epic:** Chordify Ground Truth Integration
**Priority:** P1 - High
**Size:** Small
**Backend Required:** Yes

## User Story

As a developer,
I want to extract all available metadata from Chordify,
So that we have comprehensive song information for analysis and display.

## Technical Context

Chordify provides rich metadata in the HTML that we can extract alongside chord data. This metadata is valuable for:
- Validating our own BPM/key detection
- Displaying accurate song information
- Understanding time signature for beat grid alignment

## Acceptance Criteria

### Metadata Extraction

**Given** a Chordify page is scraped
**When** metadata extraction runs
**Then** the following fields are extracted and stored:

| Field | HTML Source | Output Format |
|-------|------------|---------------|
| BPM | `<dt>bpm</dt><dd>97</dd>` | `number` |
| Key | `<dt>Key</dt><dd>Gₘ</dd>` | `{ root: "G", quality: "minor" }` |
| Time Signature | `class="chords barlength-4"` | `{ beatsPerBar: 4 }` |
| Duration | Timeline `06:17` | `number` (seconds) |
| Title | Page title / metadata | `string` |
| Artist | Artist link text | `string` |

### Key Parsing

**Given** key displayed as "Gₘ"
**When** parsing the key
**Then** output is `{ root: "G", quality: "minor" }`

**Given** key displayed as "B♭"
**When** parsing the key
**Then** output is `{ root: "Bb", quality: "major" }`

### Time Signature Detection

**Given** chord container has `class="chords barlength-4"`
**When** extracting time signature
**Then** `{ beatsPerBar: 4 }` is stored (implies 4/4 time)

**Given** chord container has `class="chords barlength-3"`
**When** extracting time signature
**Then** `{ beatsPerBar: 3 }` is stored (implies 3/4 time)

## Implementation Notes

### HTML Selectors

```typescript
// Metadata from definition list
const metadataSelectors = {
  bpm: 'dt:contains("bpm") + dd',
  key: 'dt:contains("Key") + dd',
  artist: 'dt:contains("Artist") + dd a',
  title: 'dt:contains("Title") + dd',
};

// Time signature from chord container
const timeSignatureSelector = '#chords';
// Extract barlength-X from class attribute
```

### Key Notation Mapping

```typescript
const keyNotationMap: Record<string, { root: string; quality: string }> = {
  'Gₘ': { root: 'G', quality: 'minor' },
  'G': { root: 'G', quality: 'major' },
  'B♭': { root: 'Bb', quality: 'major' },
  'B♭ₘ': { root: 'Bb', quality: 'minor' },
  // Handle subscript 'm' for minor, '♭' for flat, '♯' for sharp
};

function parseKey(keyText: string): { root: string; quality: string } {
  const isMinor = keyText.includes('ₘ') || keyText.includes('m');
  const root = keyText
    .replace('ₘ', '')
    .replace('m', '')
    .replace('♭', 'b')
    .replace('♯', '#');
  return { root, quality: isMinor ? 'minor' : 'major' };
}
```

### Duration Parsing

```typescript
// Parse "06:17" to seconds
function parseDuration(durationText: string): number {
  const [minutes, seconds] = durationText.split(':').map(Number);
  return minutes * 60 + seconds;
}
```

## Testing Checklist

- [ ] BPM extracted correctly
- [ ] Key parsed with correct root and quality
- [ ] Minor keys detected (ₘ subscript)
- [ ] Flat/sharp notes converted (♭ → b, ♯ → #)
- [ ] Time signature extracted from barlength class
- [ ] Duration converted to seconds
- [ ] Artist and title extracted

## Definition of Done

- [ ] All metadata fields extracted from Chordify HTML
- [ ] Key notation properly parsed (minor, flats, sharps)
- [ ] Time signature detected from CSS class
- [ ] Metadata stored in songs-metadata.json
- [ ] Tested with songs in different keys and time signatures
