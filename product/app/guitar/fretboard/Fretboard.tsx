import { hStack } from '@lib/ui/css/stack'
import { toSizeUnit } from '@lib/ui/css/toSizeUnit'
import { ChildrenProp } from '@lib/ui/props'
import { getColor } from '@lib/ui/theme/getters'
import { range } from '@lib/utils/array/range'
import { Interval } from '@lib/utils/interval/Interval'
import { intervalRange } from '@lib/utils/interval/intervalRange'
import { getFretMarkers } from '@product/core/guitar/fretMarkers'
import { standardTuning } from '@product/core/guitar/tuning'
import styled from 'styled-components'

import { Fret } from './Fret'
import { FretMarkerItem } from './FretMarkerItem'
import { Nut } from './Nut'
import { useResponsiveFretboardConfig } from './ResponsiveFretboardConfig'
import { VisibleFretsProvider } from './state/visibleFrets'
import { String } from './String'

const Neck = styled.div`
  position: relative;
  ${hStack()};
`

const OpenNotes = styled.div``

const Frets = styled.div`
  position: relative;
  flex: 1;
  background: ${getColor('foreground')};
`

type FretboardProps = {
  visibleFrets?: Interval
} & ChildrenProp

export const defaultVisibleFrets: Interval = { start: -1, end: 14 }

export const Fretboard = ({
  children,
  visibleFrets = defaultVisibleFrets,
}: FretboardProps) => {
  const config = useResponsiveFretboardConfig()
  const showNut = visibleFrets.start < 1

  const frets = intervalRange(
    showNut
      ? {
          ...visibleFrets,
          start: visibleFrets.start + 1,
        }
      : visibleFrets,
  )

  return (
    <Neck style={{ height: config.height }}>
      <VisibleFretsProvider value={visibleFrets}>
        {visibleFrets.start < 0 && (
          <OpenNotes style={{ width: config.openNotesSectionWidth }} />
        )}
        {showNut && <Nut width={config.nutWidth} />}
        <Frets>
          {frets.map((index) => (
            <Fret key={index} index={index} />
          ))}
          {getFretMarkers(visibleFrets).map((value) => (
            <FretMarkerItem key={value.index} value={value} />
          ))}

          {range(standardTuning.length).map((index) => (
            <String
              key={index}
              index={index}
              nutWidth={config.nutWidth}
              thickestStringWidth={config.thickestStringWidth}
            />
          ))}
          {children}
        </Frets>
      </VisibleFretsProvider>
    </Neck>
  )
}
