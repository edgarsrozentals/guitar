# Story 5.3: Update User-Facing UI Text to Platform-Neutral Language

**Epic:** Platform-Neutral Branding
**Priority:** P2 - Medium
**Size:** Small
**Backend Required:** No

## User Story

As a user,
I want the application to use generic video terminology in the interface,
So that I am not confused by platform-specific branding.

## Technical Context

User-visible text strings contain platform-specific references. These need to be updated to generic terms while maintaining clarity about what the app does.

## Acceptance Criteria

### Placeholder Text Updates

**Given** the video URL input has placeholder text
**When** I update it
**Then**:

| Original | New |
|----------|-----|
| "Paste YouTube URL (e.g., https://youtube.com/watch?v=...)" | "Paste video URL" |

### Help Text Updates

**Given** help text references specific platforms
**When** I update it
**Then**:

| Original | New |
|----------|-----|
| "Enter a YouTube URL to detect chords and play along" | "Enter a video URL to detect chords and play along" |

### Error Message Updates

**Given** error messages reference specific platforms
**When** I update them
**Then**:

| Original | New |
|----------|-----|
| "Please enter a YouTube URL" | "Please enter a video URL" |
| "Invalid YouTube URL. Please enter a valid YouTube video link." | "Invalid video URL. Please enter a valid video link." |

### Link Text Updates

**Given** external links reference specific platforms
**When** I update them
**Then**:

| Original | New |
|----------|-----|
| "Open on YouTube" | "Open original video" |

### Comment Updates

**Given** code comments reference specific platforms
**When** reviewing them
**Then**:
- Comments in `useLyricsSync.ts` referencing "YouTube" are updated to "video player"
- Technical implementation comments (e.g., "YouTube IFrame API") remain unchanged as they describe the actual API being used

### Build Verification

**Given** all text updates are complete
**When** I run the build
**Then**:
- The application builds without errors
- No missing translation keys or broken strings

## Implementation Notes

### VideoUrlInput.tsx Updates

```typescript
// product/app/chords/video/VideoUrlInput.tsx

// BEFORE
<Input
  placeholder="Paste YouTube URL (e.g., https://youtube.com/watch?v=...)"
  aria-label="YouTube URL"
/>

// AFTER
<Input
  placeholder="Paste video URL"
  aria-label="Video URL"
/>

// Error messages
// BEFORE
if (!url) {
  setError('Please enter a YouTube URL');
}
if (!isValidUrl(url)) {
  setError('Invalid YouTube URL. Please enter a valid YouTube video link.');
}

// AFTER
if (!url) {
  setError('Please enter a video URL');
}
if (!isValidUrl(url)) {
  setError('Invalid video URL. Please enter a valid video link.');
}
```

### Help Text Component

```typescript
// If there's a help text component or tooltip
// BEFORE
<HelpText>Enter a YouTube URL to detect chords and play along</HelpText>

// AFTER
<HelpText>Enter a video URL to detect chords and play along</HelpText>
```

### External Link Updates

```typescript
// VideoPlayer.tsx or wherever the source link exists
// BEFORE
<ExternalLink
  href={`https://youtube.com/watch?v=${videoId}`}
  title="Open on YouTube"
>
  Open on YouTube
</ExternalLink>

// AFTER
<ExternalLink
  href={`https://youtube.com/watch?v=${videoId}`}
  title="Open original video"
>
  Open original video
</ExternalLink>
```

### Code Comment Updates

```typescript
// useLyricsSync.ts
// BEFORE
// Sync lyrics with YouTube player's current time

// AFTER
// Sync lyrics with video player's current time

// Note: Keep technical comments accurate
// KEEP AS-IS (describes actual implementation)
// Load the YouTube IFrame API script
```

### Strings to Search For

```bash
# Find all user-facing strings to update
grep -rn "YouTube URL" product/
grep -rn "YouTube video" product/
grep -rn "YouTube link" product/
grep -rn "on YouTube" product/
grep -rn "from YouTube" product/

# Exclude technical implementation comments
# These should be reviewed manually
```

### Strings to Keep (Technical)

The following should NOT be changed as they describe the actual technical implementation:

- "YouTube IFrame API" (this is the official API name)
- "youtube.com" in URLs (these are actual URLs)
- "img.youtube.com" for thumbnails (actual service)
- Type names in third-party libraries

## Regression Testing

After completing the text updates:

1. Run `yarn dev` and navigate to /chords
2. Verify all visible text uses platform-neutral language
3. Check the URL input placeholder
4. Enter an invalid URL and verify error message
5. Load a video and verify the external link text
6. Check any tooltips or help text

## Testing Checklist
- [ ] URL input placeholder updated
- [ ] Help text updated (if present)
- [ ] Error messages updated
- [ ] External link text updated
- [ ] Code comments reviewed and updated where appropriate
- [ ] Application builds without errors
- [ ] All visible text is platform-neutral
- [ ] Error messages display correctly
- [ ] External link still functions

## Dependencies
- Stories 5.1 and 5.2 complete (file and component renames)

## Definition of Done
- [ ] All user-facing text updated
- [ ] Code comments reviewed
- [ ] Application builds
- [ ] Visual verification of all text
- [ ] External links functional
- [ ] Changes committed