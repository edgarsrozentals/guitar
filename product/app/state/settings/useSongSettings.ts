import { useCallback, useEffect, useRef, useState } from 'react'

import { getSupabaseBrowserClient } from '../../lib/supabase/client'
import { useAuth } from '../auth/AuthProvider'

export type StemType = 'vocals' | 'drum' | 'bass' | 'electric_guitar' | 'piano'
export type ChordLibrary = 'essentia' | 'madmom' | 'btc' | 'chordify'
export type MediaTab =
  | 'audio'
  | 'chords'
  | 'generation'
  | 'stems'
  | 'lyrics'
  | 'fretboard'

// Essentia configuration settings
export type EssentiaSettings = {
  // Silence detection
  silenceThreshold: number // 0.001 - 0.05, default 0.01

  // HPCP settings
  hpcpSize: number // 12, 36, or 120
  harmonics: number // 0-8
  nonLinear: boolean
  minFrequency: number // 20-200
  maxFrequency: number // 2000-5000

  // Chord detection
  windowSize: number // 1-5 seconds

  // SpectralPeaks
  maxPeaks: number // 30-100
  magnitudeThreshold: number // 0.00001 - 0.001
}

// Hidden timelines
export type HiddenTimelines = Record<ChordLibrary, boolean>

type SongSettingsRow = {
  active_tab: string
  selected_stems: string[]
  stem_volumes: Record<string, number>
  stem_muted: Record<string, boolean>
  master_stems_volume: number
  active_library: string
  enabled_libraries: string[]
  use_backing_track: boolean
  snap_to_beats: boolean
  use_beat_sync_detection: boolean
  essentia_settings: EssentiaSettings | null
  hidden_timelines: HiddenTimelines | null
}

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

export function useSongSettings(videoId: string | null): UseSongSettingsReturn {
  const { user } = useAuth()
  const [settings, setSettings] = useState<SongSettings>(DEFAULT_SONG_SETTINGS)
  const [loading, setLoading] = useState(true)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const supabase = getSupabaseBrowserClient()

  // Load settings from database
  useEffect(() => {
    const loadSettings = async () => {
      if (!user || !videoId) {
        setSettings(DEFAULT_SONG_SETTINGS)
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('song_settings')
          .select('*')
          .eq('user_id', user.id)
          .eq('video_id', videoId)
          .single()

        if (error) {
          if (error.code === 'PGRST116') {
            // No row exists, use defaults
            setSettings(DEFAULT_SONG_SETTINGS)
          } else {
            console.error('Error loading song settings:', error)
          }
        } else if (data) {
          const row = data as unknown as SongSettingsRow
          setSettings({
            activeTab: row.active_tab as MediaTab,
            selectedStems: new Set(row.selected_stems as StemType[]),
            stemVolumes: row.stem_volumes,
            stemMuted: row.stem_muted,
            masterStemsVolume: row.master_stems_volume,
            activeLibrary: row.active_library as ChordLibrary,
            enabledLibraries: new Set(row.enabled_libraries as ChordLibrary[]),
            useBackingTrack: row.use_backing_track,
            snapToBeats: row.snap_to_beats,
            useBeatSyncDetection: row.use_beat_sync_detection,
            essentiaSettings:
              row.essentia_settings || DEFAULT_ESSENTIA_SETTINGS,
            hiddenTimelines: row.hidden_timelines || DEFAULT_HIDDEN_TIMELINES,
          })
        }
      } catch (err) {
        console.error('Error loading song settings:', err)
      } finally {
        setLoading(false)
      }
    }

    loadSettings()
  }, [user, videoId, supabase])

  // Save settings to database (debounced)
  const saveSettings = useCallback(
    async (newSettings: SongSettings) => {
      if (!user || !videoId) return

      try {
        const { error } = await supabase.from('song_settings').upsert(
          {
            user_id: user.id,
            video_id: videoId,
            active_tab: newSettings.activeTab,
            selected_stems: Array.from(newSettings.selectedStems),
            stem_volumes: newSettings.stemVolumes,
            stem_muted: newSettings.stemMuted,
            master_stems_volume: newSettings.masterStemsVolume,
            active_library: newSettings.activeLibrary,
            enabled_libraries: Array.from(newSettings.enabledLibraries),
            use_backing_track: newSettings.useBackingTrack,
            snap_to_beats: newSettings.snapToBeats,
            use_beat_sync_detection: newSettings.useBeatSyncDetection,
            essentia_settings: newSettings.essentiaSettings,
            hidden_timelines: newSettings.hiddenTimelines,
            updated_at: new Date().toISOString(),
            last_accessed: new Date().toISOString(),
          } as any,
          { onConflict: 'user_id,video_id' },
        )

        if (error) {
          console.error('Error saving song settings:', error)
        }
      } catch (err) {
        console.error('Error saving song settings:', err)
      }
    },
    [user, videoId, supabase],
  )

  const updateSettings = useCallback(
    (updates: Partial<SongSettings>) => {
      setSettings((prev) => {
        const updated = { ...prev, ...updates }

        // Debounced save to database
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current)
        }
        saveTimeoutRef.current = setTimeout(() => {
          saveSettings(updated)
        }, 500)

        return updated
      })
    },
    [saveSettings],
  )

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // Individual setters
  const setActiveTab = useCallback(
    (tab: MediaTab) => updateSettings({ activeTab: tab }),
    [updateSettings],
  )

  const setSelectedStems = useCallback(
    (stems: Set<StemType>) => updateSettings({ selectedStems: stems }),
    [updateSettings],
  )

  const setStemVolumes = useCallback(
    (volumes: Record<string, number>) =>
      updateSettings({ stemVolumes: volumes }),
    [updateSettings],
  )

  const setStemMuted = useCallback(
    (muted: Record<string, boolean>) => updateSettings({ stemMuted: muted }),
    [updateSettings],
  )

  const setMasterStemsVolume = useCallback(
    (volume: number) => updateSettings({ masterStemsVolume: volume }),
    [updateSettings],
  )

  const setActiveLibrary = useCallback(
    (library: ChordLibrary) => updateSettings({ activeLibrary: library }),
    [updateSettings],
  )

  const setEnabledLibraries = useCallback(
    (libraries: Set<ChordLibrary>) =>
      updateSettings({ enabledLibraries: libraries }),
    [updateSettings],
  )

  const setUseBackingTrack = useCallback(
    (use: boolean) => updateSettings({ useBackingTrack: use }),
    [updateSettings],
  )

  const setSnapToBeats = useCallback(
    (snap: boolean) => updateSettings({ snapToBeats: snap }),
    [updateSettings],
  )

  const setUseBeatSyncDetection = useCallback(
    (use: boolean) => updateSettings({ useBeatSyncDetection: use }),
    [updateSettings],
  )

  const setEssentiaSettings = useCallback(
    (essentiaSettings: EssentiaSettings) =>
      updateSettings({ essentiaSettings }),
    [updateSettings],
  )

  const setHiddenTimelines = useCallback(
    (hiddenTimelines: HiddenTimelines) => updateSettings({ hiddenTimelines }),
    [updateSettings],
  )

  return {
    settings,
    setActiveTab,
    setSelectedStems,
    setStemVolumes,
    setStemMuted,
    setMasterStemsVolume,
    setActiveLibrary,
    setEnabledLibraries,
    setUseBackingTrack,
    setSnapToBeats,
    setUseBeatSyncDetection,
    setEssentiaSettings,
    setHiddenTimelines,
    loading,
  }
}
