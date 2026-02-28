'use client'

/**
 * useAutoSaveChords Hook
 *
 * Automatically saves chord analysis to cloud storage when changes are detected.
 * Uses debouncing to prevent excessive API calls.
 *
 * Epic: Cloud Song Storage (P0)
 * Story: 1.7 Frontend Integration
 */

import { useEffect, useRef, useCallback, useState } from 'react'

import {
  songLibraryApi,
  ChordLibrary,
  ChordAnalysis,
} from '../../../services/songLibraryApi'

type UseAutoSaveChordsInput = {
  songId: string | null
  library: ChordLibrary
  chords: ChordAnalysis['chords'] | null
  tempo?: ChordAnalysis['tempo']
  key?: ChordAnalysis['key']
  enabled: boolean
}

type UseAutoSaveChordsResult = {
  isSaving: boolean
  lastSaved: Date | null
  error: string | null
  saveNow: () => Promise<void>
}

const DEBOUNCE_MS = 2000

export function useAutoSaveChords({
  songId,
  library,
  chords,
  tempo,
  key,
  enabled,
}: UseAutoSaveChordsInput): UseAutoSaveChordsResult {
  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const lastSavedChordsRef = useRef<string | null>(null)

  const doSave = useCallback(async () => {
    if (!songId || !chords || chords.length === 0) return

    // Check if chords have changed since last save
    const chordsKey = JSON.stringify(chords)
    if (chordsKey === lastSavedChordsRef.current) {
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      await songLibraryApi.saveChords(songId, library, chords, { tempo, key })
      lastSavedChordsRef.current = chordsKey
      setLastSaved(new Date())
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Failed to save chords'
      setError(message)
      console.error('Auto-save chords failed:', err)
    } finally {
      setIsSaving(false)
    }
  }, [songId, library, chords, tempo, key])

  const saveNow = useCallback(async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
      saveTimeoutRef.current = null
    }
    await doSave()
  }, [doSave])

  // Debounced auto-save when chords change
  useEffect(() => {
    if (!enabled || !songId || !chords || chords.length === 0) {
      return
    }

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    // Schedule save after debounce period
    saveTimeoutRef.current = setTimeout(() => {
      doSave()
    }, DEBOUNCE_MS)

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [enabled, songId, chords, doSave])

  return {
    isSaving,
    lastSaved,
    error,
    saveNow,
  }
}
