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

// Normal size config (20% smaller than original)
const normalConfig: FretboardConfigValues = {
  height: 192,
  nutWidth: 16,
  stringsOffset: 0.04,
  noteSize: 29,
  openNotesSectionWidth: 33, // noteSize + noteFretOffset * 2
  noteFretOffset: 2,
  thickestStringWidth: 6,
}

// Compact size config for narrow screens (20% smaller than original)
const compactConfig: FretboardConfigValues = {
  height: 134,
  nutWidth: 11,
  stringsOffset: 0.04,
  noteSize: 19,
  openNotesSectionWidth: 23,
  noteFretOffset: 2,
  thickestStringWidth: 4,
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
