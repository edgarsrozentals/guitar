# Story 4.5: Marketing CTAs and Public Pages

**Epic:** Demo Songs & Public Access
**Priority:** P2 - Medium
**Size:** Medium
**Backend Required:** No (Frontend only)

## User Story

As a marketing team,
I want strategic sign-up prompts throughout the demo experience,
So that visitors convert to registered users.

## Technical Context

Add conversion-focused CTAs throughout the demo experience and create public marketing pages (How It Works, FAQ) to help visitors understand the product value.

## Acceptance Criteria

### Demo Selection Page CTAs

**Given** a visitor is on the demo selection page (`/demo`)
**When** they view the page
**Then**:
- "Sign Up Free" button visible in header
- Secondary CTA below demo grid: "Ready for your own songs? Create a free account"
- Both CTAs link to `/auth/signup`

### Timed Banner in Demo Player

**Given** a visitor is using the demo player
**When** they have watched for more than 60 seconds
**Then**:
- Non-intrusive banner appears at bottom
- Message: "Enjoying the demo? Sign up to analyze your own songs"
- Banner can be dismissed
- Dismissed banner won't reappear in same session

### Restricted Action Modals

**Given** a visitor is on the demo player
**When** they attempt a restricted action (re-analyze, add song, save settings)
**Then**:
- A modal appears explaining the feature requires an account
- Modal includes "Sign Up" and "Maybe Later" buttons
- "Sign Up" navigates to `/auth/signup?redirect=/demo/{videoId}`
- After sign-up, user returns to same demo

### How It Works Page

**Given** the public site exists
**When** a visitor navigates to `/how-it-works`
**Then** they see sections explaining:
1. **Chord Detection** - AI analyzes any song and detects chords
2. **Stem Separation** - Isolate instruments for practice
3. **Lyrics Sync** - Follow along with karaoke-style lyrics
4. **Learning Tools** - Practice at any speed, loop sections
5. Each section includes a CTA to try demo or sign up

### FAQ Page

**Given** the public site exists
**When** a visitor navigates to `/faq`
**Then** they see questions covering:
- What songs are supported?
- How accurate is the chord detection?
- Can I use my own audio files?
- Is there a free tier?
- How does stem separation work?
- What chord types are detected?
- Bottom CTA: "Still have questions? Sign up and try it free"

### Redirect Preservation

**Given** a visitor clicks any "Sign Up" CTA
**When** they complete registration
**Then**:
- They are redirected back to their previous location
- If from demo player, return to same demo
- If from demo selection, go to library

## Implementation Notes

### Timed Banner Component
```typescript
// product/app/demo/TimedSignUpBanner.tsx
import { useState, useEffect } from 'react';
import styled from 'styled-components';
import Link from 'next/link';

const SHOW_AFTER_SECONDS = 60;
const STORAGE_KEY = 'demo-banner-dismissed';

export const TimedSignUpBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed this session
    if (sessionStorage.getItem(STORAGE_KEY)) {
      return;
    }

    const timer = setTimeout(() => {
      setIsVisible(true);
    }, SHOW_AFTER_SECONDS * 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
    sessionStorage.setItem(STORAGE_KEY, 'true');
  };

  if (!isVisible || isDismissed) {
    return null;
  }

  return (
    <Banner>
      <BannerContent>
        <BannerText>
          Enjoying the demo? Sign up to analyze your own songs
        </BannerText>
        <Link href="/auth/signup" passHref>
          <SignUpButton>Sign Up Free</SignUpButton>
        </Link>
      </BannerContent>
      <DismissButton onClick={handleDismiss}>×</DismissButton>
    </Banner>
  );
};

const Banner = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(90deg, #1a1a2e 0%, #16213e 100%);
  padding: 16px 24px;
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
  border-top: 1px solid #333;
  animation: slideUp 0.3s ease-out;

  @keyframes slideUp {
    from {
      transform: translateY(100%);
    }
    to {
      transform: translateY(0);
    }
  }
`;

const BannerContent = styled.div`
  display: flex;
  align-items: center;
  gap: 24px;
`;

const BannerText = styled.span`
  color: #fff;
  font-size: 16px;
`;

const SignUpButton = styled.a`
  background: #4a9eff;
  color: white;
  padding: 10px 24px;
  border-radius: 6px;
  text-decoration: none;
  font-weight: 500;
  transition: background 0.2s;

  &:hover {
    background: #3a8eef;
  }
`;

const DismissButton = styled.button`
  position: absolute;
  right: 16px;
  background: none;
  border: none;
  color: #888;
  font-size: 24px;
  cursor: pointer;
  padding: 8px;

  &:hover {
    color: #fff;
  }
`;
```

### Sign Up Required Modal
```typescript
// product/app/demo/SignUpRequiredModal.tsx
import styled from 'styled-components';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { Dialog } from '@lib/ui/Dialog';
import { Button } from '@lib/ui/Button';

interface SignUpRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: string;
}

const FEATURE_MESSAGES: Record<string, string> = {
  reanalyze: 'Re-analyze chords with different settings',
  save: 'Save songs to your personal library',
  addSong: 'Add your own songs for analysis',
  settings: 'Customize analysis settings'
};

export const SignUpRequiredModal = ({
  isOpen,
  onClose,
  feature
}: SignUpRequiredModalProps) => {
  const router = useRouter();
  const currentPath = router.asPath;

  const message = FEATURE_MESSAGES[feature] || 'Access this feature';

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Create a Free Account">
      <Content>
        <Icon>🎸</Icon>
        <Message>
          To <strong>{message}</strong>, you need a free account.
        </Message>
        <Benefits>
          <Benefit>✓ Analyze unlimited songs</Benefit>
          <Benefit>✓ Save your progress</Benefit>
          <Benefit>✓ Access all features</Benefit>
        </Benefits>
      </Content>
      <Actions>
        <Button variant="ghost" onClick={onClose}>
          Maybe Later
        </Button>
        <Link
          href={`/auth/signup?redirect=${encodeURIComponent(currentPath)}`}
          passHref
        >
          <Button as="a" variant="primary">
            Sign Up Free
          </Button>
        </Link>
      </Actions>
    </Dialog>
  );
};

const Content = styled.div`
  padding: 24px 0;
  text-align: center;
`;

const Icon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
`;

const Message = styled.p`
  font-size: 16px;
  color: #ccc;
  margin: 0 0 24px;

  strong {
    color: #fff;
  }
`;

const Benefits = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
  text-align: left;
  display: inline-block;
`;

const Benefit = styled.li`
  color: #4a9eff;
  margin-bottom: 8px;
  font-size: 14px;
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #333;
`;
```

### How It Works Page
```typescript
// product/app/pages/how-it-works.tsx
import styled from 'styled-components';
import Link from 'next/link';
import { Button } from '@lib/ui/Button';

const FEATURES = [
  {
    icon: '🎸',
    title: 'AI Chord Detection',
    description: 'Our AI analyzes any song and detects the chords in real-time. See chord changes synchronized with the music as you play along.',
  },
  {
    icon: '🎚️',
    title: 'Stem Separation',
    description: 'Isolate vocals, drums, bass, and other instruments. Practice with just the backing track or focus on specific parts.',
  },
  {
    icon: '🎤',
    title: 'Lyrics Sync',
    description: 'Follow along with karaoke-style lyrics that highlight each word as it\'s sung. Perfect for learning vocal timing.',
  },
  {
    icon: '⏱️',
    title: 'Practice Tools',
    description: 'Slow down difficult sections, loop parts you want to master, and use the metronome to build your timing.',
  },
  {
    icon: '🎹',
    title: 'CAGED System',
    description: 'See chord shapes in multiple positions using the CAGED system. Find the fingering that works best for you.',
  },
];

export default function HowItWorksPage() {
  return (
    <Container>
      <Hero>
        <Title>How Guitar App Works</Title>
        <Subtitle>
          The smart way to learn any song on guitar
        </Subtitle>
      </Hero>

      <Features>
        {FEATURES.map((feature, index) => (
          <Feature key={index}>
            <FeatureIcon>{feature.icon}</FeatureIcon>
            <FeatureContent>
              <FeatureTitle>{feature.title}</FeatureTitle>
              <FeatureDescription>{feature.description}</FeatureDescription>
            </FeatureContent>
          </Feature>
        ))}
      </Features>

      <CTASection>
        <CTATitle>Ready to try it?</CTATitle>
        <CTAButtons>
          <Link href="/demo" passHref>
            <Button as="a" variant="ghost" size="large">
              Try Demo Songs
            </Button>
          </Link>
          <Link href="/auth/signup" passHref>
            <Button as="a" variant="primary" size="large">
              Sign Up Free
            </Button>
          </Link>
        </CTAButtons>
      </CTASection>
    </Container>
  );
}

const Container = styled.div`
  max-width: 800px;
  margin: 0 auto;
  padding: 48px 24px;
`;

const Hero = styled.header`
  text-align: center;
  margin-bottom: 64px;
`;

const Title = styled.h1`
  font-size: 42px;
  margin: 0 0 16px;
`;

const Subtitle = styled.p`
  font-size: 20px;
  color: #888;
  margin: 0;
`;

const Features = styled.div`
  display: flex;
  flex-direction: column;
  gap: 48px;
  margin-bottom: 64px;
`;

const Feature = styled.div`
  display: flex;
  gap: 24px;
  align-items: flex-start;
`;

const FeatureIcon = styled.div`
  font-size: 48px;
  flex-shrink: 0;
`;

const FeatureContent = styled.div``;

const FeatureTitle = styled.h2`
  font-size: 24px;
  margin: 0 0 8px;
`;

const FeatureDescription = styled.p`
  font-size: 16px;
  color: #aaa;
  line-height: 1.6;
  margin: 0;
`;

const CTASection = styled.section`
  text-align: center;
  padding: 48px;
  background: #1a1a1a;
  border-radius: 16px;
`;

const CTATitle = styled.h2`
  font-size: 28px;
  margin: 0 0 24px;
`;

const CTAButtons = styled.div`
  display: flex;
  justify-content: center;
  gap: 16px;
`;
```

### FAQ Page
```typescript
// product/app/pages/faq.tsx
import { useState } from 'react';
import styled from 'styled-components';
import Link from 'next/link';
import { Button } from '@lib/ui/Button';

const FAQS = [
  {
    question: 'What songs can I analyze?',
    answer: 'You can analyze any song from a video URL. The AI works best with songs that have clear chord progressions - pop, rock, folk, blues, and similar genres typically get the most accurate results.'
  },
  {
    question: 'How accurate is the chord detection?',
    answer: 'Our AI uses multiple detection algorithms and typically achieves 80-90% accuracy on common chord types. Complex jazz chords or heavily distorted music may be less accurate. You can compare results from different detection libraries.'
  },
  // ... more FAQs
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <Container>
      <Title>Frequently Asked Questions</Title>

      <FAQList>
        {FAQS.map((faq, index) => (
          <FAQItem key={index}>
            <Question onClick={() => setOpenIndex(openIndex === index ? null : index)}>
              {faq.question}
              <Arrow $isOpen={openIndex === index}>▼</Arrow>
            </Question>
            {openIndex === index && (
              <Answer>{faq.answer}</Answer>
            )}
          </FAQItem>
        ))}
      </FAQList>

      <CTASection>
        <CTAText>Still have questions? Try it yourself!</CTAText>
        <Link href="/auth/signup" passHref>
          <Button as="a" variant="primary">
            Sign Up Free
          </Button>
        </Link>
      </CTASection>
    </Container>
  );
}
```

## Testing Checklist
- [ ] Header sign-up CTA on demo page
- [ ] Footer CTA on demo page
- [ ] Timed banner appears after 60 seconds
- [ ] Banner can be dismissed
- [ ] Dismissed banner doesn't reappear
- [ ] Restricted action modal shows correctly
- [ ] Modal "Sign Up" preserves redirect
- [ ] How It Works page renders correctly
- [ ] FAQ accordion works
- [ ] All CTAs link to correct signup URL
- [ ] Redirect works after signup

## Dependencies
- Auth signup page with redirect support
- Demo player integration
- Dialog component from @lib/ui

## Definition of Done
- [ ] Timed banner implemented
- [ ] Sign-up required modal created
- [ ] How It Works page created
- [ ] FAQ page created
- [ ] All CTAs functional
- [ ] Redirect preservation working
- [ ] Session storage for banner dismiss
- [ ] Mobile responsive verified