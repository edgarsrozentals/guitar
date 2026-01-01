// Chord quality definitions with semitone intervals from root
export const chordQualities = [
  'major',
  'minor',
  '7',
  'maj7',
  'min7',
  'dim',
  'dim7',
  'aug',
  '9',
  'maj9',
  'min9',
] as const

export type ChordQuality = (typeof chordQualities)[number]

export const chordQualityNames: Record<ChordQuality, string> = {
  major: 'Major',
  minor: 'Minor',
  '7': '7',
  maj7: 'Maj7',
  min7: 'Min7',
  dim: 'Dim',
  dim7: 'Dim7',
  aug: 'Aug',
  '9': '9',
  maj9: 'Maj9',
  min9: 'Min9',
}

// Chord symbol suffixes for chord-fingering library
export const chordQualitySuffixes: Record<ChordQuality, string> = {
  major: '',
  minor: 'm',
  '7': '7',
  maj7: 'maj7',
  min7: 'm7',
  dim: 'dim',
  dim7: 'dim7',
  aug: 'aug',
  '9': '9',
  maj9: 'maj9',
  min9: 'm9',
}

// Intervals in semitones from root
export const chordIntervalsSemitones: Record<ChordQuality, number[]> = {
  major: [0, 4, 7],           // 1, 3, 5
  minor: [0, 3, 7],           // 1, b3, 5
  '7': [0, 4, 7, 10],         // 1, 3, 5, b7 (dominant 7th)
  maj7: [0, 4, 7, 11],        // 1, 3, 5, 7
  min7: [0, 3, 7, 10],        // 1, b3, 5, b7
  dim: [0, 3, 6],             // 1, b3, b5
  dim7: [0, 3, 6, 9],         // 1, b3, b5, bb7 (fully diminished)
  aug: [0, 4, 8],             // 1, 3, #5
  '9': [0, 4, 7, 10, 14],     // 1, 3, 5, b7, 9
  maj9: [0, 4, 7, 11, 14],    // 1, 3, 5, 7, 9
  min9: [0, 3, 7, 10, 14],    // 1, b3, 5, b7, 9
}

// Get all notes (0-11) that belong to a chord
export const getChordNotes = (
  rootNote: number,
  quality: ChordQuality,
): number[] => {
  const intervals = chordIntervalsSemitones[quality]
  return intervals.map((interval) => (rootNote + interval) % 12)
}

// Interval names for display
export const intervalNames: Record<number, string> = {
  0: 'R',   // Root
  1: 'b2',
  2: '2',
  3: 'b3',
  4: '3',
  5: '4',
  6: 'b5',
  7: '5',
  8: '#5',
  9: '6',
  10: 'b7',
  11: '7',
  12: 'R',  // Octave
  13: 'b9',
  14: '9',
}

// Get interval name for a note relative to root
export const getIntervalName = (
  note: number,
  rootNote: number,
  quality: ChordQuality,
): string | null => {
  const intervals = chordIntervalsSemitones[quality]
  const semitones = (note - rootNote + 12) % 12

  // Check if this semitone distance matches any chord interval
  const matchingInterval = intervals.find(
    (interval) => interval % 12 === semitones,
  )

  if (matchingInterval !== undefined) {
    return intervalNames[matchingInterval] || intervalNames[semitones]
  }

  return null
}
