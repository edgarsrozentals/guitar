-- Migration: Create User API Keys table
-- Purpose: Store user-provided API keys for LALAL.ai and AssemblyAI
-- Date: 2026-02-28

-- ============================================
-- 1. CREATE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS user_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    service TEXT NOT NULL CHECK (service IN ('lalal_ai', 'assemblyai')),
    api_key TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Each user can only have one key per service
    CONSTRAINT user_api_keys_user_service_unique UNIQUE (user_id, service)
);

-- ============================================
-- 2. INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_api_keys_user_id ON user_api_keys(user_id);

-- ============================================
-- 3. ROW LEVEL SECURITY
-- ============================================

ALTER TABLE user_api_keys ENABLE ROW LEVEL SECURITY;

-- Users can only read their own keys
CREATE POLICY "Users can read own API keys"
    ON user_api_keys FOR SELECT
    USING (auth.uid() = user_id);

-- Users can insert their own keys
CREATE POLICY "Users can insert own API keys"
    ON user_api_keys FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own keys
CREATE POLICY "Users can update own API keys"
    ON user_api_keys FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own keys
CREATE POLICY "Users can delete own API keys"
    ON user_api_keys FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- 4. UPDATED_AT TRIGGER
-- ============================================

CREATE TRIGGER update_user_api_keys_updated_at
    BEFORE UPDATE ON user_api_keys
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
