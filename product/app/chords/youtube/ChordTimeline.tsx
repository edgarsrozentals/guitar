'use client'

import { getColor } from '@lib/ui/theme/getters'
import { useMemo, useState } from 'react'
import styled from 'styled-components'

type Chord = {
  root: string
  quality: string
}

type ChordEvent = {
  time: number
  chord: Chord
}

// Zoom levels: pixels per BEAT (not per second)
// This ensures consistent visual beat width regardless of tempo
const PIXELS_PER_BEAT_LEVELS = [40, 60, 80, 100, 130, 160, 200]
const DEFAULT_ZOOM_INDEX = 2 // 80 pixels per beat

type SongInfo = {
  keyRoot?: string
  keyQuality?: string
  bpm?: number
  timeSignature?: string
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
  onRefresh?: () => void // Callback to refresh/regenerate chords
  isLoading?: boolean // Whether analysis is in progress
  loadingProgress?: number // Progress percentage during loading
  beats?: number[] // Array of beat timestamps in seconds
  showBeats?: boolean // Whether to show beat markers
  beatsPerBar?: number // Time signature - beats per bar (default 4 for 4/4)
  bpm?: number // Tempo in beats per minute (for calculating beat width)
  onDelete?: () => void // Callback to delete this timeline's analysis
  isGroundTruth?: boolean // Whether this is ground truth data (e.g., Chordify)
  color?: string // Custom color for the library
  onHide?: () => void // Callback to hide this timeline
  onChordClick?: (chord: Chord) => void // Callback when a chord block is clicked
  // Playback controls
  onRewind?: () => void
  onToggle?: () => void
  isPlaying?: boolean
  isReady?: boolean
  // Song info (key, bpm, time signature) - displayed in header for ground truth
  songInfo?: SongInfo
}

const OuterContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
`

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-left: 104px; /* Align with timeline (after playback buttons: 48px * 2 + 8px gap) */
  padding-right: 8px;
`

const HeaderLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`

const SongInfoItem = styled.span`
  font-size: 12px;
  color: ${getColor('textSupporting')};
`

const SongInfoValue = styled.span`
  font-weight: 600;
  color: ${getColor('text')};
`

const LibraryName = styled.span<{ $color?: string }>`
  font-size: 12px;
  font-weight: 600;
  color: ${({ $color }) => $color || getColor('text')};
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
    $isActive ? getColor('success') : getColor('mist')};
  color: ${({ $isActive }) =>
    $isActive ? getColor('background') : getColor('textSupporting')};

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

const Container = styled.div`
  display: flex;
  align-items: stretch;
  gap: 0;
  width: 100%;
`

const PlaybackButtonsColumn = styled.div`
  display: flex;
  align-items: stretch;
  gap: 0;
  flex-shrink: 0;
`

const PlaybackButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  background: ${getColor('mist')};
  color: ${getColor('text')};
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;

  &:first-child {
    border-radius: 8px 0 0 8px;
  }

  &:hover {
    background: ${getColor('foreground')};
    color: ${getColor('textSupporting')};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    &:hover {
      background: ${getColor('mist')};
      color: ${getColor('text')};
    }
  }

  svg {
    width: 26px;
    height: 26px;
  }
`

const SettingsDropdown = styled.div`
  position: relative;
  display: flex;
  align-items: stretch;
`

const SettingsButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  background: ${getColor('mist')};
  color: ${getColor('textSupporting')};
  border: none;
  border-radius: 0 8px 8px 0;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: ${getColor('foreground')};
    color: ${getColor('text')};
  }

  svg {
    width: 18px;
    height: 18px;
  }
`

const DropdownMenu = styled.div<{ $visible: boolean }>`
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background: ${getColor('foreground')};
  border: 1px solid ${getColor('mist')};
  border-radius: 8px;
  padding: 6px;
  min-width: 140px;
  z-index: 100;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  visibility: ${({ $visible }) => ($visible ? 'visible' : 'hidden')};
  transform: translateY(${({ $visible }) => ($visible ? 0 : -4)}px);
  transition: all 0.15s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
`

const DropdownItem = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 10px;
  background: transparent;
  color: ${getColor('text')};
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  text-align: left;
  transition: background 0.1s ease;

  &:hover {
    background: ${getColor('mist')};
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
    &:hover {
      background: transparent;
    }
  }

  svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
  }
`

const DropdownDivider = styled.div`
  height: 1px;
  background: ${getColor('mist')};
  margin: 4px 0;
`

const TimelineWrapper = styled.div<{ $isActive?: boolean }>`
  flex: 1;
  background: ${getColor('mist')};
  border-radius: 0;
  padding: 12px;
  overflow: hidden;
  position: relative;
  ${({ $isActive }) =>
    $isActive &&
    `
    box-shadow: inset 0 0 0 2px ${getColor('primary')};
  `}
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
  contain: layout style;
`

const TimelineTrack = styled.div.attrs<{ $offset: number }>(({ $offset }) => ({
  style: {
    transform: `translateX(${$offset}px)`,
  },
}))`
  position: absolute;
  height: 100%;
  width: 100%;
  will-change: transform;
`

// Colors for chord states
const CURRENT_CHORD_COLOR = '#4caf50' // Green for active/current chord
const UPCOMING_CHORD_COLOR = '#4a90d9' // Blue for upcoming chord

const ChordBlockContainer = styled.div.attrs<{
  $position: number
  $width: number
  $isCurrent: boolean
  $isPast: boolean
  $isUpcoming: boolean
}>(({ $position, $width, $isCurrent, $isUpcoming }) => ({
  style: {
    left: `${$position}px`,
    width: `${Math.max($width - 2, 20)}px`,
    zIndex: $isCurrent ? 5 : $isUpcoming ? 4 : undefined,
    boxShadow: $isCurrent
      ? '0 2px 8px rgba(0, 0, 0, 0.3)'
      : $isUpcoming
        ? '0 1px 4px rgba(0, 0, 0, 0.2)'
        : undefined,
  },
}))`
  position: absolute;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  padding-left: 8px;
  border-radius: 6px;
  font-weight: 700;
  overflow: hidden;
  white-space: nowrap;

  background: ${({ $isCurrent, $isUpcoming, $isPast }) =>
    $isCurrent
      ? CURRENT_CHORD_COLOR
      : $isUpcoming
        ? UPCOMING_CHORD_COLOR
        : $isPast
          ? getColor('mist')
          : getColor('mistExtra')};
`

const ChordText = styled.span.attrs<{
  $isCurrent: boolean
  $isUpcoming: boolean
  $isPast: boolean
  $stickyOffset: number
  $isLongChord: boolean
}>(({ $stickyOffset, $isCurrent, $isLongChord }) => ({
  style: {
    transform: `translateX(${$stickyOffset}px)`,
    fontSize: $isCurrent && $isLongChord ? '20px' : '16px',
  },
}))`
  position: relative;
  z-index: 1;
  color: ${({ $isCurrent, $isUpcoming, $isPast }) =>
    $isCurrent || $isUpcoming
      ? 'white'
      : $isPast
        ? getColor('textSupporting')
        : getColor('text')};
`

const MARKER_POSITION = 120 // Position of the current time marker (from left edge)
const MARKER_COLOR = '#e53935' // Red color for visibility

const CurrentMarker = styled.div`
  position: absolute;
  left: ${MARKER_POSITION}px;
  top: -4px;
  bottom: -4px;
  width: 3px;
  background: ${MARKER_COLOR};
  z-index: 10;

  &::before {
    content: '';
    position: absolute;
    top: -4px;
    left: -5px;
    width: 12px;
    height: 12px;
    background: ${MARKER_COLOR};
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

const BeatMarkersContainer = styled.div.attrs<{ $offset: number }>(
  ({ $offset }) => ({
    style: {
      transform: `translateX(${$offset}px)`,
    },
  }),
)`
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  pointer-events: none;
  z-index: 4;
  will-change: transform;
`

const BeatMarker = styled.div<{
  $position: number
  $isPast: boolean
  $isBar: boolean
}>`
  position: absolute;
  left: ${({ $position }) => $position}px;
  top: 0;
  bottom: 0;
  width: ${({ $isBar }) => ($isBar ? '3px' : '2px')};
  background: ${({ $isPast, $isBar }) =>
    $isPast
      ? $isBar
        ? 'rgba(200, 200, 200, 0.4)'
        : 'rgba(180, 180, 180, 0.25)'
      : $isBar
        ? 'rgba(240, 240, 240, 0.85)'
        : 'rgba(220, 220, 220, 0.5)'};
  opacity: ${({ $isPast }) => ($isPast ? 0.6 : 1)};
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
  onRefresh,
  isLoading,
  loadingProgress,
  beats,
  showBeats = true,
  beatsPerBar = 4,
  bpm = 120,
  onDelete,
  isGroundTruth,
  color,
  onHide,
  onChordClick,
  onRewind,
  onToggle,
  isPlaying = false,
  isReady = true,
  songInfo,
}: ChordTimelineProps) {
  const [zoomIndex, setZoomIndex] = useState(DEFAULT_ZOOM_INDEX)
  const [settingsOpen, setSettingsOpen] = useState(false)

  // Calculate pixels per second based on BPM and desired pixels per beat
  // This ensures consistent beat widths regardless of tempo
  const pixelsPerBeat = PIXELS_PER_BEAT_LEVELS[zoomIndex]
  const beatsPerSecond = bpm / 60
  const pixelsPerSecond = pixelsPerBeat * beatsPerSecond

  const markerPosition = MARKER_POSITION

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (zoomIndex < PIXELS_PER_BEAT_LEVELS.length - 1) {
      setZoomIndex(zoomIndex + 1)
    }
  }

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (zoomIndex > 0) {
      setZoomIndex(zoomIndex - 1)
    }
  }

  // Pre-calculate static chord layout (only changes with chords/duration/zoom)
  const chordLayout = useMemo(() => {
    if (!chords.length) return []

    return chords.map((event, i) => {
      const nextEvent = chords[i + 1]
      const endTime = nextEvent ? nextEvent.time : duration
      const chordDuration = endTime - event.time

      return {
        chord: event.chord,
        startTime: event.time,
        endTime,
        position: event.time * pixelsPerSecond,
        width: chordDuration * pixelsPerSecond,
      }
    })
  }, [chords, duration, pixelsPerSecond])

  // Find current chord index using binary search for performance
  const currentIndex = useMemo(() => {
    if (!chordLayout.length) return -1

    // Binary search for current chord
    let left = 0
    let right = chordLayout.length - 1

    while (left <= right) {
      const mid = Math.floor((left + right) / 2)
      const chord = chordLayout[mid]

      if (currentTime >= chord.startTime && currentTime < chord.endTime) {
        return mid
      } else if (currentTime < chord.startTime) {
        right = mid - 1
      } else {
        left = mid + 1
      }
    }
    return -1
  }, [chordLayout, currentTime])

  // Calculate offset to keep current time at marker position
  const offset = markerPosition - currentTime * pixelsPerSecond

  const handleStatusClick = () => {
    if (onSelect && !isActive && enabled) {
      onSelect()
    }
  }

  const handleRefresh = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (onRefresh && !isLoading) {
      onRefresh()
    }
  }

  return (
    <OuterContainer>
      {/* Header row with song info on left, library name and status on right */}
      <HeaderRow>
        <HeaderLeft>
          {songInfo && (
            <>
              {songInfo.keyRoot && (
                <SongInfoItem>
                  <SongInfoValue>
                    {songInfo.keyRoot} {songInfo.keyQuality}
                  </SongInfoValue>
                </SongInfoItem>
              )}
              {songInfo.bpm && (
                <SongInfoItem>
                  <SongInfoValue>{songInfo.bpm}</SongInfoValue> BPM
                </SongInfoItem>
              )}
              {songInfo.timeSignature && (
                <SongInfoItem>
                  <SongInfoValue>{songInfo.timeSignature}</SongInfoValue>
                </SongInfoItem>
              )}
            </>
          )}
        </HeaderLeft>
        <HeaderRight>
          <LibraryName $color={color}>{libraryName || 'Timeline'}</LibraryName>
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
        </HeaderRight>
      </HeaderRow>

      {/* Main timeline row with playback buttons */}
      <Container>
        {/* Playback buttons on the left */}
        <PlaybackButtonsColumn>
          <PlaybackButton
            onClick={onRewind}
            disabled={!isReady}
            title="Rewind to beginning"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z" />
            </svg>
          </PlaybackButton>
          <PlaybackButton
            onClick={onToggle}
            disabled={!isReady}
            title={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </PlaybackButton>
        </PlaybackButtonsColumn>

        <TimelineWrapper $isActive={isActive && enabled}>
          {!enabled && <DisabledOverlay />}
          <TimelineContainer>
            <CurrentMarker />
            {showBeats && beats && beats.length > 0 && (
              <BeatMarkersContainer $offset={offset}>
                {beats.map((beatTime, index) => (
                  <BeatMarker
                    key={`beat-${index}`}
                    $position={beatTime * pixelsPerSecond}
                    $isPast={beatTime < currentTime}
                    $isBar={index % beatsPerBar === 0}
                  />
                ))}
              </BeatMarkersContainer>
            )}
            <TimelineTrack $offset={offset}>
              {chordLayout.map((item, index) => {
                const isCurrent = index === currentIndex
                const isPast = currentTime >= item.endTime
                const isUpcoming = index === currentIndex + 1

                const chordLabel =
                  item.chord.root === 'N'
                    ? '—'
                    : `${item.chord.root}${
                        item.chord.quality === 'major'
                          ? ''
                          : item.chord.quality === 'minor'
                            ? 'm'
                            : item.chord.quality
                      }`

                // Calculate sticky offset for current chord
                // When the chord block slides left past the marker, the text should stick near marker
                let stickyOffset = 0
                if (isCurrent && enabled) {
                  const chordLeftEdge = item.position + offset
                  const paddingLeft = 8
                  // If chord left edge is past the marker (to the left), offset text right
                  if (chordLeftEdge < markerPosition) {
                    stickyOffset = markerPosition - chordLeftEdge - paddingLeft
                    // Clamp so text doesn't go beyond chord block right edge
                    const maxOffset = item.width - 50 // Leave some space
                    stickyOffset = Math.min(
                      stickyOffset,
                      Math.max(0, maxOffset),
                    )
                  }
                }

                // Check if chord is longer than 1 beat (for larger font)
                const beatDuration = 60 / bpm
                const chordDuration = item.endTime - item.startTime
                const isLongChord = chordDuration > beatDuration * 1.5

                return (
                  <ChordBlockContainer
                    key={`${item.startTime}-${index}`}
                    $position={item.position}
                    $width={item.width}
                    $isCurrent={isCurrent && enabled}
                    $isPast={isPast}
                    $isUpcoming={isUpcoming && enabled}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (onChordClick && item.chord.root !== 'N') {
                        onChordClick(item.chord)
                      }
                    }}
                    style={{
                      cursor: item.chord.root !== 'N' ? 'pointer' : 'default',
                    }}
                  >
                    <ChordText
                      $isCurrent={isCurrent && enabled}
                      $isUpcoming={isUpcoming && enabled}
                      $isPast={isPast}
                      $stickyOffset={stickyOffset}
                      $isLongChord={isLongChord}
                    >
                      {chordLabel}
                    </ChordText>
                  </ChordBlockContainer>
                )
              })}
            </TimelineTrack>
            <UpcomingLabel>upcoming →</UpcomingLabel>
          </TimelineContainer>
        </TimelineWrapper>

        {/* Settings dropdown on the right */}
        <SettingsDropdown
          onMouseEnter={() => setSettingsOpen(true)}
          onMouseLeave={() => setSettingsOpen(false)}
        >
          <SettingsButton title="Timeline settings">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
            </svg>
          </SettingsButton>
          <DropdownMenu $visible={settingsOpen}>
            <DropdownItem
              onClick={handleZoomIn}
              disabled={zoomIndex === PIXELS_PER_BEAT_LEVELS.length - 1}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Zoom in
            </DropdownItem>
            <DropdownItem onClick={handleZoomOut} disabled={zoomIndex === 0}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Zoom out
            </DropdownItem>
            {onRefresh && (
              <>
                <DropdownDivider />
                <DropdownItem onClick={handleRefresh} disabled={isLoading}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M23 4v6h-6"></path>
                    <path d="M1 20v-6h6"></path>
                    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                  </svg>
                  Refresh
                </DropdownItem>
              </>
            )}
            {onDelete && chords.length > 0 && (
              <DropdownItem
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete()
                }}
                disabled={isLoading}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                Delete
              </DropdownItem>
            )}
            {onHide && (
              <>
                <DropdownDivider />
                <DropdownItem
                  onClick={(e) => {
                    e.stopPropagation()
                    onHide()
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                    <line x1="1" y1="1" x2="23" y2="23"></line>
                  </svg>
                  Hide
                </DropdownItem>
              </>
            )}
          </DropdownMenu>
        </SettingsDropdown>
      </Container>
    </OuterContainer>
  )
}
