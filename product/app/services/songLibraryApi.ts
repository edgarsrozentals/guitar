'use client'

/**
 * Song Library API Client
 *
 * API client for managing user songs in the cloud.
 * Handles authentication via Supabase JWT tokens.
 *
 * Epic: Cloud Song Storage (P0)
 * Story: 1.7 Frontend Integration
 */

import { getSupabaseBrowserClient } from '../lib/supabase/client'

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4568'

// ============================================
// TYPES
// ============================================

export type ChordLibrary = 'essentia' | 'madmom' | 'btc' | 'chordify'
export type StemType =
  | 'vocals'
  | 'backing'
  | 'drums'
  | 'bass'
  | 'guitar'
  | 'piano'
  | 'other'

export type Song = {
  id: string
  videoId: string
  title: string
  artist: string | null
  durationSeconds: number
  audioUrl: string | null
  hasChords: boolean
  hasStems: boolean
  hasLyrics: boolean
  keyDetected: {
    root: string
    scale: 'major' | 'minor'
    strength: number
  } | null
  tempoDetected: { bpm: number; confidence: number; beats?: number[] } | null
  createdAt: string
  lastAccessedAt: string
}

export type SongsResponse = {
  songs: Song[]
  total: number
  page: number
  totalPages: number
}

export type ChordAnalysis = {
  id: string
  library: ChordLibrary
  chords: Array<{ time: number; chord: { root: string; quality: string } }>
  tempo: { bpm: number; confidence: number; beats?: number[] } | null
  key: { root: string; scale: string; strength: number } | null
  createdAt: string
}

export type Stem = {
  id: string
  stemType: StemType
  url: string
  durationSeconds: number | null
  createdAt: string
}

export type Lyrics = {
  id: string
  lrcContent: string
  hasWordTiming: boolean
  audioSource: 'vocals_stem' | 'full_audio' | null
  lrcFileUrl: string | null
  createdAt: string
}

// ============================================
// AUTH HELPERS
// ============================================

async function getAuthHeaders(): Promise<HeadersInit> {
  const supabase = getSupabaseBrowserClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) {
    throw new Error('Not authenticated')
  }

  return {
    Authorization: `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  }
}

async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers = await getAuthHeaders()
  return fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  })
}

// ============================================
// SONG LIBRARY API
// ============================================

export const songLibraryApi = {
  // ----------------------------------------
  // Songs CRUD
  // ----------------------------------------

  async listSongs(page = 1, limit = 20): Promise<SongsResponse> {
    const response = await fetchWithAuth(
      `${BACKEND_URL}/api/user-songs?page=${page}&limit=${limit}`,
    )
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || 'Failed to fetch songs')
    }
    return response.json()
  },

  async getSong(songId: string): Promise<Song> {
    const response = await fetchWithAuth(
      `${BACKEND_URL}/api/user-songs/${songId}`,
    )
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || 'Failed to fetch song')
    }
    return response.json()
  },

  async getSongByVideoId(videoId: string): Promise<Song | null> {
    const response = await fetchWithAuth(
      `${BACKEND_URL}/api/user-songs/by-video/${videoId}`,
    )
    if (response.status === 404) {
      return null
    }
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || 'Failed to fetch song')
    }
    return response.json()
  },

  async createSong(data: {
    videoId: string
    title: string
    artist?: string
    durationSeconds: number
  }): Promise<Song> {
    const response = await fetchWithAuth(`${BACKEND_URL}/api/user-songs`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || 'Failed to create song')
    }
    return response.json()
  },

  async updateSong(
    songId: string,
    data: Partial<{
      title: string
      artist: string
      keyDetected: Song['keyDetected']
      tempoDetected: Song['tempoDetected']
    }>,
  ): Promise<Song> {
    const response = await fetchWithAuth(
      `${BACKEND_URL}/api/user-songs/${songId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      },
    )
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || 'Failed to update song')
    }
    return response.json()
  },

  async deleteSong(songId: string): Promise<void> {
    const response = await fetchWithAuth(
      `${BACKEND_URL}/api/user-songs/${songId}`,
      {
        method: 'DELETE',
      },
    )
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || 'Failed to delete song')
    }
  },

  // ----------------------------------------
  // Audio
  // ----------------------------------------

  async uploadAudio(
    songId: string,
    audioData: string,
  ): Promise<{ audioUrl: string }> {
    const response = await fetchWithAuth(
      `${BACKEND_URL}/api/user-songs/${songId}/upload-audio`,
      {
        method: 'POST',
        body: JSON.stringify({ audioData }),
      },
    )
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || 'Failed to upload audio')
    }
    return response.json()
  },

  async getAudioUrl(songId: string): Promise<{ signedUrl: string }> {
    const response = await fetchWithAuth(
      `${BACKEND_URL}/api/user-songs/${songId}/audio-url`,
    )
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || 'Failed to get audio URL')
    }
    return response.json()
  },

  // ----------------------------------------
  // Chords
  // ----------------------------------------

  async getChords(
    songId: string,
    library?: ChordLibrary,
  ): Promise<{ chords: ChordAnalysis[]; analyzedWith: ChordLibrary[] }> {
    const url = library
      ? `${BACKEND_URL}/api/user-songs/${songId}/chords?library=${library}`
      : `${BACKEND_URL}/api/user-songs/${songId}/chords`
    const response = await fetchWithAuth(url)
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || 'Failed to fetch chords')
    }
    return response.json()
  },

  async saveChords(
    songId: string,
    library: ChordLibrary,
    chords: ChordAnalysis['chords'],
    options?: {
      tempo?: ChordAnalysis['tempo']
      key?: ChordAnalysis['key']
    },
  ): Promise<ChordAnalysis> {
    const response = await fetchWithAuth(
      `${BACKEND_URL}/api/user-songs/${songId}/chords`,
      {
        method: 'POST',
        body: JSON.stringify({
          library,
          chords,
          tempo: options?.tempo,
          key: options?.key,
        }),
      },
    )
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || 'Failed to save chords')
    }
    return response.json()
  },

  async deleteChords(songId: string, library: ChordLibrary): Promise<void> {
    const response = await fetchWithAuth(
      `${BACKEND_URL}/api/user-songs/${songId}/chords/${library}`,
      {
        method: 'DELETE',
      },
    )
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || 'Failed to delete chords')
    }
  },

  // ----------------------------------------
  // Stems
  // ----------------------------------------

  async getStems(
    songId: string,
  ): Promise<{ stems: Stem[]; hasStems: boolean }> {
    const response = await fetchWithAuth(
      `${BACKEND_URL}/api/user-songs/${songId}/stems`,
    )
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || 'Failed to fetch stems')
    }
    return response.json()
  },

  async uploadStem(
    songId: string,
    stemType: StemType,
    audioData: string,
    durationSeconds?: number,
  ): Promise<Stem> {
    const response = await fetchWithAuth(
      `${BACKEND_URL}/api/user-songs/${songId}/stems`,
      {
        method: 'POST',
        body: JSON.stringify({
          stemType,
          audioData,
          durationSeconds,
        }),
      },
    )
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || 'Failed to upload stem')
    }
    return response.json()
  },

  async deleteStem(songId: string, stemType: StemType): Promise<void> {
    const response = await fetchWithAuth(
      `${BACKEND_URL}/api/user-songs/${songId}/stems/${stemType}`,
      {
        method: 'DELETE',
      },
    )
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || 'Failed to delete stem')
    }
  },

  async deleteAllStems(songId: string): Promise<void> {
    const response = await fetchWithAuth(
      `${BACKEND_URL}/api/user-songs/${songId}/stems`,
      {
        method: 'DELETE',
      },
    )
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || 'Failed to delete stems')
    }
  },

  // ----------------------------------------
  // Lyrics
  // ----------------------------------------

  async getLyrics(songId: string): Promise<Lyrics | null> {
    const response = await fetchWithAuth(
      `${BACKEND_URL}/api/user-songs/${songId}/lyrics`,
    )
    if (response.status === 404) {
      return null
    }
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || 'Failed to fetch lyrics')
    }
    return response.json()
  },

  async saveLyrics(
    songId: string,
    lrcContent: string,
    options?: {
      hasWordTiming?: boolean
      audioSource?: 'vocals_stem' | 'full_audio'
    },
  ): Promise<Lyrics> {
    const response = await fetchWithAuth(
      `${BACKEND_URL}/api/user-songs/${songId}/lyrics`,
      {
        method: 'POST',
        body: JSON.stringify({
          lrcContent,
          hasWordTiming: options?.hasWordTiming ?? false,
          audioSource: options?.audioSource,
        }),
      },
    )
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || 'Failed to save lyrics')
    }
    return response.json()
  },

  async deleteLyrics(songId: string): Promise<void> {
    const response = await fetchWithAuth(
      `${BACKEND_URL}/api/user-songs/${songId}/lyrics`,
      {
        method: 'DELETE',
      },
    )
    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(error.error || 'Failed to delete lyrics')
    }
  },
}
