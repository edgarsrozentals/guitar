# Story 4.2: Demo Songs Storage Bucket and Content Seeding

**Epic:** Demo Songs & Public Access
**Priority:** P1 - High
**Size:** Large
**Backend Required:** Yes

## User Story

As a product owner,
I want demo songs pre-loaded with full analysis data,
So that visitors can immediately experience all app features.

## Technical Context

Demo songs are fully pre-analyzed and stored in a public bucket. This story covers bucket setup and the seeding process to populate demo content.

## Acceptance Criteria

### Storage Bucket Configuration

**Given** Supabase storage is configured
**When** the demo-songs bucket is created
**Then**:
- Bucket named "demo-songs" exists
- Public read access enabled
- Write access restricted to service role only
- No authentication required to read files

### Bucket Structure

**Given** the demo-songs bucket exists
**When** files are organized
**Then** the following structure is used:
```
demo-songs/
├── {videoId}/
│   ├── audio.mp3
│   ├── stems/
│   │   ├── vocals.mp3
│   │   ├── backing.mp3
│   │   ├── drums.mp3
│   │   └── bass.mp3
│   └── thumbnail.jpg (optional)
```

### Curated Demo Selection

**Given** the product owner selects demo songs
**When** reviewing criteria
**Then** demos should:
- Be copyright-free or have appropriate licensing
- Represent different genres/styles
- Have clear chord progressions for learning
- Be 3-5 minutes in length
- Have good audio quality

### Seeding Script

**Given** demo audio files are ready
**When** admin runs the seeding script
**Then**:
- 3 curated demo songs are uploaded to demo-songs bucket
- Audio files stored at `{videoId}/audio.mp3`
- Backing tracks stored at `{videoId}/stems/backing.mp3`
- All other stems stored appropriately
- demo_songs table populated with pre-analyzed data

### Pre-Analyzed Data

**Given** demo audio files are uploaded
**When** admin runs the seeding script
**Then**:
- Chord data for all libraries (essentia, madmom, btc) is stored
- Tempo and beat grid information included
- Key signature detection results included
- Lyrics with word-level timestamps included
- All data stored in JSONB format in database

### Demo Song Loading Time

**Given** demo songs are seeded
**When** any user visits the demo player
**Then**:
- All demo songs load within 2 seconds
- No analysis or processing required
- Audio streams immediately

## Implementation Notes

### Bucket Configuration
```typescript
// scripts/setup-demo-bucket.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function setupDemoBucket() {
  console.log('Creating demo-songs bucket...');

  // Create bucket with public access
  const { error: createError } = await supabase.storage.createBucket('demo-songs', {
    public: true, // Public read access
    fileSizeLimit: 100 * 1024 * 1024 // 100MB
  });

  if (createError && !createError.message.includes('already exists')) {
    throw createError;
  }

  console.log('✓ demo-songs bucket ready');
}

setupDemoBucket().catch(console.error);
```

### Demo Songs Manifest
```typescript
// scripts/demo-songs-manifest.ts
export interface DemoSongManifest {
  videoId: string;
  title: string;
  artist: string;
  description: string;
  displayOrder: number;
  files: {
    audio: string; // Local path
    stems?: Record<string, string>;
    lyrics?: string;
  };
  preAnalyzed: {
    chords: {
      essentia: any[];
      madmom: any[];
      btc: any[];
    };
    tempo: {
      bpm: number;
      beats: number[];
    };
    key: {
      root: string;
      scale: string;
      confidence: number;
    };
    lyrics?: {
      lrcContent: string;
    };
  };
  durationSeconds: number;
}

// Example demo songs (replace with actual selections)
export const DEMO_SONGS: DemoSongManifest[] = [
  {
    videoId: 'demo-blues-shuffle',
    title: 'Blues Shuffle in A',
    artist: 'Guitar App Demo',
    description: 'Classic 12-bar blues progression - great for learning blues guitar',
    displayOrder: 1,
    files: {
      audio: './demo-content/blues-shuffle.mp3',
      stems: {
        vocals: './demo-content/blues-shuffle-stems/vocals.mp3',
        backing: './demo-content/blues-shuffle-stems/backing.mp3',
        drums: './demo-content/blues-shuffle-stems/drums.mp3',
        bass: './demo-content/blues-shuffle-stems/bass.mp3'
      }
    },
    preAnalyzed: {
      chords: {
        essentia: [
          { time: 0, chord: { root: 'A', quality: '7' } },
          { time: 4, chord: { root: 'A', quality: '7' } },
          // ... full chord analysis
        ],
        madmom: [/* ... */],
        btc: [/* ... */]
      },
      tempo: {
        bpm: 120,
        beats: [0.5, 1.0, 1.5, 2.0 /* ... */]
      },
      key: {
        root: 'A',
        scale: 'major', // Blues uses major scale with blue notes
        confidence: 0.92
      }
    },
    durationSeconds: 180
  },
  {
    videoId: 'demo-acoustic-ballad',
    title: 'Acoustic Ballad in G',
    artist: 'Guitar App Demo',
    description: 'Gentle fingerpicking pattern with common chord progressions',
    displayOrder: 2,
    // ... configuration
  },
  {
    videoId: 'demo-rock-rhythm',
    title: 'Rock Rhythm in E',
    artist: 'Guitar App Demo',
    description: 'Power chords and rock rhythm patterns for beginners',
    displayOrder: 3,
    // ... configuration
  }
];
```

### Seeding Script
```typescript
// scripts/seed-demo-songs.ts
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { DEMO_SONGS, DemoSongManifest } from './demo-songs-manifest';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function seedDemoSongs() {
  console.log('🎸 Seeding demo songs...\n');

  for (const demo of DEMO_SONGS) {
    console.log(`\n📀 Processing: ${demo.title}`);
    await seedDemoSong(demo);
  }

  console.log('\n✅ Demo songs seeded successfully!');
}

async function seedDemoSong(demo: DemoSongManifest) {
  try {
    // 1. Upload audio file
    console.log('   Uploading audio...');
    const audioPath = `${demo.videoId}/audio.mp3`;
    const audioBuffer = await fs.readFile(demo.files.audio);
    await uploadFile('demo-songs', audioPath, audioBuffer, 'audio/mpeg');

    // 2. Upload stems if available
    const stemPaths: Record<string, string> = {};
    if (demo.files.stems) {
      console.log('   Uploading stems...');
      for (const [type, localPath] of Object.entries(demo.files.stems)) {
        const remotePath = `${demo.videoId}/stems/${type}.mp3`;
        const buffer = await fs.readFile(localPath);
        await uploadFile('demo-songs', remotePath, buffer, 'audio/mpeg');
        stemPaths[type] = remotePath;
      }
    }

    // 3. Create database record
    console.log('   Creating database record...');
    const { error: dbError } = await supabase
      .from('demo_songs')
      .upsert({
        video_id: demo.videoId,
        title: demo.title,
        artist: demo.artist,
        description: demo.description,
        display_order: demo.displayOrder,
        is_active: true,
        audio_storage_path: audioPath,
        chords: demo.preAnalyzed.chords,
        stems: Object.keys(stemPaths).length > 0 ? stemPaths : null,
        lyrics: demo.preAnalyzed.lyrics || null,
        tempo: demo.preAnalyzed.tempo,
        key_signature: demo.preAnalyzed.key,
        duration_seconds: demo.durationSeconds
      }, {
        onConflict: 'video_id'
      });

    if (dbError) throw dbError;

    console.log(`   ✓ ${demo.title} seeded successfully`);

  } catch (error) {
    console.error(`   ✗ Failed to seed ${demo.title}:`, error);
    throw error;
  }
}

async function uploadFile(
  bucket: string,
  path: string,
  buffer: Buffer,
  contentType: string
) {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, buffer, {
      contentType,
      upsert: true
    });

  if (error) throw error;
}

seedDemoSongs().catch(console.error);
```

### Verification Script
```typescript
// scripts/verify-demo-songs.ts
async function verifyDemoSongs() {
  console.log('🔍 Verifying demo songs...\n');

  // Check database records
  const { data: songs, error } = await supabase
    .from('demo_songs')
    .select('*')
    .order('display_order');

  if (error) throw error;

  console.log(`Found ${songs.length} demo songs in database\n`);

  for (const song of songs) {
    console.log(`📀 ${song.title}`);

    // Check audio file
    const { data: audioUrl } = supabase.storage
      .from('demo-songs')
      .getPublicUrl(song.audio_storage_path);

    const audioResponse = await fetch(audioUrl.publicUrl, { method: 'HEAD' });
    console.log(`   Audio: ${audioResponse.ok ? '✓' : '✗'}`);

    // Check stems
    if (song.stems) {
      for (const [type, path] of Object.entries(song.stems)) {
        const { data: stemUrl } = supabase.storage
          .from('demo-songs')
          .getPublicUrl(path as string);
        const stemResponse = await fetch(stemUrl.publicUrl, { method: 'HEAD' });
        console.log(`   Stem ${type}: ${stemResponse.ok ? '✓' : '✗'}`);
      }
    }

    // Check data completeness
    console.log(`   Chords: ${song.chords ? '✓' : '✗'}`);
    console.log(`   Tempo: ${song.tempo ? '✓' : '✗'}`);
    console.log(`   Key: ${song.key_signature ? '✓' : '✗'}`);
  }
}

verifyDemoSongs().catch(console.error);
```

## Testing Checklist
- [ ] demo-songs bucket created with public access
- [ ] Audio files uploadable via seeding script
- [ ] Stem files uploadable via seeding script
- [ ] Database records created with all fields
- [ ] Public URLs accessible without auth
- [ ] Files load within 2 seconds
- [ ] All 3 demo songs verified complete
- [ ] Chord data stored and retrievable
- [ ] Tempo/beat data stored
- [ ] Key signature data stored

## Dependencies
- Supabase Storage configured
- Demo audio files prepared (copyright-free)
- Pre-analyzed chord/tempo/key data
- Story 4.1 (Database Schema) complete

## Definition of Done
- [ ] Storage bucket created and configured
- [ ] 3 demo songs selected and prepared
- [ ] Audio files uploaded to bucket
- [ ] Stem files uploaded (if available)
- [ ] Database records populated
- [ ] Pre-analyzed data complete
- [ ] Verification script passes
- [ ] Demo songs load quickly in browser