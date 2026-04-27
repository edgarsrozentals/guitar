'use client'

import { HStack, VStack } from '@lib/ui/css/stack'
import { textInput } from '@lib/ui/css/textInput'
import { getColor } from '@lib/ui/theme/getters'
import { useState, useCallback, useEffect } from 'react'
import styled from 'styled-components'

import { parseYouTubeUrl } from './utils/parseYouTubeUrl'

const BACKEND_URL = ''

type ProcessedSong = {
  videoId: string
  title: string
  duration: number
  hasAudio: boolean
  hasStems: boolean
  key: { root: string; scale: string } | null
  tempo: { bpm: number } | null
}

type YouTubeUrlInputProps = {
  onVideoSelect: (videoId: string) => void
  isLoading?: boolean
}

const Container = styled.div`
  width: 100%;
`

const InputWrapper = styled.div`
  position: relative;
  width: 100%;
`

const Input = styled.input`
  ${textInput};
  padding-right: 100px;
`

const SubmitButton = styled.button<{ $isDisabled?: boolean }>`
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: ${({ $isDisabled }) =>
    $isDisabled ? getColor('mist') : getColor('primary')};
  color: ${({ $isDisabled }) =>
    $isDisabled ? getColor('textSupporting') : getColor('background')};
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 600;
  cursor: ${({ $isDisabled }) => ($isDisabled ? 'not-allowed' : 'pointer')};
  transition: all 0.2s ease;

  &:hover {
    opacity: ${({ $isDisabled }) => ($isDisabled ? 1 : 0.9)};
  }
`

const ErrorText = styled.span`
  color: ${getColor('alert')};
  font-size: 13px;
`

const HelpText = styled.span`
  color: ${getColor('textSupporting')};
  font-size: 13px;
`

const Divider = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  color: ${getColor('textSupporting')};
  font-size: 12px;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: ${getColor('mist')};
  }
`

const SongSelect = styled.select`
  ${textInput};
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23666' d='M6 8L2 4h8z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  padding-right: 36px;

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const SongMeta = styled.span`
  font-size: 11px;
  color: ${getColor('textSupporting')};
  margin-left: 8px;
`

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function YouTubeUrlInput({
  onVideoSelect,
  isLoading,
}: YouTubeUrlInputProps) {
  const [url, setUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [processedSongs, setProcessedSongs] = useState<ProcessedSong[]>([])
  const [isLoadingSongs, setIsLoadingSongs] = useState(true)

  // Fetch list of processed songs
  useEffect(() => {
    async function fetchSongs() {
      try {
        const response = await fetch(`${BACKEND_URL}/api/songs`)
        if (response.ok) {
          const songs = await response.json()
          setProcessedSongs(songs)
        }
      } catch (err) {
        console.error('Failed to fetch processed songs:', err)
      } finally {
        setIsLoadingSongs(false)
      }
    }
    fetchSongs()
  }, [])

  const handleSubmit = useCallback(() => {
    const result = parseYouTubeUrl(url)
    if (result.success) {
      setError(null)
      onVideoSelect(result.videoId)
    } else {
      setError(result.error)
    }
  }, [url, onVideoSelect])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSubmit()
      }
    },
    [handleSubmit],
  )

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUrl(e.target.value)
    setError(null)
  }, [])

  const handleSongSelect = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const videoId = e.target.value
      if (videoId) {
        onVideoSelect(videoId)
      }
    },
    [onVideoSelect],
  )

  const isDisabled = isLoading || !url.trim()

  return (
    <Container>
      <VStack gap={12}>
        {/* Previously processed songs dropdown */}
        {processedSongs.length > 0 && (
          <>
            <VStack gap={4}>
              <SongSelect
                onChange={handleSongSelect}
                disabled={isLoading}
                defaultValue=""
              >
                <option value="" disabled>
                  {isLoadingSongs
                    ? 'Loading songs...'
                    : `Select from ${processedSongs.length} processed song${processedSongs.length === 1 ? '' : 's'}`}
                </option>
                {processedSongs.map((song) => (
                  <option key={song.videoId} value={song.videoId}>
                    {song.title} ({formatDuration(song.duration)})
                    {song.key ? ` - ${song.key.root} ${song.key.scale}` : ''}
                    {song.hasStems ? ' [stems]' : ''}
                  </option>
                ))}
              </SongSelect>
            </VStack>
            <Divider>or paste a new URL</Divider>
          </>
        )}

        {/* URL input */}
        <InputWrapper>
          <Input
            type="text"
            placeholder="Paste YouTube URL (e.g., https://youtube.com/watch?v=...)"
            value={url}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
          />
          <SubmitButton
            onClick={handleSubmit}
            $isDisabled={isDisabled}
            disabled={isDisabled}
          >
            {isLoading ? 'Loading...' : 'Load'}
          </SubmitButton>
        </InputWrapper>
        <HStack justifyContent="space-between">
          {error ? (
            <ErrorText>{error}</ErrorText>
          ) : (
            <HelpText>
              Enter a YouTube URL to detect chords and play along
            </HelpText>
          )}
        </HStack>
      </VStack>
    </Container>
  )
}
