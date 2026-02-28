import { centerContent } from '@lib/ui/css/centerContent'
import { round } from '@lib/ui/css/round'
import { toSizeUnit } from '@lib/ui/css/toSizeUnit'
import { PositionAbsolutelyByCenter } from '@lib/ui/layout/PositionAbsolutelyByCenter'
import { getColor } from '@lib/ui/theme/getters'
import { toPercents } from '@lib/utils/toPercents'
import { CAGEDShapeName } from '@product/core/chords/cagedShapes'
import { getFretPosition } from '@product/core/guitar/getFretPosition'
import { chromaticNotesNames } from '@product/core/note'
import { getNoteFromPosition } from '@product/core/note/getNoteFromPosition'
import { NotePosition } from '@product/core/note/NotePosition'
import styled, { css } from 'styled-components'

import { totalFrets } from '../guitar/config'
import { useResponsiveFretboardConfig } from '../guitar/fretboard/ResponsiveFretboardConfig'
import { useVisibleFrets } from '../guitar/fretboard/state/visibleFrets'
import { getStringPosition } from '../guitar/fretboard/utils/getStringPosition'

import { SHAPE_COLORS } from './state/fretboardSettings'

type ShapeNoteProps = NotePosition & {
  // Shapes should be pre-sorted by fret position (left-to-right on fretboard)
  shapes: CAGEDShapeName[]
  isRoot?: boolean
}

const Container = styled.div<{ $isRoot?: boolean; $isOpen?: boolean }>`
  ${round}
  ${centerContent};
  font-weight: 600;
  color: ${getColor('background')};
  overflow: hidden;
  position: relative;

  ${({ $isRoot }) =>
    $isRoot &&
    css`
      border: 2px solid #e53935;
      color: #e53935;
    `}

  ${({ $isOpen }) =>
    $isOpen &&
    css`
      border: 1px solid #88888880;
      background: #88888820;
      color: #888888;
    `}
`

const SolidBackground = styled.div<{ $color: string }>`
  position: absolute;
  inset: 0;
  background: ${({ $color }) => $color};
  z-index: 0;
`

const SplitBackground = styled.div<{ $leftColor: string; $rightColor: string }>`
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    ${({ $leftColor }) => $leftColor} 50%,
    ${({ $rightColor }) => $rightColor} 50%
  );
  z-index: 0;
`

const NoteLabel = styled.span`
  position: relative;
  z-index: 1;
`

export const ShapeNote = ({ string, fret, shapes, isRoot }: ShapeNoteProps) => {
  const visibleFrets = useVisibleFrets()
  const config = useResponsiveFretboardConfig()

  const top = toPercents(getStringPosition(string))

  const value = getNoteFromPosition({ position: { string, fret } })

  // Calculate fret center for note positioning (traditional fretboard visualization)
  const fretPosition = getFretPosition({
    totalFrets,
    visibleFrets,
    index: fret,
  })
  const fretCenter = (fretPosition.start + fretPosition.end) / 2

  const left =
    fret === -1
      ? `calc(${toSizeUnit(-config.nutWidth)} - ${toSizeUnit(config.noteSize / 2)})`
      : toPercents(fretCenter)

  const isOpen = fret === -1

  // Get colors for shapes (already sorted by fret position from ChordFretboard)
  const colors = shapes.map((shape) => SHAPE_COLORS[shape])

  return (
    <PositionAbsolutelyByCenter top={top} left={left}>
      <Container
        $isRoot={isRoot}
        $isOpen={isOpen}
        style={{ width: config.noteSize, height: config.noteSize }}
      >
        {!isOpen && colors.length === 1 && (
          <SolidBackground $color={colors[0]} />
        )}
        {!isOpen && colors.length >= 2 && (
          <SplitBackground $leftColor={colors[0]} $rightColor={colors[1]} />
        )}
        <NoteLabel>{chromaticNotesNames[value]}</NoteLabel>
      </Container>
    </PositionAbsolutelyByCenter>
  )
}
