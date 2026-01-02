import { borderRadius } from '@lib/ui/css/borderRadius'
import { VStack } from '@lib/ui/css/stack'
import { getColor } from '@lib/ui/theme/getters'
import { toPercents } from '@lib/utils/toPercents'
import { getFretPosition } from '@product/core/guitar/getFretPosition'
import { useCallback, useRef } from 'react'
import styled from 'styled-components'

import { totalFrets } from '../../guitar/config'
import { defaultVisibleFrets } from '../../guitar/fretboard/Fretboard'
import { useResponsiveFretboardConfig } from '../../guitar/fretboard/ResponsiveFretboardConfig'

const SliderWrapper = styled.div`
  display: flex;
  align-items: center;
  user-select: none;
`

const OpenSection = styled.div`
  flex-shrink: 0;
  display: flex;
  justify-content: center;
`

const NutSection = styled.div`
  flex-shrink: 0;
`

const FretsSection = styled.div`
  flex: 1;
  padding: 8px 12px;
`

const SliderTrack = styled.div`
  position: relative;
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: ${getColor('mistExtra')};
  cursor: pointer;
`

const SliderThumb = styled.div`
  position: absolute;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: ${getColor('mistExtra')};
  border: 2px solid ${getColor('contrast')};
  cursor: grab;
  transform: translate(-50%, -50%);
  top: 50%;
  transition: transform 0.05s;

  &:hover {
    transform: translate(-50%, -50%) scale(1.1);
  }

  &:active {
    cursor: grabbing;
  }
`

const FretMarkersContainer = styled.div`
  position: relative;
  height: 20px;
  width: 100%;
`

const FretNumber = styled.button<{ $isActive: boolean }>`
  position: absolute;
  transform: translateX(-50%);
  font-size: 13px;
  font-weight: 500;
  padding: 2px 4px;
  border: none;
  background: ${({ $isActive }) =>
    $isActive ? getColor('mistExtra') : 'transparent'};
  ${borderRadius.s};
  cursor: pointer;
  color: ${({ $isActive }) =>
    $isActive ? getColor('contrast') : getColor('textSupporting')};

  &:hover {
    background: ${getColor('mist')};
  }
`

const OpenFretNumber = styled.button<{ $isActive: boolean }>`
  font-size: 13px;
  font-weight: 500;
  padding: 2px 4px;
  border: none;
  background: ${({ $isActive }) =>
    $isActive ? getColor('mistExtra') : 'transparent'};
  ${borderRadius.s};
  cursor: pointer;
  color: ${({ $isActive }) =>
    $isActive ? getColor('contrast') : getColor('textSupporting')};

  &:hover {
    background: ${getColor('mist')};
  }
`

// Get the logarithmic position for a fret (0-1 range)
const getLogPosition = (fret: number): number => {
  if (fret <= 0) return 0
  const position = getFretPosition({
    index: fret - 1,
    visibleFrets: { start: 0, end: defaultVisibleFrets.end },
    totalFrets,
  })
  return position.end
}

// Convert a position (0-1) back to the nearest fret
const positionToFret = (position: number, maxFret: number): number => {
  // Check if position is close enough to 0 (open string)
  const fret1Pos = getLogPosition(1)
  if (position < fret1Pos / 2) {
    return 0
  }

  // Find the fret whose position is closest to the given position
  let closestFret = 1
  let closestDistance = Math.abs(fret1Pos - position)

  for (let fret = 2; fret <= maxFret; fret++) {
    const fretPos = getLogPosition(fret)
    const distance = Math.abs(fretPos - position)
    if (distance < closestDistance) {
      closestDistance = distance
      closestFret = fret
    }
  }

  return closestFret
}

type ManagePositionProps = {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
}

export const ManagePosition = ({
  value,
  onChange,
  min = 0,
  max = 14,
}: ManagePositionProps) => {
  const config = useResponsiveFretboardConfig()
  const trackRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  // Generate fret positions (1-14, skipping 0 which is open)
  const frets = Array.from({ length: max - min }, (_, i) => i + min + 1)

  const handlePositionFromEvent = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return

      const rect = trackRef.current.getBoundingClientRect()
      const x = clientX - rect.left
      const position = Math.max(0, Math.min(1, x / rect.width))
      const newFret = positionToFret(position, max)
      onChange(newFret)
    },
    [max, onChange],
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault() // Prevent text selection while dragging
      isDragging.current = true
      handlePositionFromEvent(e.clientX)

      const handleMouseMove = (e: MouseEvent) => {
        if (isDragging.current) {
          e.preventDefault()
          handlePositionFromEvent(e.clientX)
        }
      }

      const handleMouseUp = () => {
        isDragging.current = false
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    },
    [handlePositionFromEvent],
  )

  const thumbPosition = value >= 1 ? getLogPosition(value) : 0

  return (
    <SliderWrapper>
      <OpenSection style={{ width: config.openNotesSectionWidth }}>
        <OpenFretNumber $isActive={value === 0} onClick={() => onChange(0)}>
          0
        </OpenFretNumber>
      </OpenSection>
      <NutSection style={{ width: config.nutWidth }} />
      <FretsSection>
        <VStack gap={6}>
          <SliderTrack ref={trackRef} onMouseDown={handleMouseDown}>
            <SliderThumb style={{ left: toPercents(thumbPosition) }} />
          </SliderTrack>
          <FretMarkersContainer>
            {frets.map((fret) => {
              const position = getLogPosition(fret)

              return (
                <FretNumber
                  key={fret}
                  $isActive={fret === value}
                  onClick={() => onChange(fret)}
                  style={{ left: toPercents(position) }}
                >
                  {fret}
                </FretNumber>
              )
            })}
          </FretMarkersContainer>
        </VStack>
      </FretsSection>
    </SliderWrapper>
  )
}
