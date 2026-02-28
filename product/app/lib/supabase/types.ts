export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          display_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          display_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_preferences: {
        Row: {
          id: string
          user_id: string
          enabled_shapes: string[]
          show_all_positions: boolean
          highlight_roots: boolean
          color_by_shape: boolean
          color_by_position: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          enabled_shapes?: string[]
          show_all_positions?: boolean
          highlight_roots?: boolean
          color_by_shape?: boolean
          color_by_position?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          enabled_shapes?: string[]
          show_all_positions?: boolean
          highlight_roots?: boolean
          color_by_shape?: boolean
          color_by_position?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      song_settings: {
        Row: {
          id: string
          user_id: string
          video_id: string
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
          created_at: string
          updated_at: string
          last_accessed: string
        }
        Insert: {
          id?: string
          user_id: string
          video_id: string
          active_tab?: string
          selected_stems?: string[]
          stem_volumes?: Record<string, number>
          stem_muted?: Record<string, boolean>
          master_stems_volume?: number
          active_library?: string
          enabled_libraries?: string[]
          use_backing_track?: boolean
          snap_to_beats?: boolean
          use_beat_sync_detection?: boolean
          created_at?: string
          updated_at?: string
          last_accessed?: string
        }
        Update: {
          id?: string
          user_id?: string
          video_id?: string
          active_tab?: string
          selected_stems?: string[]
          stem_volumes?: Record<string, number>
          stem_muted?: Record<string, boolean>
          master_stems_volume?: number
          active_library?: string
          enabled_libraries?: string[]
          use_backing_track?: boolean
          snap_to_beats?: boolean
          use_beat_sync_detection?: boolean
          created_at?: string
          updated_at?: string
          last_accessed?: string
        }
      }
      user_songs: {
        Row: {
          id: string
          user_id: string
          video_id: string
          title: string
          artist: string | null
          duration_seconds: number
          audio_storage_path: string | null
          has_stems: boolean
          has_lyrics: boolean
          key_detected: {
            root: string
            scale: 'major' | 'minor'
            strength: number
          } | null
          tempo_detected: {
            bpm: number
            confidence: number
            beats?: number[]
          } | null
          is_public: boolean
          created_at: string
          updated_at: string
          last_accessed_at: string
        }
        Insert: {
          id?: string
          user_id: string
          video_id: string
          title: string
          artist?: string | null
          duration_seconds: number
          audio_storage_path?: string | null
          has_stems?: boolean
          has_lyrics?: boolean
          key_detected?: {
            root: string
            scale: 'major' | 'minor'
            strength: number
          } | null
          tempo_detected?: {
            bpm: number
            confidence: number
            beats?: number[]
          } | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
          last_accessed_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          video_id?: string
          title?: string
          artist?: string | null
          duration_seconds?: number
          audio_storage_path?: string | null
          has_stems?: boolean
          has_lyrics?: boolean
          key_detected?: {
            root: string
            scale: 'major' | 'minor'
            strength: number
          } | null
          tempo_detected?: {
            bpm: number
            confidence: number
            beats?: number[]
          } | null
          is_public?: boolean
          created_at?: string
          updated_at?: string
          last_accessed_at?: string
        }
      }
      user_song_chords: {
        Row: {
          id: string
          user_song_id: string
          library: 'essentia' | 'madmom' | 'btc' | 'chordify'
          chords: Array<{
            time: number
            chord: { root: string; quality: string }
          }>
          tempo: {
            bpm: number
            confidence: number
            beatCount?: number
            beats?: number[]
          } | null
          key: { root: string; scale: string; strength: number } | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_song_id: string
          library: 'essentia' | 'madmom' | 'btc' | 'chordify'
          chords: Array<{
            time: number
            chord: { root: string; quality: string }
          }>
          tempo?: {
            bpm: number
            confidence: number
            beatCount?: number
            beats?: number[]
          } | null
          key?: { root: string; scale: string; strength: number } | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_song_id?: string
          library?: 'essentia' | 'madmom' | 'btc' | 'chordify'
          chords?: Array<{
            time: number
            chord: { root: string; quality: string }
          }>
          tempo?: {
            bpm: number
            confidence: number
            beatCount?: number
            beats?: number[]
          } | null
          key?: { root: string; scale: string; strength: number } | null
          created_at?: string
          updated_at?: string
        }
      }
      user_song_stems: {
        Row: {
          id: string
          user_song_id: string
          stem_type:
            | 'vocals'
            | 'backing'
            | 'drums'
            | 'bass'
            | 'guitar'
            | 'piano'
            | 'other'
          storage_path: string
          duration_seconds: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_song_id: string
          stem_type:
            | 'vocals'
            | 'backing'
            | 'drums'
            | 'bass'
            | 'guitar'
            | 'piano'
            | 'other'
          storage_path: string
          duration_seconds?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_song_id?: string
          stem_type?:
            | 'vocals'
            | 'backing'
            | 'drums'
            | 'bass'
            | 'guitar'
            | 'piano'
            | 'other'
          storage_path?: string
          duration_seconds?: number | null
          created_at?: string
        }
      }
      user_song_lyrics: {
        Row: {
          id: string
          user_song_id: string
          lrc_content: string
          has_word_timing: boolean
          audio_source: 'vocals_stem' | 'full_audio' | null
          storage_path: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_song_id: string
          lrc_content: string
          has_word_timing?: boolean
          audio_source?: 'vocals_stem' | 'full_audio' | null
          storage_path?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_song_id?: string
          lrc_content?: string
          has_word_timing?: boolean
          audio_source?: 'vocals_stem' | 'full_audio' | null
          storage_path?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_api_keys: {
        Row: {
          id: string
          user_id: string
          service: 'lalal_ai' | 'assemblyai'
          api_key: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          service: 'lalal_ai' | 'assemblyai'
          api_key: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          service?: 'lalal_ai' | 'assemblyai'
          api_key?: string
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
