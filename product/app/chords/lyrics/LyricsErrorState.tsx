'use client'

import { VStack } from '@lib/ui/css/stack'
import { getColor } from '@lib/ui/theme/getters'
import styled from 'styled-components'

import {
  ERROR_MESSAGES,
  LyricsErrorState as LyricsErrorStateType,
} from './types'

type LyricsErrorStateProps = {
  errorType: LyricsErrorStateType['errorType']
  message?: string
  onRetry: () => void
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  min-height: 120px;
`

const ErrorMessage = styled.div`
  font-size: 13px;
  color: ${getColor('alert')};
  text-align: center;
  max-width: 280px;
`

const RetryButton = styled.button`
  padding: 10px 20px;
  background: ${getColor('primary')};
  color: ${getColor('background')};
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    opacity: 0.9;
  }
`

export function LyricsErrorState({
  errorType,
  message,
  onRetry,
}: LyricsErrorStateProps) {
  const errorMessage = message || ERROR_MESSAGES[errorType]

  return (
    <Container>
      <VStack gap={16} alignItems="center">
        <ErrorMessage>{errorMessage}</ErrorMessage>
        <RetryButton onClick={onRetry}>Try Again</RetryButton>
      </VStack>
    </Container>
  )
}
