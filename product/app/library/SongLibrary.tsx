'use client'

/**
 * SongLibrary Component
 *
 * Displays the user's saved songs from cloud storage.
 * Supports grid view, delete confirmation, and navigation to chord player.
 *
 * Epic: Cloud Song Storage (P0)
 * Story: 1.7 Frontend Integration
 */

import { HStack } from '@lib/ui/css/stack'
import { getColor } from '@lib/ui/theme/getters'
import { useRouter } from 'next/router'
import { useState } from 'react'
import styled from 'styled-components'

import { Song } from '../services/songLibraryApi'

import { DeleteSongDialog } from './components/DeleteSongDialog'
import { LibraryEmptyState } from './components/LibraryEmptyState'
import { LibraryErrorState } from './components/LibraryErrorState'
import { LibraryLoadingSkeleton } from './components/LibraryLoadingSkeleton'
import { SongCard } from './components/SongCard'
import { useUserSongs } from './hooks/useUserSongs'

const Container = styled.div`
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
`

const Header = styled.div`
  margin-bottom: 32px;
`

const Title = styled.h1`
  font-size: 28px;
  font-weight: 600;
  color: ${getColor('text')};
  margin: 0;
`

const SongCount = styled.span`
  font-size: 14px;
  color: ${getColor('textSupporting')};
  margin-left: 12px;
`

const SongGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
`

export const SongLibrary = () => {
  const router = useRouter()
  const { songs, isLoading, error, total, deleteSong, refresh } = useUserSongs()
  const [songToDelete, setSongToDelete] = useState<Song | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const handleSongClick = (song: Song) => {
    // Navigate to chord player with the video ID
    router.push(`/chords/${song.videoId}`)
  }

  const handleDeleteClick = (song: Song) => {
    setSongToDelete(song)
    setDeleteError(null)
  }

  const handleDeleteCancel = () => {
    setSongToDelete(null)
    setDeleteError(null)
  }

  const handleDeleteConfirm = async () => {
    if (!songToDelete) return

    setIsDeleting(true)
    setDeleteError(null)

    try {
      await deleteSong(songToDelete.id)
      setSongToDelete(null)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to delete song'
      setDeleteError(message)
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <Container>
        <Header>
          <Title>My Library</Title>
        </Header>
        <LibraryLoadingSkeleton count={6} />
      </Container>
    )
  }

  if (error) {
    return (
      <Container>
        <Header>
          <Title>My Library</Title>
        </Header>
        <LibraryErrorState message={error} onRetry={refresh} />
      </Container>
    )
  }

  if (songs.length === 0) {
    return (
      <Container>
        <Header>
          <Title>My Library</Title>
        </Header>
        <LibraryEmptyState />
      </Container>
    )
  }

  return (
    <Container>
      <Header>
        <HStack alignItems="baseline">
          <Title>My Library</Title>
          <SongCount>
            {total} {total === 1 ? 'song' : 'songs'}
          </SongCount>
        </HStack>
      </Header>

      <SongGrid>
        {songs.map((song) => (
          <SongCard
            key={song.id}
            song={song}
            onClick={() => handleSongClick(song)}
            onDelete={() => handleDeleteClick(song)}
          />
        ))}
      </SongGrid>

      <DeleteSongDialog
        song={songToDelete}
        isOpen={!!songToDelete}
        isDeleting={isDeleting}
        error={deleteError}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
      />
    </Container>
  )
}
