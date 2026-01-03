import { CAGEDShapeName } from '@product/core/chords/cagedShapes'
import { createContext, useCallback, useContext, useMemo } from 'react'

import { useUserPreferences } from '../../state/settings/useUserPreferences'

// Color palette for CAGED shapes - maximized contrast for adjacent shapes
// CAGED order on fretboard: C-A-G-E-D (and D wraps to C)
// Each color must contrast well with its neighbors
export const SHAPE_COLORS: Record<CAGEDShapeName, string> = {
  C: '#3b82f6', // Blue - contrasts with A (green) and D (pink)
  A: '#22c55e', // Green - contrasts with C (blue) and G (orange)
  G: '#f97316', // Orange - contrasts with A (green) and E (purple)
  E: '#a855f7', // Purple - contrasts with G (orange) and D (pink)
  D: '#ec4899', // Pink/Magenta - contrasts with E (purple) and C (blue)
}

// Color palette for neck positions - non-overlapping zones for practicing
export type PositionZone = {
  name: string
  minFret: number
  maxFret: number
  color: string
}

export const POSITION_ZONES: PositionZone[] = [
  { name: 'Open', minFret: -1, maxFret: 3, color: '#3b82f6' }, // Blue - open position
  { name: '4-6', minFret: 4, maxFret: 6, color: '#22c55e' }, // Green
  { name: '7-9', minFret: 7, maxFret: 9, color: '#f97316' }, // Orange
  { name: '10-12', minFret: 10, maxFret: 12, color: '#a855f7' }, // Purple
  { name: '13+', minFret: 13, maxFret: 24, color: '#ec4899' }, // Pink
]

// Get color for a fret position
export const getPositionColor = (fret: number): string => {
  for (const zone of POSITION_ZONES) {
    if (fret >= zone.minFret && fret <= zone.maxFret) {
      return zone.color
    }
  }
  return POSITION_ZONES[POSITION_ZONES.length - 1].color // fallback to last zone
}

export type FretboardSettings = {
  enabledShapes: Set<CAGEDShapeName>
  showAllPositions: boolean
  highlightRoots: boolean
  colorByShape: boolean
  colorByPosition: boolean
}

type FretboardSettingsContextValue = {
  settings: FretboardSettings
  setEnabledShapes: (shapes: Set<CAGEDShapeName>) => void
  toggleShape: (shape: CAGEDShapeName) => void
  setShowAllPositions: (show: boolean) => void
  setHighlightRoots: (highlight: boolean) => void
  setColorByShape: (color: boolean) => void
  setColorByPosition: (color: boolean) => void
}

const FretboardSettingsContext = createContext<
  FretboardSettingsContextValue | undefined
>(undefined)

type FretboardSettingsProviderProps = {
  children: React.ReactNode
}

export const FretboardSettingsProvider = ({
  children,
}: FretboardSettingsProviderProps) => {
  // Use persisted preferences (syncs with Supabase when user is logged in)
  const { preferences, updatePreferences } = useUserPreferences()

  const setEnabledShapes = useCallback(
    (shapes: Set<CAGEDShapeName>) => {
      updatePreferences({ enabledShapes: shapes })
    },
    [updatePreferences],
  )

  const toggleShape = useCallback(
    (shape: CAGEDShapeName) => {
      const next = new Set(preferences.enabledShapes)
      if (next.has(shape)) {
        next.delete(shape)
      } else {
        next.add(shape)
      }
      updatePreferences({ enabledShapes: next })
    },
    [preferences.enabledShapes, updatePreferences],
  )

  const setShowAllPositions = useCallback(
    (show: boolean) => {
      updatePreferences({ showAllPositions: show })
    },
    [updatePreferences],
  )

  const setHighlightRoots = useCallback(
    (highlight: boolean) => {
      updatePreferences({ highlightRoots: highlight })
    },
    [updatePreferences],
  )

  const setColorByShape = useCallback(
    (color: boolean) => {
      updatePreferences({ colorByShape: color })
    },
    [updatePreferences],
  )

  const setColorByPosition = useCallback(
    (color: boolean) => {
      updatePreferences({ colorByPosition: color })
    },
    [updatePreferences],
  )

  const contextValue = useMemo(
    () => ({
      settings: preferences,
      setEnabledShapes,
      toggleShape,
      setShowAllPositions,
      setHighlightRoots,
      setColorByShape,
      setColorByPosition,
    }),
    [
      preferences,
      setEnabledShapes,
      toggleShape,
      setShowAllPositions,
      setHighlightRoots,
      setColorByShape,
      setColorByPosition,
    ],
  )

  return (
    <FretboardSettingsContext.Provider value={contextValue}>
      {children}
    </FretboardSettingsContext.Provider>
  )
}

export const useFretboardSettings = () => {
  const context = useContext(FretboardSettingsContext)
  if (!context) {
    throw new Error(
      'useFretboardSettings must be used within FretboardSettingsProvider',
    )
  }
  return context
}
