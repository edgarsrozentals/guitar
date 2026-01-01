import { useIsScreenWidthLessThan } from '@lib/ui/hooks/useIsScreenWidthLessThan'
import { createContext, useContext, useMemo, ReactNode } from 'react'

type FretboardConfigValues = {
  height: number
  nutWidth: number
  stringsOffset: number
  noteSize: number
  openNotesSectionWidth: number
  noteFretOffset: number
  thickestStringWidth: number
}

// Normal size config
const normalConfig: FretboardConfigValues = {
  height: 240,
  nutWidth: 20,
  stringsOffset: 0.04,
  noteSize: 36,
  openNotesSectionWidth: 40, // noteSize + noteFretOffset * 2
  noteFretOffset: 2,
  thickestStringWidth: 8,
}

// Compact size config for narrow screens
const compactConfig: FretboardConfigValues = {
  height: 168, // ~30% smaller than normal
  nutWidth: 14,
  stringsOffset: 0.04,
  noteSize: 24, // smaller notes
  openNotesSectionWidth: 28,
  noteFretOffset: 2,
  thickestStringWidth: 5,
}

const ResponsiveFretboardConfigContext =
  createContext<FretboardConfigValues>(normalConfig)

// Breakpoint for switching to compact mode
const COMPACT_BREAKPOINT = 800

type ResponsiveFretboardConfigProviderProps = {
  children: ReactNode
}

export const ResponsiveFretboardConfigProvider = ({
  children,
}: ResponsiveFretboardConfigProviderProps) => {
  const isCompact = useIsScreenWidthLessThan(COMPACT_BREAKPOINT)

  const config = useMemo(
    () => (isCompact ? compactConfig : normalConfig),
    [isCompact],
  )

  return (
    <ResponsiveFretboardConfigContext.Provider value={config}>
      {children}
    </ResponsiveFretboardConfigContext.Provider>
  )
}

export const useResponsiveFretboardConfig = () => {
  return useContext(ResponsiveFretboardConfigContext)
}
