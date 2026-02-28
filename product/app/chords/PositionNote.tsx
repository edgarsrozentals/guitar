import { centerContent } from '@lib/ui/css/centerContent'
import { round } from '@lib/ui/css/round'
import { toSizeUnit } from '@lib/ui/css/toSizeUnit'
import { PositionAbsolutelyByCenter } from '@lib/ui/layout/PositionAbsolutelyByCenter'
import { getColor } from '@lib/ui/theme/getters'
import { toPercents } from '@lib/utils/toPercents'
import { getFretPosition } from '@product/core/guitar/getFretPosition'
import { chromaticNotesNames } from '@product/core/note'
import { getNoteFromPosition } from '@product/core/note/getNoteFromPosition'
import { NotePosition } from '@product/core/note/NotePosition'
import styled, { css } from 'styled-components'

import { totalFrets } from '../guitar/config'
import { useResponsiveFretboardConfig } from '../guitar/fretboard/ResponsiveFretboardConfig'
import { useVisibleFrets } from '../guitar/fretboard/state/visibleFrets'
import { getStringPosition } from '../guitar/fretboard/utils/getStringPosition'

type PositionNoteProps = NotePosition & {
  color: string
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

const Background = styled.div<{ $color: string }>`
  position: absolute;
  inset: 0;
  background: ${({ $color }) => $color};
  z-index: 0;
`

const NoteLabel = styled.span`
  position: relative;
  z-index: 1;
`

export const PositionNote = ({
  string,
  fret,
  color,
  isRoot,
}: PositionNoteProps) => {
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

  return (
    <PositionAbsolutelyByCenter top={top} left={left}>
      <Container
        $isRoot={isRoot}
        $isOpen={isOpen}
        style={{ width: config.noteSize, height: config.noteSize }}
      >
        {!isOpen && <Background $color={color} />}
        <NoteLabel>{chromaticNotesNames[value]}</NoteLabel>
      </Container>
    </PositionAbsolutelyByCenter>
  )
}
