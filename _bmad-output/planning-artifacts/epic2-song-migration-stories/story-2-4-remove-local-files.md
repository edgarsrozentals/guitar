# Story 2.4: Remove Local File Serving and Clean Up Backend

**Epic:** Existing Song Migration
**Priority:** P1 - High
**Size:** Medium
**Backend Required:** Yes

## User Story

As a developer,
I want to remove local file serving code from the backend,
So that the system exclusively uses Supabase Storage and reduces server complexity.

## Technical Context

After migration verification passes, we remove the local file serving routes and clean up the backend. This simplifies deployment and ensures all files are served from cloud storage.

## Acceptance Criteria

### Code Audit and Documentation

**Given** Story 2.3 verification has passed with 100% success
**When** reviewing the backend codebase
**Then**:
- All static file serving routes for audio, stems, and lyrics are identified
- A list of files/directories to be removed is documented
- All hardcoded local paths are identified

### Remove Local File Serving

**Given** the local file serving code is identified
**When** the code is removed
**Then**:
- Static file routes are deleted from Express server
- Local file path references are removed
- No code attempts to read from local audio/stems/lyrics directories
- The server starts without errors

### Redirect to Cloud Storage

**Given** the application requests a song's audio file
**When** the backend handles the request
**Then**:
- Returns a signed Supabase Storage URL
- Client successfully streams audio from the signed URL
- No fallback to local files

### Archive Local Files

**Given** the migration is confirmed complete
**When** performing final cleanup
**Then**:
- Local audio, stems, and lyrics directories are archived (not deleted immediately)
- Archive is stored outside the repository (e.g., external backup drive)
- A cleanup completion record is added to migration log
- Git ignores the archive location

### Update Development Setup

**Given** local file serving is removed
**When** setting up for development
**Then**:
- Development requires Supabase credentials
- README updated with new setup instructions
- Example environment variables documented
- No local file dependencies for new development

## Implementation Notes

### Identify Code to Remove
```bash
# Find static file serving routes
grep -r "express.static\|sendFile\|res.download" backend/src/

# Find local path references
grep -r "backend/audio\|backend/stems\|backend/lyrics" backend/

# Find file system reads for media
grep -r "fs.readFile.*\.(mp3|lrc)" backend/src/
```

### Remove Static File Routes
```typescript
// BEFORE: backend/src/server.ts
app.use('/audio', express.static('audio'));
app.use('/stems', express.static('stems'));
app.use('/lyrics', express.static('lyrics'));

// AFTER: Remove these lines entirely
// All file access now via signed URLs from API endpoints
```

### Update Song Endpoints
```typescript
// BEFORE: Returns local file path
router.get('/:videoId/audio', (req, res) => {
  res.sendFile(`audio/${req.params.videoId}.mp3`);
});

// AFTER: Returns signed URL (already implemented in Story 1.4)
router.get('/:videoId', authMiddleware, async (req, res) => {
  // ... fetch from database, generate signed URL
  res.json({ audioUrl: signedUrl });
});
```

### Archive Script
```bash
#!/bin/bash
# backend/scripts/archive-local-files.sh

ARCHIVE_DIR="/Volumes/Backup/guitar-app-migration-archive"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
ARCHIVE_NAME="guitar-app-files-${TIMESTAMP}"

echo "📦 Archiving local files..."

# Create archive directory
mkdir -p "${ARCHIVE_DIR}/${ARCHIVE_NAME}"

# Copy files to archive
cp -r backend/audio "${ARCHIVE_DIR}/${ARCHIVE_NAME}/"
cp -r backend/stems "${ARCHIVE_DIR}/${ARCHIVE_NAME}/"
cp -r backend/lyrics "${ARCHIVE_DIR}/${ARCHIVE_NAME}/"
cp backend/songs-metadata.json "${ARCHIVE_DIR}/${ARCHIVE_NAME}/"

# Create archive manifest
cat > "${ARCHIVE_DIR}/${ARCHIVE_NAME}/manifest.json" << EOF
{
  "archivedAt": "$(date -Iseconds)",
  "source": "guitar-app backend",
  "reason": "Migration to Supabase Storage",
  "migrationVerification": "_bmad-output/migration-verification.json"
}
EOF

echo "✅ Files archived to: ${ARCHIVE_DIR}/${ARCHIVE_NAME}"

# Update migration log
echo "📝 Updating migration log..."
node -e "
const fs = require('fs');
const log = JSON.parse(fs.readFileSync('_bmad-output/migration-log.json'));
log.archiveCompleted = {
  at: new Date().toISOString(),
  location: '${ARCHIVE_DIR}/${ARCHIVE_NAME}'
};
fs.writeFileSync('_bmad-output/migration-log.json', JSON.stringify(log, null, 2));
"

echo "✅ Archive complete"
```

### Remove Directories from Git
```bash
# After archiving, remove from repo
rm -rf backend/audio
rm -rf backend/stems
rm -rf backend/lyrics

# Update .gitignore (keep these ignored)
echo "backend/audio/" >> .gitignore
echo "backend/stems/" >> .gitignore
echo "backend/lyrics/" >> .gitignore
```

### Update Documentation
```markdown
# README.md updates

## Development Setup

### Prerequisites
- Node.js 20+
- Supabase account with project configured

### Environment Variables
\`\`\`bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
\`\`\`

### Running Locally
1. Clone the repository
2. Copy `.env.example` to `.env` and fill in values
3. Run `yarn install`
4. Run `yarn dev` (frontend) and `yarn backend` (backend)

### Media Files
All audio files, stems, and lyrics are stored in Supabase Storage.
Local file storage is no longer used.
```

### Toggle for Gradual Rollout
```typescript
// Optional: Feature flag for gradual transition
const USE_CLOUD_STORAGE = process.env.USE_CLOUD_STORAGE === 'true';

router.get('/:videoId/audio', authMiddleware, async (req, res) => {
  if (USE_CLOUD_STORAGE) {
    // Return signed URL from Supabase
    const signedUrl = await generateSignedUrl(userId, storagePath);
    return res.json({ audioUrl: signedUrl });
  } else {
    // Fallback to local file (deprecated)
    return res.sendFile(`audio/${req.params.videoId}.mp3`);
  }
});
```

## Verification
- Backend passes all existing tests after file serving removal
- Application functions correctly using only Supabase Storage
- No 404 errors when accessing migrated songs
- Local development setup documentation updated
- All audio plays from cloud storage URLs

## Rollback
- Local files archived (not deleted) for 30 days
- Git commit for backend changes can be reverted
- Environment variable toggle to switch between local/Supabase file serving
- Archive can be restored if needed

## Testing Checklist
- [ ] All static file routes removed
- [ ] Server starts without errors
- [ ] No local file path references remain
- [ ] Signed URLs work for all file types
- [ ] Local files successfully archived
- [ ] Documentation updated
- [ ] Development setup works with cloud storage
- [ ] No 404 errors in production
- [ ] Feature flag toggle works (if implemented)

## Dependencies
- Story 2.3 (Verification) passed with 100% success
- Archive location accessible
- Supabase credentials for development

## Definition of Done
- [ ] All local file serving code removed
- [ ] Local files archived externally
- [ ] Server runs without local files
- [ ] Documentation updated
- [ ] Development setup verified
- [ ] No regression in functionality
- [ ] Archive manifest created
- [ ] Migration log updated with cleanup status