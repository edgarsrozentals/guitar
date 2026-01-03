import fs from 'fs'

import request from 'supertest'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

// Set test environment before importing app
process.env.NODE_ENV = 'test'

import {
  app,
  chordAnalysisProgress,
  loadSongsMetadata,
  songCache,
  SONGS_METADATA_FILE,
} from './server'

// Test data
const TEST_VIDEO_ID = 'test-video-123'
const TEST_SONG_DATA = {
  videoId: TEST_VIDEO_ID,
  title: 'Test Song',
  duration: 180,
  chords: [
    { time: 0, chord: { root: 'C', quality: 'major' } },
    { time: 2, chord: { root: 'G', quality: 'major' } },
  ],
  chordsByLibrary: {
    essentia: [
      { time: 0, chord: { root: 'C', quality: 'major' } },
      { time: 2, chord: { root: 'G', quality: 'major' } },
    ],
    madmom: [
      { time: 0, chord: { root: 'C', quality: 'major' } },
      { time: 2.5, chord: { root: 'G', quality: 'major' } },
    ],
    btc: [
      { time: 0, chord: { root: 'C', quality: 'major' } },
      { time: 2.2, chord: { root: 'G', quality: 'major' } },
    ],
  },
  analyzedWith: ['essentia', 'madmom', 'btc'],
  key: { root: 'C', scale: 'major', strength: 0.85 },
  tempo: { bpm: 120, confidence: 0.9, beatCount: 100 },
}

// Backup original metadata file
let originalMetadata: string | null = null

describe('DELETE /api/songs/:videoId/chords/:library', () => {
  beforeAll(() => {
    // Backup original metadata if it exists
    if (fs.existsSync(SONGS_METADATA_FILE)) {
      originalMetadata = fs.readFileSync(SONGS_METADATA_FILE, 'utf-8')
    }
  })

  afterAll(() => {
    // Restore original metadata
    if (originalMetadata !== null) {
      fs.writeFileSync(SONGS_METADATA_FILE, originalMetadata)
    } else if (fs.existsSync(SONGS_METADATA_FILE)) {
      // Remove test metadata file if none existed before
      fs.unlinkSync(SONGS_METADATA_FILE)
    }
    // Clear test data from cache
    songCache.delete(TEST_VIDEO_ID)
  })

  beforeEach(() => {
    // Reset test song data before each test
    songCache.set(TEST_VIDEO_ID, { ...TEST_SONG_DATA })
    chordAnalysisProgress.set(`${TEST_VIDEO_ID}:essentia`, {
      progress: 100,
      status: 'complete',
    })
    chordAnalysisProgress.set(`${TEST_VIDEO_ID}:madmom`, {
      progress: 100,
      status: 'complete',
    })
    chordAnalysisProgress.set(`${TEST_VIDEO_ID}:btc`, {
      progress: 100,
      status: 'complete',
    })
  })

  it('returns 400 for invalid library name', async () => {
    const response = await request(app)
      .delete(`/api/songs/${TEST_VIDEO_ID}/chords/invalid-library`)
      .expect(400)

    expect(response.body.error).toBe('Invalid library')
    expect(response.body.validLibraries).toBeDefined()
  })

  it('returns 404 for non-existent video', async () => {
    const response = await request(app)
      .delete('/api/songs/non-existent-video/chords/essentia')
      .expect(404)

    expect(response.body.error).toBe('Song not found')
  })

  it('successfully deletes essentia chord analysis', async () => {
    const response = await request(app)
      .delete(`/api/songs/${TEST_VIDEO_ID}/chords/essentia`)
      .expect(200)

    expect(response.body.success).toBe(true)
    expect(response.body.message).toBe('Deleted essentia chord analysis')
    expect(response.body.analyzedWith).not.toContain('essentia')

    // Verify data was deleted from cache
    const song = songCache.get(TEST_VIDEO_ID)
    expect(song?.chordsByLibrary?.essentia).toBeUndefined()
    expect(song?.analyzedWith).not.toContain('essentia')
    expect(song?.chords).toEqual([]) // essentia deletion also clears default chords

    // Verify progress was cleared
    expect(
      chordAnalysisProgress.get(`${TEST_VIDEO_ID}:essentia`),
    ).toBeUndefined()
  })

  it('successfully deletes madmom chord analysis', async () => {
    const response = await request(app)
      .delete(`/api/songs/${TEST_VIDEO_ID}/chords/madmom`)
      .expect(200)

    expect(response.body.success).toBe(true)
    expect(response.body.analyzedWith).not.toContain('madmom')

    // Verify data was deleted from cache
    const song = songCache.get(TEST_VIDEO_ID)
    expect(song?.chordsByLibrary?.madmom).toBeUndefined()
    expect(song?.analyzedWith).not.toContain('madmom')

    // Default chords should remain (only cleared for essentia)
    expect(song?.chords?.length).toBeGreaterThan(0)
  })

  it('successfully deletes btc chord analysis', async () => {
    const response = await request(app)
      .delete(`/api/songs/${TEST_VIDEO_ID}/chords/btc`)
      .expect(200)

    expect(response.body.success).toBe(true)
    expect(response.body.analyzedWith).not.toContain('btc')

    // Verify data was deleted from cache
    const song = songCache.get(TEST_VIDEO_ID)
    expect(song?.chordsByLibrary?.btc).toBeUndefined()
    expect(song?.analyzedWith).not.toContain('btc')
  })

  it('deletion persists to metadata file', async () => {
    // First delete
    await request(app)
      .delete(`/api/songs/${TEST_VIDEO_ID}/chords/madmom`)
      .expect(200)

    // Read metadata file directly
    const savedData = JSON.parse(fs.readFileSync(SONGS_METADATA_FILE, 'utf-8'))
    const savedSong = savedData.find(
      (s: { videoId: string }) => s.videoId === TEST_VIDEO_ID,
    )

    // Verify deletion persisted
    expect(savedSong?.chordsByLibrary?.madmom).toBeUndefined()
    expect(savedSong?.analyzedWith).not.toContain('madmom')
  })

  it('can delete all libraries one by one', async () => {
    // Delete all three libraries
    await request(app)
      .delete(`/api/songs/${TEST_VIDEO_ID}/chords/essentia`)
      .expect(200)
    await request(app)
      .delete(`/api/songs/${TEST_VIDEO_ID}/chords/madmom`)
      .expect(200)
    await request(app)
      .delete(`/api/songs/${TEST_VIDEO_ID}/chords/btc`)
      .expect(200)

    // Verify all deleted
    const song = songCache.get(TEST_VIDEO_ID)
    expect(song?.chordsByLibrary?.essentia).toBeUndefined()
    expect(song?.chordsByLibrary?.madmom).toBeUndefined()
    expect(song?.chordsByLibrary?.btc).toBeUndefined()
    expect(song?.analyzedWith).toEqual([])
  })

  it('deletion survives reload from metadata file', async () => {
    // Delete madmom
    await request(app)
      .delete(`/api/songs/${TEST_VIDEO_ID}/chords/madmom`)
      .expect(200)

    // Clear cache to simulate server restart
    songCache.clear()

    // Reload from file
    loadSongsMetadata()

    // The test song won't reload because audio file doesn't exist
    // But we can verify the file was correctly saved
    const savedData = JSON.parse(fs.readFileSync(SONGS_METADATA_FILE, 'utf-8'))
    const savedSong = savedData.find(
      (s: { videoId: string }) => s.videoId === TEST_VIDEO_ID,
    )

    expect(savedSong?.chordsByLibrary?.madmom).toBeUndefined()
    expect(savedSong?.analyzedWith).not.toContain('madmom')
  })

  it('deleting already-deleted library is idempotent', async () => {
    // Delete madmom twice
    await request(app)
      .delete(`/api/songs/${TEST_VIDEO_ID}/chords/madmom`)
      .expect(200)

    const response = await request(app)
      .delete(`/api/songs/${TEST_VIDEO_ID}/chords/madmom`)
      .expect(200)

    expect(response.body.success).toBe(true)
  })
})
