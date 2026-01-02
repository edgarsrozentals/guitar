'use client'

import { VStack } from '@lib/ui/css/stack'
import { getColor } from '@lib/ui/theme/getters'
import styled from 'styled-components'

type LyricsEmptyStateProps = {
  onGenerate: () => void
  isDisabled?: boolean
  hasVocalsStem?: boolean
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  min-height: 120px;
`

const GenerateButton = styled.button`
  padding: 14px 28px;
  background: ${getColor('primary')};
  color: ${getColor('background')};
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const HelperText = styled.p`
  font-size: 13px;
  color: ${getColor('textSupporting')};
  text-align: center;
  margin: 0;
  max-width: 300px;
`

const StemHint = styled.p`
  font-size: 12px;
  color: ${getColor('textShy')};
  text-align: center;
  margin: 0;
  max-width: 300px;
`

export function LyricsEmptyState({
  onGenerate,
  isDisabled = false,
  hasVocalsStem = false,
}: LyricsEmptyStateProps) {
  return (
    <Container>
      <VStack gap={12} alignItems="center">
        <GenerateButton onClick={onGenerate} disabled={isDisabled}>
          Generate Lyrics
        </GenerateButton>
        <HelperText>
          Extract lyrics from audio using AI transcription
        </HelperText>
        {hasVocalsStem ? (
          <StemHint>Using isolated vocals for better accuracy</StemHint>
        ) : (
          <StemHint>Tip: Separate stems first for better accuracy</StemHint>
        )}
      </VStack>
    </Container>
  )
}
