'use client'

/**
 * useUserSongs Hook
 *
 * Manages the user's song library with CRUD operations.
 * Provides loading, error states, and optimistic updates.
 *
 * Epic: Cloud Song Storage (P0)
 * Story: 1.7 Frontend Integration
 */

import { useState, useEffect, useCallback } from 'react'

import {
  songLibraryApi,
  Song,
  SongsResponse,
} from '../../services/songLibraryApi'

type UseUserSongsResult = {
  songs: Song[]
  isLoading: boolean
  error: string | null
  totalPages: number
  currentPage: number
  total: number
  fetchSongs: (page?: number) => Promise<void>
  deleteSong: (songId: string) => Promise<void>
  refresh: () => Promise<void>
}

export function useUserSongs(): UseUserSongsResult {
  const [songs, setSongs] = useState<Song[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchSongs = useCallback(async (page = 1) => {
    setIsLoading(true)
    setError(null)
    try {
      const response: SongsResponse = await songLibraryApi.listSongs(page)
      setSongs(response.songs)
      setTotalPages(response.totalPages)
      setCurrentPage(response.page)
      setTotal(response.total)
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to load songs'
      setError(message)
      // Don't clear existing songs on error
    } finally {
      setIsLoading(false)
    }
  }, [])

  const deleteSong = useCallback(
    async (songId: string) => {
      // Optimistic update - remove from list immediately
      const previousSongs = songs
      setSongs((prev) => prev.filter((s) => s.id !== songId))
      setTotal((prev) => Math.max(0, prev - 1))

      try {
        await songLibraryApi.deleteSong(songId)
      } catch (err) {
        // Revert on failure
        setSongs(previousSongs)
        setTotal((prev) => prev + 1)
        throw err
      }
    },
    [songs],
  )

  const refresh = useCallback(
    () => fetchSongs(currentPage),
    [currentPage, fetchSongs],
  )

  useEffect(() => {
    fetchSongs()
  }, [fetchSongs])

  return {
    songs,
    isLoading,
    error,
    totalPages,
    currentPage,
    total,
    fetchSongs,
    deleteSong,
    refresh,
  }
}
