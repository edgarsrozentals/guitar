'use client'

/**
 * useCloudSong Hook
 *
 * Manages a single song's cloud data including:
 * - Loading existing song data by video ID
 * - Auto-saving chords, stems, and lyrics
 * - Creating new songs in the library
 *
 * Epic: Cloud Song Storage (P0)
 * Story: 1.7 Frontend Integration
 */

import { useState, useEffect, useCallback, useRef } from 'react'

import {
  songLibraryApi,
  Song,
  ChordAnalysis,
  ChordLibrary,
  Stem,
  StemType,
  Lyrics,
} from '../../services/songLibraryApi'

type UseCloudSongInput = {
  videoId: string | null
  isAuthenticated: boolean
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

type UseCloudSongResult = {
  // Song data
  song: Song | null
  isLoading: boolean
  error: string | null

  // Existing analysis data
  existingChords: Map<ChordLibrary, ChordAnalysis>
  existingStems: Map<StemType, Stem>
  existingLyrics: Lyrics | null

  // Save status
  saveStatus: SaveStatus
  lastSaved: Date | null

  // Actions
  createOrGetSong: (data: {
    title: string
    artist?: string
    durationSeconds: number
  }) => Promise<Song | null>
  saveChords: (
    library: ChordLibrary,
    chords: ChordAnalysis['chords'],
    options?: { tempo?: ChordAnalysis['tempo']; key?: ChordAnalysis['key'] },
  ) => Promise<void>
  saveStem: (
    stemType: StemType,
    audioData: string,
    durationSeconds?: number,
  ) => Promise<void>
  saveLyrics: (
    lrcContent: string,
    options?: {
      hasWordTiming?: boolean
      audioSource?: 'vocals_stem' | 'full_audio'
    },
  ) => Promise<void>
  refresh: () => Promise<void>
}

export function useCloudSong({
  videoId,
  isAuthenticated,
}: UseCloudSongInput): UseCloudSongResult {
  const [song, setSong] = useState<Song | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [existingChords, setExistingChords] = useState<
    Map<ChordLibrary, ChordAnalysis>
  >(new Map())
  const [existingStems, setExistingStems] = useState<Map<StemType, Stem>>(
    new Map(),
  )
  const [existingLyrics, setExistingLyrics] = useState<Lyrics | null>(null)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  const loadedVideoIdRef = useRef<string | null>(null)

  // Load existing song data
  const loadSongData = useCallback(async () => {
    if (!videoId || !isAuthenticated) {
      setSong(null)
      setExistingChords(new Map())
      setExistingStems(new Map())
      setExistingLyrics(null)
      return
    }

    // Don't reload if we already loaded this video
    if (loadedVideoIdRef.current === videoId && song) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Try to find existing song by video ID
      const existingSong = await songLibraryApi.getSongByVideoId(videoId)

      if (existingSong) {
        setSong(existingSong)
        loadedVideoIdRef.current = videoId

        // Load associated data in parallel
        const [chordsResult, stemsResult, lyricsResult] =
          await Promise.allSettled([
            songLibraryApi.getChords(existingSong.id),
            songLibraryApi.getStems(existingSong.id),
            songLibraryApi.getLyrics(existingSong.id),
          ])

        // Process chords
        if (chordsResult.status === 'fulfilled') {
          const chordsMap = new Map<ChordLibrary, ChordAnalysis>()
          for (const chord of chordsResult.value.chords) {
            chordsMap.set(chord.library, chord)
          }
          setExistingChords(chordsMap)
        }

        // Process stems
        if (stemsResult.status === 'fulfilled') {
          const stemsMap = new Map<StemType, Stem>()
          for (const stem of stemsResult.value.stems) {
            stemsMap.set(stem.stemType, stem)
          }
          setExistingStems(stemsMap)
        }

        // Process lyrics
        if (lyricsResult.status === 'fulfilled' && lyricsResult.value) {
          setExistingLyrics(lyricsResult.value)
        }
      } else {
        // No existing song
        setSong(null)
        setExistingChords(new Map())
        setExistingStems(new Map())
        setExistingLyrics(null)
        loadedVideoIdRef.current = videoId
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load song data'
      setError(message)
      console.error('Error loading cloud song:', err)
    } finally {
      setIsLoading(false)
    }
  }, [videoId, isAuthenticated, song])

  // Load data when video ID changes
  useEffect(() => {
    if (videoId && isAuthenticated) {
      loadSongData()
    }
  }, [videoId, isAuthenticated, loadSongData])

  // Create or get song
  const createOrGetSong = useCallback(
    async (data: {
      title: string
      artist?: string
      durationSeconds: number
    }) => {
      if (!videoId || !isAuthenticated) return null

      try {
        // Check if song already exists
        if (song) {
          return song
        }

        // Create new song
        setSaveStatus('saving')
        const newSong = await songLibraryApi.createSong({
          videoId,
          title: data.title,
          artist: data.artist,
          durationSeconds: data.durationSeconds,
        })
        setSong(newSong)
        setSaveStatus('saved')
        setLastSaved(new Date())
        loadedVideoIdRef.current = videoId
        return newSong
      } catch (err) {
        setSaveStatus('error')
        console.error('Error creating song:', err)
        return null
      }
    },
    [videoId, isAuthenticated, song],
  )

  // Save chords
  const saveChords = useCallback(
    async (
      library: ChordLibrary,
      chords: ChordAnalysis['chords'],
      options?: { tempo?: ChordAnalysis['tempo']; key?: ChordAnalysis['key'] },
    ) => {
      if (!song) {
        console.warn('Cannot save chords: no song loaded')
        return
      }

      setSaveStatus('saving')
      try {
        const savedChords = await songLibraryApi.saveChords(
          song.id,
          library,
          chords,
          options,
        )
        setExistingChords((prev) => new Map(prev).set(library, savedChords))
        setSaveStatus('saved')
        setLastSaved(new Date())
      } catch (err) {
        setSaveStatus('error')
        console.error('Error saving chords:', err)
        throw err
      }
    },
    [song],
  )

  // Save stem
  const saveStem = useCallback(
    async (stemType: StemType, audioData: string, durationSeconds?: number) => {
      if (!song) {
        console.warn('Cannot save stem: no song loaded')
        return
      }

      setSaveStatus('saving')
      try {
        const savedStem = await songLibraryApi.uploadStem(
          song.id,
          stemType,
          audioData,
          durationSeconds,
        )
        setExistingStems((prev) => new Map(prev).set(stemType, savedStem))
        setSaveStatus('saved')
        setLastSaved(new Date())
      } catch (err) {
        setSaveStatus('error')
        console.error('Error saving stem:', err)
        throw err
      }
    },
    [song],
  )

  // Save lyrics
  const saveLyrics = useCallback(
    async (
      lrcContent: string,
      options?: {
        hasWordTiming?: boolean
        audioSource?: 'vocals_stem' | 'full_audio'
      },
    ) => {
      if (!song) {
        console.warn('Cannot save lyrics: no song loaded')
        return
      }

      setSaveStatus('saving')
      try {
        const savedLyrics = await songLibraryApi.saveLyrics(
          song.id,
          lrcContent,
          options,
        )
        setExistingLyrics(savedLyrics)
        setSaveStatus('saved')
        setLastSaved(new Date())
      } catch (err) {
        setSaveStatus('error')
        console.error('Error saving lyrics:', err)
        throw err
      }
    },
    [song],
  )

  // Refresh data
  const refresh = useCallback(async () => {
    loadedVideoIdRef.current = null
    await loadSongData()
  }, [loadSongData])

  return {
    song,
    isLoading,
    error,
    existingChords,
    existingStems,
    existingLyrics,
    saveStatus,
    lastSaved,
    createOrGetSong,
    saveChords,
    saveStem,
    saveLyrics,
    refresh,
  }
}
