'use client'

/**
 * SongCard Component
 *
 * Displays a song in the library grid with metadata and status indicators.
 *
 * Epic: Cloud Song Storage (P0)
 * Story: 1.7 Frontend Integration
 */

import { VStack } from '@lib/ui/css/stack'
import { getColor } from '@lib/ui/theme/getters'
import styled from 'styled-components'

import { Song } from '../../services/songLibraryApi'

type SongCardProps = {
  song: Song
  onClick: () => void
  onDelete: () => void
}

const Card = styled.div`
  background: ${getColor('background')};
  border: 1px solid ${getColor('mist')};
  border-radius: 12px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${getColor('primary')};
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
`

const ThumbnailContainer = styled.div`
  width: 100%;
  aspect-ratio: 16 / 9;
  background: ${getColor('mist')};
  border-radius: 8px;
  margin-bottom: 12px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
`

const Thumbnail = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`

const PlaceholderIcon = styled.div`
  font-size: 32px;
  color: ${getColor('textSupporting')};
`

const SongTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: ${getColor('text')};
  margin: 0 0 4px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const Artist = styled.span`
  font-size: 14px;
  color: ${getColor('textSupporting')};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
`

const Duration = styled.span`
  font-size: 12px;
  color: ${getColor('textSupporting')};
`

const StatusIndicators = styled.div`
  display: flex;
  gap: 8px;
`

const StatusBadge = styled.span<{ $active: boolean }>`
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background: ${(props) =>
    props.$active ? getColor('success') : getColor('mist')};
  color: ${(props) => (props.$active ? 'white' : getColor('textSupporting'))};
`

const DeleteButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.6);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;

  &:hover {
    background: ${getColor('alert')};
  }
`

const CardWrapper = styled.div`
  position: relative;

  &:hover ${DeleteButton} {
    opacity: 1;
  }
`

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
}

export const SongCard = ({ song, onClick, onDelete }: SongCardProps) => {
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete()
  }

  return (
    <CardWrapper>
      <Card onClick={onClick}>
        <ThumbnailContainer>
          <Thumbnail
            src={getYouTubeThumbnail(song.videoId)}
            alt={song.title}
            onError={(e) => {
              // Hide broken image
              e.currentTarget.style.display = 'none'
            }}
          />
        </ThumbnailContainer>

        <VStack gap={4}>
          <SongTitle title={song.title}>{song.title}</SongTitle>
          {song.artist && <Artist title={song.artist}>{song.artist}</Artist>}
        </VStack>

        <MetaRow>
          <Duration>{formatDuration(song.durationSeconds)}</Duration>
          <StatusIndicators>
            <StatusBadge $active={song.hasChords} title="Chords analyzed">
              {song.hasChords ? '✓' : '○'} Chords
            </StatusBadge>
            <StatusBadge $active={song.hasStems} title="Stems separated">
              {song.hasStems ? '✓' : '○'} Stems
            </StatusBadge>
            <StatusBadge $active={song.hasLyrics} title="Lyrics generated">
              {song.hasLyrics ? '✓' : '○'} Lyrics
            </StatusBadge>
          </StatusIndicators>
        </MetaRow>
      </Card>

      <DeleteButton onClick={handleDeleteClick} title="Delete song">
        ×
      </DeleteButton>
    </CardWrapper>
  )
}
