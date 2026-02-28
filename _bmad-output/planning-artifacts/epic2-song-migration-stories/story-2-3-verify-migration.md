# Story 2.3: Verify Migrated Data Integrity and Accessibility

**Epic:** Existing Song Migration
**Priority:** P0 - Critical
**Size:** Medium
**Backend Required:** No (Verification only)

## User Story

As a system owner,
I want to verify that all migrated songs are complete and accessible,
So that I can confirm the migration was successful before removing local files.

## Technical Context

Before removing local files, we need comprehensive verification that all data was transferred correctly and is accessible through the new cloud APIs.

## Acceptance Criteria

### File Count and Size Verification

**Given** Story 2.2 migration has completed
**When** a verification script runs
**Then**:
- Compares file counts: local vs Supabase for each song
- Compares file sizes (byte-level) for all uploaded files
- Reports any discrepancies with specific file paths
- Generates verification report

**Verification Report Format:**
```json
{
  "verifiedAt": "2024-01-01T00:00:00Z",
  "summary": {
    "totalSongs": 17,
    "songsVerified": 17,
    "filesVerified": 45,
    "filesMatched": 45,
    "filesMismatched": 0,
    "filesMissing": 0
  },
  "songs": [
    {
      "videoId": "abc123",
      "title": "Song Name",
      "status": "verified",
      "files": {
        "audio": { "local": 5000000, "remote": 5000000, "match": true },
        "stems": {
          "vocals": { "local": 4000000, "remote": 4000000, "match": true }
        },
        "lyrics": { "local": 5000, "remote": 5000, "match": true }
      }
    }
  ]
}
```

### UI Verification

**Given** the owner is logged into the application
**When** navigating to the song library
**Then**:
- All 17 songs are listed with correct titles
- Each song displays correct duration
- Processing status indicators show correct state

### Playback Verification

**Given** a migrated song is selected in the chord player
**When** the song loads
**Then**:
- The audio file streams correctly from Supabase
- Playback starts without errors
- Seek functionality works
- No buffering issues

### Stems Verification

**Given** a song with separated stems is selected
**When** the stems panel is opened
**Then**:
- All stem types are available if they existed locally
- Each stem plays correctly
- Volume controls work
- Mute/solo toggles function

### Lyrics Verification

**Given** a song with lyrics is playing
**When** lyrics display is enabled
**Then**:
- Lyrics appear synchronized with playback
- Word highlighting works correctly
- No timing drift observed

### Chord Analysis Verification

**Given** a song is loaded in the chord player
**When** viewing the chord timeline
**Then**:
- All chord analysis libraries are available (essentia, madmom, btc)
- Chord timing matches original analysis
- Beat grid displays correctly
- Key detection shows correct result

### Verification Report Saved

**Given** the verification is complete
**When** the report is reviewed
**Then**:
- Report is saved to `_bmad-output/migration-verification.json`
- Summary shows: total songs, total files, success rate, any failures
- Failed items are listed with specific errors

## Implementation Notes

### Verification Script
```typescript
// backend/scripts/verify-migration.ts
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs/promises';
import * as path from 'path';

interface VerificationResult {
  verifiedAt: string;
  summary: {
    totalSongs: number;
    songsVerified: number;
    filesVerified: number;
    filesMatched: number;
    filesMismatched: number;
    filesMissing: number;
  };
  songs: SongVerification[];
}

interface SongVerification {
  videoId: string;
  title: string;
  status: 'verified' | 'partial' | 'failed';
  files: {
    audio?: FileComparison;
    stems?: Record<string, FileComparison>;
    lyrics?: FileComparison;
  };
  database?: {
    hasSongRecord: boolean;
    hasChordRecords: boolean;
    hasStemRecords: boolean;
    hasLyricsRecord: boolean;
  };
  errors?: string[];
}

interface FileComparison {
  local: number;
  remote: number;
  match: boolean;
  error?: string;
}

async function main() {
  console.log('\n🔍 Migration Verification Script\n');

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Load manifest
  const manifest = JSON.parse(
    await fs.readFile('_bmad-output/migration-manifest.json', 'utf-8')
  );

  const result: VerificationResult = {
    verifiedAt: new Date().toISOString(),
    summary: {
      totalSongs: manifest.songs.length,
      songsVerified: 0,
      filesVerified: 0,
      filesMatched: 0,
      filesMismatched: 0,
      filesMissing: 0
    },
    songs: []
  };

  // Verify each song
  for (const song of manifest.songs) {
    console.log(`\n📀 Verifying: ${song.title}`);
    const verification = await verifySong(supabase, song, manifest.ownerId);
    result.songs.push(verification);

    if (verification.status === 'verified') {
      result.summary.songsVerified++;
    }
  }

  // Calculate totals
  for (const song of result.songs) {
    if (song.files.audio) {
      result.summary.filesVerified++;
      if (song.files.audio.match) {
        result.summary.filesMatched++;
      } else if (song.files.audio.error) {
        result.summary.filesMissing++;
      } else {
        result.summary.filesMismatched++;
      }
    }

    if (song.files.stems) {
      for (const stem of Object.values(song.files.stems)) {
        result.summary.filesVerified++;
        if (stem.match) {
          result.summary.filesMatched++;
        } else if (stem.error) {
          result.summary.filesMissing++;
        } else {
          result.summary.filesMismatched++;
        }
      }
    }

    if (song.files.lyrics) {
      result.summary.filesVerified++;
      if (song.files.lyrics.match) {
        result.summary.filesMatched++;
      } else if (song.files.lyrics.error) {
        result.summary.filesMissing++;
      } else {
        result.summary.filesMismatched++;
      }
    }
  }

  // Save report
  await fs.writeFile(
    '_bmad-output/migration-verification.json',
    JSON.stringify(result, null, 2)
  );

  // Print summary
  console.log('\n📊 Verification Summary:');
  console.log(`   Songs verified: ${result.summary.songsVerified}/${result.summary.totalSongs}`);
  console.log(`   Files matched: ${result.summary.filesMatched}/${result.summary.filesVerified}`);
  console.log(`   Files mismatched: ${result.summary.filesMismatched}`);
  console.log(`   Files missing: ${result.summary.filesMissing}`);

  if (result.summary.filesMismatched === 0 && result.summary.filesMissing === 0) {
    console.log('\n✅ Migration verified successfully!');
  } else {
    console.log('\n⚠️  Issues found - review report for details');
  }
}

async function verifySong(
  supabase: any,
  song: any,
  ownerId: string
): Promise<SongVerification> {
  const verification: SongVerification = {
    videoId: song.videoId,
    title: song.title,
    status: 'verified',
    files: {},
    database: {
      hasSongRecord: false,
      hasChordRecords: false,
      hasStemRecords: false,
      hasLyricsRecord: false
    },
    errors: []
  };

  // Verify audio file
  if (song.files.audio) {
    verification.files.audio = await compareFile(
      supabase,
      song.files.audio.source,
      song.files.audio.destination
    );
    if (!verification.files.audio.match) {
      verification.status = 'partial';
    }
  }

  // Verify stems
  if (song.files.stems && song.files.stems.length > 0) {
    verification.files.stems = {};
    for (const stem of song.files.stems) {
      verification.files.stems[stem.type] = await compareFile(
        supabase,
        stem.source,
        stem.destination
      );
      if (!verification.files.stems[stem.type].match) {
        verification.status = 'partial';
      }
    }
  }

  // Verify lyrics
  if (song.files.lyrics) {
    verification.files.lyrics = await compareFile(
      supabase,
      song.files.lyrics.source,
      song.files.lyrics.destination
    );
    if (!verification.files.lyrics.match) {
      verification.status = 'partial';
    }
  }

  // Verify database records
  const { data: songRecord } = await supabase
    .from('user_songs')
    .select('id')
    .eq('user_id', ownerId)
    .eq('video_id', song.videoId)
    .single();

  if (songRecord) {
    verification.database!.hasSongRecord = true;

    // Check chord records
    const { data: chords } = await supabase
      .from('user_song_chords')
      .select('library')
      .eq('user_song_id', songRecord.id);
    verification.database!.hasChordRecords = chords && chords.length > 0;

    // Check stem records
    const { data: stems } = await supabase
      .from('user_song_stems')
      .select('stem_type')
      .eq('user_song_id', songRecord.id);
    verification.database!.hasStemRecords = stems && stems.length > 0;

    // Check lyrics record
    const { data: lyrics } = await supabase
      .from('user_song_lyrics')
      .select('id')
      .eq('user_song_id', songRecord.id)
      .single();
    verification.database!.hasLyricsRecord = !!lyrics;
  } else {
    verification.status = 'failed';
    verification.errors!.push('No database record found');
  }

  const statusIcon = verification.status === 'verified' ? '✓' :
                     verification.status === 'partial' ? '⚠️' : '✗';
  console.log(`   ${statusIcon} ${verification.status}`);

  return verification;
}

async function compareFile(
  supabase: any,
  localPath: string,
  remotePath: string
): Promise<FileComparison> {
  try {
    // Get local file size
    const localStat = await fs.stat(localPath);
    const localSize = localStat.size;

    // Get remote file info
    const { data, error } = await supabase.storage
      .from('user-songs')
      .list(path.dirname(remotePath), {
        search: path.basename(remotePath)
      });

    if (error || !data || data.length === 0) {
      return {
        local: localSize,
        remote: 0,
        match: false,
        error: 'File not found in storage'
      };
    }

    const remoteFile = data.find((f: any) => f.name === path.basename(remotePath));
    if (!remoteFile) {
      return {
        local: localSize,
        remote: 0,
        match: false,
        error: 'File not found in storage'
      };
    }

    const remoteSize = remoteFile.metadata?.size || 0;

    return {
      local: localSize,
      remote: remoteSize,
      match: localSize === remoteSize
    };

  } catch (error) {
    return {
      local: 0,
      remote: 0,
      match: false,
      error: error.message
    };
  }
}

main().catch(console.error);
```

### Manual Testing Checklist
```markdown
## Manual Verification Checklist

### Song Library (UI)
- [ ] Login as owner (edgars@ideajetlab.com)
- [ ] Navigate to /library
- [ ] Count songs (should be 17)
- [ ] Verify all titles display correctly

### Playback Test (3 random songs)
Song 1: _______________
- [ ] Audio loads from cloud
- [ ] Playback controls work
- [ ] Seek works without buffering

Song 2: _______________
- [ ] Audio loads from cloud
- [ ] Playback controls work
- [ ] Seek works without buffering

Song 3: _______________
- [ ] Audio loads from cloud
- [ ] Playback controls work
- [ ] Seek works without buffering

### Stems Test (pick song with stems)
Song: _______________
- [ ] All stem types available
- [ ] Each stem plays correctly
- [ ] Volume controls work
- [ ] Mute/solo toggles work

### Lyrics Test (pick song with lyrics)
Song: _______________
- [ ] Lyrics display correctly
- [ ] Word highlighting syncs
- [ ] No timing drift

### Chord Analysis Test
Song: _______________
- [ ] Chord timeline shows chords
- [ ] Multiple libraries available
- [ ] Beat grid displays
- [ ] Key detection shows
```

## Verification
- 100% file count match between local and Supabase
- 100% file size match for all files
- Manual playback test of at least 3 songs confirms functionality
- All chord analysis data preserved and displayed correctly

## Rollback
- If verification fails, re-run Story 2.2 for failed items only
- Local files serve as authoritative source until verification passes
- No changes to local files during verification

## Testing Checklist
- [ ] Verification script runs successfully
- [ ] All 17 songs found in Supabase
- [ ] File sizes match for all files
- [ ] Database records exist for all songs
- [ ] Chord data is complete
- [ ] Manual playback tests pass
- [ ] Stems play correctly
- [ ] Lyrics sync correctly

## Dependencies
- Story 2.2 (Execute Transfer) completed
- Access to owner account
- Migration manifest available

## Definition of Done
- [ ] Verification script created and run
- [ ] All files verified matching
- [ ] All database records confirmed
- [ ] Manual testing completed
- [ ] Verification report saved
- [ ] Sign-off from owner on functionality