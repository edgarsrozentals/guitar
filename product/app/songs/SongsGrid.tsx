'use client'

import { VStack } from '@lib/ui/css/stack'
import { getColor } from '@lib/ui/theme/getters'
import { useRouter } from 'next/router'
import { useCallback, useEffect, useState } from 'react'
import styled from 'styled-components'

import { PageContainer } from '../layout/PageContainer'

const BACKEND_URL = ''

type SongSummary = {
  videoId: string
  title: string
  duration: number
  hasAudio: boolean
  hasStems: boolean
  hasLyrics: boolean
  hasChords: boolean
  analyzedWith: string[]
  key: { root: string; scale: string; strength: number } | null
  tempo: { bpm: number } | null
}

function useSongs() {
  const [songs, setSongs] = useState<SongSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSongs = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`${BACKEND_URL}/api/songs`)
      if (!res.ok) throw new Error('Failed to fetch songs')
      const data = await res.json()
      setSongs(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [])

  const deleteSong = useCallback(async (videoId: string) => {
    const res = await fetch(`${BACKEND_URL}/api/songs/${videoId}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Failed to delete song')
    setSongs((prev) => prev.filter((s) => s.videoId !== videoId))
  }, [])

  useEffect(() => {
    fetchSongs()
  }, [fetchSongs])

  return { songs, loading, error, deleteSong, refetch: fetchSongs }
}

// Styled components

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
`

const CardWrapper = styled.div`
  position: relative;

  &:hover button[data-delete] {
    opacity: 1;
  }
`

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

const SongTitle = styled.h3`
  font-size: 16px;
  font-weight: 600;
  color: ${getColor('text')};
  margin: 0 0 4px 0;
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

const MetaText = styled.span`
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
  font-size: 16px;

  &:hover {
    background: ${getColor('alert')};
  }
`

const Overlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`

const Dialog = styled.div`
  background: ${getColor('background')};
  border-radius: 12px;
  padding: 24px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
`

const DialogTitle = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: ${getColor('text')};
  margin: 0 0 12px 0;
`

const DialogMessage = styled.p`
  font-size: 14px;
  color: ${getColor('textSupporting')};
  margin: 0;
  line-height: 1.5;
`

const DialogSongName = styled.span`
  font-weight: 600;
  color: ${getColor('text')};
`

const DialogWarning = styled.p`
  font-size: 13px;
  color: ${getColor('alert')};
  margin: 16px 0;
  padding: 12px;
  background: rgba(255, 59, 48, 0.1);
  border-radius: 8px;
`

const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
`

const Button = styled.button<{ $variant?: 'danger' }>`
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  ${(props) =>
    props.$variant === 'danger'
      ? `
    background: ${getColor('alert')};
    border: none;
    color: white;
    &:hover:not(:disabled) { filter: brightness(1.1); }
    &:disabled { opacity: 0.6; cursor: not-allowed; }
  `
      : `
    background: transparent;
    border: 1px solid ${getColor('mist')};
    color: ${getColor('text')};
    &:hover { background: ${getColor('mist')}; }
  `}
`

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: ${getColor('textSupporting')};
`

const EmptyIcon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
`

const EmptyTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  color: ${getColor('text')};
  margin: 0 0 8px 0;
`

const EmptyDescription = styled.p`
  font-size: 14px;
  margin: 0;
  line-height: 1.5;
`

const LoadingGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
`

const LoadingSkeleton = styled.div`
  background: ${getColor('mist')};
  border-radius: 12px;
  height: 240px;
  animation: pulse 1.5s ease-in-out infinite;

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
`

const PageTitle = styled.h1`
  font-size: 24px;
  font-weight: 700;
  color: ${getColor('text')};
  margin: 0;
`

const KeyBadge = styled.span`
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  background: ${getColor('mist')};
  color: ${getColor('text')};
  font-weight: 500;
`

// Helpers

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
}

// Component

export const SongsGrid = () => {
  const router = useRouter()
  const { songs, loading, error, deleteSong } = useSongs()
  const [deleteTarget, setDeleteTarget] = useState<SongSummary | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleSongClick = (song: SongSummary) => {
    router.push(`/chords/a/minor?v=${song.videoId}`)
  }

  const handleDeleteClick = (e: React.MouseEvent, song: SongSummary) => {
    e.stopPropagation()
    setDeleteTarget(song)
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      await deleteSong(deleteTarget.videoId)
      setDeleteTarget(null)
    } finally {
      setIsDeleting(false)
    }
  }

  if (loading) {
    return (
      <PageContainer>
        <VStack gap={24}>
          <PageTitle>Songs</PageTitle>
          <LoadingGrid>
            {Array.from({ length: 6 }).map((_, i) => (
              <LoadingSkeleton key={i} />
            ))}
          </LoadingGrid>
        </VStack>
      </PageContainer>
    )
  }

  if (error) {
    return (
      <PageContainer>
        <VStack gap={24}>
          <PageTitle>Songs</PageTitle>
          <EmptyState>
            <EmptyTitle>Could not load songs</EmptyTitle>
            <EmptyDescription>
              Make sure the backend server is running on port 4568.
            </EmptyDescription>
          </EmptyState>
        </VStack>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <VStack gap={24}>
        <PageTitle>Songs</PageTitle>

        {songs.length === 0 ? (
          <EmptyState>
            <EmptyIcon>&#127925;</EmptyIcon>
            <EmptyTitle>No songs yet</EmptyTitle>
            <EmptyDescription>
              Go to the Chords page and paste a YouTube URL to analyze your
              first song.
            </EmptyDescription>
          </EmptyState>
        ) : (
          <Grid>
            {songs.map((song) => (
              <CardWrapper key={song.videoId}>
                <Card onClick={() => handleSongClick(song)}>
                  <ThumbnailContainer>
                    <Thumbnail
                      src={getYouTubeThumbnail(song.videoId)}
                      alt={song.title}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none'
                      }}
                    />
                  </ThumbnailContainer>

                  <SongTitle title={song.title}>{song.title}</SongTitle>

                  <MetaRow>
                    <div
                      style={{
                        display: 'flex',
                        gap: '8px',
                        alignItems: 'center',
                      }}
                    >
                      <MetaText>{formatDuration(song.duration)}</MetaText>
                      {song.key && (
                        <KeyBadge>
                          {song.key.root} {song.key.scale}
                        </KeyBadge>
                      )}
                      {song.tempo && (
                        <MetaText>{Math.round(song.tempo.bpm)} BPM</MetaText>
                      )}
                    </div>
                  </MetaRow>

                  <MetaRow>
                    <StatusIndicators>
                      <StatusBadge $active={song.hasChords}>
                        {song.hasChords ? '\u2713' : '\u25CB'} Chords
                      </StatusBadge>
                      <StatusBadge $active={song.hasStems}>
                        {song.hasStems ? '\u2713' : '\u25CB'} Stems
                      </StatusBadge>
                      <StatusBadge $active={song.hasLyrics}>
                        {song.hasLyrics ? '\u2713' : '\u25CB'} Lyrics
                      </StatusBadge>
                    </StatusIndicators>
                  </MetaRow>
                </Card>

                <DeleteButton
                  data-delete
                  onClick={(e) => handleDeleteClick(e, song)}
                  title="Delete song"
                >
                  &times;
                </DeleteButton>
              </CardWrapper>
            ))}
          </Grid>
        )}
      </VStack>

      {deleteTarget && (
        <Overlay
          onClick={(e) => {
            if (e.target === e.currentTarget && !isDeleting) {
              setDeleteTarget(null)
            }
          }}
        >
          <Dialog>
            <DialogTitle>Delete Song</DialogTitle>
            <DialogMessage>
              Are you sure you want to delete{' '}
              <DialogSongName>{deleteTarget.title}</DialogSongName>?
            </DialogMessage>
            <DialogWarning>
              This will permanently delete the song and all associated data
              including audio, chord analyses, stems, and lyrics.
            </DialogWarning>

            <ButtonRow>
              <Button
                onClick={() => setDeleteTarget(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                $variant="danger"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </ButtonRow>
          </Dialog>
        </Overlay>
      )}
    </PageContainer>
  )
}
