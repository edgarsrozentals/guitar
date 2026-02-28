'use client'

/**
 * useSaveToLibrary Hook
 *
 * Manages saving a song to the user's cloud library.
 * Provides save button state and auto-save functionality.
 *
 * Epic: Cloud Song Storage (P0)
 * Story: 1.7 Frontend Integration
 */

import { useState, useEffect, useCallback, useRef } from 'react'

import {
  songLibraryApi,
  Song,
  ChordLibrary,
  ChordAnalysis,
} from '../../../services/songLibraryApi'
import { useAuth } from '../../../state/auth/AuthProvider'

type SongMetadata = {
  videoId: string
  title: string
  artist?: string
  durationSeconds: number
}

type UseSaveToLibraryInput = {
  metadata: SongMetadata | null
  enabled?: boolean
}

type SaveStatus =
  | 'idle'
  | 'checking'
  | 'not_saved'
  | 'saving'
  | 'saved'
  | 'error'

type UseSaveToLibraryResult = {
  // State
  cloudSong: Song | null
  saveStatus: SaveStatus
  error: string | null
  isAuthenticated: boolean

  // Actions
  saveToLibrary: () => Promise<void>
  saveChords: (
    library: ChordLibrary,
    chords: ChordAnalysis['chords'],
    options?: { tempo?: ChordAnalysis['tempo']; key?: ChordAnalysis['key'] },
  ) => Promise<void>

  // Status helpers
  isSaved: boolean
  canSave: boolean
}

export function useSaveToLibrary({
  metadata,
  enabled = true,
}: UseSaveToLibraryInput): UseSaveToLibraryResult {
  const { user } = useAuth()
  const isAuthenticated = !!user

  const [cloudSong, setCloudSong] = useState<Song | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [error, setError] = useState<string | null>(null)

  const checkedVideoIdRef = useRef<string | null>(null)

  // Check if song exists in library when video ID changes
  useEffect(() => {
    if (!enabled || !isAuthenticated || !metadata?.videoId) {
      setCloudSong(null)
      setSaveStatus('idle')
      return
    }

    // Don't re-check if we already checked this video
    if (checkedVideoIdRef.current === metadata.videoId) {
      return
    }

    const checkSong = async () => {
      setSaveStatus('checking')
      setError(null)

      try {
        const existingSong = await songLibraryApi.getSongByVideoId(
          metadata.videoId,
        )
        checkedVideoIdRef.current = metadata.videoId

        if (existingSong) {
          setCloudSong(existingSong)
          setSaveStatus('saved')
        } else {
          setCloudSong(null)
          setSaveStatus('not_saved')
        }
      } catch (err) {
        console.error('Error checking song in library:', err)
        setSaveStatus('not_saved')
      }
    }

    checkSong()
  }, [enabled, isAuthenticated, metadata?.videoId])

  // Save song to library
  const saveToLibrary = useCallback(async () => {
    if (!metadata || !isAuthenticated) return

    setSaveStatus('saving')
    setError(null)

    try {
      const song = await songLibraryApi.createSong({
        videoId: metadata.videoId,
        title: metadata.title,
        artist: metadata.artist,
        durationSeconds: metadata.durationSeconds,
      })
      setCloudSong(song)
      setSaveStatus('saved')
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save'
      setError(message)
      setSaveStatus('error')
    }
  }, [metadata, isAuthenticated])

  // Save chords to library (requires song to be saved first)
  const saveChords = useCallback(
    async (
      library: ChordLibrary,
      chords: ChordAnalysis['chords'],
      options?: { tempo?: ChordAnalysis['tempo']; key?: ChordAnalysis['key'] },
    ) => {
      if (!cloudSong) {
        console.warn('Cannot save chords: song not in library')
        return
      }

      try {
        await songLibraryApi.saveChords(cloudSong.id, library, chords, options)
      } catch (err) {
        console.error('Error saving chords to library:', err)
      }
    },
    [cloudSong],
  )

  return {
    cloudSong,
    saveStatus,
    error,
    isAuthenticated,
    saveToLibrary,
    saveChords,
    isSaved: saveStatus === 'saved',
    canSave: saveStatus === 'not_saved' && isAuthenticated && !!metadata,
  }
}
