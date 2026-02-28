# Story 5.2: Update Component Names and Type Definitions

**Epic:** Platform-Neutral Branding
**Priority:** P2 - Medium
**Size:** Large
**Backend Required:** No

## User Story

As a developer,
I want all component names, type definitions, and function names updated to platform-neutral naming,
So that the internal code identifiers do not reference specific video platforms.

## Technical Context

After file renames in Story 5.1, the actual component names, type definitions, hooks, and function names inside the files still reference the old naming. This story updates all internal identifiers.

## Acceptance Criteria

### Component Renames

**Given** Story 5.1 is complete with files renamed
**When** I update component names
**Then** the following renames occur inside the files:

| Original | New |
|----------|-----|
| YouTubeChordPlayer | VideoChordPlayer |
| YouTubePlayer | VideoPlayer |
| YouTubeUrlInput | VideoUrlInput |

### Hook Renames

**Given** hooks have platform-specific names
**When** I update hook names
**Then**:
- `useYouTubePlayer` becomes `useVideoPlayer`
- All usages updated throughout codebase

### Type Definition Renames

**Given** types have platform-specific names
**When** I update type names
**Then**:

| Original | New |
|----------|-----|
| YouTubePlayerState | VideoPlayerState |
| YouTubePlayerControls | VideoPlayerControls |
| YouTubePlayerProps | VideoPlayerProps |
| YouTubeUrlInputProps | VideoUrlInputProps |
| YouTubeChordPlayerProps | VideoChordPlayerProps |

### Function Renames

**Given** utility functions have platform-specific names
**When** I update function names
**Then**:

| Original | New |
|----------|-----|
| parseYouTubeUrl | parseVideoUrl |
| getYouTubeThumbnail | getVideoThumbnail |
| loadYouTubeAPI | loadVideoAPI |

### Styled Component Renames

**Given** styled components have platform-specific names
**When** I update styled component names
**Then**:
- `YouTubeLink` becomes `VideoSourceLink`
- Any other platform-specific styled components renamed

### Callback Renames

**Given** callbacks have platform-specific names
**When** I update callback names
**Then**:
- `handleYouTubeSeek` becomes `handleVideoSeek`
- Any other platform-specific callbacks renamed

### External Import Updates

**Given** other files import from the video folder
**When** I update external imports
**Then**:
- `ChordsPage.tsx` imports from `./video` instead of `./youtube`
- All component references use new names
- No broken imports anywhere in codebase

### Build Verification

**Given** all renames are complete
**When** I run build and type checks
**Then**:
- `yarn typecheck` passes with no errors
- `yarn lint` passes with no errors

## Implementation Notes

### Component Name Updates

```typescript
// VideoChordPlayer.tsx
// BEFORE
export const YouTubeChordPlayer = ({ ... }: YouTubeChordPlayerProps) => {
  // ...
};

// AFTER
export const VideoChordPlayer = ({ ... }: VideoChordPlayerProps) => {
  // ...
};
```

### Type Definition Updates

```typescript
// types.ts or within components
// BEFORE
interface YouTubePlayerProps {
  videoId: string;
  onReady?: () => void;
  // ...
}

interface YouTubePlayerState {
  isPlaying: boolean;
  currentTime: number;
  // ...
}

// AFTER
interface VideoPlayerProps {
  videoId: string;
  onReady?: () => void;
  // ...
}

interface VideoPlayerState {
  isPlaying: boolean;
  currentTime: number;
  // ...
}
```

### Hook Updates

```typescript
// hooks/useVideoPlayer.ts
// BEFORE
export const useYouTubePlayer = (videoId: string): YouTubePlayerControls => {
  // ...
};

// AFTER
export const useVideoPlayer = (videoId: string): VideoPlayerControls => {
  // ...
};
```

### Utility Function Updates

```typescript
// utils/parseVideoUrl.ts
// BEFORE
export const parseYouTubeUrl = (url: string): string | null => {
  // ...
};

export const getYouTubeThumbnail = (videoId: string): string => {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
};

// AFTER
export const parseVideoUrl = (url: string): string | null => {
  // NOTE: Implementation still handles YouTube URLs
  // The function name is generic, but implementation is specific
  // ...
};

export const getVideoThumbnail = (videoId: string): string => {
  // Still uses YouTube thumbnail URL - implementation unchanged
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;
};
```

### Update ChordsPage.tsx

```typescript
// product/app/chords/ChordsPage.tsx
// BEFORE
import { YouTubeChordPlayer } from './youtube';

export const ChordsPage = () => {
  return (
    <Container>
      <YouTubeChordPlayer />
    </Container>
  );
};

// AFTER
import { VideoChordPlayer } from './video';

export const ChordsPage = () => {
  return (
    <Container>
      <VideoChordPlayer />
    </Container>
  );
};
```

### Search and Replace Commands

```bash
# Find all occurrences to rename
grep -rn "YouTubeChordPlayer" product/
grep -rn "YouTubePlayer" product/
grep -rn "YouTubeUrlInput" product/
grep -rn "useYouTubePlayer" product/
grep -rn "YouTubePlayerState" product/
grep -rn "YouTubePlayerControls" product/
grep -rn "YouTubePlayerProps" product/
grep -rn "parseYouTubeUrl" product/
grep -rn "getYouTubeThumbnail" product/
```

### Files to Update (Outside video folder)

1. **product/app/chords/ChordsPage.tsx**
   - Update import path and component usage

2. **Any test files referencing these components**
   - Update imports and references

3. **Any documentation or type export files**
   - Update references

## Regression Testing

After completing the renames:

1. Run `yarn dev` and navigate to /chords
2. Verify video URL input accepts and loads a video
3. Verify chord timeline and playback controls function correctly
4. Verify no TypeScript errors in IDE
5. Check browser console for any runtime errors

## Testing Checklist
- [ ] All component names updated inside files
- [ ] All type definitions renamed
- [ ] All hooks renamed
- [ ] All utility functions renamed
- [ ] All styled components renamed
- [ ] All callbacks renamed
- [ ] ChordsPage.tsx updated
- [ ] All external imports updated
- [ ] yarn typecheck passes
- [ ] yarn lint passes
- [ ] Video URL input works
- [ ] Chord timeline displays
- [ ] Playback controls work

## Dependencies
- Story 5.1 (File renames) complete
- IDE with find/replace capability

## Definition of Done
- [ ] All internal identifiers renamed
- [ ] All external usages updated
- [ ] No broken imports
- [ ] Type checking passes
- [ ] Lint passes
- [ ] Full functionality verified
- [ ] Changes committed