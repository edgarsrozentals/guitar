import { ChordQuality } from '@product/core/chords/chordTypes'
import { toUriNote } from '@product/core/note/uriNote'
import { useRouter } from 'next/router'
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react'

export type ChordsState = {
  rootNote: number
  quality: ChordQuality
}

export const makeChordsPath = ({ rootNote, quality }: ChordsState) =>
  `/chords/${toUriNote(rootNote)}/${quality}`

// Context for live chord state (real-time updates without URL navigation)
type ChordsContextValue = {
  state: ChordsState
  setLiveState: (state: ChordsState) => void
  urlState: ChordsState
}

const ChordsContext = createContext<ChordsContextValue | undefined>(undefined)

type ChordsProviderProps = {
  value: ChordsState
  children: React.ReactNode
}

export const ChordsProvider = ({ value, children }: ChordsProviderProps) => {
  // Local state for real-time updates (during playback)
  const [liveState, setLiveState] = useState<ChordsState | null>(null)

  const contextValue = useMemo(
    () => ({
      // Use live state if set, otherwise fall back to URL state
      state: liveState ?? value,
      setLiveState: (newState: ChordsState) => setLiveState(newState),
      urlState: value,
    }),
    [liveState, value],
  )

  return (
    <ChordsContext.Provider value={contextValue}>
      {children}
    </ChordsContext.Provider>
  )
}

// Hook to get current chord state (live or URL-based)
export const useChords = (): ChordsState => {
  const context = useContext(ChordsContext)
  if (!context) {
    throw new Error('useChords must be used within ChordsProvider')
  }
  return context.state
}

// Hook for real-time chord updates (no URL navigation) - use during playback
export const useSetChordsLive = () => {
  const context = useContext(ChordsContext)
  if (!context) {
    throw new Error('useSetChordsLive must be used within ChordsProvider')
  }
  return context.setLiveState
}

// Hook for URL-based chord changes (user interactions)
export const useChangeChords = () => {
  const context = useContext(ChordsContext)
  if (!context) {
    throw new Error('useChangeChords must be used within ChordsProvider')
  }
  const { urlState } = context
  const { push } = useRouter()

  return useCallback(
    (params: Partial<ChordsState>) => {
      // Preserve query parameters (like ?v=VIDEO_ID) when navigating
      const basePath = makeChordsPath({ ...urlState, ...params })
      const currentSearch =
        typeof window !== 'undefined' ? window.location.search : ''
      push(basePath + currentSearch)
    },
    [push, urlState],
  )
}
