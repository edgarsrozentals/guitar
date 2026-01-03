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
    }
  }
}
