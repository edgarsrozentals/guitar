/**
 * Chord comparison logic for measuring AI detection accuracy against ground truth (Chordify)
 *
 * This module provides functions to compare detected chords with a reference "ground truth"
 * chord set (typically from Chordify's human-verified data).
 */

type Chord = {
  root: string
  quality: string
}

type ChordEvent = {
  time: number
  chord: Chord
}

export type Mismatch = {
  time: number
  groundTruth: { root: string; quality: string }
  detected: { root: string; quality: string }
  rootMatch: boolean
  qualityMatch: boolean
}

export type ComparisonResult = {
  totalBeats: number
  matchingBeats: number
  rootMatches: number
  qualityMatches: number
  overallAgreement: number // percentage
  rootAccuracy: number // percentage
  qualityAccuracy: number // percentage (when root matches)
  mismatches: Mismatch[]
}

/**
 * Enharmonic equivalents mapping - notes that sound the same but have different names
 * This maps all note names to a canonical form (0-11 representing semitones from C)
 */
const NOTE_TO_SEMITONE: Record<string, number> = {
  C: 0,
  'C#': 1,
  Db: 1,
  D: 2,
  'D#': 3,
  Eb: 3,
  E: 4,
  Fb: 4,
  'E#': 5,
  F: 5,
  'F#': 6,
  Gb: 6,
  G: 7,
  'G#': 8,
  Ab: 8,
  A: 9,
  'A#': 10,
  Bb: 10,
  B: 11,
  Cb: 11,
  'B#': 0,
}

/**
 * Check if two root notes are enharmonically equivalent
 */
export function areRootsEquivalent(root1: string, root2: string): boolean {
  const semitone1 = NOTE_TO_SEMITONE[root1]
  const semitone2 = NOTE_TO_SEMITONE[root2]

  // If either note is not recognized, do a direct string comparison
  if (semitone1 === undefined || semitone2 === undefined) {
    return root1.toLowerCase() === root2.toLowerCase()
  }

  return semitone1 === semitone2
}

/**
 * Normalize chord quality to a canonical form for comparison
 * Different libraries may use different names for the same quality
 */
const QUALITY_ALIASES: Record<string, string> = {
  major: 'major',
  maj: 'major',
  M: 'major',
  '': 'major',

  minor: 'minor',
  min: 'minor',
  m: 'minor',

  '7': '7',
  dom7: '7',

  maj7: 'maj7',
  M7: 'maj7',

  min7: 'min7',
  m7: 'min7',

  dim: 'dim',
  diminished: 'dim',
  o: 'dim',

  aug: 'aug',
  augmented: 'aug',
  '+': 'aug',

  sus4: 'sus4',
  sus: 'sus4',

  sus2: 'sus2',
}

/**
 * Normalize a chord quality string to a canonical form
 */
export function normalizeQuality(quality: string): string {
  const normalized = QUALITY_ALIASES[quality]
  return normalized !== undefined ? normalized : quality.toLowerCase()
}

/**
 * Check if two chord qualities are equivalent
 */
export function areQualitiesEquivalent(
  quality1: string,
  quality2: string,
): boolean {
  return normalizeQuality(quality1) === normalizeQuality(quality2)
}

/**
 * Get the chord at a specific time from a chord sequence
 * Uses binary search for efficiency
 */
export function getChordAtTime(
  chords: ChordEvent[],
  time: number,
): ChordEvent | null {
  if (chords.length === 0) return null

  // Binary search for the chord that is active at this time
  let left = 0
  let right = chords.length - 1

  while (left < right) {
    const mid = Math.floor((left + right + 1) / 2)
    if (chords[mid].time <= time) {
      left = mid
    } else {
      right = mid - 1
    }
  }

  // Return the chord if we found one that starts at or before the given time
  if (chords[left].time <= time) {
    return chords[left]
  }

  return null
}

/**
 * Generate sampling points based on BPM
 * If no BPM is provided, samples every 0.5 seconds
 */
export function generateSamplePoints(
  duration: number,
  bpm?: number,
  beats?: number[],
): number[] {
  // If we have explicit beat timestamps, use those
  if (beats && beats.length > 0) {
    return beats.filter((beat) => beat <= duration)
  }

  // If we have BPM, calculate beat intervals
  if (bpm && bpm > 0) {
    const beatInterval = 60 / bpm
    const points: number[] = []
    for (let t = 0; t < duration; t += beatInterval) {
      points.push(t)
    }
    return points
  }

  // Fallback: sample every 0.5 seconds
  const points: number[] = []
  for (let t = 0; t < duration; t += 0.5) {
    points.push(t)
  }
  return points
}

export type CompareInput = {
  groundTruth: ChordEvent[]
  detected: ChordEvent[]
  duration: number
  bpm?: number
  beats?: number[]
}

/**
 * Compare detected chords against ground truth
 * Samples at beat intervals and calculates accuracy metrics
 */
export function compareChords({
  groundTruth,
  detected,
  duration,
  bpm,
  beats,
}: CompareInput): ComparisonResult {
  if (groundTruth.length === 0 || detected.length === 0) {
    return {
      totalBeats: 0,
      matchingBeats: 0,
      rootMatches: 0,
      qualityMatches: 0,
      overallAgreement: 0,
      rootAccuracy: 0,
      qualityAccuracy: 0,
      mismatches: [],
    }
  }

  const samplePoints = generateSamplePoints(duration, bpm, beats)
  const totalBeats = samplePoints.length

  let matchingBeats = 0
  let rootMatches = 0
  let qualityMatches = 0
  const mismatches: Mismatch[] = []

  for (const time of samplePoints) {
    const gtChord = getChordAtTime(groundTruth, time)
    const detChord = getChordAtTime(detected, time)

    // Skip if either chord is missing (shouldn't happen normally)
    if (!gtChord || !detChord) {
      continue
    }

    const rootMatch = areRootsEquivalent(
      gtChord.chord.root,
      detChord.chord.root,
    )
    const qualityMatch = areQualitiesEquivalent(
      gtChord.chord.quality,
      detChord.chord.quality,
    )

    if (rootMatch) {
      rootMatches++
      if (qualityMatch) {
        qualityMatches++
        matchingBeats++
      } else {
        // Root matches but quality doesn't
        mismatches.push({
          time,
          groundTruth: {
            root: gtChord.chord.root,
            quality: gtChord.chord.quality,
          },
          detected: {
            root: detChord.chord.root,
            quality: detChord.chord.quality,
          },
          rootMatch: true,
          qualityMatch: false,
        })
      }
    } else {
      // Root doesn't match
      mismatches.push({
        time,
        groundTruth: {
          root: gtChord.chord.root,
          quality: gtChord.chord.quality,
        },
        detected: {
          root: detChord.chord.root,
          quality: detChord.chord.quality,
        },
        rootMatch: false,
        qualityMatch: false, // Quality match is meaningless when root differs
      })
    }
  }

  // Calculate percentages
  const overallAgreement =
    totalBeats > 0 ? Math.round((matchingBeats / totalBeats) * 100) : 0
  const rootAccuracy =
    totalBeats > 0 ? Math.round((rootMatches / totalBeats) * 100) : 0
  // Quality accuracy is calculated only when root matches
  const qualityAccuracy =
    rootMatches > 0 ? Math.round((qualityMatches / rootMatches) * 100) : 0

  return {
    totalBeats,
    matchingBeats,
    rootMatches,
    qualityMatches,
    overallAgreement,
    rootAccuracy,
    qualityAccuracy,
    mismatches,
  }
}

/**
 * Format a chord for display
 */
export function formatChord(chord: { root: string; quality: string }): string {
  if (chord.quality === 'major' || chord.quality === '') {
    return chord.root
  }
  if (chord.quality === 'minor') {
    return `${chord.root}m`
  }
  return `${chord.root}${chord.quality}`
}
