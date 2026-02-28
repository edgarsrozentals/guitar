# Story 1.7: Frontend Integration for Personal Song Library

**Epic:** Cloud Song Storage
**Priority:** P1 - High
**Size:** Large
**Backend Required:** No (Frontend only)

## User Story

As an authenticated user,
I want to view and manage my personal song library in the app,
So that I can easily access my previously processed songs.

## Technical Context

The frontend needs to integrate with the new cloud storage APIs, switching from local file serving to cloud storage with signed URLs. This includes automatic saving of analysis results and seamless loading of existing songs.

## Acceptance Criteria

### Library Page Display

**Given** an authenticated user navigates to the song library page
**When** the page loads
**Then**:
- A list of their saved songs is displayed
- Each song shows: title, artist, duration, processing status indicators
- Status indicators show: has chords (✓), has stems (✓), has lyrics (✓)
- Songs are sorted by most recently accessed
- A loading skeleton is shown while fetching

### Song Selection and Playback

**Given** an authenticated user views the song library
**When** they click on a song
**Then**:
- They are navigated to the chord player with the song loaded
- The audio plays from cloud storage (signed URL) instead of re-downloading
- Any existing chord analysis is loaded automatically
- Any existing stems are loaded automatically
- Any existing lyrics are loaded automatically

### Save to Library Flow

**Given** an authenticated user on the chord player page
**When** they analyze chords for a new video and the analysis completes
**Then**:
- A "Save to Library" button becomes visible (if song not already saved)
- Clicking it saves the song with its analysis to their library
- A success toast notification confirms the save
- The button changes to "Saved to Library" (disabled state)

### Auto-Save Incremental Updates

**Given** an authenticated user views a song from their library
**When** they perform additional analysis (different chord library, stem separation, lyrics)
**Then**:
- The new results are automatically saved to their library
- No manual save action is required for incremental updates
- A subtle indicator shows "Saving..." then "Saved"

### Delete from Library

**Given** an authenticated user views the song library
**When** they click the delete button on a song
**Then**:
- A confirmation modal appears with song title
- Modal explains: "This will permanently delete the song and all associated data"
- Upon confirmation, the song and all data are deleted
- The song is removed from the list immediately (optimistic update)
- A success toast confirms deletion

### Authentication Guard

**Given** an unauthenticated user
**When** they navigate to the song library page
**Then**:
- They are redirected to the login page
- After successful login, they are returned to the library page
- The redirect URL is preserved through the auth flow

### Error Handling

**Given** the API returns an error when fetching the library
**When** the error is caught
**Then**:
- An error message is displayed: "Failed to load your songs"
- A "Retry" button is shown
- The error is logged for debugging
- Clicking Retry attempts the fetch again

## Implementation Notes

### API Client Service
```typescript
// product/app/services/songLibraryApi.ts
import { supabase } from '@product/config/supabase';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

interface Song {
  id: string;
  videoId: string;
  title: string;
  artist?: string;
  duration: number;
  audioUrl: string;
  hasChords: boolean;
  hasStems: boolean;
  hasLyrics: boolean;
  createdAt: string;
  lastAccessedAt: string;
}

interface SongsResponse {
  songs: Song[];
  total: number;
  page: number;
  totalPages: number;
}

const getAuthHeaders = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) {
    throw new Error('Not authenticated');
  }
  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  };
};

export const songLibraryApi = {
  async listSongs(page = 1, limit = 20): Promise<SongsResponse> {
    const headers = await getAuthHeaders();
    const response = await fetch(
      `${API_BASE}/api/songs?page=${page}&limit=${limit}`,
      { headers }
    );
    if (!response.ok) throw new Error('Failed to fetch songs');
    return response.json();
  },

  async getSong(songId: string): Promise<Song> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/api/songs/${songId}`, { headers });
    if (!response.ok) throw new Error('Failed to fetch song');
    return response.json();
  },

  async createSong(data: { videoId: string; title: string; artist?: string }) {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/api/songs`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to create song');
    }
    return response.json();
  },

  async deleteSong(songId: string): Promise<void> {
    const headers = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/api/songs/${songId}`, {
      method: 'DELETE',
      headers
    });
    if (!response.ok) throw new Error('Failed to delete song');
  },

  async updateLastAccessed(songId: string): Promise<void> {
    const headers = await getAuthHeaders();
    await fetch(`${API_BASE}/api/songs/${songId}/accessed`, {
      method: 'PATCH',
      headers
    });
  }
};
```

### useUserSongs Hook
```typescript
// product/app/library/hooks/useUserSongs.ts
import { useState, useEffect, useCallback } from 'react';
import { songLibraryApi, Song } from '../services/songLibraryApi';

interface UseUserSongsResult {
  songs: Song[];
  isLoading: boolean;
  error: string | null;
  totalPages: number;
  currentPage: number;
  fetchSongs: (page?: number) => Promise<void>;
  deleteSong: (songId: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useUserSongs = (): UseUserSongsResult => {
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchSongs = useCallback(async (page = 1) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await songLibraryApi.listSongs(page);
      setSongs(response.songs);
      setTotalPages(response.totalPages);
      setCurrentPage(page);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load songs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const deleteSong = useCallback(async (songId: string) => {
    // Optimistic update
    setSongs(prev => prev.filter(s => s.id !== songId));
    try {
      await songLibraryApi.deleteSong(songId);
    } catch (err) {
      // Revert on failure
      await fetchSongs(currentPage);
      throw err;
    }
  }, [currentPage, fetchSongs]);

  const refresh = useCallback(() => fetchSongs(currentPage), [currentPage, fetchSongs]);

  useEffect(() => {
    fetchSongs();
  }, [fetchSongs]);

  return {
    songs,
    isLoading,
    error,
    totalPages,
    currentPage,
    fetchSongs,
    deleteSong,
    refresh
  };
};
```

### Song Library Page Component
```typescript
// product/app/pages/library.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@product/hooks/useAuth';
import { SongLibrary } from '@product/app/library/SongLibrary';

export default function LibraryPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/auth/login?redirect=${encodeURIComponent('/library')}`);
    }
  }, [user, authLoading, router]);

  if (authLoading) {
    return <LibraryLoadingSkeleton />;
  }

  if (!user) {
    return null; // Redirecting...
  }

  return <SongLibrary />;
}
```

### SongLibrary Component
```typescript
// product/app/library/SongLibrary.tsx
import { useState } from 'react';
import styled from 'styled-components';
import { useUserSongs } from './hooks/useUserSongs';
import { SongCard } from './SongCard';
import { DeleteSongDialog } from './DeleteSongDialog';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { LoadingSkeleton } from './LoadingSkeleton';

export const SongLibrary = () => {
  const { songs, isLoading, error, deleteSong, refresh } = useUserSongs();
  const [songToDelete, setSongToDelete] = useState<Song | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteConfirm = async () => {
    if (!songToDelete) return;
    setIsDeleting(true);
    try {
      await deleteSong(songToDelete.id);
      toast.success('Song deleted');
    } catch {
      toast.error('Failed to delete song');
    } finally {
      setIsDeleting(false);
      setSongToDelete(null);
    }
  };

  if (isLoading) {
    return <LoadingSkeleton count={6} />;
  }

  if (error) {
    return <ErrorState message={error} onRetry={refresh} />;
  }

  if (songs.length === 0) {
    return <EmptyState />;
  }

  return (
    <Container>
      <Header>
        <Title>My Library</Title>
        <SongCount>{songs.length} songs</SongCount>
      </Header>

      <SongGrid>
        {songs.map(song => (
          <SongCard
            key={song.id}
            song={song}
            onDelete={() => setSongToDelete(song)}
          />
        ))}
      </SongGrid>

      <DeleteSongDialog
        song={songToDelete}
        isOpen={!!songToDelete}
        isDeleting={isDeleting}
        onClose={() => setSongToDelete(null)}
        onConfirm={handleDeleteConfirm}
      />
    </Container>
  );
};
```

### Auto-Save Hook for Chord Player
```typescript
// product/app/chords/hooks/useAutoSave.ts
import { useEffect, useRef, useCallback } from 'react';
import { songLibraryApi } from '../../services/songLibraryApi';

interface UseAutoSaveOptions {
  songId: string | null;
  chords: ChordAnalysis | null;
  stems: StemData | null;
  lyrics: LyricsData | null;
  library: string;
}

export const useAutoSave = ({ songId, chords, stems, lyrics, library }: UseAutoSaveOptions) => {
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  const saveChords = useCallback(async () => {
    if (!songId || !chords) return;

    setIsSaving(true);
    try {
      await songLibraryApi.saveChords(songId, library, chords);
      setLastSaved(new Date());
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [songId, chords, library]);

  // Debounced auto-save when chords change
  useEffect(() => {
    if (!songId || !chords) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(saveChords, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [chords, saveChords, songId]);

  return { isSaving, lastSaved };
};
```

## Testing Checklist
- [ ] Library page loads for authenticated users
- [ ] Unauthenticated users redirected to login
- [ ] Songs display with correct metadata
- [ ] Status indicators show correctly
- [ ] Clicking song navigates to chord player
- [ ] Audio plays from signed URLs
- [ ] Save to Library button works for new songs
- [ ] Auto-save works for incremental updates
- [ ] Delete confirmation modal displays
- [ ] Delete removes song and updates list
- [ ] Error state displays with retry button
- [ ] Empty state shows call-to-action
- [ ] Loading skeleton displays during fetch

## Dependencies
- Supabase Auth integration
- Backend API endpoints (Stories 1.4-1.6)
- Toast notification system
- Existing chord player components

## Definition of Done
- [ ] Library page component created
- [ ] Song cards with status indicators
- [ ] Delete confirmation modal
- [ ] Auto-save hook for chord player
- [ ] API client service layer
- [ ] Authentication guard working
- [ ] Error and empty states implemented
- [ ] Loading skeletons for better UX
- [ ] Integration with existing chord player
- [ ] Signed URL playback working