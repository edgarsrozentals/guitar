# Story 3.1: Create Song Library Page with Grid/List View

**Epic:** Song Library UI
**Priority:** P1 - High
**Size:** Large
**Backend Required:** No (Frontend only)

## User Story

As an authenticated user,
I want to view my song collection on a dedicated library page,
So that I can easily browse all my saved songs.

## Technical Context

Create a new library page that displays the user's saved songs with options for grid and list views. This page integrates with the cloud storage API from Epic 1.

## Acceptance Criteria

### Library Page Display

**Given** I am logged in and have songs in my library
**When** I navigate to `/library`
**Then**:
- I see a page header with "My Library" title
- I see my songs displayed in a grid layout by default
- Each song card shows: title, artist, duration, thumbnail
- I see a toggle to switch between grid and list view
- Songs are sorted by most recently accessed

### List View Toggle

**Given** I am logged in and toggle to list view
**When** the view switches to list mode
**Then**:
- Songs are displayed as horizontal list items
- Each item shows: thumbnail, title, artist, duration, key, BPM
- Compact metadata display for scanning
- List items are clickable to open song

### Empty State

**Given** I am logged in but have no songs in my library
**When** I navigate to `/library`
**Then**:
- I see an empty state with message "No songs yet"
- I see an illustration or icon representing an empty library
- I see a call-to-action button: "Add your first song"
- Clicking the button navigates to `/chords`

### Loading State

**Given** my songs are loading
**When** I first visit the library page
**Then**:
- I see skeleton loading placeholders for song cards/items
- Skeleton count matches expected grid layout (6-12 items)
- View toggle is disabled during loading

### Error State

**Given** the song fetch fails due to a network error
**When** the page attempts to load
**Then**:
- I see an error message "Failed to load your songs"
- I see a "Retry" button to attempt loading again
- Error icon is displayed
- Clicking Retry triggers a new fetch

### View Preference Persistence

**Given** I select list view
**When** I navigate away and return to the library
**Then**:
- My view preference (list) is preserved
- Preference is stored in localStorage

## Implementation Notes

### Page Structure
```typescript
// product/app/pages/library.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '@product/hooks/useAuth';
import { SongLibrary } from '@product/app/library/SongLibrary';
import { AuthGuard } from '@product/components/AuthGuard';

export default function LibraryPage() {
  return (
    <AuthGuard redirectTo="/auth/login?redirect=/library">
      <SongLibrary />
    </AuthGuard>
  );
}
```

### Library Component Structure
```
product/app/library/
├── SongLibrary.tsx          # Main container
├── SongGrid.tsx             # Grid view layout
├── SongList.tsx             # List view layout
├── SongCard.tsx             # Grid item component
├── SongListItem.tsx         # List item component
├── ViewToggle.tsx           # Grid/List toggle
├── EmptyState.tsx           # No songs display
├── ErrorState.tsx           # Error with retry
├── LoadingSkeleton.tsx      # Loading placeholders
└── hooks/
    └── useUserSongs.ts      # Data fetching hook
```

### SongLibrary Component
```typescript
// product/app/library/SongLibrary.tsx
import { useState } from 'react';
import styled from 'styled-components';
import { useUserSongs } from './hooks/useUserSongs';
import { useLocalStorage } from '@lib/hooks/useLocalStorage';
import { SongGrid } from './SongGrid';
import { SongList } from './SongList';
import { ViewToggle } from './ViewToggle';
import { EmptyState } from './EmptyState';
import { ErrorState } from './ErrorState';
import { LoadingSkeleton } from './LoadingSkeleton';

type ViewMode = 'grid' | 'list';

export const SongLibrary = () => {
  const [viewMode, setViewMode] = useLocalStorage<ViewMode>('library-view', 'grid');
  const { songs, isLoading, error, refresh } = useUserSongs();

  if (isLoading) {
    return (
      <Container>
        <Header>
          <Title>My Library</Title>
          <ViewToggle value={viewMode} onChange={setViewMode} disabled />
        </Header>
        <LoadingSkeleton viewMode={viewMode} />
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Header>
          <Title>My Library</Title>
        </Header>
        <ErrorState message={error} onRetry={refresh} />
      </Container>
    );
  }

  if (songs.length === 0) {
    return (
      <Container>
        <Header>
          <Title>My Library</Title>
        </Header>
        <EmptyState />
      </Container>
    );
  }

  return (
    <Container>
      <Header>
        <Title>My Library</Title>
        <HeaderRight>
          <SongCount>{songs.length} {songs.length === 1 ? 'song' : 'songs'}</SongCount>
          <ViewToggle value={viewMode} onChange={setViewMode} />
        </HeaderRight>
      </Header>

      {viewMode === 'grid' ? (
        <SongGrid songs={songs} />
      ) : (
        <SongList songs={songs} />
      )}
    </Container>
  );
};

const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const Title = styled.h1`
  font-size: 28px;
  font-weight: 600;
  margin: 0;
`;

const HeaderRight = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const SongCount = styled.span`
  color: #666;
  font-size: 14px;
`;
```

### SongCard Component
```typescript
// product/app/library/SongCard.tsx
import styled from 'styled-components';
import Link from 'next/link';
import { Song } from './types';

interface SongCardProps {
  song: Song;
  onDelete?: () => void;
}

export const SongCard = ({ song, onDelete }: SongCardProps) => {
  const thumbnail = `https://img.youtube.com/vi/${song.videoId}/mqdefault.jpg`;

  return (
    <Card>
      <Link href={`/chords/youtube?v=${song.videoId}`} passHref>
        <CardLink>
          <Thumbnail src={thumbnail} alt={song.title} />
          <Content>
            <SongTitle>{song.title}</SongTitle>
            {song.artist && <Artist>{song.artist}</Artist>}
            <MetaRow>
              <Duration>{formatDuration(song.duration)}</Duration>
              <Indicators>
                {song.hasChords && <Indicator title="Has chords">🎸</Indicator>}
                {song.hasStems && <Indicator title="Has stems">🎚️</Indicator>}
                {song.hasLyrics && <Indicator title="Has lyrics">🎤</Indicator>}
              </Indicators>
            </MetaRow>
          </Content>
        </CardLink>
      </Link>
      {onDelete && (
        <DeleteButton onClick={onDelete} aria-label="Delete song">
          🗑️
        </DeleteButton>
      )}
    </Card>
  );
};

const Card = styled.div`
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  background: #1a1a1a;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }
`;

const CardLink = styled.a`
  display: block;
  text-decoration: none;
  color: inherit;
`;

const Thumbnail = styled.img`
  width: 100%;
  aspect-ratio: 16/9;
  object-fit: cover;
`;

const Content = styled.div`
  padding: 12px;
`;

const SongTitle = styled.h3`
  font-size: 14px;
  font-weight: 500;
  margin: 0 0 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Artist = styled.p`
  font-size: 12px;
  color: #888;
  margin: 0 0 8px;
`;

const MetaRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const Duration = styled.span`
  font-size: 12px;
  color: #666;
`;

const Indicators = styled.div`
  display: flex;
  gap: 4px;
`;

const Indicator = styled.span`
  font-size: 12px;
`;

const DeleteButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.7);
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;

  ${Card}:hover & {
    opacity: 1;
  }
`;

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
```

### Grid Layout
```typescript
// product/app/library/SongGrid.tsx
import styled from 'styled-components';
import { SongCard } from './SongCard';
import { Song } from './types';

interface SongGridProps {
  songs: Song[];
  onDeleteSong?: (songId: string) => void;
}

export const SongGrid = ({ songs, onDeleteSong }: SongGridProps) => {
  return (
    <Grid>
      {songs.map(song => (
        <SongCard
          key={song.id}
          song={song}
          onDelete={onDeleteSong ? () => onDeleteSong(song.id) : undefined}
        />
      ))}
    </Grid>
  );
};

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;

  @media (max-width: 600px) {
    grid-template-columns: repeat(2, 1fr);
    gap: 12px;
  }
`;
```

## Testing Checklist
- [ ] Library page renders for authenticated users
- [ ] Grid view displays songs correctly
- [ ] List view displays songs correctly
- [ ] View toggle switches between modes
- [ ] View preference persists across sessions
- [ ] Empty state displays when no songs
- [ ] Loading skeleton displays during fetch
- [ ] Error state displays on fetch failure
- [ ] Retry button triggers new fetch
- [ ] Song cards link to chord player
- [ ] Song cards show correct metadata

## Dependencies
- useAuth hook for authentication
- API endpoints from Epic 1
- LocalStorage for preference persistence
- styled-components for styling

## Definition of Done
- [ ] Library page component created
- [ ] Grid view implemented
- [ ] List view implemented
- [ ] View toggle working
- [ ] Empty state designed
- [ ] Loading skeleton implemented
- [ ] Error state with retry
- [ ] Responsive layout tested
- [ ] Navigation to chord player works
- [ ] Page added to navigation