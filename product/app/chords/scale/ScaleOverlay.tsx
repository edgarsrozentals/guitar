import { range } from '@lib/utils/array/range'
import { intervalRange } from '@lib/utils/interval/intervalRange'
import { standardTuning } from '@product/core/guitar/tuning'
import { chromaticNotesNames, chromaticNotesNumber } from '@product/core/note'
import { getBlueNote } from '@product/core/scale/blues/getBlueNote'
import { getScaleNotes } from '@product/core/scale/getScaleNotes'
import { ScalePattern } from '@product/core/scale/ScalePattern'
import { ScaleType } from '@product/core/scale/ScaleType'
import { Tonality } from '@product/core/tonality'

import { defaultVisibleFrets } from '../../guitar/fretboard/Fretboard'

import { ScaleOverlayNote } from './ScaleOverlayNote'

type ScaleOverlayProps = {
  rootNote: number
  pattern: ScalePattern
  scaleType?: ScaleType
  tonality?: Tonality
}

export const ScaleOverlay = ({
  rootNote,
  pattern,
  scaleType,
  tonality,
}: ScaleOverlayProps) => {
  const scaleNotes = getScaleNotes({ rootNote, pattern })

  // Calculate the blue note if this is a blues scale
  const blueNote =
    scaleType === 'blues' && tonality
      ? getBlueNote({ rootNote, tonality })
      : null

  const elements: React.ReactNode[] = []

  // Iterate through all strings and frets
  range(standardTuning.length).forEach((string) => {
    const openNote = standardTuning[string]

    // Include open string (-1) and all visible frets
    intervalRange(defaultVisibleFrets).forEach((fret) => {
      // Calculate the note at this position
      // For open string (fret -1), use the open note directly
      // For fretted notes, add fret + 1 to the open note
      const note =
        fret === -1 ? openNote : (openNote + fret + 1) % chromaticNotesNumber

      // Check if this note is in the scale
      if (scaleNotes.includes(note)) {
        const isRoot = note === rootNote
        const isBlueNote = blueNote !== null && note === blueNote
        const noteName = chromaticNotesNames[note]

        elements.push(
          <ScaleOverlayNote
            key={`scale-${string}-${fret}`}
            string={string}
            fret={fret}
            isRoot={isRoot}
            isBlueNote={isBlueNote}
            noteName={noteName}
          />,
        )
      }
    })
  })

  return <>{elements}</>
}
