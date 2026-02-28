# Story 3.5: Track and Display Recently Accessed Songs

**Epic:** Song Library UI
**Priority:** P2 - Medium
**Size:** Medium
**Backend Required:** Yes (API for tracking access)

## User Story

As an authenticated user,
I want to see my recently accessed songs prominently,
So that I can quickly continue where I left off.

## Technical Context

Track song access times and display a dedicated "Recent Songs" section. The backend updates `last_accessed_at` timestamp when songs are opened in the chord player.

## Acceptance Criteria

### Recent Songs Section

**Given** I am on the library page
**When** the page loads
**Then**:
- I see a "Recent Songs" section at the top
- Section shows up to 5 most recently accessed songs
- Songs displayed in horizontal scrollable row
- Each song shows thumbnail, title, and duration

### Access Time Tracking

**Given** I open a song in the chord player
**When** the chord player page loads
**Then**:
- The song's `last_accessed_at` timestamp is updated
- API call is made in background (non-blocking)
- No visible loading or delay

### Recent Section Visibility

**Given** I have no songs in my library
**When** I view the library page
**Then**:
- The "Recent Songs" section is not displayed
- Only the empty state is shown

**Given** I have fewer than 5 songs in my library
**When** I view the library page
**Then**:
- "Recent Songs" shows all my songs
- No duplicates between Recent and main list
- OR: Recent section is hidden if all songs fit in main view

### Default Sort Order

**Given** I am viewing the full library list
**When** the page loads (no explicit sort selected)
**Then**:
- Songs are sorted by last accessed date (most recent first)
- Songs never accessed are sorted by creation date

### Sort Options

**Given** I am viewing the library page
**When** I click the sort dropdown
**Then**:
- Options available: "Recent", "Title A-Z", "Title Z-A", "Duration", "Date Added"
- Selecting an option re-sorts the list immediately

### Sort Preference Persistence

**Given** I select a sort order
**When** I navigate away and return
**Then**:
- My sort preference is preserved (localStorage)
- List displays with my preferred sort

## Implementation Notes

### API Endpoint for Tracking Access
```typescript
// Backend: PATCH /api/songs/:songId/accessed
router.patch('/:songId/accessed', authMiddleware, async (req, res) => {
  const { songId } = req.params;
  const userId = req.user!.id;

  try {
    // Update last_accessed_at
    const { error } = await supabase
      .from('user_songs')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', songId)
      .eq('user_id', userId);

    if (error) throw error;

    res.status(204).send();
  } catch (error) {
    console.error('Failed to update access time:', error);
    // Return success anyway - this is non-critical
    res.status(204).send();
  }
});
```

### Track Access Hook
```typescript
// product/app/chords/hooks/useTrackSongAccess.ts
import { useEffect, useRef } from 'react';
import { songLibraryApi } from '../../services/songLibraryApi';

export const useTrackSongAccess = (songId: string | null) => {
  const hasTracked = useRef(false);

  useEffect(() => {
    if (!songId || hasTracked.current) return;

    // Track access in background - don't await
    songLibraryApi.updateLastAccessed(songId).catch(() => {
      // Silently fail - non-critical
    });

    hasTracked.current = true;
  }, [songId]);
};
```

### Recent Songs Component
```typescript
// product/app/library/RecentSongs.tsx
import styled from 'styled-components';
import Link from 'next/link';
import { Song } from './types';

interface RecentSongsProps {
  songs: Song[];
}

export const RecentSongs = ({ songs }: RecentSongsProps) => {
  if (songs.length === 0) return null;

  // Take only 5 most recent
  const recentSongs = songs.slice(0, 5);

  return (
    <Section>
      <SectionTitle>Recent Songs</SectionTitle>
      <ScrollContainer>
        <SongRow>
          {recentSongs.map(song => (
            <RecentSongCard key={song.id} song={song} />
          ))}
        </SongRow>
      </ScrollContainer>
    </Section>
  );
};

const RecentSongCard = ({ song }: { song: Song }) => {
  const thumbnail = `https://img.youtube.com/vi/${song.videoId}/mqdefault.jpg`;

  return (
    <Link href={`/chords/youtube?v=${song.videoId}`} passHref>
      <CardLink>
        <Thumbnail src={thumbnail} alt={song.title} />
        <CardContent>
          <Title>{song.title}</Title>
          <Duration>{formatDuration(song.duration)}</Duration>
        </CardContent>
      </CardLink>
    </Link>
  );
};

const Section = styled.section`
  margin-bottom: 32px;
`;

const SectionTitle = styled.h2`
  font-size: 18px;
  font-weight: 500;
  margin: 0 0 16px;
`;

const ScrollContainer = styled.div`
  overflow-x: auto;
  margin: 0 -24px;
  padding: 0 24px;

  /* Hide scrollbar but allow scrolling */
  scrollbar-width: none;
  &::-webkit-scrollbar {
    display: none;
  }
`;

const SongRow = styled.div`
  display: flex;
  gap: 16px;
`;

const CardLink = styled.a`
  display: block;
  width: 180px;
  flex-shrink: 0;
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s;

  &:hover {
    transform: scale(1.02);
  }
`;

const Thumbnail = styled.img`
  width: 100%;
  aspect-ratio: 16/9;
  object-fit: cover;
  border-radius: 8px;
`;

const CardContent = styled.div`
  padding: 8px 0;
`;

const Title = styled.div`
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Duration = styled.div`
  font-size: 12px;
  color: #888;
`;

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
```

### Sort Controls
```typescript
// product/app/library/SortSelect.tsx
import styled from 'styled-components';

type SortOption = 'recent' | 'title-asc' | 'title-desc' | 'duration' | 'created';

interface SortSelectProps {
  value: SortOption;
  onChange: (value: SortOption) => void;
}

export const SortSelect = ({ value, onChange }: SortSelectProps) => {
  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value as SortOption)}
    >
      <option value="recent">Recent</option>
      <option value="title-asc">Title A-Z</option>
      <option value="title-desc">Title Z-A</option>
      <option value="duration">Duration</option>
      <option value="created">Date Added</option>
    </Select>
  );
};

const Select = styled.select`
  padding: 8px 12px;
  border: 1px solid #333;
  border-radius: 6px;
  background: #1a1a1a;
  color: #fff;
  font-size: 13px;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #4a9eff;
  }
`;
```

### Sort Logic Hook
```typescript
// product/app/library/hooks/useSortedSongs.ts
import { useMemo } from 'react';
import { useLocalStorage } from '@lib/hooks/useLocalStorage';
import { Song } from '../types';

type SortOption = 'recent' | 'title-asc' | 'title-desc' | 'duration' | 'created';

export const useSortedSongs = (songs: Song[]) => {
  const [sortBy, setSortBy] = useLocalStorage<SortOption>('library-sort', 'recent');

  const sortedSongs = useMemo(() => {
    const sorted = [...songs];

    switch (sortBy) {
      case 'recent':
        return sorted.sort((a, b) => {
          const aTime = new Date(a.lastAccessedAt || a.createdAt).getTime();
          const bTime = new Date(b.lastAccessedAt || b.createdAt).getTime();
          return bTime - aTime;
        });

      case 'title-asc':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));

      case 'title-desc':
        return sorted.sort((a, b) => b.title.localeCompare(a.title));

      case 'duration':
        return sorted.sort((a, b) => b.duration - a.duration);

      case 'created':
        return sorted.sort((a, b) => {
          const aTime = new Date(a.createdAt).getTime();
          const bTime = new Date(b.createdAt).getTime();
          return bTime - aTime;
        });

      default:
        return sorted;
    }
  }, [songs, sortBy]);

  return {
    sortedSongs,
    sortBy,
    setSortBy,
  };
};
```

### Updated Library with Recent Section
```typescript
// product/app/library/SongLibrary.tsx (final)
export const SongLibrary = () => {
  const { songs, isLoading, error, refresh } = useUserSongs();
  const { sortedSongs, sortBy, setSortBy } = useSortedSongs(songs);
  // ... other state

  return (
    <Container>
      <Header>
        <Title>My Library</Title>
        <HeaderControls>
          <SortSelect value={sortBy} onChange={setSortBy} />
          <ViewToggle value={viewMode} onChange={setViewMode} />
        </HeaderControls>
      </Header>

      {/* Recent Songs - only when sorted by recent */}
      {sortBy === 'recent' && sortedSongs.length > 5 && (
        <RecentSongs songs={sortedSongs} />
      )}

      {/* Search and Filters */}
      <FilterBar>
        <SearchInput value={search} onChange={setSearch} />
        <FilterButton onClick={toggleFilters}>
          Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
        </FilterButton>
      </FilterBar>

      {/* Main Song List */}
      {viewMode === 'grid' ? (
        <SongGrid songs={filteredSongs} onDeleteSong={handleDeleteClick} />
      ) : (
        <SongList songs={filteredSongs} onDeleteSong={handleDeleteClick} />
      )}

      {/* Delete Dialog */}
      <DeleteSongDialog ... />
    </Container>
  );
};
```

## Testing Checklist
- [ ] Recent Songs section displays top 5 songs
- [ ] Horizontal scroll works smoothly
- [ ] Recent section hidden when no songs
- [ ] Recent section hidden when < 5 songs (optional)
- [ ] Access time updated when opening song
- [ ] Access tracking doesn't block playback
- [ ] Sort by Recent works correctly
- [ ] Sort by Title A-Z works
- [ ] Sort by Title Z-A works
- [ ] Sort by Duration works
- [ ] Sort by Date Added works
- [ ] Sort preference persists
- [ ] Recent songs clickable and navigate

## Dependencies
- Backend endpoint for access tracking
- LocalStorage for sort preference
- useUserSongs returns lastAccessedAt

## Definition of Done
- [ ] Backend access tracking endpoint created
- [ ] Access tracking hook implemented
- [ ] Recent Songs section component created
- [ ] Sort controls implemented
- [ ] Sort logic hook created
- [ ] Sort preference persistence working
- [ ] Horizontal scrolling smooth
- [ ] Mobile responsive verified