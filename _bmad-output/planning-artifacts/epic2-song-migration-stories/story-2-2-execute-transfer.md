# Story 2.2: Execute Data Transfer to Supabase Storage

**Epic:** Existing Song Migration
**Priority:** P0 - Critical
**Size:** Large
**Backend Required:** Yes

## User Story

As a system owner,
I want all 17 songs migrated to Supabase Storage under my user account,
So that my existing song library is accessible in the new cloud system.

## Technical Context

This story executes the actual data transfer using the migration script from Story 2.1. Files are uploaded to Supabase Storage and database records created to complete the migration.

## Acceptance Criteria

### File Upload Execution

**Given** the migration script from Story 2.1 is complete and tested
**When** the script is executed in migration mode (`--migrate`)
**Then**:
- All audio files from `backend/audio/*.mp3` are uploaded to `user-songs` bucket
- All stem files from `backend/stems/{videoId}/*.mp3` are uploaded
- All lyrics files from `backend/lyrics/*.lrc` are uploaded
- Upload progress is displayed for each file
- Each file's upload is verified (checksum or size comparison)

### Database Records Creation

**Given** the Supabase database has the `user_songs` table
**When** each song is migrated
**Then**:
- A record is inserted in `user_songs` with correct metadata
- Records include: video_id, title, duration, storage path
- Records reference the owner's user_id
- Chord analysis data is inserted into `user_song_chords`
- Tempo and key data are preserved in JSONB
- Stem records are created in `user_song_stems`
- Lyrics records are created in `user_song_lyrics`

### Error Handling

**Given** a file upload fails during migration
**When** the script encounters the error
**Then**:
- The error is logged with file path and error details
- The script continues with remaining files (no abort)
- A summary of failed uploads is reported at completion
- Failed files are listed for manual retry

### Migration Log

**Given** the migration completes
**When** reviewing the results
**Then**:
- A migration log is saved to `_bmad-output/migration-log.json`
- Log contains: start time, end time, success count, failure count
- Each file has: status, upload time, error (if any)
- Log can be used for verification and audit

## Implementation Notes

### Execute Migration Logic
```typescript
// backend/scripts/migrate-to-cloud.ts (continued)

interface MigrationResult {
  startedAt: string;
  completedAt: string;
  successCount: number;
  failureCount: number;
  results: FileResult[];
}

interface FileResult {
  source: string;
  destination: string;
  status: 'success' | 'failed' | 'skipped';
  uploadTimeMs?: number;
  error?: string;
}

async function executeMigration(
  supabase: any,
  manifest: MigrationManifest,
  config: MigrationConfig
): Promise<MigrationResult> {
  const result: MigrationResult = {
    startedAt: new Date().toISOString(),
    completedAt: '',
    successCount: 0,
    failureCount: 0,
    results: []
  };

  console.log('\n🚀 Starting migration...\n');

  for (const song of manifest.songs) {
    console.log(`\n📀 Migrating: ${song.title} (${song.videoId})`);

    // Upload audio
    if (song.files.audio) {
      const audioResult = await uploadFile(
        supabase,
        song.files.audio.source,
        song.files.audio.destination
      );
      result.results.push(audioResult);
      if (audioResult.status === 'success') {
        result.successCount++;
      } else {
        result.failureCount++;
      }
    }

    // Upload stems
    if (song.files.stems) {
      for (const stem of song.files.stems) {
        const stemResult = await uploadFile(
          supabase,
          stem.source,
          stem.destination
        );
        result.results.push(stemResult);
        if (stemResult.status === 'success') {
          result.successCount++;
        } else {
          result.failureCount++;
        }
      }
    }

    // Upload lyrics
    if (song.files.lyrics) {
      const lyricsResult = await uploadFile(
        supabase,
        song.files.lyrics.source,
        song.files.lyrics.destination
      );
      result.results.push(lyricsResult);
      if (lyricsResult.status === 'success') {
        result.successCount++;
      } else {
        result.failureCount++;
      }
    }

    // Create database records
    await createDatabaseRecords(supabase, song, manifest.ownerId);
  }

  result.completedAt = new Date().toISOString();

  // Save migration log
  await fs.writeFile(
    '_bmad-output/migration-log.json',
    JSON.stringify(result, null, 2)
  );

  return result;
}

async function uploadFile(
  supabase: any,
  sourcePath: string,
  destinationPath: string
): Promise<FileResult> {
  const startTime = Date.now();

  try {
    // Read file
    const fileBuffer = await fs.readFile(sourcePath);

    // Determine content type
    const contentType = sourcePath.endsWith('.mp3')
      ? 'audio/mpeg'
      : 'text/plain';

    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from('user-songs')
      .upload(destinationPath, fileBuffer, {
        contentType,
        upsert: true // Allow overwrite for retries
      });

    if (error) {
      throw error;
    }

    const uploadTimeMs = Date.now() - startTime;
    console.log(`   ✓ ${path.basename(sourcePath)} (${uploadTimeMs}ms)`);

    return {
      source: sourcePath,
      destination: destinationPath,
      status: 'success',
      uploadTimeMs
    };

  } catch (error) {
    const uploadTimeMs = Date.now() - startTime;
    console.log(`   ✗ ${path.basename(sourcePath)}: ${error.message}`);

    return {
      source: sourcePath,
      destination: destinationPath,
      status: 'failed',
      uploadTimeMs,
      error: error.message
    };
  }
}

async function createDatabaseRecords(
  supabase: any,
  song: any,
  ownerId: string
) {
  console.log(`   📝 Creating database records...`);

  try {
    // Create user_songs record
    const { data: userSong, error: songError } = await supabase
      .from('user_songs')
      .insert({
        user_id: ownerId,
        video_id: song.videoId,
        title: song.title,
        duration_seconds: song.metadata?.duration || 0,
        audio_storage_path: song.files.audio?.destination
      })
      .select()
      .single();

    if (songError) {
      // Check if duplicate
      if (songError.code === '23505') {
        console.log(`   ⚠️  Song already exists, updating...`);
        // Update existing record
        const { data: existing } = await supabase
          .from('user_songs')
          .select('id')
          .eq('user_id', ownerId)
          .eq('video_id', song.videoId)
          .single();

        if (existing) {
          await updateExistingRecords(supabase, existing.id, song);
        }
        return;
      }
      throw songError;
    }

    // Create chord records for each library
    if (song.metadata?.chordsByLibrary) {
      for (const [library, chords] of Object.entries(song.metadata.chordsByLibrary)) {
        await supabase
          .from('user_song_chords')
          .insert({
            user_song_id: userSong.id,
            library,
            chords,
            tempo: song.metadata.tempo,
            key: song.metadata.key
          });
      }
    }

    // Create stem records
    if (song.files.stems) {
      for (const stem of song.files.stems) {
        await supabase
          .from('user_song_stems')
          .insert({
            user_song_id: userSong.id,
            stem_type: stem.type,
            storage_path: stem.destination
          });
      }
    }

    // Create lyrics record
    if (song.files.lyrics) {
      const lrcContent = await fs.readFile(song.files.lyrics.source, 'utf-8');
      await supabase
        .from('user_song_lyrics')
        .insert({
          user_song_id: userSong.id,
          lrc_content: lrcContent,
          storage_path: song.files.lyrics.destination
        });
    }

    console.log(`   ✓ Database records created`);

  } catch (error) {
    console.error(`   ✗ Database error: ${error.message}`);
  }
}

async function updateExistingRecords(
  supabase: any,
  songId: string,
  song: any
) {
  // Update chord records
  if (song.metadata?.chordsByLibrary) {
    for (const [library, chords] of Object.entries(song.metadata.chordsByLibrary)) {
      await supabase
        .from('user_song_chords')
        .upsert({
          user_song_id: songId,
          library,
          chords,
          tempo: song.metadata.tempo,
          key: song.metadata.key
        }, { onConflict: 'user_song_id,library' });
    }
  }

  console.log(`   ✓ Existing records updated`);
}
```

### Progress Display
```typescript
// Add progress bar for large files
import cliProgress from 'cli-progress';

async function uploadLargeFile(
  supabase: any,
  sourcePath: string,
  destinationPath: string
): Promise<FileResult> {
  const stat = await fs.stat(sourcePath);
  const isLarge = stat.size > 10 * 1024 * 1024; // > 10MB

  if (isLarge) {
    const bar = new cliProgress.SingleBar({
      format: '   [{bar}] {percentage}% | {filename}',
      barCompleteChar: '█',
      barIncompleteChar: '░'
    });
    bar.start(100, 0, { filename: path.basename(sourcePath) });

    // For now, simple upload (Supabase doesn't support chunked upload directly)
    // Progress is simulated
    bar.update(50);
    const result = await uploadFile(supabase, sourcePath, destinationPath);
    bar.update(100);
    bar.stop();
    return result;
  }

  return uploadFile(supabase, sourcePath, destinationPath);
}
```

## Verification
- All 17 songs appear in Supabase Storage under correct paths
- All 17 song records exist in database with complete metadata
- File sizes in Supabase match original local files
- Migration log shows success rate
- Chord data is queryable via API

## Rollback
- Migration script supports `--rollback` flag to delete uploaded files
- Rollback reads migration log to identify uploaded files
- Local files remain untouched
- Database records can be deleted via admin

```typescript
// Rollback implementation
async function rollbackMigration(supabase: any) {
  const logPath = '_bmad-output/migration-log.json';
  const log = JSON.parse(await fs.readFile(logPath, 'utf-8'));

  console.log('\n⚠️  Rolling back migration...\n');

  for (const file of log.results) {
    if (file.status === 'success') {
      console.log(`   Deleting: ${file.destination}`);
      await supabase.storage
        .from('user-songs')
        .remove([file.destination]);
    }
  }

  // Delete database records (by owner)
  const manifest = JSON.parse(
    await fs.readFile('_bmad-output/migration-manifest.json', 'utf-8')
  );

  await supabase
    .from('user_songs')
    .delete()
    .eq('user_id', manifest.ownerId);

  console.log('\n✓ Rollback complete');
}
```

## Testing Checklist
- [ ] All audio files uploaded successfully
- [ ] All stem files uploaded successfully
- [ ] All lyrics files uploaded successfully
- [ ] Database records created for all songs
- [ ] Chord data preserved in JSONB
- [ ] Tempo and key data preserved
- [ ] Stem records reference correct paths
- [ ] Lyrics content stored correctly
- [ ] Migration log generated
- [ ] Failed uploads are logged
- [ ] Rollback successfully removes files

## Dependencies
- Story 2.1 (Migration Script) completed
- Supabase Storage bucket configured
- Database schema from Story 1.1
- Service role key with admin permissions

## Definition of Done
- [ ] All 17 songs uploaded to Storage
- [ ] All database records created
- [ ] Migration log saved
- [ ] Rollback mechanism tested
- [ ] File sizes verified match
- [ ] Chord data verified accessible
- [ ] Zero critical failures