# Story 1.1: Create User Songs Database Schema and RLS Policies

**Epic:** Cloud Song Storage
**Priority:** P0 - Critical
**Size:** Medium
**Backend Required:** Yes

## User Story

As a developer,
I want to set up the database schema for user song storage with proper security policies,
So that user data is isolated and secure from the start.

## Technical Context

We need to create the foundational database structure for storing user songs in Supabase, including all related metadata and ensuring proper data isolation through Row Level Security (RLS) policies.

## Acceptance Criteria

### Database Schema Creation

**Given** access to the Supabase project
**When** I run the database migration
**Then** the following tables are created:

1. **user_songs table**
   - id (uuid, primary key)
   - user_id (uuid, FK to auth.users)
   - video_id (text, unique per user)
   - title (text)
   - artist (text, nullable)
   - duration_seconds (integer)
   - audio_storage_path (text)
   - created_at (timestamptz)
   - updated_at (timestamptz)
   - last_accessed_at (timestamptz)

2. **user_song_chords table**
   - id (uuid, primary key)
   - user_song_id (uuid, FK to user_songs)
   - library (text) - 'essentia', 'madmom', 'btc'
   - chords (jsonb)
   - tempo (jsonb)
   - key (jsonb)
   - created_at (timestamptz)
   - updated_at (timestamptz)

3. **user_song_stems table**
   - id (uuid, primary key)
   - user_song_id (uuid, FK to user_songs)
   - stem_type (text) - 'vocals', 'backing', 'drums', 'bass', 'other'
   - storage_path (text)
   - created_at (timestamptz)

4. **user_song_lyrics table**
   - id (uuid, primary key)
   - user_song_id (uuid, FK to user_songs)
   - lrc_content (text)
   - storage_path (text)
   - created_at (timestamptz)

### RLS Policy Implementation

**Given** all tables are created
**When** RLS policies are applied
**Then** the following security rules are enforced:

1. **user_songs table policies:**
   - SELECT: user_id = auth.uid()
   - INSERT: user_id = auth.uid()
   - UPDATE: user_id = auth.uid()
   - DELETE: user_id = auth.uid()

2. **Related tables policies (chords, stems, lyrics):**
   - SELECT: user_song_id IN (SELECT id FROM user_songs WHERE user_id = auth.uid())
   - INSERT: user_song_id IN (SELECT id FROM user_songs WHERE user_id = auth.uid())
   - UPDATE: user_song_id IN (SELECT id FROM user_songs WHERE user_id = auth.uid())
   - DELETE: user_song_id IN (SELECT id FROM user_songs WHERE user_id = auth.uid())

### Security Validation

**Given** a user with id "user-123"
**When** they attempt to query another user's songs
**Then** the query returns zero rows due to RLS policy enforcement

**Given** a user is not authenticated
**When** they attempt to access any user_songs data
**Then** the request is denied with a 401 error

### Performance Considerations

**Given** the database schema is created
**When** reviewing the table structure
**Then** appropriate indexes exist on:
- user_id in user_songs table
- user_song_id in all related tables
- (user_id, video_id) composite unique index
- created_at for sorting

## Implementation Notes

### Migration File Structure
```sql
-- Create tables
CREATE TABLE user_songs (...);
CREATE TABLE user_song_chords (...);
CREATE TABLE user_song_stems (...);
CREATE TABLE user_song_lyrics (...);

-- Enable RLS
ALTER TABLE user_songs ENABLE ROW LEVEL SECURITY;
-- ... for all tables

-- Create policies
CREATE POLICY user_songs_select ON user_songs
  FOR SELECT USING (user_id = auth.uid());
-- ... all policies

-- Create indexes
CREATE INDEX idx_user_songs_user_id ON user_songs(user_id);
-- ... all indexes
```

### Cascade Delete Setup
- ON DELETE CASCADE for all foreign key relationships
- Ensures cleanup when user deletes a song

### Testing Checklist
- [ ] All tables created successfully
- [ ] RLS policies prevent cross-user access
- [ ] Unauthenticated requests are blocked
- [ ] Indexes improve query performance
- [ ] Cascade deletes work correctly

## Dependencies
- Supabase project setup
- Database admin access
- Migration tooling (Supabase CLI or SQL editor)

## Definition of Done
- [ ] Database migration script created and tested
- [ ] All tables created with correct schema
- [ ] RLS policies implemented and tested
- [ ] Indexes created for performance
- [ ] Documentation updated with schema diagrams
- [ ] Migration can be rolled back if needed