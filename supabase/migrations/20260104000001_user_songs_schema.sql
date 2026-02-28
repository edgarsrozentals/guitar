-- Migration: Create User Songs Schema for Cloud Storage
-- Epic: Cloud Song Storage (P0)
-- Story: 1.1 Database Schema & RLS Policies
-- Date: 2026-01-04

-- ============================================
-- 1. CREATE TABLES
-- ============================================

-- User Songs: Main song metadata table
CREATE TABLE IF NOT EXISTS user_songs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    video_id TEXT NOT NULL,
    title TEXT NOT NULL,
    artist TEXT,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    audio_storage_path TEXT,
    has_stems BOOLEAN DEFAULT FALSE,
    has_lyrics BOOLEAN DEFAULT FALSE,
    key_detected JSONB,  -- { root: string, scale: 'major' | 'minor', strength: number }
    tempo_detected JSONB, -- { bpm: number, confidence: number, beats: number[] }
    is_public BOOLEAN DEFAULT FALSE, -- For demo songs
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ DEFAULT NOW(),

    -- Each user can only have one song per video_id
    CONSTRAINT user_songs_user_video_unique UNIQUE (user_id, video_id)
);

-- User Song Chords: Chord analysis results from different libraries
CREATE TABLE IF NOT EXISTS user_song_chords (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_song_id UUID NOT NULL REFERENCES user_songs(id) ON DELETE CASCADE,
    library TEXT NOT NULL CHECK (library IN ('essentia', 'madmom', 'btc', 'chordify')),
    chords JSONB NOT NULL DEFAULT '[]', -- Array of { time: number, chord: { root: string, quality: string } }
    tempo JSONB, -- { bpm: number, confidence: number, beatCount: number, beats: number[] }
    key JSONB,   -- { root: string, scale: string, strength: number }
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Each song can only have one analysis per library
    CONSTRAINT user_song_chords_song_library_unique UNIQUE (user_song_id, library)
);

-- User Song Stems: Separated audio stems
CREATE TABLE IF NOT EXISTS user_song_stems (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_song_id UUID NOT NULL REFERENCES user_songs(id) ON DELETE CASCADE,
    stem_type TEXT NOT NULL CHECK (stem_type IN ('vocals', 'backing', 'drums', 'bass', 'guitar', 'piano', 'other')),
    storage_path TEXT NOT NULL,
    duration_seconds INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Each song can only have one stem of each type
    CONSTRAINT user_song_stems_song_type_unique UNIQUE (user_song_id, stem_type)
);

-- User Song Lyrics: Transcribed lyrics with timing
CREATE TABLE IF NOT EXISTS user_song_lyrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_song_id UUID NOT NULL REFERENCES user_songs(id) ON DELETE CASCADE,
    lrc_content TEXT NOT NULL,
    has_word_timing BOOLEAN DEFAULT FALSE,
    audio_source TEXT CHECK (audio_source IN ('vocals_stem', 'full_audio')),
    storage_path TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Each song can only have one lyrics entry
    CONSTRAINT user_song_lyrics_song_unique UNIQUE (user_song_id)
);

-- ============================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ============================================

-- Primary lookup indexes
CREATE INDEX IF NOT EXISTS idx_user_songs_user_id ON user_songs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_songs_video_id ON user_songs(video_id);
CREATE INDEX IF NOT EXISTS idx_user_songs_last_accessed ON user_songs(last_accessed_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_songs_created_at ON user_songs(created_at DESC);

-- Foreign key indexes for efficient joins
CREATE INDEX IF NOT EXISTS idx_user_song_chords_song_id ON user_song_chords(user_song_id);
CREATE INDEX IF NOT EXISTS idx_user_song_stems_song_id ON user_song_stems(user_song_id);
CREATE INDEX IF NOT EXISTS idx_user_song_lyrics_song_id ON user_song_lyrics(user_song_id);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_songs_user_created ON user_songs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_song_chords_song_library ON user_song_chords(user_song_id, library);

-- ============================================
-- 3. ENABLE ROW LEVEL SECURITY
-- ============================================

ALTER TABLE user_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_song_chords ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_song_stems ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_song_lyrics ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. CREATE RLS POLICIES - user_songs
-- ============================================

-- Users can only see their own songs (or public demo songs)
CREATE POLICY "Users can view own songs"
    ON user_songs FOR SELECT
    USING (user_id = auth.uid() OR is_public = TRUE);

-- Users can only insert their own songs
CREATE POLICY "Users can insert own songs"
    ON user_songs FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Users can only update their own songs
CREATE POLICY "Users can update own songs"
    ON user_songs FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Users can only delete their own songs
CREATE POLICY "Users can delete own songs"
    ON user_songs FOR DELETE
    USING (user_id = auth.uid());

-- ============================================
-- 5. CREATE RLS POLICIES - user_song_chords
-- ============================================

-- Users can view chords for songs they own (or public songs)
CREATE POLICY "Users can view chords for own songs"
    ON user_song_chords FOR SELECT
    USING (
        user_song_id IN (
            SELECT id FROM user_songs
            WHERE user_id = auth.uid() OR is_public = TRUE
        )
    );

-- Users can insert chords for songs they own
CREATE POLICY "Users can insert chords for own songs"
    ON user_song_chords FOR INSERT
    WITH CHECK (
        user_song_id IN (
            SELECT id FROM user_songs WHERE user_id = auth.uid()
        )
    );

-- Users can update chords for songs they own
CREATE POLICY "Users can update chords for own songs"
    ON user_song_chords FOR UPDATE
    USING (
        user_song_id IN (
            SELECT id FROM user_songs WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        user_song_id IN (
            SELECT id FROM user_songs WHERE user_id = auth.uid()
        )
    );

-- Users can delete chords for songs they own
CREATE POLICY "Users can delete chords for own songs"
    ON user_song_chords FOR DELETE
    USING (
        user_song_id IN (
            SELECT id FROM user_songs WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- 6. CREATE RLS POLICIES - user_song_stems
-- ============================================

-- Users can view stems for songs they own (or public songs)
CREATE POLICY "Users can view stems for own songs"
    ON user_song_stems FOR SELECT
    USING (
        user_song_id IN (
            SELECT id FROM user_songs
            WHERE user_id = auth.uid() OR is_public = TRUE
        )
    );

-- Users can insert stems for songs they own
CREATE POLICY "Users can insert stems for own songs"
    ON user_song_stems FOR INSERT
    WITH CHECK (
        user_song_id IN (
            SELECT id FROM user_songs WHERE user_id = auth.uid()
        )
    );

-- Users can update stems for songs they own
CREATE POLICY "Users can update stems for own songs"
    ON user_song_stems FOR UPDATE
    USING (
        user_song_id IN (
            SELECT id FROM user_songs WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        user_song_id IN (
            SELECT id FROM user_songs WHERE user_id = auth.uid()
        )
    );

-- Users can delete stems for songs they own
CREATE POLICY "Users can delete stems for own songs"
    ON user_song_stems FOR DELETE
    USING (
        user_song_id IN (
            SELECT id FROM user_songs WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- 7. CREATE RLS POLICIES - user_song_lyrics
-- ============================================

-- Users can view lyrics for songs they own (or public songs)
CREATE POLICY "Users can view lyrics for own songs"
    ON user_song_lyrics FOR SELECT
    USING (
        user_song_id IN (
            SELECT id FROM user_songs
            WHERE user_id = auth.uid() OR is_public = TRUE
        )
    );

-- Users can insert lyrics for songs they own
CREATE POLICY "Users can insert lyrics for own songs"
    ON user_song_lyrics FOR INSERT
    WITH CHECK (
        user_song_id IN (
            SELECT id FROM user_songs WHERE user_id = auth.uid()
        )
    );

-- Users can update lyrics for songs they own
CREATE POLICY "Users can update lyrics for own songs"
    ON user_song_lyrics FOR UPDATE
    USING (
        user_song_id IN (
            SELECT id FROM user_songs WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        user_song_id IN (
            SELECT id FROM user_songs WHERE user_id = auth.uid()
        )
    );

-- Users can delete lyrics for songs they own
CREATE POLICY "Users can delete lyrics for own songs"
    ON user_song_lyrics FOR DELETE
    USING (
        user_song_id IN (
            SELECT id FROM user_songs WHERE user_id = auth.uid()
        )
    );

-- ============================================
-- 8. CREATE TRIGGER FOR updated_at
-- ============================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to user_songs
DROP TRIGGER IF EXISTS update_user_songs_updated_at ON user_songs;
CREATE TRIGGER update_user_songs_updated_at
    BEFORE UPDATE ON user_songs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to user_song_chords
DROP TRIGGER IF EXISTS update_user_song_chords_updated_at ON user_song_chords;
CREATE TRIGGER update_user_song_chords_updated_at
    BEFORE UPDATE ON user_song_chords
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to user_song_lyrics
DROP TRIGGER IF EXISTS update_user_song_lyrics_updated_at ON user_song_lyrics;
CREATE TRIGGER update_user_song_lyrics_updated_at
    BEFORE UPDATE ON user_song_lyrics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 9. SERVICE ROLE ACCESS POLICIES
-- ============================================
-- Note: Service role bypasses RLS by default in Supabase.
-- These are handled via the Supabase admin client in the backend.

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- To apply: Run this in Supabase SQL Editor or via CLI:
-- supabase db push
--
-- To rollback, use the rollback migration file.
