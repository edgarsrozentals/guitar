/**
 * Chordify Transformer
 *
 * Transforms raw Chordify data into our standard chord format.
 */

import * as cheerio from 'cheerio'

import {
  parseRawChords,
  parseMetadata,
  calculateFirstBeatOffset,
} from './scraper'

import type {
  RawChord,
  ChordEvent,
  ChordInfo,
  ChordifyImportResult,
  ChordifyMetadata,
} from './types'

/**
 * Map Chordify quality notation to our format
 */
const QUALITY_MAP: Record<string, string> = {
  maj: 'major',
  min: 'minor',
  '7': '7',
  maj7: 'maj7',
  min7: 'min7',
  dim: 'dim',
  aug: 'aug',
  sus4: 'sus4',
  sus2: 'sus2',
  add9: 'add9',
  '9': '9',
  '11': '11',
  '13': '13',
  '6': '6',
  min6: 'min6',
  dim7: 'dim7',
  hdim7: 'm7b5', // half-diminished
  '7sus4': '7sus4',
}

/**
 * Parse a chord handle like "G:min" into our format
 */
export function parseChordHandle(handle: string): ChordInfo | null {
  // Skip "N" (no chord / silence)
  if (handle === 'N') return null

  // Handle format: "Root:Quality" e.g., "G:min", "Bb:maj7"
  const colonIndex = handle.indexOf(':')
  if (colonIndex === -1) {
    // No quality specified, assume major
    return { root: handle, quality: 'major' }
  }

  const root = handle.substring(0, colonIndex)
  const rawQuality = handle.substring(colonIndex + 1)

  // Map quality to our format, fallback to raw if unknown
  const quality = QUALITY_MAP[rawQuality] || rawQuality

  return { root, quality }
}

/**
 * Collapse consecutive identical chords into single events
 * Includes rest markers ("N") to show empty bars/beats
 */
export function collapseChords(
  rawChords: RawChord[],
  bpm: number,
): ChordEvent[] {
  if (!bpm || bpm <= 0) return []

  const beatDuration = 60 / bpm
  const result: ChordEvent[] = []
  let lastHandle: string | null = null

  for (const raw of rawChords) {
    // Skip consecutive duplicates (including consecutive N's)
    if (raw.handle === lastHandle) continue

    if (raw.handle === 'N') {
      // Include rest marker with special "rest" quality
      result.push({
        time: raw.beatIndex * beatDuration,
        chord: { root: 'N', quality: 'rest' },
      })
      lastHandle = raw.handle
      continue
    }

    const parsed = parseChordHandle(raw.handle)
    if (parsed) {
      result.push({
        time: raw.beatIndex * beatDuration,
        chord: parsed,
      })
      lastHandle = raw.handle
    }
  }

  return result
}

/**
 * Transform HTML into complete ChordifyImportResult
 */
export function transformChordifyHtml(
  html: string,
  videoId: string,
): ChordifyImportResult {
  const $ = cheerio.load(html)

  // Parse raw data
  const rawChords = parseRawChords($)
  const metadata = parseMetadata($)

  // Ensure we have BPM for calculations
  const bpm = metadata.bpm || 120 // fallback

  // Calculate first beat offset
  const firstBeatOffset = calculateFirstBeatOffset(rawChords, bpm)

  // Transform chords
  const chords = collapseChords(rawChords, bpm)

  // Build complete metadata
  const fullMetadata: ChordifyMetadata = {
    title: metadata.title || 'Unknown Title',
    artist: metadata.artist || 'Unknown Artist',
    bpm,
    key: metadata.key || null,
    timeSignature: metadata.timeSignature || { beatsPerBar: 4 },
    duration: metadata.duration || 0,
    firstBeatOffset,
  }

  return {
    videoId,
    source: 'chordify',
    metadata: fullMetadata,
    chords,
    rawChordCount: rawChords.length,
  }
}

/**
 * Convert ChordifyImportResult to the format used in songs-metadata.json
 */
export function toSongMetadataFormat(result: ChordifyImportResult): {
  chords: ChordEvent[]
  tempo: {
    bpm: number
    firstBeatOffset: number
    beatsPerBar: number
  }
  key: ChordInfo | null
  chordifyMetadata: {
    title: string
    artist: string
    duration: number
    bpm: number // Chordify's BPM for beat alignment
    beatsPerBar: number
    key: ChordInfo | null // Chordify's detected key
    importedAt: string
  }
} {
  return {
    chords: result.chords,
    tempo: {
      bpm: result.metadata.bpm,
      firstBeatOffset: result.metadata.firstBeatOffset,
      beatsPerBar: result.metadata.timeSignature.beatsPerBar,
    },
    key: result.metadata.key,
    chordifyMetadata: {
      title: result.metadata.title,
      artist: result.metadata.artist,
      duration: result.metadata.duration,
      bpm: result.metadata.bpm, // Store Chordify's BPM for accurate beat alignment
      beatsPerBar: result.metadata.timeSignature.beatsPerBar,
      key: result.metadata.key, // Store Chordify's detected key
      importedAt: new Date().toISOString(),
    },
  }
}
