/**
 * User Song Lyrics API Routes
 *
 * CRUD operations for lyrics data stored in Supabase.
 * All routes require authentication.
 *
 * Epic: Cloud Song Storage (P0)
 * Story: 1.6 Stems & Lyrics API
 */

import { Router, Request, Response } from 'express'

import {
  getLyricsPath,
  generateSignedUrl,
  uploadFile,
  deleteFile,
} from '../lib/storage'
import { getSupabaseAdmin } from '../lib/supabase'
import { authMiddleware } from '../middleware/auth'

const router = Router()

// All routes require authentication
router.use(authMiddleware)

// ============================================
// TYPES
// ============================================

type AudioSource = 'vocals_stem' | 'full_audio'

// ============================================
// GET /api/user-songs/:songId/lyrics - Get lyrics
// ============================================

router.get('/:songId/lyrics', async (req: Request, res: Response) => {
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

    // Verify song ownership
    const { data: song } = await supabase
      .from('user_songs')
      .select('id, video_id')
      .eq('id', songId)
      .eq('user_id', userId)
      .single()

    if (!song) {
      return res.status(404).json({
        error: 'Song not found',
        code: 'SONG_NOT_FOUND',
      })
    }

    // Get lyrics
    const { data: lyrics, error } = await supabase
      .from('user_song_lyrics')
      .select('*')
      .eq('user_song_id', songId)
      .single()

    if (error || !lyrics) {
      return res.status(404).json({
        error: 'Lyrics not found',
        code: 'LYRICS_NOT_FOUND',
      })
    }

    // Generate signed URL if storage path exists
    let lrcFileUrl: string | null = null
    if (lyrics.storage_path) {
      try {
        lrcFileUrl = await generateSignedUrl(userId, lyrics.storage_path)
      } catch (e) {
        console.error('Failed to generate lyrics URL:', e)
      }
    }

    res.json({
      ...lyrics,
      lrcFileUrl,
    })
  } catch (error) {
    console.error('Error in GET /api/user-songs/:songId/lyrics:', error)
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    })
  }
})

// ============================================
// POST /api/user-songs/:songId/lyrics - Save lyrics
// ============================================

router.post('/:songId/lyrics', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id
    const { songId } = req.params
    const { lrcContent, hasWordTiming, audioSource } = req.body

    if (!lrcContent) {
      return res.status(400).json({
        error: 'Missing required field: lrcContent',
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

    // Verify song ownership and get video_id
    const { data: song } = await supabase
      .from('user_songs')
      .select('id, video_id')
      .eq('id', songId)
      .eq('user_id', userId)
      .single()

    if (!song) {
      return res.status(404).json({
        error: 'Song not found',
        code: 'SONG_NOT_FOUND',
      })
    }

    // Upload LRC file to storage
    const storagePath = getLyricsPath(userId, song.video_id)
    const lrcBuffer = Buffer.from(lrcContent, 'utf-8')

    await uploadFile(storagePath, lrcBuffer, 'text/plain')

    // Upsert lyrics record
    const { data: lyrics, error } = await supabase
      .from('user_song_lyrics')
      .upsert(
        {
          user_song_id: songId,
          lrc_content: lrcContent,
          has_word_timing: hasWordTiming || false,
          audio_source: audioSource || null,
          storage_path: storagePath,
        },
        {
          onConflict: 'user_song_id',
        },
      )
      .select()
      .single()

    if (error) {
      console.error('Error saving lyrics:', error)
      return res.status(500).json({
        error: 'Failed to save lyrics',
        code: 'DB_ERROR',
      })
    }

    // Update song has_lyrics flag
    await supabase
      .from('user_songs')
      .update({ has_lyrics: true })
      .eq('id', songId)

    // Generate signed URL
    const lrcFileUrl = await generateSignedUrl(userId, storagePath)

    res.status(201).json({
      ...lyrics,
      lrcFileUrl,
    })
  } catch (error) {
    console.error('Error in POST /api/user-songs/:songId/lyrics:', error)
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    })
  }
})

// ============================================
// DELETE /api/user-songs/:songId/lyrics - Delete lyrics
// ============================================

router.delete('/:songId/lyrics', async (req: Request, res: Response) => {
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

    // Get the lyrics
    const { data: lyrics } = await supabase
      .from('user_song_lyrics')
      .select('id, storage_path, user_songs!inner(user_id)')
      .eq('user_song_id', songId)
      .single()

    if (!lyrics || (lyrics.user_songs as any).user_id !== userId) {
      return res.status(404).json({
        error: 'Lyrics not found',
        code: 'LYRICS_NOT_FOUND',
      })
    }

    // Delete from storage
    if (lyrics.storage_path) {
      try {
        await deleteFile(lyrics.storage_path)
      } catch (e) {
        console.error('Error deleting lyrics file:', e)
      }
    }

    // Delete from database
    const { error } = await supabase
      .from('user_song_lyrics')
      .delete()
      .eq('id', lyrics.id)

    if (error) {
      console.error('Error deleting lyrics:', error)
      return res.status(500).json({
        error: 'Failed to delete lyrics',
        code: 'DB_ERROR',
      })
    }

    // Update has_lyrics flag
    await supabase
      .from('user_songs')
      .update({ has_lyrics: false })
      .eq('id', songId)

    res.json({
      success: true,
      message: 'Lyrics deleted',
    })
  } catch (error) {
    console.error('Error in DELETE /api/user-songs/:songId/lyrics:', error)
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    })
  }
})

export default router
