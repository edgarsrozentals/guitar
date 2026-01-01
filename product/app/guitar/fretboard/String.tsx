import { PositionAbsolutelyCenterHorizontally } from '@lib/ui/layout/PositionAbsolutelyCenterHorizontally'
import { IndexProp } from '@lib/ui/props'
import { getColor } from '@lib/ui/theme/getters'
import { toPercents } from '@lib/utils/toPercents'
import styled, { css } from 'styled-components'

import { stringsThickness } from '../../guitar/config'

import { useVisibleFrets } from './state/visibleFrets'
import { getStringPosition } from './utils/getStringPosition'

const Container = styled.div<{ $isBassString: boolean }>`
  background: ${({ $isBassString }) =>
    $isBassString
      ? css`repeating-linear-gradient(135deg, ${getColor('background')}, ${getColor('background')} 1.5px, ${getColor('textSupporting')} 1.5px, ${getColor('textSupporting')} 3px)`
      : css`
          ${getColor('textSupporting')}
        `};
  position: relative;
  color: ${getColor('background')};
`

type StringProps = IndexProp & {
  nutWidth: number
  thickestStringWidth: number
}

export const String = ({ index, nutWidth, thickestStringWidth }: StringProps) => {
  const isBassString = index > 2

  const visibleFrets = useVisibleFrets()

  const showNut = visibleFrets.start < 1

  const width = showNut ? `calc(100% + ${nutWidth}px)` : '100%'
  const marginLeft = showNut ? -nutWidth : 0

  return (
    <PositionAbsolutelyCenterHorizontally
      top={toPercents(getStringPosition(index))}
      fullWidth
    >
      <Container
        $isBassString={isBassString}
        style={{
          height: thickestStringWidth * stringsThickness[index],
          width,
          marginLeft,
        }}
        key={index}
      />
    </PositionAbsolutelyCenterHorizontally>
  )
}
