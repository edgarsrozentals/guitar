/**
 * User Song Chords API Routes
 *
 * CRUD operations for chord analysis data stored in Supabase.
 * All routes require authentication.
 *
 * Epic: Cloud Song Storage (P0)
 * Story: 1.5 Chord Analysis CRUD API
 */

import { Router, Request, Response } from 'express'

import { getSupabaseAdmin } from '../lib/supabase'
import { authMiddleware } from '../middleware/auth'

const router = Router()

// All routes require authentication
router.use(authMiddleware)

// ============================================
// TYPES
// ============================================

type ChordLibrary = 'essentia' | 'madmom' | 'btc' | 'chordify'

const VALID_LIBRARIES: ChordLibrary[] = [
  'essentia',
  'madmom',
  'btc',
  'chordify',
]

// ============================================
// GET /api/user-songs/:songId/chords - Get all chord analyses
// ============================================

router.get('/:songId/chords', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id
    const { songId } = req.params
    const library = req.query.library as ChordLibrary | undefined

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

    // Build query
    let query = supabase
      .from('user_song_chords')
      .select('*')
      .eq('user_song_id', songId)

    if (library) {
      if (!VALID_LIBRARIES.includes(library)) {
        return res.status(400).json({
          error: `Invalid library. Valid options: ${VALID_LIBRARIES.join(', ')}`,
          code: 'INVALID_LIBRARY',
        })
      }
      query = query.eq('library', library)
    }

    const { data: chords, error } = await query

    if (error) {
      console.error('Error fetching chords:', error)
      return res.status(500).json({
        error: 'Failed to fetch chords',
        code: 'DB_ERROR',
      })
    }

    // If specific library requested, return single result or 404
    if (library) {
      if (!chords || chords.length === 0) {
        return res.status(404).json({
          error: `No chords analyzed with ${library}`,
          code: 'CHORDS_NOT_FOUND',
          availableLibraries: [],
        })
      }
      return res.json(chords[0])
    }

    // Return all chord analyses
    res.json({
      chords: chords || [],
      analyzedWith: (chords || []).map((c) => c.library),
    })
  } catch (error) {
    console.error('Error in GET /api/user-songs/:songId/chords:', error)
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    })
  }
})

// ============================================
// POST /api/user-songs/:songId/chords - Save chord analysis
// ============================================

router.post('/:songId/chords', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id
    const { songId } = req.params
    const { library, chords, tempo, key } = req.body

    if (!library || !chords) {
      return res.status(400).json({
        error: 'Missing required fields: library, chords',
        code: 'INVALID_INPUT',
      })
    }

    if (!VALID_LIBRARIES.includes(library)) {
      return res.status(400).json({
        error: `Invalid library. Valid options: ${VALID_LIBRARIES.join(', ')}`,
        code: 'INVALID_LIBRARY',
      })
    }

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

    // Upsert chord analysis (replace if exists)
    const { data: chordData, error } = await supabase
      .from('user_song_chords')
      .upsert(
        {
          user_song_id: songId,
          library,
          chords,
          tempo: tempo || null,
          key: key || null,
        },
        {
          onConflict: 'user_song_id,library',
        },
      )
      .select()
      .single()

    if (error) {
      console.error('Error saving chords:', error)
      return res.status(500).json({
        error: 'Failed to save chords',
        code: 'DB_ERROR',
      })
    }

    // Update song key/tempo if this is the first analysis or essentia
    if (library === 'essentia' || library === 'chordify') {
      const updates: Record<string, unknown> = {}
      if (key) updates.key_detected = key
      if (tempo) updates.tempo_detected = tempo

      if (Object.keys(updates).length > 0) {
        await supabase.from('user_songs').update(updates).eq('id', songId)
      }
    }

    res.status(201).json(chordData)
  } catch (error) {
    console.error('Error in POST /api/user-songs/:songId/chords:', error)
    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    })
  }
})

// ============================================
// DELETE /api/user-songs/:songId/chords/:library - Delete chord analysis
// ============================================

router.delete(
  '/:songId/chords/:library',
  async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id
      const { songId, library } = req.params

      if (!VALID_LIBRARIES.includes(library as ChordLibrary)) {
        return res.status(400).json({
          error: `Invalid library. Valid options: ${VALID_LIBRARIES.join(', ')}`,
          code: 'INVALID_LIBRARY',
        })
      }

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

      // Delete the chord analysis
      const { error } = await supabase
        .from('user_song_chords')
        .delete()
        .eq('user_song_id', songId)
        .eq('library', library as ChordLibrary)

      if (error) {
        console.error('Error deleting chords:', error)
        return res.status(500).json({
          error: 'Failed to delete chords',
          code: 'DB_ERROR',
        })
      }

      // Get remaining analyses
      const { data: remaining } = await supabase
        .from('user_song_chords')
        .select('library')
        .eq('user_song_id', songId)

      res.json({
        success: true,
        message: `Deleted ${library} chord analysis`,
        remainingLibraries: (remaining || []).map((c) => c.library),
      })
    } catch (error) {
      console.error(
        'Error in DELETE /api/user-songs/:songId/chords/:library:',
        error,
      )
      res.status(500).json({
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
      })
    }
  },
)

export default router
