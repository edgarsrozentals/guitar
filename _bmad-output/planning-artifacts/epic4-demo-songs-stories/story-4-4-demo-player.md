# Story 4.4: Read-Only Demo Player Experience

**Epic:** Demo Songs & Public Access
**Priority:** P1 - High
**Size:** Large
**Backend Required:** No (Frontend only, uses demo API)

## User Story

As a visitor,
I want to use the full chord player with demo songs,
So that I can evaluate the app's features before signing up.

## Technical Context

Create a demo player at `/demo/{videoId}` that provides full playback functionality but disables modification features. This reuses most of the existing chord player components.

## Acceptance Criteria

### Demo Player Loading

**Given** an anonymous user navigates to `/demo/{videoId}`
**When** the demo song exists and is active
**Then**:
- Chord player loads with full functionality
- Video/audio plays from demo storage
- Chord timeline displays pre-analyzed chords
- Fretboard visualization shows chord shapes
- No login required

### Playback Features (Enabled)

**Given** the demo player is loaded
**When** a visitor interacts with playback
**Then** the following work normally:
- Play/pause controls
- Seek on timeline
- Volume control
- Speed control (50%, 75%, 100%)
- Stem mixer (if stems available)
- Lyrics display (if lyrics available)
- Chord shape selection (CAGED positions)

### Modification Features (Disabled)

**Given** the demo player is loaded
**When** a visitor attempts to modify settings
**Then**:
- "Re-analyze chords" button is disabled/hidden
- Library switcher (Essentia/Madmom/BTC) shows current but can't re-analyze
- "Save to Library" button shows sign-up prompt
- Beat sync detection toggle is disabled

### Disabled Feature Tooltips

**Given** a disabled feature is hovered
**When** the tooltip appears
**Then**:
- Message: "Sign up to customize analysis settings"
- Tooltip includes sign-up link

### Demo Not Found

**Given** a visitor navigates to `/demo/{invalidVideoId}`
**When** the page loads
**Then**:
- "Demo not found" message displays
- Link to `/demo` (demo selection) provided
- Sign up CTA displayed

### Demo Mode Indicator

**Given** the demo player is loaded
**When** viewing the player
**Then**:
- A subtle "Demo Mode" badge is visible
- Badge indicates limited functionality
- Badge links to sign-up page

### All Chord Libraries Available

**Given** demo songs have pre-analyzed data for all libraries
**When** a visitor views the demo
**Then**:
- Can switch between Essentia, Madmom, BTC views
- Each library's chord data displays correctly
- No re-analysis needed (data pre-loaded)

## Implementation Notes

### Demo Player Page
```typescript
// product/app/pages/demo/[videoId].tsx
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import styled from 'styled-components';
import { ChordPlayer } from '@product/app/chords/ChordPlayer';
import { DemoModeBanner } from '@product/app/demo/DemoModeBanner';
import { DemoNotFound } from '@product/app/demo/DemoNotFound';

interface DemoSong {
  videoId: string;
  title: string;
  artist: string;
  audioUrl: string;
  chords: Record<string, any>;
  stems: Record<string, string>;
  lyrics: { lrcContent: string } | null;
  tempo: { bpm: number; beats: number[] };
  key: { root: string; scale: string };
  duration: number;
}

export default function DemoPlayerPage() {
  const router = useRouter();
  const { videoId } = router.query;
  const [song, setSong] = useState<DemoSong | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!videoId) return;

    const fetchDemo = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/demo-songs/${videoId}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError('not_found');
          } else {
            throw new Error('Failed to load');
          }
          return;
        }
        const data = await response.json();
        setSong(data);
      } catch (err) {
        setError('load_failed');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDemo();
  }, [videoId]);

  if (isLoading) {
    return <LoadingState />;
  }

  if (error === 'not_found' || !song) {
    return <DemoNotFound />;
  }

  if (error === 'load_failed') {
    return <ErrorState onRetry={() => router.reload()} />;
  }

  return (
    <Container>
      <DemoModeBanner />

      <ChordPlayer
        mode="demo"
        song={{
          videoId: song.videoId,
          title: song.title,
          artist: song.artist,
          audioUrl: song.audioUrl,
          duration: song.duration
        }}
        preloadedData={{
          chords: song.chords,
          stems: song.stems,
          lyrics: song.lyrics,
          tempo: song.tempo,
          key: song.key
        }}
        disabledFeatures={[
          'reanalyze',
          'saveToLibrary',
          'beatSyncDetection',
          'deleteAnalysis'
        ]}
      />
    </Container>
  );
}

const Container = styled.div`
  min-height: 100vh;
`;
```

### Demo Mode Banner
```typescript
// product/app/demo/DemoModeBanner.tsx
import styled from 'styled-components';
import Link from 'next/link';

export const DemoModeBanner = () => {
  return (
    <Banner>
      <BannerContent>
        <DemoLabel>Demo Mode</DemoLabel>
        <BannerText>
          You're viewing a demo song.
          <Link href="/auth/signup" passHref>
            <SignUpLink>Sign up</SignUpLink>
          </Link>
          {' '}to analyze your own songs.
        </BannerText>
      </BannerContent>
      <Link href="/demo" passHref>
        <BrowseLink>Browse more demos</BrowseLink>
      </Link>
    </Banner>
  );
};

const Banner = styled.div`
  background: linear-gradient(90deg, #1a1a2e 0%, #16213e 100%);
  padding: 12px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid #333;
`;

const BannerContent = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const DemoLabel = styled.span`
  background: #4a9eff;
  color: white;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
`;

const BannerText = styled.span`
  color: #aaa;
  font-size: 14px;
`;

const SignUpLink = styled.a`
  color: #4a9eff;
  text-decoration: none;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
`;

const BrowseLink = styled.a`
  color: #888;
  text-decoration: none;
  font-size: 14px;

  &:hover {
    color: #fff;
  }
`;
```

### Demo Not Found
```typescript
// product/app/demo/DemoNotFound.tsx
import styled from 'styled-components';
import Link from 'next/link';
import { Button } from '@lib/ui/Button';

export const DemoNotFound = () => {
  return (
    <Container>
      <Icon>🎸</Icon>
      <Title>Demo Not Found</Title>
      <Message>
        This demo song doesn't exist or has been removed.
      </Message>
      <Actions>
        <Link href="/demo" passHref>
          <Button as="a" variant="primary">
            Browse Demo Songs
          </Button>
        </Link>
        <Link href="/auth/signup" passHref>
          <Button as="a" variant="ghost">
            Sign Up for Full Access
          </Button>
        </Link>
      </Actions>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  padding: 24px;
  text-align: center;
`;

const Icon = styled.div`
  font-size: 64px;
  margin-bottom: 24px;
`;

const Title = styled.h1`
  font-size: 28px;
  margin: 0 0 12px;
`;

const Message = styled.p`
  color: #888;
  margin: 0 0 32px;
  max-width: 400px;
`;

const Actions = styled.div`
  display: flex;
  gap: 16px;
`;
```

### Chord Player Updates for Demo Mode
```typescript
// product/app/chords/ChordPlayer.tsx (partial)
interface ChordPlayerProps {
  mode: 'normal' | 'demo';
  song: {
    videoId: string;
    title: string;
    artist?: string;
    audioUrl: string;
    duration: number;
  };
  preloadedData?: {
    chords: Record<string, any>;
    stems: Record<string, string>;
    lyrics: { lrcContent: string } | null;
    tempo: { bpm: number; beats: number[] };
    key: { root: string; scale: string };
  };
  disabledFeatures?: string[];
}

export const ChordPlayer = ({
  mode,
  song,
  preloadedData,
  disabledFeatures = []
}: ChordPlayerProps) => {
  const isDemo = mode === 'demo';
  const isDisabled = (feature: string) => disabledFeatures.includes(feature);

  // Use preloaded data in demo mode, otherwise fetch from API
  const chords = isDemo ? preloadedData?.chords : fetchedChords;
  const stems = isDemo ? preloadedData?.stems : fetchedStems;
  // ... etc

  return (
    <PlayerContainer>
      {/* Controls Bar */}
      <ControlsBar>
        {/* Analyze button - disabled in demo */}
        <AnalyzeButton
          disabled={isDisabled('reanalyze')}
          title={isDisabled('reanalyze') ? 'Sign up to analyze songs' : ''}
        >
          Analyze
        </AnalyzeButton>

        {/* Library selector - view only in demo */}
        <LibrarySelector
          value={selectedLibrary}
          onChange={setSelectedLibrary}
          options={Object.keys(chords)}
          showReanalyze={!isDisabled('reanalyze')}
        />

        {/* Save button - shows sign up in demo */}
        {isDisabled('saveToLibrary') ? (
          <SignUpPromptButton href="/auth/signup">
            Sign up to save songs
          </SignUpPromptButton>
        ) : (
          <SaveButton onClick={handleSave}>
            Save to Library
          </SaveButton>
        )}
      </ControlsBar>

      {/* Video/Audio Player */}
      <VideoPlayer src={song.audioUrl} />

      {/* Chord Timeline */}
      <ChordTimeline
        chords={chords[selectedLibrary]}
        tempo={isDemo ? preloadedData?.tempo : tempo}
      />

      {/* Fretboard */}
      <Fretboard chord={currentChord} />

      {/* Stems Panel */}
      {stems && Object.keys(stems).length > 0 && (
        <StemsPanel stems={stems} />
      )}

      {/* Lyrics Panel */}
      {lyrics && (
        <LyricsPanel lyrics={lyrics} />
      )}
    </PlayerContainer>
  );
};
```

## Testing Checklist
- [ ] Demo player loads without authentication
- [ ] Audio plays from demo storage
- [ ] Play/pause/seek work correctly
- [ ] Volume and speed controls work
- [ ] Chord timeline displays correctly
- [ ] Fretboard shows chord shapes
- [ ] Stems mixer works (if available)
- [ ] Lyrics display syncs (if available)
- [ ] Can switch between chord libraries
- [ ] Analyze button is disabled
- [ ] Save button shows sign-up prompt
- [ ] Demo mode banner displays
- [ ] Demo not found page works
- [ ] Mobile responsive

## Dependencies
- Demo API from Story 4.1
- Demo content from Story 4.2
- Existing ChordPlayer components

## Definition of Done
- [ ] Demo player page created
- [ ] Full playback functionality working
- [ ] Modification features disabled
- [ ] Demo mode banner implemented
- [ ] Sign-up prompts in place
- [ ] Not found page created
- [ ] Preloaded data integration working
- [ ] Mobile responsive verified