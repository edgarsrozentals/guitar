# Story 3.2: Display Song Metadata and Status Indicators

**Epic:** Song Library UI
**Priority:** P1 - High
**Size:** Medium
**Backend Required:** No (Frontend only)

## User Story

As an authenticated user,
I want to see detailed metadata and status indicators for each song,
So that I can quickly understand what data is available for each song.

## Technical Context

Enhance the song cards and list items to display comprehensive metadata including key, BPM, and visual indicators for available features (chords, stems, lyrics).

## Acceptance Criteria

### Basic Metadata Display

**Given** I am viewing my song library
**When** I look at a song card or list item
**Then**:
- Song title is prominently displayed (truncated if too long)
- Duration is formatted as MM:SS
- Artist name is shown (if available)
- Thumbnail image from video is displayed

### Music Theory Metadata

**Given** a song has been analyzed
**When** I view that song in the library
**Then**:
- Detected key is shown (e.g., "A minor", "C major")
- Detected BPM is shown (rounded to nearest integer)
- If key/BPM not detected, show dash or "—"

### Feature Indicators

**Given** a song has stems separated
**When** I view that song's card/item
**Then**:
- I see a stems indicator icon (🎚️ or similar)
- Icon has a tooltip: "Stems available"

**Given** a song has lyrics generated
**When** I view that song's card/item
**Then**:
- I see a lyrics indicator icon (🎤 or similar)
- Icon has a tooltip: "Lyrics available"

**Given** a song has chord analysis
**When** I view that song's card/item
**Then**:
- I see a chords indicator icon (🎸 or similar)
- Icon has a tooltip showing which libraries (e.g., "Chords: Essentia, Madmom")

### Click to Open

**Given** I am viewing a song in the library
**When** I click on the song card or list item
**Then**:
- I am navigated to `/chords/youtube?v={videoId}`
- The chord player loads with the song
- Click target is the entire card (not just title)

### Processing State

**Given** a song is still being processed
**When** I view that song in the library
**Then**:
- A loading indicator replaces metadata
- Text shows "Processing..."
- Song is not clickable until processing completes

## Implementation Notes

### Metadata Display in Card
```typescript
// product/app/library/SongCard.tsx (enhanced)
interface Song {
  id: string;
  videoId: string;
  title: string;
  artist?: string;
  duration: number;
  key?: { root: string; scale: string };
  bpm?: number;
  hasChords: boolean;
  hasStems: boolean;
  hasLyrics: boolean;
  chordLibraries?: string[];
  isProcessing?: boolean;
}

export const SongCard = ({ song, onDelete }: SongCardProps) => {
  if (song.isProcessing) {
    return (
      <Card>
        <Thumbnail src={getThumbnail(song.videoId)} alt={song.title} />
        <Content>
          <SongTitle>{song.title}</SongTitle>
          <ProcessingState>
            <Spinner />
            Processing...
          </ProcessingState>
        </Content>
      </Card>
    );
  }

  return (
    <Card>
      <Link href={`/chords/youtube?v=${song.videoId}`} passHref>
        <CardLink>
          <Thumbnail src={getThumbnail(song.videoId)} alt={song.title} />
          <Content>
            <SongTitle title={song.title}>{song.title}</SongTitle>
            {song.artist && <Artist>{song.artist}</Artist>}

            <MetadataRow>
              <Duration>{formatDuration(song.duration)}</Duration>
              <KeyBpm>
                {song.key ? `${song.key.root} ${song.key.scale}` : '—'}
                {' • '}
                {song.bpm ? `${Math.round(song.bpm)} BPM` : '—'}
              </KeyBpm>
            </MetadataRow>

            <IndicatorRow>
              <FeatureIndicators song={song} />
            </IndicatorRow>
          </Content>
        </CardLink>
      </Link>
      {onDelete && <DeleteButton onClick={onDelete}>🗑️</DeleteButton>}
    </Card>
  );
};

const MetadataRow = styled.div`
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #888;
  margin: 8px 0;
`;

const KeyBpm = styled.span`
  text-transform: capitalize;
`;

const ProcessingState = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #888;
  font-size: 13px;
  padding: 12px 0;
`;
```

### Feature Indicators Component
```typescript
// product/app/library/FeatureIndicators.tsx
import styled from 'styled-components';
import { Tooltip } from '@lib/ui/Tooltip';

interface FeatureIndicatorsProps {
  song: {
    hasChords: boolean;
    hasStems: boolean;
    hasLyrics: boolean;
    chordLibraries?: string[];
  };
}

export const FeatureIndicators = ({ song }: FeatureIndicatorsProps) => {
  return (
    <Indicators>
      {song.hasChords && (
        <Tooltip
          content={
            song.chordLibraries?.length
              ? `Chords: ${song.chordLibraries.join(', ')}`
              : 'Chords available'
          }
        >
          <Indicator $active>
            <ChordsIcon />
          </Indicator>
        </Tooltip>
      )}
      {!song.hasChords && (
        <Indicator $active={false}>
          <ChordsIcon />
        </Indicator>
      )}

      {song.hasStems && (
        <Tooltip content="Stems available">
          <Indicator $active>
            <StemsIcon />
          </Indicator>
        </Tooltip>
      )}
      {!song.hasStems && (
        <Indicator $active={false}>
          <StemsIcon />
        </Indicator>
      )}

      {song.hasLyrics && (
        <Tooltip content="Lyrics available">
          <Indicator $active>
            <LyricsIcon />
          </Indicator>
        </Tooltip>
      )}
      {!song.hasLyrics && (
        <Indicator $active={false}>
          <LyricsIcon />
        </Indicator>
      )}
    </Indicators>
  );
};

const Indicators = styled.div`
  display: flex;
  gap: 8px;
`;

const Indicator = styled.span<{ $active: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  background: ${({ $active }) => ($active ? 'rgba(255,255,255,0.1)' : 'transparent')};
  opacity: ${({ $active }) => ($active ? 1 : 0.3)};

  svg {
    width: 14px;
    height: 14px;
  }
`;

// Icon components
const ChordsIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.59 3H4.41A1.41 1.41 0 003 4.41v15.18A1.41 1.41 0 004.41 21h15.18A1.41 1.41 0 0021 19.59V4.41A1.41 1.41 0 0019.59 3zM8 17a1 1 0 111-1 1 1 0 01-1 1zm0-4a1 1 0 111-1 1 1 0 01-1 1zm0-4a1 1 0 111-1 1 1 0 01-1 1zm4 8a1 1 0 111-1 1 1 0 01-1 1zm0-4a1 1 0 111-1 1 1 0 01-1 1zm4 4a1 1 0 111-1 1 1 0 01-1 1z"/>
  </svg>
);

const StemsIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M6 4v16h2V4H6zm5 4v12h2V8h-2zm5-2v14h2V6h-2z"/>
  </svg>
);

const LyricsIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 3a9 9 0 100 18 9 9 0 000-18zm0 16a7 7 0 110-14 7 7 0 010 14zm3-7a3 3 0 11-6 0 3 3 0 016 0z"/>
  </svg>
);
```

### List Item with Metadata
```typescript
// product/app/library/SongListItem.tsx
import styled from 'styled-components';
import Link from 'next/link';
import { Song } from './types';
import { FeatureIndicators } from './FeatureIndicators';

interface SongListItemProps {
  song: Song;
  onDelete?: () => void;
}

export const SongListItem = ({ song, onDelete }: SongListItemProps) => {
  const thumbnail = `https://img.youtube.com/vi/${song.videoId}/default.jpg`;

  return (
    <ListItem>
      <Link href={`/chords/youtube?v=${song.videoId}`} passHref>
        <ItemLink>
          <Thumbnail src={thumbnail} alt="" />
          <TitleArtist>
            <Title>{song.title}</Title>
            {song.artist && <Artist>{song.artist}</Artist>}
          </TitleArtist>
          <Duration>{formatDuration(song.duration)}</Duration>
          <Key>{song.key ? `${song.key.root} ${song.key.scale}` : '—'}</Key>
          <Bpm>{song.bpm ? `${Math.round(song.bpm)}` : '—'}</Bpm>
          <FeatureIndicators song={song} />
        </ItemLink>
      </Link>
      {onDelete && (
        <DeleteButton onClick={onDelete}>🗑️</DeleteButton>
      )}
    </ListItem>
  );
};

const ListItem = styled.div`
  display: flex;
  align-items: center;
  background: #1a1a1a;
  border-radius: 8px;
  padding: 8px;
  margin-bottom: 8px;
  transition: background 0.2s;

  &:hover {
    background: #222;
  }
`;

const ItemLink = styled.a`
  display: flex;
  align-items: center;
  flex: 1;
  gap: 16px;
  text-decoration: none;
  color: inherit;
`;

const Thumbnail = styled.img`
  width: 60px;
  height: 45px;
  object-fit: cover;
  border-radius: 4px;
`;

const TitleArtist = styled.div`
  flex: 1;
  min-width: 0;
`;

const Title = styled.div`
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const Artist = styled.div`
  font-size: 12px;
  color: #888;
`;

const Duration = styled.span`
  font-size: 13px;
  color: #888;
  width: 50px;
  text-align: right;
`;

const Key = styled.span`
  font-size: 13px;
  color: #888;
  width: 80px;
  text-transform: capitalize;
`;

const Bpm = styled.span`
  font-size: 13px;
  color: #888;
  width: 50px;
  text-align: right;
`;

const DeleteButton = styled.button`
  background: none;
  border: none;
  padding: 8px;
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.2s;

  &:hover {
    opacity: 1;
  }
`;
```

## Testing Checklist
- [ ] Song title displays and truncates properly
- [ ] Artist displays when available
- [ ] Duration formatted correctly
- [ ] Key displays in correct format
- [ ] BPM displays as rounded integer
- [ ] Dash shown when key/BPM missing
- [ ] Chords indicator shows when has chords
- [ ] Stems indicator shows when has stems
- [ ] Lyrics indicator shows when has lyrics
- [ ] Tooltips display on hover
- [ ] Clicking song navigates to player
- [ ] Processing state displays correctly

## Dependencies
- Tooltip component from @lib/ui
- Song data from API includes metadata fields
- Icons for indicators

## Definition of Done
- [ ] Metadata displays in grid cards
- [ ] Metadata displays in list items
- [ ] Feature indicators working with tooltips
- [ ] Key/BPM formatting correct
- [ ] Processing state implemented
- [ ] Click navigation working
- [ ] Responsive layout verified
- [ ] Accessibility attributes added