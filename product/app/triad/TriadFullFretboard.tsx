import { range } from '@lib/utils/array/range'
import { rotateArray } from '@lib/utils/array/rotateArray'
import { intervalRange } from '@lib/utils/interval/intervalRange'
import { standardTuning } from '@product/core/guitar/tuning'
import { chromaticNotesNumber } from '@product/core/note'
import { getScaleNotes } from '@product/core/scale/getScaleNotes'
import { scalePatterns } from '@product/core/scale/ScaleType'
import { ChordType, chordIntervals } from '@product/core/triads'

import { defaultVisibleFrets, Fretboard } from '../guitar/fretboard/Fretboard'
import { Note } from '../guitar/fretboard/Note'

import { useTriad } from './state/triad'

type TriadFullFretboardProps = {
  chordType: ChordType
}

export const TriadFullFretboard = ({ chordType }: TriadFullFretboardProps) => {
  const { rootNote, index: triadIndex, tonality } = useTriad()

  const pattern = scalePatterns.full[tonality]

  const scaleNotes = getScaleNotes({
    pattern,
    rootNote,
  })

  // Rotate scale notes to start from the chord root
  const rotatedScaleNotes = rotateArray(scaleNotes, triadIndex)
  const intervals = chordIntervals[chordType]

  return (
    <Fretboard>
      {range(standardTuning.length).map((string) => {
        const openNote = standardTuning[string]
        return intervalRange(defaultVisibleFrets).map((fret) => {
          const note = (openNote + fret + 1) % chromaticNotesNumber

          if (scaleNotes.includes(note)) {
            // Calculate scale degree relative to chord root
            const scaleDegree = rotatedScaleNotes.indexOf(note) + 1
            const isChordNote = intervals.includes(scaleDegree)

            return (
              <Note
                key={`${string}-${fret}`}
                string={string}
                fret={fret}
                kind={isChordNote ? 'primary' : undefined}
              >
                {scaleDegree}
              </Note>
            )
          }

          return null
        })
      })}
    </Fretboard>
  )
}
