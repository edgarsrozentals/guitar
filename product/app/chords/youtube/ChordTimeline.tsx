'use client'

import { getColor } from '@lib/ui/theme/getters'
import { useMemo } from 'react'
import styled from 'styled-components'

type Chord = {
  root: string
  quality: string
}

type ChordEvent = {
  time: number
  chord: Chord
}

type ChordTimelineProps = {
  chords: ChordEvent[]
  currentTime: number
  duration: number
  visibleWindow?: number // seconds to show (default 30)
  libraryName?: string // Name of the chord detection library
  isActive?: boolean // Whether this timeline controls the fretboard
  onSelect?: () => void // Callback when timeline is clicked to make it active
  enabled?: boolean // Whether this library is enabled for display
  onToggle?: () => void // Callback to toggle enabled state
  isLoading?: boolean // Whether analysis is in progress
  loadingProgress?: number // Progress percentage during loading
}

const Container = styled.div`
  display: flex;
  align-items: stretch;
  gap: 12px;
  width: 100%;
`

const ControlsColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  gap: 6px;
  min-width: 100px;
  flex-shrink: 0;
`

const ControlRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const LibraryName = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${getColor('text')};
`

const ToggleSwitch = styled.button<{ $enabled: boolean; $isLoading?: boolean }>`
  position: relative;
  width: 32px;
  height: 18px;
  border-radius: 9px;
  border: none;
  cursor: pointer;
  background: ${({ $enabled }) =>
    $enabled ? getColor('primary') : getColor('mist')};
  opacity: ${({ $isLoading }) => ($isLoading ? 0.6 : 1)};
  transition: background 0.2s ease;
  flex-shrink: 0;

  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: ${({ $enabled }) => ($enabled ? '16px' : '2px')};
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${getColor('background')};
    transition: left 0.2s ease;
  }

  &:disabled {
    cursor: not-allowed;
  }
`

const StatusButton = styled.button<{ $isActive: boolean }>`
  font-size: 10px;
  font-weight: 500;
  padding: 3px 8px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${({ $isActive }) =>
    $isActive ? getColor('success') : getColor('alert')};
  color: ${getColor('background')};

  &:hover {
    opacity: 0.85;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const LoadingText = styled.span`
  font-size: 10px;
  color: ${getColor('textSupporting')};
`

const TimelineWrapper = styled.div<{ $isActive?: boolean }>`
  flex: 1;
  background: ${getColor('foreground')};
  border-radius: 8px;
  padding: 12px;
  overflow: hidden;
  position: relative;
  ${({ $isActive }) =>
    $isActive &&
    `
    border: 2px solid ${getColor('primary')};
  `}
  ${({ $isActive }) =>
    !$isActive &&
    `
    border: 2px solid transparent;
  `}
  transition: border-color 0.2s ease;
`

const DisabledOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: ${getColor('foreground')};
  opacity: 0.7;
  border-radius: 6px;
  z-index: 5;
`

const TimelineContainer = styled.div`
  position: relative;
  width: 100%;
  height: 48px;
  overflow: hidden;
`

const TimelineTrack = styled.div<{ $offset: number }>`
  display: flex;
  position: absolute;
  height: 100%;
  transition: transform 0.1s linear;
  transform: translateX(${({ $offset }) => $offset}px);
`

const ChordBlock = styled.div<{
  $width: number
  $isCurrent: boolean
  $isPast: boolean
}>`
  height: 100%;
  min-width: ${({ $width }) => $width}px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  margin-right: 4px;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.15s ease;

  background: ${({ $isCurrent, $isPast }) =>
    $isCurrent
      ? getColor('primary')
      : $isPast
        ? getColor('mist')
        : getColor('mistExtra')};

  color: ${({ $isCurrent, $isPast }) =>
    $isCurrent
      ? getColor('background')
      : $isPast
        ? getColor('textSupporting')
        : getColor('text')};

  ${({ $isCurrent }) =>
    $isCurrent &&
    `
    transform: scale(1.05);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  `}
`

const CurrentMarker = styled.div`
  position: absolute;
  left: 80px;
  top: -4px;
  bottom: -4px;
  width: 2px;
  background: ${getColor('primary')};
  z-index: 10;

  &::before {
    content: '';
    position: absolute;
    top: -4px;
    left: -4px;
    width: 10px;
    height: 10px;
    background: ${getColor('primary')};
    border-radius: 50%;
  }
`

const UpcomingLabel = styled.div`
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 10px;
  color: ${getColor('textSupporting')};
  background: ${getColor('foreground')};
  padding: 2px 6px;
  border-radius: 4px;
`

export function ChordTimeline({
  chords,
  currentTime,
  duration,
  visibleWindow = 20,
  libraryName,
  isActive,
  onSelect,
  enabled = true,
  onToggle,
  isLoading,
  loadingProgress,
}: ChordTimelineProps) {
  const pixelsPerSecond = 60 // How many pixels per second of music
  const markerPosition = 80 // Position of the current time marker

  // Calculate which chords to show and their positions
  const visibleChords = useMemo(() => {
    if (!chords.length) return []

    const result: Array<{
      chord: Chord
      startTime: number
      endTime: number
      width: number
      isCurrent: boolean
      isPast: boolean
    }> = []

    for (let i = 0; i < chords.length; i++) {
      const event = chords[i]
      const nextEvent = chords[i + 1]
      const endTime = nextEvent ? nextEvent.time : duration
      const chordDuration = endTime - event.time

      result.push({
        chord: event.chord,
        startTime: event.time,
        endTime,
        width: Math.max(chordDuration * pixelsPerSecond, 50), // Minimum 50px
        isCurrent: currentTime >= event.time && currentTime < endTime,
        isPast: currentTime >= endTime,
      })
    }

    return result
  }, [chords, currentTime, duration, pixelsPerSecond])

  // Calculate offset to keep current time at marker position
  const offset = markerPosition - currentTime * pixelsPerSecond

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onToggle && !isLoading) {
      onToggle()
    }
  }

  const handleStatusClick = () => {
    if (onSelect && !isActive && enabled) {
      onSelect()
    }
  }

  return (
    <Container>
      <ControlsColumn>
        <ControlRow>
          {onToggle && (
            <ToggleSwitch
              $enabled={enabled}
              $isLoading={isLoading}
              onClick={handleToggle}
              disabled={isLoading}
            />
          )}
          <LibraryName>{libraryName || 'Timeline'}</LibraryName>
        </ControlRow>
        <ControlRow>
          {isLoading ? (
            <LoadingText>
              {loadingProgress !== undefined
                ? `${Math.round(loadingProgress)}%`
                : 'Loading...'}
            </LoadingText>
          ) : enabled ? (
            <StatusButton
              $isActive={isActive ?? false}
              onClick={handleStatusClick}
              disabled={isActive}
            >
              {isActive ? 'Active' : 'Inactive'}
            </StatusButton>
          ) : null}
        </ControlRow>
      </ControlsColumn>
      <TimelineWrapper $isActive={isActive && enabled}>
        {!enabled && <DisabledOverlay />}
        <TimelineContainer>
          <CurrentMarker />
          <TimelineTrack $offset={offset}>
            {visibleChords.map((item, index) => (
              <ChordBlock
                key={`${item.startTime}-${index}`}
                $width={item.width}
                $isCurrent={item.isCurrent && enabled}
                $isPast={item.isPast}
              >
                {item.chord.root}
                {item.chord.quality === 'major'
                  ? ''
                  : item.chord.quality === 'minor'
                    ? 'm'
                    : item.chord.quality}
              </ChordBlock>
            ))}
          </TimelineTrack>
          <UpcomingLabel>upcoming →</UpcomingLabel>
        </TimelineContainer>
      </TimelineWrapper>
    </Container>
  )
}
