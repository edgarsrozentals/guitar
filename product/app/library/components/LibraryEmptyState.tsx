'use client'

/**
 * LibraryEmptyState Component
 *
 * Displayed when the user has no songs in their library.
 *
 * Epic: Cloud Song Storage (P0)
 * Story: 1.7 Frontend Integration
 */

import { getColor } from '@lib/ui/theme/getters'
import { useRouter } from 'next/router'
import styled from 'styled-components'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
`

const Icon = styled.div`
  font-size: 64px;
  margin-bottom: 16px;
`

const Title = styled.h2`
  font-size: 20px;
  font-weight: 600;
  color: ${getColor('text')};
  margin: 0 0 8px 0;
`

const Description = styled.p`
  font-size: 14px;
  color: ${getColor('textSupporting')};
  margin: 0 0 24px 0;
  max-width: 400px;
  line-height: 1.5;
`

const AddButton = styled.button`
  padding: 12px 24px;
  background: ${getColor('primary')};
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    filter: brightness(1.1);
  }
`

export const LibraryEmptyState = () => {
  const router = useRouter()

  const handleAddSong = () => {
    router.push('/chords')
  }

  return (
    <Container>
      <Icon>🎸</Icon>
      <Title>No songs yet</Title>
      <Description>
        Your song library is empty. Analyze a YouTube video to add your first
        song and start practicing!
      </Description>
      <AddButton onClick={handleAddSong}>Analyze a Song</AddButton>
    </Container>
  )
}
