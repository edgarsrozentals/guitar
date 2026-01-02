'use client'

import { VStack } from '@lib/ui/css/stack'
import { getColor } from '@lib/ui/theme/getters'
import styled from 'styled-components'

type LyricsLoadingStateProps = {
  progress: number // 0-100
  onCancel?: () => void
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  min-height: 120px;
`

const StatusText = styled.div`
  font-size: 13px;
  color: ${getColor('text')};
  font-weight: 500;
`

const ProgressBarTrack = styled.div`
  width: 100%;
  max-width: 240px;
  height: 8px;
  background: ${getColor('mist')};
  border-radius: 4px;
  overflow: hidden;
`

const ProgressBarFill = styled.div<{ $progress: number }>`
  height: 100%;
  width: ${({ $progress }) => $progress}%;
  background: ${getColor('primary')};
  border-radius: 4px;
  transition: width 0.3s ease;
`

const ProgressPercent = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${getColor('primary')};
`

const CancelButton = styled.button`
  padding: 6px 12px;
  background: transparent;
  color: ${getColor('textSupporting')};
  border: 1px solid ${getColor('mist')};
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${getColor('mist')};
    color: ${getColor('text')};
  }
`

export function LyricsLoadingState({
  progress,
  onCancel,
}: LyricsLoadingStateProps) {
  return (
    <Container>
      <VStack gap={12} alignItems="center" fullWidth>
        <StatusText>Generating lyrics...</StatusText>
        <ProgressBarTrack>
          <ProgressBarFill $progress={progress} />
        </ProgressBarTrack>
        <ProgressPercent>{Math.round(progress)}%</ProgressPercent>
        {onCancel && <CancelButton onClick={onCancel}>Cancel</CancelButton>}
      </VStack>
    </Container>
  )
}
