import { round } from '@lib/ui/css/round'
import { toSizeUnit } from '@lib/ui/css/toSizeUnit'
import { PositionAbsolutelyByCenter } from '@lib/ui/layout/PositionAbsolutelyByCenter'
import { toPercents } from '@lib/utils/toPercents'
import { getFretPosition } from '@product/core/guitar/getFretPosition'
import { NotePosition } from '@product/core/note/NotePosition'
import styled from 'styled-components'

import { totalFrets } from '../guitar/config'
import { useResponsiveFretboardConfig } from '../guitar/fretboard/ResponsiveFretboardConfig'
import { useVisibleFrets } from '../guitar/fretboard/state/visibleFrets'
import { getStringPosition } from '../guitar/fretboard/utils/getStringPosition'

const Dot = styled.div`
  ${round}
  width: 10px;
  height: 10px;
  background: #e53935;
`

type RootDotProps = NotePosition

export const RootDot = ({ string, fret }: RootDotProps) => {
  const visibleFrets = useVisibleFrets()
  const config = useResponsiveFretboardConfig()

  const top = toPercents(getStringPosition(string))

  // Calculate fret center for note positioning (traditional fretboard visualization)
  const fretPosition = getFretPosition({
    totalFrets,
    visibleFrets,
    index: fret,
  })
  const fretCenter = (fretPosition.start + fretPosition.end) / 2

  // Position the dot at the top-right of the note
  const noteLeft =
    fret === -1
      ? `calc(${toSizeUnit(-config.nutWidth)} - ${toSizeUnit(config.noteSize / 2)})`
      : toPercents(fretCenter)

  // Offset to position at top-right corner of the note circle
  const left = `calc(${noteLeft} + ${toSizeUnit(config.noteSize / 2 - 14)})`

  return (
    <PositionAbsolutelyByCenter
      top={`calc(${top} - ${toSizeUnit(config.noteSize / 2 - 8)})`}
      left={left}
    >
      <Dot />
    </PositionAbsolutelyByCenter>
  )
}
