import { centerContent } from '@lib/ui/css/centerContent'
import { round } from '@lib/ui/css/round'
import { toSizeUnit } from '@lib/ui/css/toSizeUnit'
import { PositionAbsolutelyByCenter } from '@lib/ui/layout/PositionAbsolutelyByCenter'
import { KindProp, ChildrenProp } from '@lib/ui/props'
import { getColor } from '@lib/ui/theme/getters'
import { match } from '@lib/utils/match'
import { toPercents } from '@lib/utils/toPercents'
import { getFretPosition } from '@product/core/guitar/getFretPosition'
import { chromaticNotesNames } from '@product/core/note'
import { getNoteFromPosition } from '@product/core/note/getNoteFromPosition'
import { NotePosition } from '@product/core/note/NotePosition'
import styled, { css } from 'styled-components'

import { totalFrets } from '../../guitar/config'

import { useResponsiveFretboardConfig } from './ResponsiveFretboardConfig'
import { useVisibleFrets } from './state/visibleFrets'
import { getStringPosition } from './utils/getStringPosition'

export type NoteKind = 'regular' | 'primary' | 'blue'

export type NoteProps = Partial<KindProp<NoteKind> & ChildrenProp> &
  NotePosition & {
    isRoot?: boolean
  }

const Container = styled.div<
  KindProp<NoteKind> & { $isRoot?: boolean; $isOpen?: boolean }
>`
  ${round}

  border: 1px solid transparent;
  ${centerContent};
  font-weight: 600;

  ${({ kind, $isRoot, $isOpen, theme: { colors } }) => {
    // Open string notes (fret -1) are always gray
    if ($isOpen) {
      return css`
        border: 1px solid #88888880;
        background: #88888820;
        color: #888888;
      `
    }

    const color = match(kind, {
      regular: () => colors.getLabelColor(3),
      primary: () => colors.success,
      blue: () => colors.getLabelColor(7),
    })

    if ($isRoot && kind === 'primary') {
      return css`
        background: ${color.toCssValue()};
        border: 2px solid #e53935;
        color: #e53935;
      `
    }

    if (kind === 'primary') {
      return css`
        background: ${color.toCssValue()};
        color: ${getColor('background')};
      `
    }

    return css`
      border: 1px solid ${color.getVariant({ l: (a) => a * 0.48 }).toCssValue()};
      background: ${color.getVariant({ l: (v) => v * 0.12 }).toCssValue()};
      color: ${color
        .getVariant({ l: (v) => v * 1.2, s: (v) => v * 1.2 })
        .toCssValue()};
    `
  }}
`

export const Note = ({
  string,
  fret,
  kind = 'regular',
  children,
  isRoot,
}: NoteProps) => {
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
        kind={kind}
        $isRoot={isRoot}
        $isOpen={isOpen}
        style={{ width: config.noteSize, height: config.noteSize }}
      >
        {children ?? chromaticNotesNames[value]}
      </Container>
    </PositionAbsolutelyByCenter>
  )
}
