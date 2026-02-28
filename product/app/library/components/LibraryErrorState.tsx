'use client'

/**
 * LibraryErrorState Component
 *
 * Displayed when there's an error loading the song library.
 *
 * Epic: Cloud Song Storage (P0)
 * Story: 1.7 Frontend Integration
 */

import { getColor } from '@lib/ui/theme/getters'
import styled from 'styled-components'

type LibraryErrorStateProps = {
  message: string
  onRetry: () => void
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
`

const Icon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
`

const Title = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: ${getColor('text')};
  margin: 0 0 8px 0;
`

const Message = styled.p`
  font-size: 14px;
  color: ${getColor('textSupporting')};
  margin: 0 0 24px 0;
  max-width: 400px;
`

const RetryButton = styled.button`
  padding: 10px 20px;
  background: transparent;
  color: ${getColor('primary')};
  border: 1px solid ${getColor('primary')};
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${getColor('primary')};
    color: white;
  }
`

export const LibraryErrorState = ({
  message,
  onRetry,
}: LibraryErrorStateProps) => {
  return (
    <Container>
      <Icon>⚠️</Icon>
      <Title>Failed to load your songs</Title>
      <Message>{message}</Message>
      <RetryButton onClick={onRetry}>Retry</RetryButton>
    </Container>
  )
}
