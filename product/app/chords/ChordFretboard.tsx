import {
  ChordShapeType,
  findShapeForPosition,
  shapeToFretPositions,
} from '@product/core/chords/cagedShapes'
import { ChordQuality } from '@product/core/chords/chordTypes'
import { getNoteFromPosition } from '@product/core/note/getNoteFromPosition'
import { useMemo } from 'react'

import { defaultVisibleFrets, Fretboard } from '../guitar/fretboard/Fretboard'
import { Note } from '../guitar/fretboard/Note'

import { useChords } from './state/chords'

type ChordFretboardProps = {
  position: number
  scaleOverlay?: React.ReactNode
}

// Map our chord qualities to CAGED shape types
const qualityToShapeType: Partial<Record<ChordQuality, ChordShapeType>> = {
  major: 'major',
  minor: 'minor',
  '7': '7',
  maj7: 'maj7',
  min7: 'min7',
  dim: 'dim',
  dim7: 'dim7',
  '9': '9',
  maj9: 'maj9',
  min9: 'min9',
}

export const ChordFretboard = ({
  position,
  scaleOverlay,
}: ChordFretboardProps) => {
  const { rootNote, quality } = useChords()

  const shapeType = qualityToShapeType[quality] || 'major'

  const chordData = useMemo(() => {
    return findShapeForPosition(rootNote, position, shapeType)
  }, [rootNote, position, shapeType])

  if (!chordData) {
    return (
      <Fretboard>
        {scaleOverlay}
        {null}
      </Fretboard>
    )
  }

  const { shape, rootFret } = chordData
  const fretPositions = shapeToFretPositions(shape, rootFret)

  const elements: React.ReactNode[] = []

  fretPositions.forEach((fret, stringIndex) => {
    if (fret === null) return // muted string

    // Convert fret to component format: 0 = first fret, -1 = open
    const componentFret = fret === 0 ? -1 : fret - 1

    // Skip notes beyond visible frets
    if (componentFret > defaultVisibleFrets.end) return

    // Check if this note is a root note (same pitch class as chord root)
    const noteAtPosition = getNoteFromPosition({
      position: { string: stringIndex, fret: componentFret },
    })
    const isRoot = noteAtPosition === rootNote

    elements.push(
      <Note
        key={`note-${stringIndex}-${componentFret}`}
        string={stringIndex}
        fret={componentFret}
        kind="primary"
        isRoot={isRoot}
      />,
    )
  })

  return (
    <Fretboard>
      {scaleOverlay}
      {elements}
    </Fretboard>
  )
}
