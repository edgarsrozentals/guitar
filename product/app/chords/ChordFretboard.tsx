import {
  CAGEDShapeName,
  ChordShapeType,
  findShapeForPosition,
  getShapesForType,
  getRootPositionsForNote,
  shapeToFretPositions,
} from '@product/core/chords/cagedShapes'
import { ChordQuality } from '@product/core/chords/chordTypes'
import { getNoteFromPosition } from '@product/core/note/getNoteFromPosition'
import { useMemo } from 'react'

import { defaultVisibleFrets, Fretboard } from '../guitar/fretboard/Fretboard'
import { Note } from '../guitar/fretboard/Note'

import { PositionNote } from './PositionNote'
import { ShapeNote } from './ShapeNote'
import { useChords } from './state/chords'
import {
  getPositionColor,
  useFretboardSettings,
} from './state/fretboardSettings'

type ShapeWithPosition = {
  name: CAGEDShapeName
  rootFret: number
}

type NoteWithShapes = {
  string: number
  fret: number
  shapes: ShapeWithPosition[]
  isRoot: boolean
}

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
  const { settings } = useFretboardSettings()

  const shapeType = qualityToShapeType[quality] || 'major'

  // Get all shapes for the current chord type when showing all positions
  const allShapesData = useMemo(() => {
    if (!settings.showAllPositions) return null

    const shapes = getShapesForType(shapeType)
    const rootPositions = getRootPositionsForNote(rootNote)
    const result: { shape: (typeof shapes)[0]; rootFret: number }[] = []

    for (const shape of shapes) {
      // Skip if this shape is not enabled
      if (!settings.enabledShapes.has(shape.name)) continue

      const baseRootFret = rootPositions[shape.name]

      // Add shape at base position and octave up
      for (const octaveOffset of [0, 12]) {
        const rootFret = baseRootFret + octaveOffset
        const lowestFret = rootFret - shape.rootOffset

        // Skip if below nut or beyond reasonable range
        if (lowestFret < 0) continue
        if (rootFret > 15) continue

        result.push({ shape, rootFret })
      }
    }

    return result
  }, [rootNote, shapeType, settings.showAllPositions, settings.enabledShapes])

  // Single position mode
  const singleChordData = useMemo(() => {
    if (settings.showAllPositions) return null

    const result = findShapeForPosition(rootNote, position, shapeType)

    // Filter by enabled shapes
    if (result && !settings.enabledShapes.has(result.shape.name)) {
      return null
    }

    return result
  }, [
    rootNote,
    position,
    shapeType,
    settings.showAllPositions,
    settings.enabledShapes,
  ])

  // Collect notes with their shape sources for overlap detection
  const notesWithShapes = useMemo(() => {
    const noteMap = new Map<string, NoteWithShapes>()

    const addNote = (
      stringIndex: number,
      fret: number,
      shapeName: CAGEDShapeName,
      shapeRootFret: number,
      isRootNote: boolean,
    ) => {
      const componentFret = fret === 0 ? -1 : fret - 1
      if (componentFret > defaultVisibleFrets.end) return

      const key = `${stringIndex}-${componentFret}`
      const existing = noteMap.get(key)

      if (existing) {
        // Add shape to existing note if not already present
        if (!existing.shapes.some((s) => s.name === shapeName)) {
          existing.shapes.push({ name: shapeName, rootFret: shapeRootFret })
        }
        existing.isRoot = existing.isRoot || isRootNote
      } else {
        noteMap.set(key, {
          string: stringIndex,
          fret: componentFret,
          shapes: [{ name: shapeName, rootFret: shapeRootFret }],
          isRoot: isRootNote,
        })
      }
    }

    if (settings.showAllPositions && allShapesData) {
      allShapesData.forEach(({ shape, rootFret }) => {
        const fretPositions = shapeToFretPositions(shape, rootFret)

        fretPositions.forEach((fret, stringIndex) => {
          if (fret === null) return

          const noteAtPosition = getNoteFromPosition({
            position: { string: stringIndex, fret: fret === 0 ? -1 : fret - 1 },
          })
          const isRootNote =
            settings.highlightRoots && noteAtPosition === rootNote

          addNote(stringIndex, fret, shape.name, rootFret, isRootNote)
        })
      })
    } else if (singleChordData) {
      const { shape, rootFret } = singleChordData
      const fretPositions = shapeToFretPositions(shape, rootFret)

      fretPositions.forEach((fret, stringIndex) => {
        if (fret === null) return

        const noteAtPosition = getNoteFromPosition({
          position: { string: stringIndex, fret: fret === 0 ? -1 : fret - 1 },
        })
        const isRootNote =
          settings.highlightRoots && noteAtPosition === rootNote

        addNote(stringIndex, fret, shape.name, rootFret, isRootNote)
      })
    }

    return Array.from(noteMap.values())
  }, [
    allShapesData,
    singleChordData,
    settings.showAllPositions,
    settings.highlightRoots,
    rootNote,
  ])

  const elements: React.ReactNode[] = notesWithShapes.map((note) => {
    // Color by neck position (fret zone)
    if (settings.colorByPosition) {
      const color = getPositionColor(note.fret)
      return (
        <PositionNote
          key={`position-note-${note.string}-${note.fret}`}
          string={note.string}
          fret={note.fret}
          color={color}
          isRoot={note.isRoot}
        />
      )
    }

    // Color by CAGED shape
    if (settings.colorByShape) {
      // Sort shapes by rootFret position (ascending) so left color = earlier shape on fretboard
      const sortedShapeNames = [...note.shapes]
        .sort((a, b) => a.rootFret - b.rootFret)
        .map((s) => s.name)

      return (
        <ShapeNote
          key={`shape-note-${note.string}-${note.fret}`}
          string={note.string}
          fret={note.fret}
          shapes={sortedShapeNames}
          isRoot={note.isRoot}
        />
      )
    }

    // Default: no coloring
    return (
      <Note
        key={`note-${note.string}-${note.fret}`}
        string={note.string}
        fret={note.fret}
        kind="primary"
        isRoot={note.isRoot}
      />
    )
  })

  return (
    <Fretboard>
      {scaleOverlay}
      {elements}
    </Fretboard>
  )
}
