/**
 * User Songs API Routes
 *
 * CRUD operations for user songs stored in Supabase.
 * All routes require authentication.
 *
 * Epic: Cloud Song Storage (P0)
 * Story: 1.4 Upload Song & List Songs API
 */

import { Router, Request, Response } from 'express'

import {
  getAudioPath,
  getLyricsPath,
  generateSignedUrl,
  generateSignedUrls,
  uploadFile,
  deleteFiles,
} from '../lib/storage'
import { getSupabaseAdmin } from '../lib/supabase'
import { authMiddleware } from '../middleware/auth'

const router = Router()

// All routes require authentication
router.use(authMiddleware)

// ============================================
// TYPES
// ============================================

type ChordEvent = {
  time: number
  chord: {
    root: string
    quality: string
  }
}

type KeyInfo = {
  root: string
  scale: 'major' | 'minor'
  strength: number
}

type TempoInfo = {
  bpm: number
  confidence: number
  beatCount?: number
  beats?: number[]
}

type UserSong = {
  id: string
  user_id: string
  video_id: string
  title: string
  artist: string | null
  duration_seconds: number
  audio_storage_path: string | null
  has_stems: boolean
  has_lyrics: boolean
  key_detected: KeyInfo | null
  tempo_detected: TempoInfo | null
  is_public: boolean
  created_at: string
  updated_at: string
  last_accessed_at: string
}

type ChordLibrary = 'essentia' | 'madmom' | 'btc' | 'chordify'

// ============================================
// GET /api/user-songs - List all songs for current user
// ============================================

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id
    const supabase = getSupabaseAdmin()

    if (!supabase) {
      return res.status(503).json({
        error: 'Database not available',
        code: 'DB_UNAVAILABLE',
      })
    }

    // Query user's songs with optional sorting
    const sortBy = (req.query.sortBy as string) || 'last_accessed_at'
    const sortOrder = (req.query.sortOrder as string) || 'desc'
    const limit = parseInt(req.query.limit as string) || 50
    const offset = parseInt(req.query.offset as string) || 0

    const {
      data: songs,
      error,
      count,
    } = await supabase
      .from('user_songs')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching user songs:', error)
      return res.status(500).json({
        error: 'Failed to fetch songs',
        code: 'DB_ERROR',
      })
    }

    res.json({
      songs: songs || [],
      total: count || 0,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error in GET /api/user-songs:', error)
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    })
  }
})

// ============================================
// GET /api/user-songs/:songId - Get a specific song
// ============================================

router.get('/:songId', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id
    const { songId } = req.params
    const supabase = getSupabaseAdmin()

    if (!supabase) {
      return res.status(503).json({
        error: 'Database not available',
        code: 'DB_UNAVAILABLE',
      })
    }

    // Get the song
    const { data: song, error } = await supabase
      .from('user_songs')
      .select('*')
      .eq('id', songId)
      .eq('user_id', userId)
      .single()

    if (error || !song) {
      return res.status(404).json({
        error: 'Song not found',
        code: 'SONG_NOT_FOUND',
      })
    }

    // Update last accessed timestamp
    await supabase
      .from('user_songs')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', songId)

    // Generate signed URLs for audio files
    const urls: Record<string, string> = {}

    if (song.audio_storage_path) {
      try {
        urls.audio = await generateSignedUrl(userId, song.audio_storage_path)
      } catch (e) {
        console.error('Failed to generate audio URL:', e)
      }
    }

    // Get related data (chords, stems, lyrics)
    const [chordsResult, stemsResult, lyricsResult] = await Promise.all([
      supabase.from('user_song_chords').select('*').eq('user_song_id', songId),
      supabase.from('user_song_stems').select('*').eq('user_song_id', songId),
      supabase
        .from('user_song_lyrics')
        .select('*')
        .eq('user_song_id', songId)
        .single(),
    ])

    // Generate signed URLs for stems
    if (stemsResult.data) {
      const stemPaths = stemsResult.data.map((s) => s.storage_path)
      const stemUrls = await generateSignedUrls(userId, stemPaths)
      for (const stem of stemsResult.data) {
        urls[`stem_${stem.stem_type}`] = stemUrls[stem.storage_path] || ''
      }
    }

    res.json({
      song,
      urls,
      chords: chordsResult.data || [],
      stems: stemsResult.data || [],
      lyrics: lyricsResult.data || null,
    })
  } catch (error) {
    console.error('Error in GET /api/user-songs/:songId:', error)
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    })
  }
})

// ============================================
// GET /api/user-songs/by-video/:videoId - Get song by video ID
// ============================================

router.get('/by-video/:videoId', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id
    const { videoId } = req.params
    const supabase = getSupabaseAdmin()

    if (!supabase) {
      return res.status(503).json({
        error: 'Database not available',
        code: 'DB_UNAVAILABLE',
      })
    }

    // Get the song by video_id
    const { data: song, error } = await supabase
      .from('user_songs')
      .select('*')
      .eq('video_id', videoId)
      .eq('user_id', userId)
      .single()

    if (error || !song) {
      return res.status(404).json({
        error: 'Song not found',
        code: 'SONG_NOT_FOUND',
      })
    }

    // Update last accessed timestamp
    await supabase
      .from('user_songs')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', song.id)

    // Generate signed URL for audio
    let audioUrl: string | null = null
    if (song.audio_storage_path) {
      try {
        audioUrl = await generateSignedUrl(userId, song.audio_storage_path)
      } catch (e) {
        console.error('Failed to generate audio URL:', e)
      }
    }

    res.json({
      song,
      audioUrl,
    })
  } catch (error) {
    console.error('Error in GET /api/user-songs/by-video/:videoId:', error)
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    })
  }
})

// ============================================
// POST /api/user-songs - Create a new song
// ============================================

router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id
    const { video_id, title, artist, duration_seconds } = req.body

    if (!video_id || !title || duration_seconds === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: video_id, title, duration_seconds',
        code: 'INVALID_INPUT',
      })
    }

    const supabase = getSupabaseAdmin()

    if (!supabase) {
      return res.status(503).json({
        error: 'Database not available',
        code: 'DB_UNAVAILABLE',
      })
    }

    // Check if song already exists for this user
    const { data: existing } = await supabase
      .from('user_songs')
      .select('id')
      .eq('user_id', userId)
      .eq('video_id', video_id)
      .single()

    if (existing) {
      return res.status(409).json({
        error: 'Song already exists',
        code: 'SONG_EXISTS',
        songId: existing.id,
      })
    }

    // Create the song
    const audioStoragePath = getAudioPath(userId, video_id)

    const { data: song, error } = await supabase
      .from('user_songs')
      .insert({
        user_id: userId,
        video_id,
        title,
        artist: artist || null,
        duration_seconds,
        audio_storage_path: audioStoragePath,
        has_stems: false,
        has_lyrics: false,
        is_public: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating song:', error)
      return res.status(500).json({
        error: 'Failed to create song',
        code: 'DB_ERROR',
      })
    }

    res.status(201).json({
      song,
      audioStoragePath,
    })
  } catch (error) {
    console.error('Error in POST /api/user-songs:', error)
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    })
  }
})

// ============================================
// PUT /api/user-songs/:songId - Update a song
// ============================================

router.put('/:songId', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id
    const { songId } = req.params
    const updates = req.body

    const supabase = getSupabaseAdmin()

    if (!supabase) {
      return res.status(503).json({
        error: 'Database not available',
        code: 'DB_UNAVAILABLE',
      })
    }

    // Verify ownership
    const { data: existing } = await supabase
      .from('user_songs')
      .select('id')
      .eq('id', songId)
      .eq('user_id', userId)
      .single()

    if (!existing) {
      return res.status(404).json({
        error: 'Song not found',
        code: 'SONG_NOT_FOUND',
      })
    }

    // Allowed update fields
    const allowedFields = [
      'title',
      'artist',
      'duration_seconds',
      'has_stems',
      'has_lyrics',
      'key_detected',
      'tempo_detected',
    ]

    const filteredUpdates: Record<string, unknown> = {}
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field]
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      return res.status(400).json({
        error: 'No valid fields to update',
        code: 'INVALID_INPUT',
      })
    }

    // Update the song
    const { data: song, error } = await supabase
      .from('user_songs')
      .update(filteredUpdates)
      .eq('id', songId)
      .select()
      .single()

    if (error) {
      console.error('Error updating song:', error)
      return res.status(500).json({
        error: 'Failed to update song',
        code: 'DB_ERROR',
      })
    }

    res.json({ song })
  } catch (error) {
    console.error('Error in PUT /api/user-songs/:songId:', error)
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    })
  }
})

// ============================================
// DELETE /api/user-songs/:songId - Delete a song
// ============================================

router.delete('/:songId', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id
    const { songId } = req.params

    const supabase = getSupabaseAdmin()

    if (!supabase) {
      return res.status(503).json({
        error: 'Database not available',
        code: 'DB_UNAVAILABLE',
      })
    }

    // Get the song first to get storage paths
    const { data: song } = await supabase
      .from('user_songs')
      .select('*, user_song_stems(*)')
      .eq('id', songId)
      .eq('user_id', userId)
      .single()

    if (!song) {
      return res.status(404).json({
        error: 'Song not found',
        code: 'SONG_NOT_FOUND',
      })
    }

    // Delete storage files
    const filesToDelete: string[] = []

    if (song.audio_storage_path) {
      filesToDelete.push(song.audio_storage_path)
    }

    // Add stem paths
    if (song.user_song_stems) {
      for (const stem of song.user_song_stems) {
        if (stem.storage_path) {
          filesToDelete.push(stem.storage_path)
        }
      }
    }

    // Add lyrics path
    const lyricsPath = getLyricsPath(userId, song.video_id)
    filesToDelete.push(lyricsPath)

    // Delete files from storage (errors are logged but don't fail the operation)
    if (filesToDelete.length > 0) {
      try {
        await deleteFiles(filesToDelete)
      } catch (e) {
        console.error('Error deleting storage files:', e)
        // Continue with database deletion
      }
    }

    // Delete the song (cascades to related tables)
    const { error } = await supabase
      .from('user_songs')
      .delete()
      .eq('id', songId)

    if (error) {
      console.error('Error deleting song:', error)
      return res.status(500).json({
        error: 'Failed to delete song',
        code: 'DB_ERROR',
      })
    }

    res.json({
      success: true,
      message: 'Song deleted',
    })
  } catch (error) {
    console.error('Error in DELETE /api/user-songs/:songId:', error)
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    })
  }
})

// ============================================
// POST /api/user-songs/:songId/upload-audio - Upload audio file
// ============================================

router.post('/:songId/upload-audio', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id
    const { songId } = req.params
    const { audioData, contentType = 'audio/mpeg' } = req.body

    if (!audioData) {
      return res.status(400).json({
        error: 'Missing audioData (base64 encoded)',
        code: 'INVALID_INPUT',
      })
    }

    const supabase = getSupabaseAdmin()

    if (!supabase) {
      return res.status(503).json({
        error: 'Database not available',
        code: 'DB_UNAVAILABLE',
      })
    }

    // Verify ownership and get song
    const { data: song } = await supabase
      .from('user_songs')
      .select('video_id, audio_storage_path')
      .eq('id', songId)
      .eq('user_id', userId)
      .single()

    if (!song) {
      return res.status(404).json({
        error: 'Song not found',
        code: 'SONG_NOT_FOUND',
      })
    }

    // Upload the audio file
    const storagePath =
      song.audio_storage_path || getAudioPath(userId, song.video_id)
    const audioBuffer = Buffer.from(audioData, 'base64')

    await uploadFile(storagePath, audioBuffer, contentType)

    // Update the song with the storage path
    await supabase
      .from('user_songs')
      .update({ audio_storage_path: storagePath })
      .eq('id', songId)

    // Generate signed URL
    const signedUrl = await generateSignedUrl(userId, storagePath)

    res.json({
      success: true,
      storagePath,
      signedUrl,
    })
  } catch (error) {
    console.error('Error in POST /api/user-songs/:songId/upload-audio:', error)
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    })
  }
})

// ============================================
// GET /api/user-songs/:songId/audio-url - Get signed URL for audio
// ============================================

router.get('/:songId/audio-url', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id
    const { songId } = req.params

    const supabase = getSupabaseAdmin()

    if (!supabase) {
      return res.status(503).json({
        error: 'Database not available',
        code: 'DB_UNAVAILABLE',
      })
    }

    // Get the song
    const { data: song } = await supabase
      .from('user_songs')
      .select('audio_storage_path')
      .eq('id', songId)
      .eq('user_id', userId)
      .single()

    if (!song || !song.audio_storage_path) {
      return res.status(404).json({
        error: 'Audio not found',
        code: 'AUDIO_NOT_FOUND',
      })
    }

    // Generate signed URL
    const signedUrl = await generateSignedUrl(userId, song.audio_storage_path)

    res.json({
      signedUrl,
      expiresIn: 3600, // 1 hour
    })
  } catch (error) {
    console.error('Error in GET /api/user-songs/:songId/audio-url:', error)
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    })
  }
})

export default router
