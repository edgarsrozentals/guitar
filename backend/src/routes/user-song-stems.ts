/**
 * User Song Stems API Routes
 *
 * CRUD operations for stem separation data stored in Supabase.
 * All routes require authentication.
 *
 * Epic: Cloud Song Storage (P0)
 * Story: 1.6 Stems & Lyrics API
 */

import { Router, Request, Response } from 'express'

import {
  getStemPath,
  generateSignedUrl,
  generateSignedUrls,
  uploadFile,
  deleteFile,
  deleteFiles,
  type StemType,
} from '../lib/storage'
import { getSupabaseAdmin } from '../lib/supabase'
import { authMiddleware } from '../middleware/auth'

const router = Router()

// All routes require authentication
router.use(authMiddleware)

// ============================================
// TYPES
// ============================================

const VALID_STEM_TYPES: StemType[] = [
  'vocals',
  'backing',
  'drums',
  'bass',
  'guitar',
  'piano',
  'other',
]

// ============================================
// GET /api/user-songs/:songId/stems - Get all stems
// ============================================

router.get('/:songId/stems', async (req: Request, res: Response) => {
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

    // Get all stems
    const { data: stems, error } = await supabase
      .from('user_song_stems')
      .select('*')
      .eq('user_song_id', songId)

    if (error) {
      console.error('Error fetching stems:', error)
      return res.status(500).json({
        error: 'Failed to fetch stems',
        code: 'DB_ERROR',
      })
    }

    // Generate signed URLs for all stems
    const stemPaths = (stems || []).map((s) => s.storage_path)
    const signedUrls = await generateSignedUrls(userId, stemPaths)

    const stemsWithUrls = (stems || []).map((stem) => ({
      ...stem,
      url: signedUrls[stem.storage_path] || null,
    }))

    res.json({
      stems: stemsWithUrls,
      hasStems: stemsWithUrls.length > 0,
    })
  } catch (error) {
    console.error('Error in GET /api/user-songs/:songId/stems:', error)
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    })
  }
})

// ============================================
// POST /api/user-songs/:songId/stems - Upload a stem
// ============================================

router.post('/:songId/stems', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id
    const { songId } = req.params
    const { stemType, audioData, durationSeconds } = req.body

    if (!stemType || !audioData) {
      return res.status(400).json({
        error: 'Missing required fields: stemType, audioData',
        code: 'INVALID_INPUT',
      })
    }

    if (!VALID_STEM_TYPES.includes(stemType)) {
      return res.status(400).json({
        error: `Invalid stem type. Valid options: ${VALID_STEM_TYPES.join(', ')}`,
        code: 'INVALID_STEM_TYPE',
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

    // Upload stem to storage
    const storagePath = getStemPath(userId, song.video_id, stemType)
    const audioBuffer = Buffer.from(audioData, 'base64')

    await uploadFile(storagePath, audioBuffer, 'audio/mpeg')

    // Upsert stem record
    const { data: stem, error } = await supabase
      .from('user_song_stems')
      .upsert(
        {
          user_song_id: songId,
          stem_type: stemType,
          storage_path: storagePath,
          duration_seconds: durationSeconds || null,
        },
        {
          onConflict: 'user_song_id,stem_type',
        },
      )
      .select()
      .single()

    if (error) {
      console.error('Error saving stem:', error)
      return res.status(500).json({
        error: 'Failed to save stem',
        code: 'DB_ERROR',
      })
    }

    // Update song has_stems flag
    await supabase
      .from('user_songs')
      .update({ has_stems: true })
      .eq('id', songId)

    // Generate signed URL
    const signedUrl = await generateSignedUrl(userId, storagePath)

    res.status(201).json({
      ...stem,
      url: signedUrl,
    })
  } catch (error) {
    console.error('Error in POST /api/user-songs/:songId/stems:', error)
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    })
  }
})

// ============================================
// GET /api/user-songs/:songId/stems/:stemType/url - Get signed URL
// ============================================

router.get(
  '/:songId/stems/:stemType/url',
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id
      const { songId, stemType } = req.params

      if (!VALID_STEM_TYPES.includes(stemType as StemType)) {
        return res.status(400).json({
          error: `Invalid stem type. Valid options: ${VALID_STEM_TYPES.join(', ')}`,
          code: 'INVALID_STEM_TYPE',
        })
      }

      const supabase = getSupabaseAdmin()

      if (!supabase) {
        return res.status(503).json({
          error: 'Database not available',
          code: 'DB_UNAVAILABLE',
        })
      }

      // Get the stem
      const { data: stem } = await supabase
        .from('user_song_stems')
        .select('storage_path, user_songs!inner(user_id)')
        .eq('user_song_id', songId)
        .eq('stem_type', stemType as StemType)
        .single()

      if (!stem || (stem.user_songs as any).user_id !== userId) {
        return res.status(404).json({
          error: 'Stem not found',
          code: 'STEM_NOT_FOUND',
        })
      }

      // Generate signed URL
      const signedUrl = await generateSignedUrl(userId, stem.storage_path)

      res.json({
        stemType,
        signedUrl,
        expiresIn: 3600,
      })
    } catch (error) {
      console.error(
        'Error in GET /api/user-songs/:songId/stems/:stemType/url:',
        error,
      )
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      })
    }
  },
)

// ============================================
// DELETE /api/user-songs/:songId/stems/:stemType - Delete a stem
// ============================================

router.delete(
  '/:songId/stems/:stemType',
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id
      const { songId, stemType } = req.params

      if (!VALID_STEM_TYPES.includes(stemType as StemType)) {
        return res.status(400).json({
          error: `Invalid stem type. Valid options: ${VALID_STEM_TYPES.join(', ')}`,
          code: 'INVALID_STEM_TYPE',
        })
      }

      const supabase = getSupabaseAdmin()

      if (!supabase) {
        return res.status(503).json({
          error: 'Database not available',
          code: 'DB_UNAVAILABLE',
        })
      }

      // Get the stem
      const { data: stem } = await supabase
        .from('user_song_stems')
        .select('id, storage_path, user_songs!inner(user_id)')
        .eq('user_song_id', songId)
        .eq('stem_type', stemType as StemType)
        .single()

      if (!stem || (stem.user_songs as any).user_id !== userId) {
        return res.status(404).json({
          error: 'Stem not found',
          code: 'STEM_NOT_FOUND',
        })
      }

      // Delete from storage
      try {
        await deleteFile(stem.storage_path)
      } catch (e) {
        console.error('Error deleting stem file:', e)
      }

      // Delete from database
      const { error } = await supabase
        .from('user_song_stems')
        .delete()
        .eq('id', stem.id)

      if (error) {
        console.error('Error deleting stem:', error)
        return res.status(500).json({
          error: 'Failed to delete stem',
          code: 'DB_ERROR',
        })
      }

      // Check if any stems remain
      const { data: remaining } = await supabase
        .from('user_song_stems')
        .select('id')
        .eq('user_song_id', songId)

      // Update has_stems flag if no stems remain
      if (!remaining || remaining.length === 0) {
        await supabase
          .from('user_songs')
          .update({ has_stems: false })
          .eq('id', songId)
      }

      res.json({
        success: true,
        message: `Deleted ${stemType} stem`,
      })
    } catch (error) {
      console.error(
        'Error in DELETE /api/user-songs/:songId/stems/:stemType:',
        error,
      )
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      })
    }
  },
)

// ============================================
// DELETE /api/user-songs/:songId/stems - Delete all stems
// ============================================

router.delete('/:songId/stems', async (req: Request, res: Response) => {
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

    // Verify ownership
    const { data: song } = await supabase
      .from('user_songs')
      .select('id')
      .eq('id', songId)
      .eq('user_id', userId)
      .single()

    if (!song) {
      return res.status(404).json({
        error: 'Song not found',
        code: 'SONG_NOT_FOUND',
      })
    }

    // Get all stems
    const { data: stems } = await supabase
      .from('user_song_stems')
      .select('storage_path')
      .eq('user_song_id', songId)

    // Delete files from storage
    if (stems && stems.length > 0) {
      const paths = stems.map((s) => s.storage_path)
      try {
        await deleteFiles(paths)
      } catch (e) {
        console.error('Error deleting stem files:', e)
      }
    }

    // Delete all stems from database
    const { error } = await supabase
      .from('user_song_stems')
      .delete()
      .eq('user_song_id', songId)

    if (error) {
      console.error('Error deleting stems:', error)
      return res.status(500).json({
        error: 'Failed to delete stems',
        code: 'DB_ERROR',
      })
    }

    // Update has_stems flag
    await supabase
      .from('user_songs')
      .update({ has_stems: false })
      .eq('id', songId)

    res.json({
      success: true,
      message: 'All stems deleted',
      deletedCount: stems?.length || 0,
    })
  } catch (error) {
    console.error('Error in DELETE /api/user-songs/:songId/stems:', error)
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    })
  }
})

export default router
