import { CAGEDShapeName } from '@product/core/chords/cagedShapes'
import { useCallback, useEffect, useRef, useState } from 'react'

import { getSupabaseBrowserClient } from '../../lib/supabase/client'
import { useAuth } from '../auth/AuthProvider'

export type UserPreferences = {
  enabledShapes: Set<CAGEDShapeName>
  showAllPositions: boolean
  highlightRoots: boolean
  colorByShape: boolean
  colorByPosition: boolean
}

type UserPreferencesRow = {
  enabled_shapes: string[]
  show_all_positions: boolean
  highlight_roots: boolean
  color_by_shape: boolean
  color_by_position: boolean
}

const DEFAULT_PREFERENCES: UserPreferences = {
  enabledShapes: new Set(['A', 'E', 'D'] as CAGEDShapeName[]),
  showAllPositions: true,
  highlightRoots: false,
  colorByShape: true,
  colorByPosition: false,
}

type UseUserPreferencesReturn = {
  preferences: UserPreferences
  updatePreferences: (updates: Partial<UserPreferences>) => void
  loading: boolean
}

export function useUserPreferences(): UseUserPreferencesReturn {
  const { user } = useAuth()
  const [preferences, setPreferences] =
    useState<UserPreferences>(DEFAULT_PREFERENCES)
  const [loading, setLoading] = useState(true)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const supabase = getSupabaseBrowserClient()

  // Load preferences from database
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) {
        setPreferences(DEFAULT_PREFERENCES)
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('user_preferences')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (error) {
          if (error.code === 'PGRST116') {
            // No row exists, use defaults
            setPreferences(DEFAULT_PREFERENCES)
          } else {
            console.error('Error loading preferences:', error)
          }
        } else if (data) {
          const row = data as unknown as UserPreferencesRow
          setPreferences({
            enabledShapes: new Set(row.enabled_shapes as CAGEDShapeName[]),
            showAllPositions: row.show_all_positions,
            highlightRoots: row.highlight_roots,
            colorByShape: row.color_by_shape,
            colorByPosition: row.color_by_position,
          })
        }
      } catch (err) {
        console.error('Error loading preferences:', err)
      } finally {
        setLoading(false)
      }
    }

    loadPreferences()
  }, [user, supabase])

  // Save preferences to database (debounced)
  const savePreferences = useCallback(
    async (prefs: UserPreferences) => {
      if (!user) return

      try {
        const { error } = await supabase.from('user_preferences').upsert(
          {
            user_id: user.id,
            enabled_shapes: Array.from(prefs.enabledShapes),
            show_all_positions: prefs.showAllPositions,
            highlight_roots: prefs.highlightRoots,
            color_by_shape: prefs.colorByShape,
            color_by_position: prefs.colorByPosition,
            updated_at: new Date().toISOString(),
          } as any,
          { onConflict: 'user_id' },
        )

        if (error) {
          console.error('Error saving preferences:', error)
        }
      } catch (err) {
        console.error('Error saving preferences:', err)
      }
    },
    [user, supabase],
  )

  const updatePreferences = useCallback(
    (updates: Partial<UserPreferences>) => {
      setPreferences((prev) => {
        const updated = { ...prev, ...updates }

        // Debounced save to database
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current)
        }
        saveTimeoutRef.current = setTimeout(() => {
          savePreferences(updated)
        }, 500)

        return updated
      })
    },
    [savePreferences],
  )

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  return {
    preferences,
    updatePreferences,
    loading,
  }
}
