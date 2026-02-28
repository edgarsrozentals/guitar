# Story 12.5: Frontend Integration - Chordify as Comparison Source

**Epic:** Chordify Ground Truth Integration
**Priority:** P2 - Medium
**Size:** Medium
**Backend Required:** No (frontend only)

## User Story

As a user viewing chord analysis,
I want to see Chordify data alongside AI-detected chords,
So that I can compare accuracy and identify discrepancies.

## Technical Context

The existing chord player UI supports multiple chord libraries (Essentia, Madmom, BTC). We need to add Chordify as a new library option with special "ground truth" designation.

## Acceptance Criteria

### Import Button

**Given** I'm on the chord player page for a song
**When** I look at the Chords tab
**Then** I see an "Import from Chordify" button

**When** I click "Import from Chordify"
**Then** a loading indicator shows while fetching
**And** on success, a toast confirms "Chordify chords imported"
**And** "Chordify" appears in the library selector
**And** on failure, an error toast explains the issue

### Library Selection

**Given** Chordify chords are imported for a song
**When** I select "Chordify" from the library dropdown
**Then** the chord timeline displays Chordify's chords
**And** the fretboard shows Chordify's detected chord at current playback position

### Ground Truth Indicator

**Given** I'm viewing the library selector
**When** Chordify is available
**Then** it has a distinct visual indicator (badge, color, or icon)
**And** tooltip explains "Human-verified ground truth from Chordify"

### Library Comparison

**Given** multiple libraries have analyzed the song
**When** viewing the Chords tab
**Then** I can switch between Essentia, Madmom, BTC, and Chordify
**And** playback position syncs across all views

## Implementation Notes

### UI Components to Modify

1. **ChordAnalysisPanel.tsx** - Add Import button
2. **LibrarySelector.tsx** - Add Chordify option with badge

### Import Button Component

```tsx
function ImportChordifyButton({ videoId }: { videoId: string }) {
  const [loading, setLoading] = useState(false);

  const handleImport = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/songs/${videoId}/import-chordify`,
        { method: 'POST' }
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }
      toast.success('Chordify chords imported');
      // Trigger refetch of song data
    } catch (err) {
      toast.error(`Import failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button onClick={handleImport} disabled={loading}>
      {loading ? <Spinner /> : 'Import from Chordify'}
    </Button>
  );
}
```

### Library Selector Enhancement

```tsx
const LIBRARY_CONFIG = {
  essentia: { name: 'Essentia', color: '#4CAF50' },
  madmom: { name: 'Madmom', color: '#2196F3' },
  btc: { name: 'BTC', color: '#FF9800' },
  chordify: {
    name: 'Chordify',
    color: '#9C27B0',
    badge: 'Ground Truth',
    icon: '✓',
  },
};
```

### Styling

- Chordify library gets a distinct color (purple suggested)
- "Ground Truth" badge or checkmark icon
- Slightly different styling to stand out as reference

## Testing Checklist

- [ ] Import button appears in Chords tab
- [ ] Loading state shows during import
- [ ] Success toast on successful import
- [ ] Error toast with message on failure
- [ ] Chordify appears in library selector after import
- [ ] Selecting Chordify updates chord timeline
- [ ] Fretboard syncs with Chordify chords
- [ ] Ground truth badge/indicator visible

## Definition of Done

- [ ] Import button added to ChordAnalysisPanel
- [ ] Button triggers POST to /api/songs/:videoId/import-chordify
- [ ] Loading and error states handled
- [ ] Chordify added to LibrarySelector with distinct styling
- [ ] Ground truth indicator visible
- [ ] Chord timeline and fretboard work with Chordify data
