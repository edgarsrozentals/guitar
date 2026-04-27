import { useCallback, useEffect, useState } from 'react'

export type StemType = 'vocals' | 'drum' | 'bass' | 'electric_guitar' | 'piano'
export type ChordLibrary = 'essentia' | 'madmom' | 'btc' | 'chordify'
export type MediaTab =
  | 'audio'
  | 'chords'
  | 'generation'
  | 'stems'
  | 'lyrics'
  | 'fretboard'

export type EssentiaSettings = {
  silenceThreshold: number
  hpcpSize: number
  harmonics: number
  nonLinear: boolean
  minFrequency: number
  maxFrequency: number
  windowSize: number
  maxPeaks: number
  magnitudeThreshold: number
}

export type HiddenTimelines = Record<ChordLibrary, boolean>

export type SongSettings = {
  activeTab: MediaTab
  selectedStems: Set<StemType>
  stemVolumes: Record<string, number>
  stemMuted: Record<string, boolean>
  masterStemsVolume: number
  activeLibrary: ChordLibrary
  enabledLibraries: Set<ChordLibrary>
  useBackingTrack: boolean
  snapToBeats: boolean
  useBeatSyncDetection: boolean
  essentiaSettings: EssentiaSettings
  hiddenTimelines: HiddenTimelines
}

export const ALL_STEM_TYPES: StemType[] = [
  'vocals',
  'drum',
  'bass',
  'electric_guitar',
  'piano',
]

const DEFAULT_STEM_VOLUMES: Record<string, number> = {
  vocals: 1,
  drum: 1,
  bass: 1,
  electric_guitar: 1,
  piano: 1,
  backing: 1,
}

const DEFAULT_STEM_MUTED: Record<string, boolean> = {
  vocals: false,
  drum: false,
  bass: false,
  electric_guitar: false,
  piano: false,
  backing: false,
}

export const DEFAULT_ESSENTIA_SETTINGS: EssentiaSettings = {
  silenceThreshold: 0.01,
  hpcpSize: 12,
  harmonics: 0,
  nonLinear: false,
  minFrequency: 40,
  maxFrequency: 5000,
  windowSize: 2,
  maxPeaks: 60,
  magnitudeThreshold: 0.00001,
}

const DEFAULT_HIDDEN_TIMELINES: HiddenTimelines = {
  essentia: true,
  madmom: true,
  btc: true,
  chordify: false,
}

const DEFAULT_SONG_SETTINGS: SongSettings = {
  activeTab: 'audio',
  selectedStems: new Set<StemType>(ALL_STEM_TYPES),
  stemVolumes: DEFAULT_STEM_VOLUMES,
  stemMuted: DEFAULT_STEM_MUTED,
  masterStemsVolume: 100,
  activeLibrary: 'chordify',
  enabledLibraries: new Set<ChordLibrary>(['essentia', 'chordify']),
  useBackingTrack: false,
  snapToBeats: false,
  useBeatSyncDetection: false,
  essentiaSettings: DEFAULT_ESSENTIA_SETTINGS,
  hiddenTimelines: DEFAULT_HIDDEN_TIMELINES,
}

type UseSongSettingsReturn = {
  settings: SongSettings
  setActiveTab: (tab: MediaTab) => void
  setSelectedStems: (stems: Set<StemType>) => void
  setStemVolumes: (volumes: Record<string, number>) => void
  setStemMuted: (muted: Record<string, boolean>) => void
  setMasterStemsVolume: (volume: number) => void
  setActiveLibrary: (library: ChordLibrary) => void
  setEnabledLibraries: (libraries: Set<ChordLibrary>) => void
  setUseBackingTrack: (use: boolean) => void
  setSnapToBeats: (snap: boolean) => void
  setUseBeatSyncDetection: (use: boolean) => void
  setEssentiaSettings: (settings: EssentiaSettings) => void
  setHiddenTimelines: (hidden: HiddenTimelines) => void
  loading: boolean
}

const STORAGE_KEY_PREFIX = 'guitar-app:songSettings:'

type StoredSettings = Omit<
  SongSettings,
  'selectedStems' | 'enabledLibraries'
> & {
  selectedStems: StemType[]
  enabledLibraries: ChordLibrary[]
}

function storageKey(videoId: string): string {
  return `${STORAGE_KEY_PREFIX}${videoId}`
}

function load(videoId: string): SongSettings {
  if (typeof window === 'undefined') return DEFAULT_SONG_SETTINGS
  try {
    const raw = window.localStorage.getItem(storageKey(videoId))
    if (!raw) return DEFAULT_SONG_SETTINGS
    const parsed = JSON.parse(raw) as Partial<StoredSettings>
    return {
      activeTab:
        (parsed.activeTab as MediaTab) || DEFAULT_SONG_SETTINGS.activeTab,
      selectedStems: new Set(
        (parsed.selectedStems as StemType[]) || ALL_STEM_TYPES,
      ),
      stemVolumes: parsed.stemVolumes || DEFAULT_STEM_VOLUMES,
      stemMuted: parsed.stemMuted || DEFAULT_STEM_MUTED,
      masterStemsVolume:
        parsed.masterStemsVolume ?? DEFAULT_SONG_SETTINGS.masterStemsVolume,
      activeLibrary:
        (parsed.activeLibrary as ChordLibrary) ||
        DEFAULT_SONG_SETTINGS.activeLibrary,
      enabledLibraries: new Set(
        (parsed.enabledLibraries as ChordLibrary[]) || ['essentia', 'chordify'],
      ),
      useBackingTrack: parsed.useBackingTrack ?? false,
      snapToBeats: parsed.snapToBeats ?? false,
      useBeatSyncDetection: parsed.useBeatSyncDetection ?? false,
      essentiaSettings: parsed.essentiaSettings || DEFAULT_ESSENTIA_SETTINGS,
      hiddenTimelines: parsed.hiddenTimelines || DEFAULT_HIDDEN_TIMELINES,
    }
  } catch {
    return DEFAULT_SONG_SETTINGS
  }
}

function save(videoId: string, settings: SongSettings): void {
  if (typeof window === 'undefined') return
  try {
    const stored: StoredSettings = {
      ...settings,
      selectedStems: Array.from(settings.selectedStems),
      enabledLibraries: Array.from(settings.enabledLibraries),
    }
    window.localStorage.setItem(storageKey(videoId), JSON.stringify(stored))
  } catch {
    // Ignore storage errors
  }
}

export function useSongSettings(videoId: string | null): UseSongSettingsReturn {
  const [settings, setSettings] = useState<SongSettings>(DEFAULT_SONG_SETTINGS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!videoId) {
      setSettings(DEFAULT_SONG_SETTINGS)
      setLoading(false)
      return
    }
    setSettings(load(videoId))
    setLoading(false)
  }, [videoId])

  const updateSettings = useCallback(
    (updates: Partial<SongSettings>) => {
      setSettings((prev) => {
        const updated = { ...prev, ...updates }
        if (videoId) save(videoId, updated)
        return updated
      })
    },
    [videoId],
  )

  return {
    settings,
    setActiveTab: useCallback(
      (tab: MediaTab) => updateSettings({ activeTab: tab }),
      [updateSettings],
    ),
    setSelectedStems: useCallback(
      (stems: Set<StemType>) => updateSettings({ selectedStems: stems }),
      [updateSettings],
    ),
    setStemVolumes: useCallback(
      (volumes: Record<string, number>) =>
        updateSettings({ stemVolumes: volumes }),
      [updateSettings],
    ),
    setStemMuted: useCallback(
      (muted: Record<string, boolean>) => updateSettings({ stemMuted: muted }),
      [updateSettings],
    ),
    setMasterStemsVolume: useCallback(
      (volume: number) => updateSettings({ masterStemsVolume: volume }),
      [updateSettings],
    ),
    setActiveLibrary: useCallback(
      (library: ChordLibrary) => updateSettings({ activeLibrary: library }),
      [updateSettings],
    ),
    setEnabledLibraries: useCallback(
      (libraries: Set<ChordLibrary>) =>
        updateSettings({ enabledLibraries: libraries }),
      [updateSettings],
    ),
    setUseBackingTrack: useCallback(
      (use: boolean) => updateSettings({ useBackingTrack: use }),
      [updateSettings],
    ),
    setSnapToBeats: useCallback(
      (snap: boolean) => updateSettings({ snapToBeats: snap }),
      [updateSettings],
    ),
    setUseBeatSyncDetection: useCallback(
      (use: boolean) => updateSettings({ useBeatSyncDetection: use }),
      [updateSettings],
    ),
    setEssentiaSettings: useCallback(
      (essentiaSettings: EssentiaSettings) =>
        updateSettings({ essentiaSettings }),
      [updateSettings],
    ),
    setHiddenTimelines: useCallback(
      (hiddenTimelines: HiddenTimelines) => updateSettings({ hiddenTimelines }),
      [updateSettings],
    ),
    loading,
  }
}
