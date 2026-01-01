import { VStack } from '@lib/ui/css/stack'
import { rotateArray } from '@lib/utils/array/rotateArray'
import { getNoteFromPosition } from '@product/core/note/getNoteFromPosition'
import { getScaleName } from '@product/core/scale/getScaleName'
import { getScaleNotes } from '@product/core/scale/getScaleNotes'
import { getFullScalePattern } from '@product/core/scale/getScalePattern/full'
import { Scale } from '@product/core/scale/Scale'
import { scalePatterns } from '@product/core/scale/ScaleType'
import {
  ChordType,
  chordIntervals,
  getChordName,
} from '@product/core/triads'

import { Fretboard } from '../guitar/fretboard/Fretboard'
import { Note } from '../guitar/fretboard/Note'
import { SectionTitle } from '../ui/SectionTitle'

import { useTriad } from './state/triad'

type TriadOnScalePatternProps = {
  scalePatternIndex: number
  chordType: ChordType
}

export const TriadOnScalePattern = ({
  scalePatternIndex,
  chordType,
}: TriadOnScalePatternProps) => {
  const { rootNote, index: triadIndex, tonality } = useTriad()

  const scale: Scale = {
    tonality,
    rootNote,
    type: 'full',
  }

  const scalePattern = getFullScalePattern({
    scale,
    index: scalePatternIndex,
  })

  const scaleNotes = rotateArray(
    getScaleNotes({
      rootNote,
      pattern: scalePatterns.full[tonality],
    }),
    triadIndex,
  )

  const intervals = chordIntervals[chordType]

  const title = `${getChordName(triadIndex, tonality, chordType)} on ${getScaleName(scale)} Pattern #${
    scalePatternIndex + 1
  }`

  return (
    <VStack gap={40}>
      <SectionTitle>{title}</SectionTitle>
      <Fretboard>
        {scalePattern.map((position) => {
          const scaleDegree =
            scaleNotes.indexOf(getNoteFromPosition({ position })) + 1

          const isChordNote = intervals.includes(scaleDegree)

          return (
            <Note
              key={`${position.string}-${position.fret}`}
              {...position}
              kind={isChordNote ? 'primary' : undefined}
            >
              {scaleDegree}
            </Note>
          )
        })}
      </Fretboard>
    </VStack>
  )
}

// Keep backward compatibility alias
export const TriadOnMajorScalePattern = TriadOnScalePattern
