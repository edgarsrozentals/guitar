/**
 * Supabase Database Types
 *
 * Type definitions for database tables.
 * Keep in sync with the Supabase schema.
 *
 * Epic: Cloud Song Storage (P0)
 * Story: 1.1 Database Schema
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
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
        Relationships: []
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
        Relationships: [
          {
            foreignKeyName: 'user_song_chords_user_song_id_fkey'
            columns: ['user_song_id']
            isOneToOne: false
            referencedRelation: 'user_songs'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: 'user_song_stems_user_song_id_fkey'
            columns: ['user_song_id']
            isOneToOne: false
            referencedRelation: 'user_songs'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: 'user_song_lyrics_user_song_id_fkey'
            columns: ['user_song_id']
            isOneToOne: true
            referencedRelation: 'user_songs'
            referencedColumns: ['id']
          },
        ]
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
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types for table rows
export type UserSong = Database['public']['Tables']['user_songs']['Row']
export type UserSongInsert =
  Database['public']['Tables']['user_songs']['Insert']
export type UserSongUpdate =
  Database['public']['Tables']['user_songs']['Update']

export type UserSongChords =
  Database['public']['Tables']['user_song_chords']['Row']
export type UserSongChordsInsert =
  Database['public']['Tables']['user_song_chords']['Insert']
export type UserSongChordsUpdate =
  Database['public']['Tables']['user_song_chords']['Update']

export type UserSongStems =
  Database['public']['Tables']['user_song_stems']['Row']
export type UserSongStemsInsert =
  Database['public']['Tables']['user_song_stems']['Insert']
export type UserSongStemsUpdate =
  Database['public']['Tables']['user_song_stems']['Update']

export type UserSongLyrics =
  Database['public']['Tables']['user_song_lyrics']['Row']
export type UserSongLyricsInsert =
  Database['public']['Tables']['user_song_lyrics']['Insert']
export type UserSongLyricsUpdate =
  Database['public']['Tables']['user_song_lyrics']['Update']
