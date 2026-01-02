import { centerContent } from '@lib/ui/css/centerContent'
import { round } from '@lib/ui/css/round'
import { toSizeUnit } from '@lib/ui/css/toSizeUnit'
import { PositionAbsolutelyByCenter } from '@lib/ui/layout/PositionAbsolutelyByCenter'
import { getColor } from '@lib/ui/theme/getters'
import { toPercents } from '@lib/utils/toPercents'
import { getFretPosition } from '@product/core/guitar/getFretPosition'
import { NotePosition } from '@product/core/note/NotePosition'
import styled from 'styled-components'

import { totalFrets } from '../../guitar/config'
import { useResponsiveFretboardConfig } from '../../guitar/fretboard/ResponsiveFretboardConfig'
import { useVisibleFrets } from '../../guitar/fretboard/state/visibleFrets'
import { getStringPosition } from '../../guitar/fretboard/utils/getStringPosition'

type ScaleOverlayNoteProps = NotePosition & {
  isRoot: boolean
  isBlueNote?: boolean
  noteName: string
}

const getColor_ = (isRoot: boolean, isBlueNote: boolean, isOpen: boolean) => {
  if (isOpen) return '#888888' // gray for open strings
  if (isRoot) return '#e53935' // red
  if (isBlueNote) return '#2196f3' // blue
  return '#4caf50' // green
}

const Container = styled.div<{
  $isRoot: boolean
  $isBlueNote: boolean
  $isOpen: boolean
}>`
  ${round}
  ${centerContent}

  border: 1px solid
    ${({ $isRoot, $isBlueNote, $isOpen }) =>
    `${getColor_($isRoot, $isBlueNote, $isOpen)}80`};
  background: ${getColor('foreground')};
  font-weight: 600;
  font-size: 12px;
  color: ${({ $isRoot, $isBlueNote, $isOpen }) =>
    getColor_($isRoot, $isBlueNote, $isOpen)};
`

export const ScaleOverlayNote = ({
  string,
  fret,
  isRoot,
  isBlueNote = false,
  noteName,
}: ScaleOverlayNoteProps) => {
  const visibleFrets = useVisibleFrets()
  const config = useResponsiveFretboardConfig()

  const top = toPercents(getStringPosition(string))

  const left = `calc(${
    fret === -1
      ? toSizeUnit(-config.nutWidth)
      : toPercents(
          getFretPosition({ totalFrets, visibleFrets, index: fret }).end,
        )
  } - ${toSizeUnit(config.noteSize / 2 + config.noteFretOffset)})`

  const isOpen = fret === -1

  return (
    <PositionAbsolutelyByCenter top={top} left={left}>
      <Container
        $isRoot={isRoot}
        $isBlueNote={isBlueNote}
        $isOpen={isOpen}
        style={{ width: config.noteSize, height: config.noteSize }}
      >
        {noteName}
      </Container>
    </PositionAbsolutelyByCenter>
  )
}
