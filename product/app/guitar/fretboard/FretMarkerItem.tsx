import { Match } from '@lib/ui/base/Match'
import { round } from '@lib/ui/css/round'
import { vStack } from '@lib/ui/css/stack'
import { Center } from '@lib/ui/layout/Center'
import { PositionAbsolutelyCenterVertically } from '@lib/ui/layout/PositionAbsolutelyCenterVertically'
import { ValueProp } from '@lib/ui/props'
import { getColor } from '@lib/ui/theme/getters'
import { getIntervalCenter } from '@lib/utils/interval/getIntervalCenter'
import { toPercents } from '@lib/utils/toPercents'
import { FretMarker } from '@product/core/guitar/fretMarkers'
import { getFretPosition } from '@product/core/guitar/getFretPosition'
import styled from 'styled-components'

import { totalFrets } from '../../guitar/config'

import { useResponsiveFretboardConfig } from './ResponsiveFretboardConfig'
import { useVisibleFrets } from './state/visibleFrets'

const Dot = styled.div`
  ${round};
  background: ${getColor('textShy')};
`

const DoubleMarkerContainer = styled.div`
  ${vStack({
    justifyContent: 'space-between',
    fullHeight: true,
  })}
`

type FretMarkerItemProps = ValueProp<FretMarker>

export const FretMarkerItem = ({ value }: FretMarkerItemProps) => {
  const visibleFrets = useVisibleFrets()
  const config = useResponsiveFretboardConfig()

  const dotSize = config.height * 0.12
  const verticalPad = config.height * 0.08

  return (
    <PositionAbsolutelyCenterVertically
      fullHeight
      left={toPercents(
        getIntervalCenter(
          getFretPosition({
            index: value.index,
            visibleFrets,
            totalFrets,
          }),
        ),
      )}
    >
      <Match
        value={value.type}
        single={() => (
          <Center>
            <Dot style={{ width: dotSize, height: dotSize }} />
          </Center>
        )}
        double={() => (
          <DoubleMarkerContainer
            style={{ paddingTop: verticalPad, paddingBottom: verticalPad }}
          >
            <Dot style={{ width: dotSize, height: dotSize }} />
            <Dot style={{ width: dotSize, height: dotSize }} />
          </DoubleMarkerContainer>
        )}
      />
    </PositionAbsolutelyCenterVertically>
  )
}
