import { capitalizeFirstLetter } from '@lib/utils/capitalizeFirstLetter'

import { Tonality } from '../tonality'

// Chord types
export const chordTypes = ['triad', '7th', '9th'] as const
export type ChordType = (typeof chordTypes)[number]

export const chordTypeNames: Record<ChordType, string> = {
  triad: 'Triad',
  '7th': '7th',
  '9th': '9th',
}

// Intervals for each chord type (scale degrees)
export const chordIntervals: Record<ChordType, number[]> = {
  triad: [1, 3, 5],
  '7th': [1, 3, 5, 7],
  '9th': [1, 2, 3, 5, 7], // 9th = 2nd scale degree (octave above)
}

// Legacy export for backward compatibility
export const triadIntervals = chordIntervals.triad

export const triadRomanNumerals: Record<Tonality, string[]> = {
  major: ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°'],
  minor: ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII'],
}

type ChordQuality = 'major' | 'minor' | 'diminished'

export const chordQualities: Record<Tonality, ChordQuality[]> = {
  major: ['major', 'minor', 'minor', 'major', 'major', 'minor', 'diminished'],
  minor: ['minor', 'diminished', 'major', 'minor', 'minor', 'major', 'major'],
}

export const diatonicTriadsNumber = triadRomanNumerals.major.length

export const getChordName = (
  index: number,
  tonality: Tonality = 'major',
  chordType: ChordType = 'triad',
) => {
  const numeral = triadRomanNumerals[tonality][index]
  const quality = chordQualities[tonality][index]

  const chordTypeSuffix =
    chordType === 'triad' ? 'Triad' : chordTypeNames[chordType]

  return [
    numeral,
    quality === 'major' ? capitalizeFirstLetter(quality) : quality,
    chordTypeSuffix,
  ].join(' ')
}

// Legacy export for backward compatibility
export const getTriadName = (index: number, tonality: Tonality = 'major') =>
  getChordName(index, tonality, 'triad')
