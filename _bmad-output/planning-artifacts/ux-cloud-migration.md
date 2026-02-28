# UX Design Document - Cloud Migration Features

**Project:** Guitar Practice App
**Version:** 1.0
**Date:** 2026-01-03
**Status:** Draft

---

## 1. Overview

This document defines the UX patterns for the cloud migration features, building on existing component patterns established in the codebase.

### 1.1 Design Principles (Inherited)

| Principle | Implementation |
|-----------|----------------|
| **Dark-first** | Dark theme default, light theme supported |
| **Functional over decorative** | Utility-focused UI, minimal decoration |
| **Information density** | Show relevant data, hide when not needed |
| **Keyboard accessible** | All actions reachable via keyboard |

### 1.2 Existing Design Tokens

From `@lib/ui/theme`:
- **Colors:** `background`, `foreground`, `primary`, `alert`, `success`, `mist`, `textSupporting`
- **Spacing:** `gap` utility (4, 8, 12, 16, 20, 24, 32px)
- **Border radius:** 8px (standard), 12px (cards), 16px (modals)
- **Typography:** System fonts, sizes via `Text` component

---

## 2. Existing Component Inventory

### 2.1 Layout Components (`@lib/ui`)

| Component | Usage |
|-----------|-------|
| `VStack`, `HStack` | Flex containers with gap |
| `PageContainer` | Page wrapper with max-width |
| `Panel`, `ExpandablePanel` | Content sections |
| `Modal`, `ConfirmModal` | Dialogs and confirmations |

### 2.2 Input Components

| Component | Usage |
|-----------|-------|
| `Input`, `textInput` | Text inputs (CSS mixin available) |
| `Button`, `IconButton` | Action buttons |
| `Select`, custom styled | Dropdowns |
| `InvisibleHTMLCheckbox` | Custom checkboxes |

### 2.3 State Display Components

| Component | Usage |
|-----------|-------|
| `Text` | Typography with color props |
| `CheckStatus` | Checkbox indicator |
| `Spinner` (via loaders) | Loading state |

### 2.4 Domain Components (Product)

| Component | Location | Pattern |
|-----------|----------|---------|
| `SongItem` | `product/app/songs/` | List item with checkbox |
| `SongItemFrame` | `product/app/songs/` | Item container |
| `LyricsEmptyState` | `product/app/chords/lyrics/` | Empty state pattern |
| `LyricsLoadingState` | `product/app/chords/lyrics/` | Loading state pattern |
| `LyricsErrorState` | `product/app/chords/lyrics/` | Error state pattern |

---

## 3. New Components: Library Page

### 3.1 Library Page Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  [← Back]              My Song Library              [+ Add Song] │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐  [Grid] [List]  [Filter]│
│  │ 🔍 Search songs...                  │                         │
│  └─────────────────────────────────────┘                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │  Song 1  │  │  Song 2  │  │  Song 3  │  │  Song 4  │         │
│  │  ♪ ▶     │  │  ♪ ▶     │  │  ♪ ▶     │  │  ⏳ ...  │         │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘         │
│                                                                   │
│  ┌──────────┐  ┌──────────┐                                      │
│  │  Song 5  │  │  Song 6  │                                      │
│  │  ♪ ▶     │  │  ♪ ▶     │                                      │
│  └──────────┘  └──────────┘                                      │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 SongCard Component

New component for grid view of user's songs.

```typescript
// Wireframe structure
<SongCard>
  <CardThumbnail>
    {hasThumbnail ? <img /> : <MusicNoteIcon />}
    <StatusBadge status={song.status} />
  </CardThumbnail>
  <CardContent>
    <SongTitle>{song.title}</SongTitle>
    <SongArtist>{song.artist || 'Unknown'}</SongArtist>
    <SongMeta>
      <Duration>{formatDuration(song.duration)}</Duration>
      {song.key && <Key>{song.key}</Key>}
      <FeatureIcons>
        {song.hasStems && <StemIcon />}
        {song.hasLyrics && <LyricsIcon />}
      </FeatureIcons>
    </SongMeta>
  </CardContent>
  <CardActions>
    <PlayButton />
    <MoreMenu>
      <DeleteOption />
      <AnalyzeOption />
    </MoreMenu>
  </CardActions>
</SongCard>
```

**Styling:**
```css
/* Card container */
background: var(--color-background);
border: 1px solid var(--color-mist);
border-radius: 12px;
padding: 12px;
transition: border-color 0.2s;

/* Hover state */
&:hover {
  border-color: var(--color-primary);
}

/* Grid layout */
display: grid;
grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
gap: 16px;
```

### 3.3 SongListItem Component

List view alternative (extends existing `SongItemFrame` pattern).

```
┌─────────────────────────────────────────────────────────────────┐
│ [🎵]  Song Title - Artist          3:45  Am  [♪][📝]  [▶] [⋮] │
└─────────────────────────────────────────────────────────────────┘
```

**States:**
- Default: Normal display
- Hover: Highlight background, show actions
- Processing: Pulsing status indicator, disabled actions
- Error: Red border, error icon, retry action

### 3.4 LibraryEmptyState

When user has no songs.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                   │
│                     🎸                                            │
│                                                                   │
│              Your library is empty                                │
│                                                                   │
│     Add your first song by pasting a video URL above,            │
│     or try one of our demo songs to see how it works.            │
│                                                                   │
│           [+ Add Your First Song]    [Try Demo Songs]             │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 3.5 Search & Filter Bar

```typescript
<SearchFilterBar>
  <SearchInput
    placeholder="Search by title or artist..."
    icon={<SearchIcon />}
  />
  <FilterDropdown>
    <option value="all">All Songs</option>
    <option value="ready">Ready to Play</option>
    <option value="processing">Processing</option>
    <option value="with-stems">With Stems</option>
    <option value="with-lyrics">With Lyrics</option>
  </FilterDropdown>
  <ViewToggle>
    <IconButton icon={<GridIcon />} active={view === 'grid'} />
    <IconButton icon={<ListIcon />} active={view === 'list'} />
  </ViewToggle>
</SearchFilterBar>
```

---

## 4. New Components: Demo Song Picker

### 4.1 Demo Page Layout

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                   │
│                    🎸 Try It Out                                 │
│                                                                   │
│     Explore chord detection and practice tools with              │
│     these pre-analyzed songs. No account required!               │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  🎵 Demo Song 1 │  │  🎵 Demo Song 2 │  │  🎵 Demo Song 3 │  │
│  │                 │  │                 │  │                 │  │
│  │  "Song Title"   │  │  "Song Title"   │  │  "Song Title"   │  │
│  │   by Artist     │  │   by Artist     │  │   by Artist     │  │
│  │                 │  │                 │  │                 │  │
│  │  Am • 120 BPM   │  │  G  • 95 BPM    │  │  Em • 140 BPM   │  │
│  │  ♪ 📝          │  │  ♪              │  │  ♪ 📝          │  │
│  │                 │  │                 │  │                 │  │
│  │  [  Try It  ]   │  │  [  Try It  ]   │  │  [  Try It  ]   │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│     Ready to practice your own songs?                            │
│                                                                   │
│              [ Create Free Account ]                              │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 DemoSongCard Component

Larger, more visual card for demo songs (marketing context).

```typescript
<DemoSongCard>
  <DemoThumbnail>
    <WaveformVisual /> {/* or album art placeholder */}
  </DemoThumbnail>
  <DemoContent>
    <DemoTitle>{song.title}</DemoTitle>
    <DemoArtist>by {song.artist}</DemoArtist>
    <DemoMeta>
      <KeyBadge>{song.key}</KeyBadge>
      <BpmBadge>{song.bpm} BPM</BpmBadge>
    </DemoMeta>
    <DemoFeatures>
      {song.hasStems && <FeatureBadge>Stems</FeatureBadge>}
      {song.hasLyrics && <FeatureBadge>Lyrics</FeatureBadge>}
    </DemoFeatures>
    <DemoDescription>{song.description}</DemoDescription>
  </DemoContent>
  <TryItButton>Try It →</TryItButton>
</DemoSongCard>
```

**Styling:**
```css
/* Larger card for marketing context */
background: linear-gradient(
  135deg,
  var(--color-background) 0%,
  var(--color-mist) 100%
);
border-radius: 16px;
padding: 24px;
min-height: 280px;

/* CTA button */
.try-it-button {
  width: 100%;
  background: var(--color-primary);
  color: var(--color-background);
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
}
```

### 4.3 Demo Player Restrictions

When playing demo songs, certain features are disabled:

| Feature | Demo Mode | Signed In |
|---------|-----------|-----------|
| Play/pause | ✅ | ✅ |
| Seek | ✅ | ✅ |
| Speed control | ✅ | ✅ |
| Stem mixer | ✅ (if available) | ✅ |
| Chord display | ✅ | ✅ |
| Save to library | ❌ (CTA shown) | ✅ |
| Re-analyze | ❌ | ✅ |
| Delete | ❌ | ✅ |

**Disabled Feature CTA:**
```
┌─────────────────────────────────────────┐
│  🔒 Save to your library                │
│                                          │
│  Create a free account to save songs    │
│  and access your personal library.      │
│                                          │
│  [ Sign Up Free ]                        │
└─────────────────────────────────────────┘
```

---

## 5. Status Indicators

### 5.1 Song Status Badge

Visual indicator for song processing status.

| Status | Badge | Color | Icon |
|--------|-------|-------|------|
| `processing` | "Processing..." | `textSupporting` | Spinner |
| `ready` | (none - default) | - | - |
| `error` | "Error" | `alert` | ⚠️ |
| `analyzing` | "Analyzing..." | `primary` | Spinner |

```typescript
<StatusBadge status="processing">
  <Spinner size={12} />
  <span>Processing...</span>
</StatusBadge>
```

**Styling:**
```css
/* Base badge */
display: inline-flex;
align-items: center;
gap: 4px;
padding: 2px 8px;
border-radius: 4px;
font-size: 11px;
font-weight: 500;

/* Processing */
&.processing {
  background: var(--color-mist);
  color: var(--color-textSupporting);
}

/* Error */
&.error {
  background: rgba(var(--color-alert-rgb), 0.1);
  color: var(--color-alert);
}

/* Analyzing */
&.analyzing {
  background: rgba(var(--color-primary-rgb), 0.1);
  color: var(--color-primary);
}
```

### 5.2 Feature Badges

Small indicators for song features.

```
[♪ Stems]  [📝 Lyrics]  [🎯 3 analyses]
```

**Styling:**
```css
display: inline-flex;
align-items: center;
gap: 4px;
padding: 2px 6px;
border-radius: 4px;
font-size: 10px;
background: var(--color-mist);
color: var(--color-textSupporting);
```

### 5.3 Analysis Progress Indicator

For long-running chord analysis operations.

```
┌─────────────────────────────────────────┐
│  Analyzing with Essentia...             │
│  ████████████░░░░░░░░░░░░  45%         │
│                                          │
│  Detecting chords and key...            │
└─────────────────────────────────────────┘
```

---

## 6. Interaction Patterns

### 6.1 Delete Confirmation

Uses existing `ConfirmModal` pattern from `@lib/ui/modal`.

```
┌─────────────────────────────────────────┐
│  Delete "Song Title"?                   │
│                                          │
│  This will permanently delete the song  │
│  and all associated data (chords,       │
│  stems, lyrics).                         │
│                                          │
│  This action cannot be undone.          │
│                                          │
│           [ Cancel ]  [ Delete ]         │
└─────────────────────────────────────────┘
```

### 6.2 Toast Notifications

For async operation feedback.

| Action | Toast |
|--------|-------|
| Song deleted | "Song deleted successfully" |
| Analysis complete | "Chord analysis complete" |
| Analysis failed | "Analysis failed. Tap to retry." |
| Upload started | "Processing your song..." |

### 6.3 Loading States

**Page loading:**
- Show skeleton cards (3-6 placeholder cards)
- Animate with subtle pulse

**Song loading:**
- Card shows processing spinner
- Disable click/hover until ready

---

## 7. Responsive Breakpoints

| Breakpoint | Grid Columns | Notes |
|------------|--------------|-------|
| < 480px | 1 | Full width cards |
| 480-768px | 2 | Compact layout |
| 768-1024px | 3 | Default layout |
| > 1024px | 4 | Wide layout |

**Mobile considerations:**
- Touch-friendly tap targets (min 44px)
- Swipe actions for delete (optional, v2)
- Bottom sheet for song actions menu

---

## 8. Accessibility

### 8.1 Keyboard Navigation

| Key | Action |
|-----|--------|
| Tab | Navigate between cards/items |
| Enter | Open/play selected song |
| Delete | Open delete confirmation (if focused) |
| Escape | Close modals, clear search |

### 8.2 Screen Reader

- Cards announce: "{title} by {artist}, {duration}, {status}"
- Status changes announced via aria-live
- Modal focus trapped correctly

### 8.3 Color Contrast

- All text meets WCAG AA (4.5:1 for normal, 3:1 for large)
- Status colors have icon backup (not color-only)

---

## 9. Implementation Priority

| Component | Priority | Complexity | Stories |
|-----------|----------|------------|---------|
| StatusBadge | P0 | Small | 3.2 |
| SongCard | P0 | Medium | 3.1 |
| LibraryEmptyState | P1 | Small | 3.1 |
| SearchFilterBar | P1 | Medium | 3.3 |
| DemoSongCard | P1 | Medium | 4.3 |
| ViewToggle | P2 | Small | 3.1 |
| DeleteConfirmation | P1 | Small | 3.4 |

---

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-01-03 | Initial UX document for cloud migration features |
