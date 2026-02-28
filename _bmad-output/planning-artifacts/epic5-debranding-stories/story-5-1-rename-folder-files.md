# Story 5.1: Rename Video Player Folder and Core Component Files

**Epic:** Platform-Neutral Branding
**Priority:** P2 - Medium
**Size:** Medium
**Backend Required:** No

## User Story

As a developer,
I want the youtube folder and files renamed to use platform-neutral naming,
So that the codebase does not reference specific video platforms.

## Technical Context

The current code structure contains platform-specific naming in the `/product/app/chords/youtube/` directory. This needs to be renamed to generic terms while maintaining all functionality.

## Acceptance Criteria

### Folder Rename

**Given** the folder `product/app/chords/youtube/` exists
**When** I rename the folder
**Then** it becomes `product/app/chords/video/`

### File Renames

**Given** files in the youtube folder
**When** I rename them to platform-neutral names
**Then** the following renames occur:

| Original | New |
|----------|-----|
| YouTubeChordPlayer.tsx | VideoChordPlayer.tsx |
| YouTubePlayer.tsx | VideoPlayer.tsx |
| YouTubeUrlInput.tsx | VideoUrlInput.tsx |
| hooks/useYouTubePlayer.ts | hooks/useVideoPlayer.ts |
| utils/parseYouTubeUrl.ts | utils/parseVideoUrl.ts |

### Import Updates

**Given** the files are renamed
**When** I update internal imports
**Then**:
- All imports within the video folder reference new file names
- The `index.ts` exports are updated to use new component names
- No broken imports within the folder

### Build Verification

**Given** all renames are complete
**When** I run build and type checks
**Then**:
- `yarn typecheck` passes with no errors
- `yarn lint` passes with no errors
- No import resolution failures

## Implementation Notes

### Step-by-Step Rename Process

```bash
# 1. Rename the folder
git mv product/app/chords/youtube product/app/chords/video

# 2. Rename the main files
cd product/app/chords/video
git mv YouTubeChordPlayer.tsx VideoChordPlayer.tsx
git mv YouTubePlayer.tsx VideoPlayer.tsx
git mv YouTubeUrlInput.tsx VideoUrlInput.tsx

# 3. Rename hook file
git mv hooks/useYouTubePlayer.ts hooks/useVideoPlayer.ts

# 4. Rename utility file
git mv utils/parseYouTubeUrl.ts utils/parseVideoUrl.ts
```

### Update index.ts Exports

```typescript
// product/app/chords/video/index.ts

// BEFORE
export { YouTubeChordPlayer } from './YouTubeChordPlayer';
export { YouTubePlayer } from './YouTubePlayer';
export { YouTubeUrlInput } from './YouTubeUrlInput';

// AFTER
export { VideoChordPlayer } from './VideoChordPlayer';
export { VideoPlayer } from './VideoPlayer';
export { VideoUrlInput } from './VideoUrlInput';
```

### Update Internal Imports in Files

```typescript
// VideoChordPlayer.tsx - update imports
// BEFORE
import { YouTubePlayer } from './YouTubePlayer';
import { YouTubeUrlInput } from './YouTubeUrlInput';
import { useYouTubePlayer } from './hooks/useYouTubePlayer';

// AFTER
import { VideoPlayer } from './VideoPlayer';
import { VideoUrlInput } from './VideoUrlInput';
import { useVideoPlayer } from './hooks/useVideoPlayer';
```

### Files to Update

1. **VideoChordPlayer.tsx**
   - Update imports from renamed files
   - Update hook usage

2. **VideoPlayer.tsx**
   - Update any internal references

3. **VideoUrlInput.tsx**
   - Update any internal references

4. **hooks/useVideoPlayer.ts**
   - Update any internal references

5. **utils/parseVideoUrl.ts**
   - Update any internal references

6. **index.ts**
   - Update all exports

### Verification Commands

```bash
# Check for any remaining references to old names
grep -r "YouTubeChordPlayer\|YouTubePlayer\|YouTubeUrlInput" product/app/chords/video/

# Run type checking
yarn typecheck

# Run linting
yarn lint

# Test the build
yarn build
```

## Regression Testing

After completing the renames:

1. Run `yarn dev` and verify the application loads without errors
2. Navigate to /chords and verify the video player section renders
3. Test that video URL input still accepts URLs
4. Verify no console errors related to imports

## Testing Checklist
- [ ] Folder renamed from youtube to video
- [ ] All 5 files renamed correctly
- [ ] index.ts exports updated
- [ ] All internal imports updated
- [ ] yarn typecheck passes
- [ ] yarn lint passes
- [ ] Application loads in dev mode
- [ ] Chord player page renders

## Dependencies
- Git for rename tracking
- No external dependencies

## Definition of Done
- [ ] All files renamed
- [ ] All imports updated within video folder
- [ ] Build passes without errors
- [ ] Type checking passes
- [ ] Lint passes
- [ ] Dev server runs correctly
- [ ] Changes committed with clear message