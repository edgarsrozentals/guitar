import { Tonality } from '../tonality'

// Roman numerals for scale degrees
const romanNumerals = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII']

// Scale degree qualities in major scale (1-indexed)
// Major: I, IV, V are major; ii, iii, vi are minor; vii° is diminished
const majorScaleQualities: ('major' | 'minor' | 'dim')[] = [
  'major', // I
  'minor', // ii
  'minor', // iii
  'major', // IV
  'major', // V
  'minor', // vi
  'dim', // vii°
]

// Scale degree qualities in minor scale
// Minor: i, iv, v are minor; III, VI, VII are major; ii° is diminished
const minorScaleQualities: ('major' | 'minor' | 'dim')[] = [
  'minor', // i
  'dim', // ii°
  'major', // III
  'minor', // iv
  'minor', // v
  'major', // VI
  'major', // VII
]

// Semitone intervals in major scale: W W H W W W H (2 2 1 2 2 2 1)
const majorScaleIntervals = [0, 2, 4, 5, 7, 9, 11]
// Semitone intervals in natural minor scale: W H W W H W W (2 1 2 2 1 2 2)
const minorScaleIntervals = [0, 2, 3, 5, 7, 8, 10]

type ScaleDegreeInfo = {
  degree: number // 1-7, or null if not in scale
  roman: string // e.g., "I", "ii", "IV", "vii°"
  quality: 'major' | 'minor' | 'dim'
} | null

export const getScaleDegree = (
  noteIndex: number, // 0-11, the note to check
  scaleRoot: number, // 0-11, root of the scale
  tonality: Tonality,
): ScaleDegreeInfo => {
  const intervals =
    tonality === 'major' ? majorScaleIntervals : minorScaleIntervals
  const qualities =
    tonality === 'major' ? majorScaleQualities : minorScaleQualities

  // Calculate the interval from the scale root to this note
  const interval = (noteIndex - scaleRoot + 12) % 12

  // Find which scale degree this interval corresponds to
  const degreeIndex = intervals.indexOf(interval)

  if (degreeIndex === -1) {
    // Note is not in the scale
    return null
  }

  const quality = qualities[degreeIndex]
  let roman = romanNumerals[degreeIndex]

  // Lowercase for minor, add ° for diminished
  if (quality === 'minor') {
    roman = roman.toLowerCase()
  } else if (quality === 'dim') {
    roman = roman.toLowerCase() + '°'
  }

  return {
    degree: degreeIndex + 1,
    roman,
    quality,
  }
}
