# Story 2.1: Create Migration Script for Existing Songs

**Epic:** Existing Song Migration
**Priority:** P0 - Critical
**Size:** Medium
**Backend Required:** Yes

## User Story

As a developer,
I want a migration script that reads local song data and uploads it to Supabase Storage,
So that all 17 existing songs can be transferred to the cloud infrastructure.

## Technical Context

The current system stores songs locally in `backend/audio/`, `backend/stems/`, and `backend/lyrics/` directories with metadata in `songs-metadata.json`. This needs to be migrated to Supabase Storage under the owner's user ID.

## Acceptance Criteria

### Dry-Run Mode

**Given** the migration script exists and has access to `backend/songs-metadata.json`
**When** the script is executed in dry-run mode (`--dry-run`)
**Then**:
- Lists all 17 songs with their video IDs and titles
- Reports associated files for each song:
  - Audio file path and size
  - Stem files (if any) with paths and sizes
  - Lyrics file (if any) with path and size
- Reports total data size to be migrated
- Validates that all referenced files exist locally
- Reports any missing files as warnings
- Does NOT upload any files

### Connection Validation

**Given** the script has Supabase credentials configured via environment variables
**When** the script connects to Supabase
**Then**:
- Verifies the `user-songs` storage bucket exists
- Confirms write permissions for the owner's user_id path
- Verifies the owner account exists (edgars@ideajetlab.com)
- Reports connection status and any permission issues

### Migration Manifest Generation

**Given** the owner's user_id is resolved from email `edgars@ideajetlab.com`
**When** the script prepares upload paths
**Then**:
- All files are mapped to `{bucket}/{user_id}/{videoId}/` structure
- A migration manifest JSON is generated at `_bmad-output/migration-manifest.json`
- Manifest contains:
```json
{
  "generatedAt": "2024-01-01T00:00:00Z",
  "ownerEmail": "edgars@ideajetlab.com",
  "ownerId": "uuid-here",
  "totalSongs": 17,
  "totalFiles": 45,
  "totalSizeBytes": 1234567890,
  "songs": [
    {
      "videoId": "abc123",
      "title": "Song Name",
      "files": {
        "audio": {
          "source": "backend/audio/abc123.mp3",
          "destination": "user-songs/{userId}/audio/abc123.mp3",
          "sizeBytes": 5000000
        },
        "stems": [
          {
            "type": "vocals",
            "source": "backend/stems/abc123/vocals.mp3",
            "destination": "user-songs/{userId}/stems/abc123/vocals.mp3",
            "sizeBytes": 4000000
          }
        ],
        "lyrics": {
          "source": "backend/lyrics/abc123.lrc",
          "destination": "user-songs/{userId}/lyrics/abc123.lrc",
          "sizeBytes": 5000
        }
      },
      "metadata": {
        "chordsByLibrary": {...},
        "tempo": {...},
        "key": {...}
      }
    }
  ]
}
```

## Implementation Notes

### Migration Script Structure
```typescript
// backend/scripts/migrate-to-cloud.ts
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs/promises';
import * as path from 'path';

interface MigrationConfig {
  dryRun: boolean;
  ownerEmail: string;
  songsMetadataPath: string;
  audioDir: string;
  stemsDir: string;
  lyricsDir: string;
  outputManifestPath: string;
}

interface SongMetadata {
  videoId: string;
  title?: string;
  chordsByLibrary?: Record<string, any>;
  tempo?: any;
  key?: any;
}

interface MigrationManifest {
  generatedAt: string;
  ownerEmail: string;
  ownerId: string;
  totalSongs: number;
  totalFiles: number;
  totalSizeBytes: number;
  songs: MigrationSongEntry[];
}

const DEFAULT_CONFIG: MigrationConfig = {
  dryRun: true,
  ownerEmail: 'edgars@ideajetlab.com',
  songsMetadataPath: 'backend/songs-metadata.json',
  audioDir: 'backend/audio',
  stemsDir: 'backend/stems',
  lyricsDir: 'backend/lyrics',
  outputManifestPath: '_bmad-output/migration-manifest.json'
};

async function main() {
  const args = process.argv.slice(2);
  const config = { ...DEFAULT_CONFIG };

  if (args.includes('--migrate')) {
    config.dryRun = false;
  }

  console.log(`\n🎸 Guitar App Migration Script`);
  console.log(`Mode: ${config.dryRun ? 'DRY RUN' : '⚠️  LIVE MIGRATION'}\n`);

  // Initialize Supabase client
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Step 1: Validate connection
  console.log('📡 Validating Supabase connection...');
  await validateConnection(supabase, config);

  // Step 2: Resolve owner user ID
  console.log(`\n👤 Resolving owner: ${config.ownerEmail}`);
  const ownerId = await resolveOwnerId(supabase, config.ownerEmail);
  console.log(`   Owner ID: ${ownerId}`);

  // Step 3: Read songs metadata
  console.log('\n📖 Reading songs metadata...');
  const songs = await readSongsMetadata(config.songsMetadataPath);
  console.log(`   Found ${songs.length} songs`);

  // Step 4: Scan files and build manifest
  console.log('\n📂 Scanning files...');
  const manifest = await buildManifest(songs, ownerId, config);
  console.log(`   Total files: ${manifest.totalFiles}`);
  console.log(`   Total size: ${formatBytes(manifest.totalSizeBytes)}`);

  // Step 5: Write manifest
  await fs.mkdir(path.dirname(config.outputManifestPath), { recursive: true });
  await fs.writeFile(
    config.outputManifestPath,
    JSON.stringify(manifest, null, 2)
  );
  console.log(`\n📄 Manifest written to: ${config.outputManifestPath}`);

  // Step 6: Report summary
  console.log('\n📊 Migration Summary:');
  console.log(`   Songs to migrate: ${manifest.totalSongs}`);
  console.log(`   Files to upload: ${manifest.totalFiles}`);
  console.log(`   Total data: ${formatBytes(manifest.totalSizeBytes)}`);

  if (config.dryRun) {
    console.log('\n✅ Dry run complete. Run with --migrate to execute.');
  }
}

async function validateConnection(supabase: any, config: MigrationConfig) {
  // Check bucket exists
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    throw new Error(`Failed to connect to Supabase Storage: ${error.message}`);
  }

  const bucket = buckets.find((b: any) => b.name === 'user-songs');
  if (!bucket) {
    throw new Error('Bucket "user-songs" not found. Create it first.');
  }

  console.log('   ✓ Storage bucket exists');
}

async function resolveOwnerId(supabase: any, email: string): Promise<string> {
  // Look up user by email using admin API
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw new Error(`Failed to list users: ${error.message}`);

  const owner = data.users.find((u: any) => u.email === email);
  if (!owner) {
    throw new Error(`Owner not found with email: ${email}`);
  }

  return owner.id;
}

async function readSongsMetadata(filePath: string): Promise<SongMetadata[]> {
  const content = await fs.readFile(filePath, 'utf-8');
  const data = JSON.parse(content);

  // Handle both array and object formats
  if (Array.isArray(data)) {
    return data;
  }

  // If object with videoId keys, convert to array
  return Object.entries(data).map(([videoId, metadata]: [string, any]) => ({
    videoId,
    ...metadata
  }));
}

async function buildManifest(
  songs: SongMetadata[],
  ownerId: string,
  config: MigrationConfig
): Promise<MigrationManifest> {
  const manifest: MigrationManifest = {
    generatedAt: new Date().toISOString(),
    ownerEmail: config.ownerEmail,
    ownerId,
    totalSongs: songs.length,
    totalFiles: 0,
    totalSizeBytes: 0,
    songs: []
  };

  for (const song of songs) {
    const entry = await scanSongFiles(song, ownerId, config);
    manifest.songs.push(entry);
    manifest.totalFiles += countFiles(entry);
    manifest.totalSizeBytes += sumSizeBytes(entry);
  }

  return manifest;
}

async function scanSongFiles(
  song: SongMetadata,
  ownerId: string,
  config: MigrationConfig
) {
  const entry: any = {
    videoId: song.videoId,
    title: song.title || song.videoId,
    files: {},
    metadata: {
      chordsByLibrary: song.chordsByLibrary,
      tempo: song.tempo,
      key: song.key
    }
  };

  // Check audio file
  const audioPath = path.join(config.audioDir, `${song.videoId}.mp3`);
  try {
    const stat = await fs.stat(audioPath);
    entry.files.audio = {
      source: audioPath,
      destination: `${ownerId}/audio/${song.videoId}.mp3`,
      sizeBytes: stat.size
    };
  } catch {
    console.warn(`   ⚠️  Missing audio: ${audioPath}`);
  }

  // Check stems
  const stemsPath = path.join(config.stemsDir, song.videoId);
  try {
    const stemFiles = await fs.readdir(stemsPath);
    entry.files.stems = [];
    for (const file of stemFiles) {
      if (file.endsWith('.mp3')) {
        const stemType = path.basename(file, '.mp3');
        const filePath = path.join(stemsPath, file);
        const stat = await fs.stat(filePath);
        entry.files.stems.push({
          type: stemType,
          source: filePath,
          destination: `${ownerId}/stems/${song.videoId}/${stemType}.mp3`,
          sizeBytes: stat.size
        });
      }
    }
  } catch {
    // No stems directory - that's okay
  }

  // Check lyrics
  const lyricsPath = path.join(config.lyricsDir, `${song.videoId}.lrc`);
  try {
    const stat = await fs.stat(lyricsPath);
    entry.files.lyrics = {
      source: lyricsPath,
      destination: `${ownerId}/lyrics/${song.videoId}.lrc`,
      sizeBytes: stat.size
    };
  } catch {
    // No lyrics - that's okay
  }

  return entry;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function countFiles(entry: any): number {
  let count = 0;
  if (entry.files.audio) count++;
  if (entry.files.stems) count += entry.files.stems.length;
  if (entry.files.lyrics) count++;
  return count;
}

function sumSizeBytes(entry: any): number {
  let sum = 0;
  if (entry.files.audio) sum += entry.files.audio.sizeBytes;
  if (entry.files.stems) {
    sum += entry.files.stems.reduce((acc: number, s: any) => acc + s.sizeBytes, 0);
  }
  if (entry.files.lyrics) sum += entry.files.lyrics.sizeBytes;
  return sum;
}

main().catch(console.error);
```

### Running the Script
```bash
# Set environment variables
export SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Dry run (default)
npx tsx backend/scripts/migrate-to-cloud.ts

# Execute migration
npx tsx backend/scripts/migrate-to-cloud.ts --migrate
```

## Verification
- Script runs without errors in dry-run mode
- Migration manifest accurately reflects all 17 songs and their files
- No files are uploaded during dry-run
- Missing files are reported as warnings
- Total size calculation is accurate

## Rollback
- Script is idempotent; can be re-run safely
- Manifest file preserved for audit trail
- No data modified during dry-run

## Testing Checklist
- [ ] Script connects to Supabase successfully
- [ ] Owner user ID resolved correctly
- [ ] All 17 songs detected from metadata
- [ ] Audio files scanned correctly
- [ ] Stem files detected when present
- [ ] Lyrics files detected when present
- [ ] Missing files reported as warnings
- [ ] Manifest JSON is valid and complete
- [ ] Total file count is accurate
- [ ] Total size calculation is correct

## Dependencies
- Supabase project with service role key
- Node.js with tsx for TypeScript execution
- Local file system access
- Owner account already created in Supabase

## Definition of Done
- [ ] Migration script created and tested
- [ ] Dry-run mode working correctly
- [ ] Manifest generation complete
- [ ] Connection validation implemented
- [ ] File scanning for all types
- [ ] Size reporting accurate
- [ ] Documentation for running script