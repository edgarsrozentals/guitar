# Story 5.4: Update Documentation and Verify Complete Branding Migration

**Epic:** Platform-Neutral Branding
**Priority:** P2 - Medium
**Size:** Medium
**Backend Required:** No

## User Story

As a developer,
I want documentation updated to reflect the platform-neutral architecture,
So that future developers understand the current component structure.

## Technical Context

This story updates all project documentation (CLAUDE.md, README, inline docs) and performs a final verification that all platform-specific references have been properly migrated.

## Acceptance Criteria

### CLAUDE.md Updates

**Given** Stories 5.1, 5.2, and 5.3 are complete
**When** I update the CLAUDE.md documentation
**Then**:
- "YouTube Chord Detection System" section renamed to "Video Chord Detection System"
- References to `/chords/youtube` page updated or clarified
- "Key Files" section updates paths from `product/app/chords/youtube/` to `product/app/chords/video/`
- `YouTubeChordPlayer.tsx` reference updated to `VideoChordPlayer.tsx`
- `YouTubePlayer` component reference updated to `VideoPlayer`

### Other Documentation Updates

**Given** markdown files in the project reference old naming
**When** I update them
**Then**:
- Any README files referencing YouTube components are updated
- API documentation reflects new naming
- Architecture documents updated if present

### Icon Files Unchanged

**Given** icon files exist for specific platforms
**When** reviewing what to keep
**Then**:
- `lib/ui/icons/YouTubeIcon.tsx` remains unchanged (legitimate platform icon)
- `YouTubeColoredIcon.tsx` remains unchanged (legitimate platform icon)
- These are actual brand icons, not component naming issues

### Code Verification

**Given** all renaming is complete
**When** running verification commands
**Then**:
- `grep -r "YouTubeChordPlayer\|YouTubePlayer\|YouTubeUrlInput" product/` returns no results
- `grep -r "YouTube" product/app/chords/` returns only:
  - Comments explaining the underlying API implementation
  - Actual YouTube URLs used in the implementation
- No component or type names contain "YouTube"

### Full Build Verification

**Given** all changes are complete
**When** running the full build
**Then**:
- `yarn build` completes successfully
- `yarn typecheck` passes with no errors
- No warnings related to imports or missing files

### End-to-End Verification

**Given** the build passes
**When** testing the application
**Then**:
- Load video URL, analyze chords, play with timeline sync
- Stem separation and backing track analysis still function
- Lyrics sync feature still functions
- No console errors or warnings

## Implementation Notes

### CLAUDE.md Changes

```markdown
## Video Chord Detection System

### Overview

The `/chords` page allows users to load videos, detect chords using multiple libraries, and visualize them on a timeline synchronized with the video.

### Key Files

- `product/app/chords/video/VideoChordPlayer.tsx` - Main component
- `product/app/chords/video/ChordTimeline.tsx` - Timeline visualization
- `product/app/chords/video/VideoPlayer.tsx` - Video playback component
- `product/app/chords/video/hooks/useVideoPlayer.ts` - Player hook
```

### Verification Script

```bash
#!/bin/bash
# scripts/verify-debranding.sh

echo "🔍 Verifying platform-neutral branding..."

# Check for old component names in product folder
echo -e "\n📁 Checking for old component names in product/..."
OLD_NAMES=$(grep -r "YouTubeChordPlayer\|YouTubePlayer\|YouTubeUrlInput\|useYouTubePlayer" product/ --include="*.ts" --include="*.tsx" | grep -v "// " | wc -l)

if [ "$OLD_NAMES" -gt 0 ]; then
  echo "❌ Found old component names:"
  grep -r "YouTubeChordPlayer\|YouTubePlayer\|YouTubeUrlInput\|useYouTubePlayer" product/ --include="*.ts" --include="*.tsx"
  exit 1
else
  echo "✓ No old component names found"
fi

# Check for YouTube references in chords folder (excluding comments and URLs)
echo -e "\n📁 Checking for YouTube references in product/app/chords/..."
grep -r "YouTube" product/app/chords/ --include="*.ts" --include="*.tsx" | while read line; do
  # Allow comments and URLs
  if echo "$line" | grep -qE "^\s*//" || echo "$line" | grep -qE "youtube\.com|img\.youtube\.com"; then
    continue
  fi
  echo "⚠️  Check: $line"
done

# Verify files exist in new location
echo -e "\n📁 Verifying new file structure..."
FILES_TO_CHECK=(
  "product/app/chords/video/VideoChordPlayer.tsx"
  "product/app/chords/video/VideoPlayer.tsx"
  "product/app/chords/video/VideoUrlInput.tsx"
  "product/app/chords/video/hooks/useVideoPlayer.ts"
  "product/app/chords/video/utils/parseVideoUrl.ts"
)

for file in "${FILES_TO_CHECK[@]}"; do
  if [ -f "$file" ]; then
    echo "✓ $file exists"
  else
    echo "❌ $file missing!"
    exit 1
  fi
done

# Verify old folder doesn't exist
if [ -d "product/app/chords/youtube" ]; then
  echo "❌ Old folder product/app/chords/youtube still exists!"
  exit 1
else
  echo "✓ Old youtube folder removed"
fi

# Run type check
echo -e "\n🔧 Running type check..."
yarn typecheck
if [ $? -eq 0 ]; then
  echo "✓ Type check passed"
else
  echo "❌ Type check failed!"
  exit 1
fi

# Run build
echo -e "\n🔧 Running build..."
yarn build
if [ $? -eq 0 ]; then
  echo "✓ Build passed"
else
  echo "❌ Build failed!"
  exit 1
fi

echo -e "\n✅ Branding verification complete!"
```

### Manual Testing Checklist

```markdown
## End-to-End Verification

### Video Playback
- [ ] Navigate to /chords
- [ ] Paste a video URL
- [ ] Verify URL is accepted
- [ ] Verify video loads

### Chord Analysis
- [ ] Click Analyze button
- [ ] Verify chord detection runs
- [ ] Verify chord timeline displays
- [ ] Verify chord shapes show on fretboard

### Playback Controls
- [ ] Play/pause works
- [ ] Seek works
- [ ] Volume control works
- [ ] Speed control works

### Advanced Features
- [ ] Stem separation works (if previously set up)
- [ ] Lyrics sync works (if previously set up)
- [ ] Library switching (Essentia/Madmom/BTC) works

### Console
- [ ] No JavaScript errors in console
- [ ] No warnings related to imports
- [ ] No 404s for components
```

## Testing Checklist
- [ ] CLAUDE.md updated with new paths and names
- [ ] All markdown docs reviewed and updated
- [ ] Icon files correctly unchanged
- [ ] grep verification shows no old names
- [ ] yarn typecheck passes
- [ ] yarn build passes
- [ ] End-to-end playback test passes
- [ ] Chord analysis test passes
- [ ] Stems and lyrics test passes

## Dependencies
- Stories 5.1, 5.2, and 5.3 complete
- Access to all documentation files

## Definition of Done
- [ ] CLAUDE.md updated
- [ ] All other docs reviewed
- [ ] Verification script passes
- [ ] Full build succeeds
- [ ] Manual E2E test passes
- [ ] No old naming in code
- [ ] Changes committed with summary