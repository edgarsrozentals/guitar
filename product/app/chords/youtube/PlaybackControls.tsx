'use client'

import { HStack, VStack } from '@lib/ui/css/stack'
import { getColor } from '@lib/ui/theme/getters'
import { useCallback, useState, useEffect, useRef } from 'react'
import styled from 'styled-components'

// Playback rates exported for use in Audio tab controls
export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5]

type PlaybackControlsProps = {
  isReady: boolean
  currentTime: number
  duration: number
  onSeek: (seconds: number) => void
  onSeekPreview?: (seconds: number) => void // Called during drag to preview position
}

const Container = styled.div`
  width: 100%;
  background: ${getColor('foreground')};
  border-radius: 12px;
  padding: 16px;
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
`

const ProgressFill = styled.div.attrs<{
  $progress: number
  $isDragging?: boolean
}>(({ $progress, $isDragging }) => ({
  style: {
    width: `${$progress * 100}%`,
    transition: $isDragging ? 'none' : 'width 0.1s linear',
  },
}))`
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: ${getColor('success')};
  border-radius: 3px;
`

const ProgressThumb = styled.div.attrs<{
  $progress: number
  $isDragging?: boolean
}>(({ $progress, $isDragging }) => ({
  style: {
    left: `${$progress * 100}%`,
    transition: $isDragging ? 'none' : 'left 0.1s linear',
  },
}))`
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 14px;
  height: 14px;
  background: white;
  border-radius: 50%;
  cursor: grab;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);

  &:hover {
    transform: translate(-50%, -50%) scale(1.2);
  }

  &:active {
    cursor: grabbing;
  }
`

const TimeDisplay = styled.span<{ $align?: 'left' | 'right' }>`
  font-size: 13px;
  color: ${getColor('textSupporting')};
  font-variant-numeric: tabular-nums;
  min-width: 45px;
  text-align: ${({ $align }) => $align || 'left'};
`

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function PlaybackControls({
  isReady,
  currentTime,
  duration,
  onSeek,
  onSeekPreview,
}: PlaybackControlsProps) {
  const progress = duration > 0 ? currentTime / duration : 0
  const [isDragging, setIsDragging] = useState(false)
  const [dragProgress, setDragProgress] = useState(0)
  const progressBarRef = useRef<HTMLDivElement>(null)

  const displayProgress = isDragging ? dragProgress : progress

  const calculateProgress = useCallback(
    (clientX: number) => {
      if (!progressBarRef.current || !duration) return 0
      const rect = progressBarRef.current.getBoundingClientRect()
      const clickX = clientX - rect.left
      return Math.max(0, Math.min(1, clickX / rect.width))
    },
    [duration],
  )

  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!duration) return
      const percentage = calculateProgress(e.clientX)
      const newTime = percentage * duration
      onSeek(Math.max(0, Math.min(duration, newTime)))
    },
    [duration, onSeek, calculateProgress],
  )

  const handleThumbMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation()
      setIsDragging(true)
      setDragProgress(progress)
    },
    [progress],
  )

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      const newProgress = calculateProgress(e.clientX)
      setDragProgress(newProgress)
      // Preview the position on chord timeline during drag
      if (onSeekPreview) {
        const previewTime = newProgress * duration
        onSeekPreview(Math.max(0, Math.min(duration, previewTime)))
      }
    }

    const handleMouseUp = (e: MouseEvent) => {
      const finalProgress = calculateProgress(e.clientX)
      const newTime = finalProgress * duration
      onSeek(Math.max(0, Math.min(duration, newTime)))
      setIsDragging(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    document.body.style.cursor = 'grabbing'
    document.body.style.userSelect = 'none'

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging, duration, onSeek, onSeekPreview, calculateProgress])

  return (
    <Container>
      <VStack gap={4}>
        <ProgressContainer onClick={handleProgressClick} ref={progressBarRef}>
          <ProgressBar>
            <ProgressFill
              $progress={displayProgress}
              $isDragging={isDragging}
            />
            <ProgressThumb
              $progress={displayProgress}
              $isDragging={isDragging}
              onMouseDown={handleThumbMouseDown}
            />
          </ProgressBar>
        </ProgressContainer>
        <HStack justifyContent="space-between">
          <TimeDisplay>{formatTime(currentTime)}</TimeDisplay>
          <TimeDisplay $align="right">{formatTime(duration)}</TimeDisplay>
        </HStack>
      </VStack>
    </Container>
  )
}
