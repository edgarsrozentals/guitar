import { CAGEDShapeName } from '@product/core/chords/cagedShapes'
import { useCallback, useEffect, useState } from 'react'

export type UserPreferences = {
  enabledShapes: Set<CAGEDShapeName>
  showAllPositions: boolean
  highlightRoots: boolean
  colorByShape: boolean
  colorByPosition: boolean
}

const DEFAULT_PREFERENCES: UserPreferences = {
  enabledShapes: new Set(['A', 'E', 'D'] as CAGEDShapeName[]),
  showAllPositions: true,
  highlightRoots: false,
  colorByShape: true,
  colorByPosition: false,
}

const STORAGE_KEY = 'guitar-app:userPreferences'

type StoredPreferences = {
  enabledShapes: string[]
  showAllPositions: boolean
  highlightRoots: boolean
  colorByShape: boolean
  colorByPosition: boolean
}

function load(): UserPreferences {
  if (typeof window === 'undefined') return DEFAULT_PREFERENCES
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PREFERENCES
    const parsed = JSON.parse(raw) as Partial<StoredPreferences>
    const fallbackShapes: CAGEDShapeName[] = ['A', 'E', 'D']
    return {
      enabledShapes: new Set<CAGEDShapeName>(
        (parsed.enabledShapes as CAGEDShapeName[] | undefined) ||
          fallbackShapes,
      ),
      showAllPositions: parsed.showAllPositions ?? true,
      highlightRoots: parsed.highlightRoots ?? false,
      colorByShape: parsed.colorByShape ?? true,
      colorByPosition: parsed.colorByPosition ?? false,
    }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

function save(prefs: UserPreferences): void {
  if (typeof window === 'undefined') return
  try {
    const stored: StoredPreferences = {
      enabledShapes: Array.from(prefs.enabledShapes),
      showAllPositions: prefs.showAllPositions,
      highlightRoots: prefs.highlightRoots,
      colorByShape: prefs.colorByShape,
      colorByPosition: prefs.colorByPosition,
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  } catch {
    // Ignore storage errors (quota, private browsing)
  }
}

type UseUserPreferencesReturn = {
  preferences: UserPreferences
  updatePreferences: (updates: Partial<UserPreferences>) => void
  loading: boolean
}

export function useUserPreferences(): UseUserPreferencesReturn {
  const [preferences, setPreferences] =
    useState<UserPreferences>(DEFAULT_PREFERENCES)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setPreferences(load())
    setLoading(false)
  }, [])

  const updatePreferences = useCallback((updates: Partial<UserPreferences>) => {
    setPreferences((prev) => {
      const updated = { ...prev, ...updates }
      save(updated)
      return updated
    })
  }, [])

  return { preferences, updatePreferences, loading }
}
