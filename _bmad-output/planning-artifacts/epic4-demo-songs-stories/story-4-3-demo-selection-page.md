# Story 4.3: Demo Song Selection Page

**Epic:** Demo Songs & Public Access
**Priority:** P1 - High
**Size:** Medium
**Backend Required:** No (Frontend only)

## User Story

As a visitor,
I want to browse available demo songs,
So that I can choose one to try the app's features.

## Technical Context

Create a public page at `/demo` that displays available demo songs and allows visitors to select one without requiring authentication.

## Acceptance Criteria

### Page Access

**Given** an anonymous user navigates to `/demo`
**When** the page loads
**Then**:
- Page loads without requiring authentication
- No login prompt or redirect
- Page is publicly accessible

### Demo Song Display

**Given** the demo selection page loads
**When** demo songs are fetched
**Then**:
- Grid of demo song cards is displayed
- Each card shows: thumbnail/artwork, title, artist, description
- Cards are ordered by display_order from API
- Loading skeleton shown during fetch

### Demo Song Selection

**Given** the demo selection page is displayed
**When** a visitor clicks on a demo song card
**Then**:
- They are navigated to `/demo/{videoId}`
- Demo player loads with selected song
- No authentication required

### Empty State

**Given** no demo songs are active in the database
**When** a visitor navigates to `/demo`
**Then**:
- Friendly message: "Demo songs are temporarily unavailable"
- Sign up CTA is prominently displayed
- Contact information or help link provided

### Page Header

**Given** a visitor is on the demo selection page
**When** they view the page header
**Then**:
- Title: "Try Guitar App"
- Explanatory text: "Experience our chord detection and learning tools with these sample songs"
- "Sign up for unlimited songs" button visible

### Error State

**Given** the API fails to load demo songs
**When** the error occurs
**Then**:
- Error message displayed: "Failed to load demo songs"
- Retry button available
- Sign up CTA still visible

## Implementation Notes

### Page Component
```typescript
// product/app/pages/demo/index.tsx
import { useState, useEffect } from 'react';
import styled from 'styled-components';
import Link from 'next/link';
import { DemoSongCard } from '@product/app/demo/DemoSongCard';
import { LoadingSkeleton } from '@product/app/demo/LoadingSkeleton';
import { Button } from '@lib/ui/Button';

interface DemoSong {
  videoId: string;
  title: string;
  artist: string;
  description: string;
  duration: number;
}

export default function DemoPage() {
  const [songs, setSongs] = useState<DemoSong[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDemos = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/demo-songs');
      if (!response.ok) throw new Error('Failed to load');
      const data = await response.json();
      setSongs(data.songs);
    } catch (err) {
      setError('Failed to load demo songs. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDemos();
  }, []);

  return (
    <Container>
      <Header>
        <Title>Try Guitar App</Title>
        <Subtitle>
          Experience our chord detection and learning tools with these sample songs
        </Subtitle>
        <Link href="/auth/signup" passHref>
          <SignUpButton as="a">Sign up for unlimited songs</SignUpButton>
        </Link>
      </Header>

      {isLoading && <LoadingSkeleton count={3} />}

      {error && (
        <ErrorState>
          <ErrorMessage>{error}</ErrorMessage>
          <Button onClick={fetchDemos}>Retry</Button>
        </ErrorState>
      )}

      {!isLoading && !error && songs.length === 0 && (
        <EmptyState>
          <EmptyIcon>🎸</EmptyIcon>
          <EmptyTitle>Demo songs temporarily unavailable</EmptyTitle>
          <EmptyText>
            Sign up to analyze your own songs and access all features
          </EmptyText>
          <Link href="/auth/signup" passHref>
            <Button as="a">Create Free Account</Button>
          </Link>
        </EmptyState>
      )}

      {!isLoading && !error && songs.length > 0 && (
        <SongGrid>
          {songs.map(song => (
            <DemoSongCard key={song.videoId} song={song} />
          ))}
        </SongGrid>
      )}

      <Footer>
        <FooterText>
          Want to analyze your own songs?
        </FooterText>
        <Link href="/auth/signup" passHref>
          <FooterLink>Create a free account</FooterLink>
        </Link>
      </Footer>
    </Container>
  );
}

const Container = styled.div`
  max-width: 1000px;
  margin: 0 auto;
  padding: 48px 24px;
`;

const Header = styled.header`
  text-align: center;
  margin-bottom: 48px;
`;

const Title = styled.h1`
  font-size: 36px;
  font-weight: 600;
  margin: 0 0 16px;
`;

const Subtitle = styled.p`
  font-size: 18px;
  color: #888;
  margin: 0 0 24px;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
`;

const SignUpButton = styled(Button)`
  background: #4a9eff;
  color: white;
  padding: 12px 24px;
  font-size: 16px;
  text-decoration: none;
`;

const SongGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
`;

const ErrorState = styled.div`
  text-align: center;
  padding: 48px;
`;

const ErrorMessage = styled.p`
  color: #ff6b6b;
  margin-bottom: 16px;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 64px 24px;
`;

const EmptyIcon = styled.div`
  font-size: 64px;
  margin-bottom: 24px;
`;

const EmptyTitle = styled.h2`
  font-size: 24px;
  margin: 0 0 12px;
`;

const EmptyText = styled.p`
  color: #888;
  margin: 0 0 24px;
`;

const Footer = styled.footer`
  text-align: center;
  margin-top: 64px;
  padding-top: 32px;
  border-top: 1px solid #333;
`;

const FooterText = styled.p`
  color: #888;
  margin: 0 0 8px;
`;

const FooterLink = styled.a`
  color: #4a9eff;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
`;
```

### Demo Song Card Component
```typescript
// product/app/demo/DemoSongCard.tsx
import styled from 'styled-components';
import Link from 'next/link';

interface DemoSong {
  videoId: string;
  title: string;
  artist: string;
  description: string;
  duration: number;
}

interface DemoSongCardProps {
  song: DemoSong;
}

export const DemoSongCard = ({ song }: DemoSongCardProps) => {
  // Use a placeholder or demo-specific thumbnail
  const thumbnail = `/demo-thumbnails/${song.videoId}.jpg`;
  const fallbackThumbnail = '/demo-thumbnails/default.jpg';

  return (
    <Link href={`/demo/${song.videoId}`} passHref>
      <Card>
        <ThumbnailWrapper>
          <Thumbnail
            src={thumbnail}
            alt={song.title}
            onError={(e) => {
              (e.target as HTMLImageElement).src = fallbackThumbnail;
            }}
          />
          <Duration>{formatDuration(song.duration)}</Duration>
          <PlayOverlay>
            <PlayIcon>▶</PlayIcon>
          </PlayOverlay>
        </ThumbnailWrapper>
        <Content>
          <SongTitle>{song.title}</SongTitle>
          <Artist>{song.artist}</Artist>
          <Description>{song.description}</Description>
        </Content>
      </Card>
    </Link>
  );
};

const Card = styled.a`
  display: block;
  background: #1a1a1a;
  border-radius: 12px;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  transition: transform 0.2s, box-shadow 0.2s;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
  }
`;

const ThumbnailWrapper = styled.div`
  position: relative;
  aspect-ratio: 16/9;
`;

const Thumbnail = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const Duration = styled.span`
  position: absolute;
  bottom: 8px;
  right: 8px;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
`;

const PlayOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  opacity: 0;
  transition: opacity 0.2s;

  ${Card}:hover & {
    opacity: 1;
  }
`;

const PlayIcon = styled.div`
  width: 64px;
  height: 64px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: #000;
  padding-left: 4px; /* Center the play triangle */
`;

const Content = styled.div`
  padding: 16px;
`;

const SongTitle = styled.h3`
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 4px;
`;

const Artist = styled.p`
  font-size: 14px;
  color: #888;
  margin: 0 0 12px;
`;

const Description = styled.p`
  font-size: 14px;
  color: #aaa;
  margin: 0;
  line-height: 1.5;
`;

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
```

### Loading Skeleton
```typescript
// product/app/demo/LoadingSkeleton.tsx
import styled, { keyframes } from 'styled-components';

interface LoadingSkeletonProps {
  count: number;
}

export const LoadingSkeleton = ({ count }: LoadingSkeletonProps) => {
  return (
    <Grid>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i}>
          <SkeletonThumbnail />
          <SkeletonContent>
            <SkeletonTitle />
            <SkeletonArtist />
            <SkeletonDescription />
          </SkeletonContent>
        </SkeletonCard>
      ))}
    </Grid>
  );
};

const shimmer = keyframes`
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 24px;
`;

const SkeletonCard = styled.div`
  background: #1a1a1a;
  border-radius: 12px;
  overflow: hidden;
`;

const SkeletonBase = styled.div`
  background: linear-gradient(90deg, #222 0px, #333 50%, #222 100%);
  background-size: 200px 100%;
  animation: ${shimmer} 1.5s infinite;
`;

const SkeletonThumbnail = styled(SkeletonBase)`
  aspect-ratio: 16/9;
`;

const SkeletonContent = styled.div`
  padding: 16px;
`;

const SkeletonTitle = styled(SkeletonBase)`
  height: 24px;
  width: 70%;
  border-radius: 4px;
  margin-bottom: 8px;
`;

const SkeletonArtist = styled(SkeletonBase)`
  height: 16px;
  width: 40%;
  border-radius: 4px;
  margin-bottom: 16px;
`;

const SkeletonDescription = styled(SkeletonBase)`
  height: 40px;
  width: 100%;
  border-radius: 4px;
`;
```

## Testing Checklist
- [ ] Page accessible without authentication
- [ ] Demo songs load and display
- [ ] Cards show thumbnail, title, artist, description
- [ ] Clicking card navigates to demo player
- [ ] Loading skeleton displays during fetch
- [ ] Empty state shows when no demos
- [ ] Error state shows with retry button
- [ ] Sign up CTAs visible and functional
- [ ] Responsive layout works on mobile
- [ ] Play overlay appears on hover

## Dependencies
- API endpoint from Story 4.1
- Demo songs seeded from Story 4.2
- Next.js routing

## Definition of Done
- [ ] Demo page component created
- [ ] Song cards displaying correctly
- [ ] Navigation to demo player working
- [ ] Loading/error/empty states implemented
- [ ] Sign up CTAs in place
- [ ] Responsive design verified
- [ ] No authentication required
- [ ] SEO meta tags added