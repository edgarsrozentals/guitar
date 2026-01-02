'use client'

import { HStack, VStack } from '@lib/ui/css/stack'
import { getColor } from '@lib/ui/theme/getters'
import { useCallback } from 'react'
import styled from 'styled-components'

type PlaybackControlsProps = {
  isReady: boolean
  isPlaying: boolean
  currentTime: number
  duration: number
  playbackRate: number
  volume: number
  isMuted: boolean
  onPlay: () => void
  onPause: () => void
  onToggle: () => void
  onSeek: (seconds: number) => void
  onPlaybackRateChange: (rate: number) => void
  onVolumeChange: (volume: number) => void
  onMuteToggle: () => void
}

const Container = styled.div`
  width: 100%;
  background: ${getColor('foreground')};
  border-radius: 12px;
  padding: 16px;
`

const ControlsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  width: calc(100% + 32px);
  margin-left: -16px;
  margin-right: -16px;
`

const ProgressContainer = styled.div`
  width: calc(100% + 32px);
  margin-left: -16px;
  margin-right: -16px;
  cursor: pointer;
`

const ProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background: ${getColor('mist')};
  border-radius: 3px;
  position: relative;
  overflow: hidden;
`

const ProgressFill = styled.div<{ $progress: number }>`
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: ${({ $progress }) => $progress * 100}%;
  background: ${getColor('primary')};
  border-radius: 3px;
  transition: width 0.1s linear;
`

const TimeDisplay = styled.span<{ $align?: 'left' | 'right' }>`
  font-size: 13px;
  color: ${getColor('textSupporting')};
  font-variant-numeric: tabular-nums;
  min-width: 45px;
  text-align: ${({ $align }) => $align || 'left'};
`

const SpeedSelect = styled.select`
  background: transparent;
  color: ${getColor('text')};
  border: 1px solid ${getColor('mist')};
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  min-width: 70px;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M3 4.5L6 8l3-3.5H3z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 8px center;
  padding-right: 28px;

  &:hover {
    background-color: ${getColor('mist')};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  option {
    background: ${getColor('foreground')};
    color: ${getColor('text')};
  }
`

const VolumeContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
`

const VolumeSlider = styled.input`
  flex: 1;
  height: 4px;
  appearance: none;
  background: ${getColor('mist')};
  border-radius: 2px;
  cursor: pointer;

  &::-webkit-slider-thumb {
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${getColor('primary')};
    cursor: pointer;
  }

  &::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${getColor('primary')};
    cursor: pointer;
    border: none;
  }
`

const IconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid ${getColor('mist')};
  border-radius: 8px;
  padding: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  color: ${getColor('text')};

  &:hover {
    background: ${getColor('mist')};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    width: 18px;
    height: 18px;
  }
`

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5]

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function PlaybackControls({
  isReady,
  isPlaying,
  currentTime,
  duration,
  playbackRate,
  volume,
  isMuted,
  onToggle,
  onSeek,
  onPlaybackRateChange,
  onVolumeChange,
  onMuteToggle,
}: PlaybackControlsProps) {
  const progress = duration > 0 ? currentTime / duration : 0

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!duration) return
      const rect = e.currentTarget.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const percentage = clickX / rect.width
      const newTime = percentage * duration
      onSeek(Math.max(0, Math.min(duration, newTime)))
    },
    [duration, onSeek],
  )

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onVolumeChange(Number(e.target.value))
    },
    [onVolumeChange],
  )

  return (
    <Container>
      <VStack gap={16}>
        {/* Progress bar */}
        <VStack gap={4}>
          <ProgressContainer onClick={handleProgressClick}>
            <ProgressBar>
              <ProgressFill $progress={progress} />
            </ProgressBar>
          </ProgressContainer>
          <HStack justifyContent="space-between">
            <TimeDisplay>{formatTime(currentTime)}</TimeDisplay>
            <TimeDisplay $align="right">{formatTime(duration)}</TimeDisplay>
          </HStack>
        </VStack>

        {/* Controls */}
        <ControlsRow>
          {/* Play/Pause */}
          <IconButton onClick={onToggle} disabled={!isReady}>
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
          </IconButton>

          {/* Volume */}
          <VolumeContainer>
            <IconButton onClick={onMuteToggle} disabled={!isReady}>
              {isMuted || volume === 0 ? (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                </svg>
              )}
            </IconButton>
            <VolumeSlider
              type="range"
              min={0}
              max={100}
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              disabled={!isReady}
            />
          </VolumeContainer>

          {/* Speed control */}
          <SpeedSelect
            value={playbackRate}
            onChange={(e) => onPlaybackRateChange(Number(e.target.value))}
            disabled={!isReady}
          >
            {PLAYBACK_RATES.map((rate) => (
              <option key={rate} value={rate}>
                {rate}x
              </option>
            ))}
          </SpeedSelect>
        </ControlsRow>
      </VStack>
    </Container>
  )
}
