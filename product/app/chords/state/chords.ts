import { getValueProviderSetup } from '@lib/ui/state/getValueProviderSetup'
import { ChordQuality } from '@product/core/chords/chordTypes'
import { toUriNote } from '@product/core/note/uriNote'
import { useRouter } from 'next/router'
import { useCallback } from 'react'

export type ChordsState = {
  rootNote: number
  quality: ChordQuality
}

export const makeChordsPath = ({ rootNote, quality }: ChordsState) =>
  `/chords/${toUriNote(rootNote)}/${quality}`

export const { useValue: useChords, provider: ChordsProvider } =
  getValueProviderSetup<ChordsState>('Chords')

export const useChangeChords = () => {
  const value = useChords()
  const { push } = useRouter()

  return useCallback(
    (params: Partial<ChordsState>) => {
      // Preserve query parameters (like ?v=VIDEO_ID) when navigating
      const basePath = makeChordsPath({ ...value, ...params })
      const currentSearch =
        typeof window !== 'undefined' ? window.location.search : ''
      push(basePath + currentSearch)
    },
    [push, value],
  )
}
