/**
 * Chordify Ground Truth Integration - Type Definitions
 *
 * Types for scraping and transforming chord data from Chordify.net
 */

/** Raw chord data extracted from HTML */
export type RawChord = {
  handle: string // e.g., "G:min", "D:7", "Bb:maj", "N"
  beatIndex: number
}

/** Parsed chord in our standard format */
export type ChordInfo = {
  root: string // e.g., "G", "Bb", "F#"
  quality: string // e.g., "minor", "major", "7", "maj7"
}

/** Chord event with timestamp */
export type ChordEvent = {
  time: number
  chord: ChordInfo
}

/** Song metadata extracted from Chordify */
export type ChordifyMetadata = {
  title: string
  artist: string
  bpm: number
  key: ChordInfo | null
  timeSignature: {
    beatsPerBar: number
  }
  duration: number // in seconds
  firstBeatOffset: number // calculated from "N" entries
}

/** Complete result from Chordify import */
export type ChordifyImportResult = {
  videoId: string
  source: 'chordify'
  metadata: ChordifyMetadata
  chords: ChordEvent[]
  rawChordCount: number // total beats including "N" entries
}

/** Error types for Chordify scraping */
export type ChordifyError = {
  type: 'NOT_FOUND' | 'PARSE_ERROR' | 'NETWORK_ERROR'
  message: string
  details?: string
}
