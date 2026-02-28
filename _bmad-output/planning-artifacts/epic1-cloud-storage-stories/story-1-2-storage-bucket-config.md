# Story 1.2: Configure Supabase Storage Bucket with RLS

**Epic:** Cloud Song Storage
**Priority:** P0 - Critical
**Size:** Medium
**Backend Required:** Yes

## User Story

As a developer,
I want to configure the Supabase Storage bucket for user song files,
So that audio files, stems, and lyrics are securely stored with proper access controls.

## Technical Context

Supabase Storage provides S3-compatible object storage with built-in RLS support. We need to configure buckets that enforce user isolation while allowing efficient file access through signed URLs.

## Acceptance Criteria

### Bucket Creation

**Given** access to the Supabase project
**When** I configure the storage buckets
**Then** the following buckets are created:

1. **user-songs bucket**
   - Type: Private (requires authentication)
   - Max file size: 100MB for audio files
   - Allowed MIME types: audio/*, application/octet-stream
   - File size validation enforced

### Folder Structure

**Given** the user-songs bucket exists
**When** files are organized
**Then** the following path structure is enforced:
```
user-songs/
├── {user_id}/
│   ├── audio/
│   │   └── {video_id}.mp3
│   ├── stems/
│   │   └── {video_id}/
│   │       ├── vocals.mp3
│   │       ├── backing.mp3
│   │       ├── drums.mp3
│   │       ├── bass.mp3
│   │       └── other.mp3
│   └── lyrics/
│       └── {video_id}.lrc
```

### RLS Policies for Storage

**Given** the bucket is configured
**When** RLS policies are applied
**Then** the following rules are enforced:

1. **Upload Policy**
   ```sql
   -- Users can only upload to their own folder
   (bucket_id = 'user-songs' AND auth.uid()::text = (storage.foldername(name))[1])
   ```

2. **Read Policy**
   ```sql
   -- Users can only read their own files
   (bucket_id = 'user-songs' AND auth.uid()::text = (storage.foldername(name))[1])
   ```

3. **Delete Policy**
   ```sql
   -- Users can only delete their own files
   (bucket_id = 'user-songs' AND auth.uid()::text = (storage.foldername(name))[1])
   ```

### Security Validation

**Given** an authenticated user with id "user-123"
**When** they attempt to upload a file to path "user-456/audio/song.mp3"
**Then** the upload is rejected with a 403 forbidden error

**Given** an authenticated user with id "user-123"
**When** they upload a file to path "user-123/audio/song.mp3"
**Then** the upload succeeds and returns:
- File metadata (size, type, path)
- Success confirmation

**Given** an unauthenticated request
**When** attempting to access any file in the bucket
**Then** the request is denied with a 401 error

### File Size and Type Validation

**Given** a user attempts to upload a file
**When** the file exceeds 100MB
**Then** the upload is rejected with error "File size exceeds maximum allowed (100MB)"

**Given** a user attempts to upload a non-audio file
**When** the MIME type is not audio/*
**Then** the upload is rejected with error "Invalid file type"

## Implementation Notes

### Storage Configuration Script
```javascript
// Supabase Storage bucket setup
const createBuckets = async () => {
  // Create user-songs bucket
  await supabase.storage.createBucket('user-songs', {
    public: false,
    fileSizeLimit: 104857600, // 100MB in bytes
    allowedMimeTypes: ['audio/*']
  });
};

// RLS policies (applied via Supabase dashboard or SQL)
const storagePolicies = `
  -- Insert policy
  CREATE POLICY "Users can upload own files" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'user-songs' AND
      auth.uid()::text = (storage.foldername(name))[1]
    );

  -- Select policy
  CREATE POLICY "Users can view own files" ON storage.objects
    FOR SELECT USING (
      bucket_id = 'user-songs' AND
      auth.uid()::text = (storage.foldername(name))[1]
    );

  -- Delete policy
  CREATE POLICY "Users can delete own files" ON storage.objects
    FOR DELETE USING (
      bucket_id = 'user-songs' AND
      auth.uid()::text = (storage.foldername(name))[1]
    );
`;
```

### Path Helper Functions
```typescript
// Helper functions for consistent path generation
export const getStoragePaths = (userId: string, videoId: string) => ({
  audio: `${userId}/audio/${videoId}.mp3`,
  stems: {
    vocals: `${userId}/stems/${videoId}/vocals.mp3`,
    backing: `${userId}/stems/${videoId}/backing.mp3`,
    drums: `${userId}/stems/${videoId}/drums.mp3`,
    bass: `${userId}/stems/${videoId}/bass.mp3`,
    other: `${userId}/stems/${videoId}/other.mp3`,
  },
  lyrics: `${userId}/lyrics/${videoId}.lrc`,
});
```

## Testing Checklist
- [ ] Bucket created with correct configuration
- [ ] File upload works for authenticated users
- [ ] Cross-user access is prevented
- [ ] File size limits are enforced
- [ ] MIME type restrictions work
- [ ] Folder structure is maintained
- [ ] RLS policies prevent unauthorized access

## Dependencies
- Supabase project with Storage enabled
- Storage admin access
- RLS policy configuration access

## Definition of Done
- [ ] Storage bucket created and configured
- [ ] RLS policies implemented and tested
- [ ] File size and type validation working
- [ ] Path structure documented and enforced
- [ ] Helper functions created for path generation
- [ ] Storage costs estimated based on expected usage