---
title: 'User Authentication & Per-Song Settings'
slug: 'user-auth-song-settings'
created: '2026-01-03'
status: 'ready-for-dev'
stepsCompleted: [1, 2, 3, 4]
tech_stack:
  - 'Next.js 15 (Pages Router)'
  - 'React 19'
  - 'TypeScript'
  - 'styled-components'
  - '@supabase/supabase-js ^2.x'
  - '@supabase/ssr ^0.x'
files_to_modify:
  - 'product/app/pages/_app.tsx'
  - 'product/app/layout/WebsiteLayout.tsx'
  - 'product/app/chords/state/fretboardSettings.tsx'
  - 'product/app/chords/youtube/YouTubeChordPlayer.tsx'
files_to_create:
  - 'product/app/lib/supabase/client.ts'
  - 'product/app/lib/supabase/server.ts'
  - 'product/app/state/auth/AuthProvider.tsx'
  - 'product/app/state/settings/useSongSettings.ts'
  - 'product/app/state/settings/useUserPreferences.ts'
  - 'product/app/components/UserAvatar.tsx'
  - 'product/app/components/UserDropdown.tsx'
  - 'product/app/pages/login.tsx'
  - 'product/app/pages/signup.tsx'
  - 'product/app/pages/profile.tsx'
  - 'product/app/pages/auth/callback.tsx'
  - 'product/app/.env.local'
code_patterns:
  - 'React Context + Hooks for state (see fretboardSettings.tsx pattern)'
  - 'styled-components with @lib/ui components'
  - 'Next.js Pages Router (not App Router)'
  - 'HStack/VStack layouts from @lib/ui/css/stack'
  - 'Button kind="ghost" for nav items'
test_patterns: []
---

# Tech-Spec: User Authentication & Per-Song Settings

**Created:** 2026-01-03
**Status:** Ready for Review

## Overview

### Problem Statement

No user system exists in the guitar app. All user settings (stem volumes, scale overlay configuration, library preferences, fretboard display options) are stored in React state and lost on page refresh. The app cannot be shared with testers because there's no way for users to save their personalized settings per song.

### Solution

Implement Supabase Cloud authentication (email/password + Gmail OAuth) with structured database tables for:
1. User profiles and authentication
2. Global user preferences (fretboard display settings)
3. Per-song settings (stem volumes, scale overlay, library preference)

Add user avatar to the top-right navigation with dropdown for profile/logout. Create basic login, signup, and profile pages.

### Scope

**In Scope:**
- Supabase Cloud project setup (auth + database)
- Email/password authentication flow
- Gmail OAuth authentication flow
- Login page with both auth options
- Signup page with email verification
- Profile page (display name, email, change password)
- User avatar component in top-right navigation
- Dropdown menu (profile link, logout)
- Global user preferences table (fretboard display settings)
- Per-song settings table (stem volumes, scale overlay, library preference, active tab)
- Auto-save settings on change
- Auto-load settings when opening a song
- Auth context/provider for app-wide auth state

**Out of Scope:**
- Other OAuth providers (GitHub, Discord, Apple, etc.)
- Custom avatar upload (use Gmail photo or generate initials)
- Guitar-specific preferences (tuning, number of strings)
- Cloud deployment of the application
- Real-time multi-device sync
- Song/file storage in Supabase (just settings for now)
- Social features (sharing, following)
- Admin dashboard

## Context for Development

### Codebase Patterns

**State Management:** React Context + Hooks pattern throughout. No Redux.
- `ChordsProvider` in `product/app/chords/state/chords.tsx`
- `FretboardSettingsProvider` in `product/app/chords/state/fretboardSettings.tsx`
- Pattern: Create context, provider component with useState, export hook

**Styling:** styled-components with `@lib/ui` component library
- Use existing Button, Input components from `@lib/ui`
- Follow HStack/VStack layout patterns from `@lib/ui/css/stack`
- Use `getColor()` from `@lib/ui/theme/getters` for theme colors

**Routing:** Next.js 15 Pages Router (NOT App Router)
- Pages in `product/app/pages/` directory
- `_app.tsx` wraps all pages with providers
- Current provider order: DarkLightThemeProvider > WebsiteLayout

**Navigation:** `WebsiteLayout.tsx` structure:
- Line 77-80: Logo (left side)
- Line 82-95: `renderTopbarItems()` returns HStack with nav items
- Line 84: Empty `<div />` - placeholder before nav items
- **Avatar insertion point**: After the HStack (line 93), add avatar component

### Files to Reference

| File | Purpose | Key Lines |
| ---- | ------- | --------- |
| `product/app/pages/_app.tsx` | Provider wrapper - add AuthProvider here | L24-28 |
| `product/app/layout/WebsiteLayout.tsx` | Nav layout - add avatar after HStack | L82-95 |
| `product/app/chords/state/fretboardSettings.tsx` | Context provider pattern to follow | L73-151 |
| `product/app/chords/youtube/YouTubeChordPlayer.tsx` | All song settings (useState calls) | L1234-1297 |
| `lib/ui/buttons/Button.tsx` | Button component | - |
| `lib/ui/css/stack.tsx` | HStack/VStack components | - |

### Technical Decisions

1. **Supabase Cloud** - User's existing cloud instance, not local
2. **Structured tables** - Separate columns for each setting (not JSON blob)
3. **Settings extraction** - Create `useSongSettings` hook consumed by YouTubeChordPlayer
4. **Auth middleware** - Use Next.js middleware for protected routes (profile page only)
5. **Session handling** - `@supabase/ssr` for SSR-compatible sessions
6. **Debounced saves** - Settings auto-save with 500ms debounce to avoid API spam

### Song Settings to Persist (from YouTubeChordPlayer investigation)

| Setting | Type | Line | Default |
| ------- | ---- | ---- | ------- |
| `activeTab` | MediaTab | 1241 | 'audio' |
| `selectedStems` | Set<StemType> | 1245 | empty |
| `stemVolumes` | Record<string, number> | 1248 | per-stem defaults |
| `stemMuted` | Record<string, boolean> | 1256 | all false |
| `masterStemsVolume` | number | 1265 | 100 |
| `enabledLibraries` | Set<ChordLibrary> | 1270 | all enabled |
| `activeLibrary` | ChordLibrary | 1273 | 'essentia' |
| `useBackingTrack` | boolean | 1274 | false |
| `snapToBeats` | boolean | 1275 | false |
| `useBeatSyncDetection` | boolean | 1276 | false |

### Global User Preferences (from fretboardSettings.tsx)

| Setting | Type | Line | Default |
| ------- | ---- | ---- | ------- |
| `enabledShapes` | Set<CAGEDShapeName> | 84 | all 5 shapes |
| `showAllPositions` | boolean | 87 | false |
| `highlightRoots` | boolean | 90 | true |
| `colorByShape` | boolean | 93 | true |
| `colorByPosition` | boolean | 94 | false |

---

## Implementation Plan

### Database Schema

```sql
-- User profiles (extends Supabase auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Global user preferences (fretboard settings)
CREATE TABLE public.user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE UNIQUE,
  enabled_shapes TEXT[] DEFAULT ARRAY['C','A','G','E','D'],
  show_all_positions BOOLEAN DEFAULT false,
  highlight_roots BOOLEAN DEFAULT true,
  color_by_shape BOOLEAN DEFAULT true,
  color_by_position BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Per-song settings
CREATE TABLE public.song_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  video_id TEXT NOT NULL,

  -- UI state
  active_tab TEXT DEFAULT 'audio',

  -- Stem settings
  selected_stems TEXT[] DEFAULT ARRAY[]::TEXT[],
  stem_volumes JSONB DEFAULT '{}',
  stem_muted JSONB DEFAULT '{}',
  master_stems_volume INTEGER DEFAULT 100,

  -- Library preferences
  active_library TEXT DEFAULT 'essentia',
  enabled_libraries TEXT[] DEFAULT ARRAY['essentia','madmom','btc'],
  use_backing_track BOOLEAN DEFAULT false,
  snap_to_beats BOOLEAN DEFAULT false,
  use_beat_sync_detection BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_accessed TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, video_id)
);

-- Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.song_settings ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only access their own data
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can manage own preferences" ON public.user_preferences
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own song settings" ON public.song_settings
  FOR ALL USING (auth.uid() = user_id);

-- Trigger: Create profile + preferences on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.user_preferences (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

### Tasks

#### Phase 1: Supabase Setup & Auth Foundation

- [ ] **Task 1.1: Create Supabase project and configure auth** (Manual)
  - Action: Create new project at supabase.com
  - Action: Go to Authentication > Providers, enable Email
  - Action: Go to Authentication > Providers, enable Google (add OAuth credentials)
  - Action: Go to Authentication > URL Configuration, add `http://localhost:4567` to redirect URLs
  - Action: Go to SQL Editor, run the database schema SQL above
  - Notes: Save project URL and anon key for env vars

- [ ] **Task 1.2: Install Supabase dependencies**
  - File: `product/app/package.json`
  - Action: Run `yarn add @supabase/supabase-js @supabase/ssr` from product/app directory
  - Notes: Verify versions are ^2.47.0 and ^0.5.0 respectively

- [ ] **Task 1.3: Create environment file**
  - File: `product/app/.env.local` (create new)
  - Action: Add `NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co`
  - Action: Add `NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key`
  - Notes: Do NOT commit this file (should be in .gitignore)

- [ ] **Task 1.4: Create Supabase browser client**
  - File: `product/app/lib/supabase/client.ts` (create new)
  - Action: Export `createBrowserClient()` function using `@supabase/ssr`
  - Action: Use env vars for URL and anon key
  - Pattern: Singleton pattern to avoid multiple client instances

- [ ] **Task 1.5: Create Supabase server client**
  - File: `product/app/lib/supabase/server.ts` (create new)
  - Action: Export `createServerClient()` for API routes
  - Action: Handle cookies for session management
  - Notes: Used for server-side operations and protected API routes

- [ ] **Task 1.6: Create AuthProvider context**
  - File: `product/app/state/auth/AuthProvider.tsx` (create new)
  - Action: Create `AuthContext` with type: `{ user, session, loading, signIn, signUp, signOut, signInWithGoogle }`
  - Action: Create `AuthProvider` component that initializes Supabase client
  - Action: Listen to `onAuthStateChange` to update user/session
  - Action: Export `useAuth()` hook
  - Pattern: Follow `fretboardSettings.tsx` context pattern (lines 73-151)

- [ ] **Task 1.7: Wrap app with AuthProvider**
  - File: `product/app/pages/_app.tsx`
  - Action: Import `AuthProvider` from `../state/auth/AuthProvider`
  - Action: Wrap inside `DarkLightThemeProvider`, around `WebsiteLayout` (line 25-27)
  - Result: `<DarkLightThemeProvider><AuthProvider><WebsiteLayout>...</WebsiteLayout></AuthProvider></DarkLightThemeProvider>`

#### Phase 2: Auth Pages

- [ ] **Task 2.1: Create login page**
  - File: `product/app/pages/login.tsx` (create new)
  - Action: Create form with email and password inputs using `@lib/ui` components
  - Action: Add "Sign in with Google" button
  - Action: Add link to `/signup` page
  - Action: On success, redirect to `/` using `useRouter`
  - Action: Show error message if login fails
  - Styling: Use VStack for layout, center on page, max-width 400px

- [ ] **Task 2.2: Create signup page**
  - File: `product/app/pages/signup.tsx` (create new)
  - Action: Create form with email, password, confirm password inputs
  - Action: Add "Sign up with Google" button
  - Action: Add link to `/login` page
  - Action: On submit, call `signUp` from `useAuth()`
  - Action: Show "Check your email for verification link" message on success
  - Validation: Passwords must match, min 6 characters

- [ ] **Task 2.3: Create OAuth callback handler**
  - File: `product/app/pages/auth/callback.tsx` (create new)
  - Action: Use `useEffect` to check for auth code in URL
  - Action: Exchange code for session using Supabase client
  - Action: Redirect to `/` on success
  - Action: Redirect to `/login?error=auth` on failure
  - Notes: This handles the redirect from Google OAuth

- [ ] **Task 2.4: Create profile page**
  - File: `product/app/pages/profile.tsx` (create new)
  - Action: Redirect to `/login` if not authenticated
  - Action: Display user avatar (from `user.user_metadata.avatar_url` or initials)
  - Action: Display and edit display name (input field + save button)
  - Action: Display email (read-only)
  - Action: Add "Change Password" section with current/new/confirm fields
  - Action: Add Logout button
  - Action: Save display name to `profiles` table via Supabase

#### Phase 3: Navigation Avatar

- [ ] **Task 3.1: Create UserAvatar component**
  - File: `product/app/components/UserAvatar.tsx` (create new)
  - Action: Accept props: `avatarUrl?: string`, `displayName?: string`, `size?: number`
  - Action: If `avatarUrl` exists, render circular `<img>`
  - Action: Else, render circular div with initials from `displayName`
  - Action: Default size: 32px
  - Styling: Use styled-components, `border-radius: 50%`, `object-fit: cover`

- [ ] **Task 3.2: Create UserDropdown component**
  - File: `product/app/components/UserDropdown.tsx` (create new)
  - Action: Accept props: none (uses `useAuth()` internally)
  - Action: Render `UserAvatar` as trigger
  - Action: On click, toggle dropdown visibility
  - Action: Dropdown items: "Profile" (link to /profile), "Logout" (calls signOut)
  - Action: Close dropdown on outside click
  - Styling: Absolute positioned dropdown, use `getColor('background')` for bg

- [ ] **Task 3.3: Add avatar to navigation**
  - File: `product/app/layout/WebsiteLayout.tsx`
  - Action: Import `useAuth` and `UserDropdown`
  - Action: Import `Button` and `Link` from existing imports
  - Action: In `renderTopbarItems()` after the closing `</HStack>` (line 93), add conditional:
    ```tsx
    {user ? (
      <UserDropdown />
    ) : (
      <Link href="/login">
        <Button kind="ghost" as="div">Login</Button>
      </Link>
    )}
    ```
  - Notes: Keep spacing consistent with existing nav items

#### Phase 4: Settings Persistence

- [ ] **Task 4.1: Create useUserPreferences hook**
  - File: `product/app/state/settings/useUserPreferences.ts` (create new)
  - Action: Accept no parameters
  - Action: Use `useAuth()` to get current user
  - Action: On mount (if user), fetch from `user_preferences` table
  - Action: Return: `{ preferences, updatePreferences, loading }`
  - Action: `updatePreferences` debounces (500ms) and upserts to database
  - Action: If no user, return defaults and no-op update function
  - Types: Match `FretboardSettings` type from `fretboardSettings.tsx`

- [ ] **Task 4.2: Integrate useUserPreferences with FretboardSettingsProvider**
  - File: `product/app/chords/state/fretboardSettings.tsx`
  - Action: Import `useUserPreferences` hook
  - Action: Import `useAuth` to check if user exists
  - Action: In provider, call `useUserPreferences()`
  - Action: Initialize useState values from `preferences` (with fallback to defaults)
  - Action: Add `useEffect` to call `updatePreferences` when any setting changes
  - Notes: Ensure no infinite loops - only save when values actually change

- [ ] **Task 4.3: Create useSongSettings hook**
  - File: `product/app/state/settings/useSongSettings.ts` (create new)
  - Action: Accept parameter: `videoId: string | null`
  - Action: Use `useAuth()` to get current user
  - Action: On mount/videoId change (if user + videoId), fetch from `song_settings` table
  - Action: Return all settings with individual setters (mirror YouTubeChordPlayer state shape)
  - Action: Each setter debounces (500ms) and upserts to database
  - Action: If no user, return defaults and no-op setters
  - Types: Create `SongSettings` type matching the database columns

- [ ] **Task 4.4: Integrate useSongSettings with YouTubeChordPlayer**
  - File: `product/app/chords/youtube/YouTubeChordPlayer.tsx`
  - Action: Import `useSongSettings` hook
  - Action: Call `useSongSettings(videoId)` at component top
  - Action: Replace these useState calls with hook values:
    - Line 1241: `activeTab` → `songSettings.activeTab`
    - Line 1245: `selectedStems` → `songSettings.selectedStems`
    - Line 1248: `stemVolumes` → `songSettings.stemVolumes`
    - Line 1256: `stemMuted` → `songSettings.stemMuted`
    - Line 1265: `masterStemsVolume` → `songSettings.masterStemsVolume`
    - Line 1270: `enabledLibraries` → `songSettings.enabledLibraries`
    - Line 1273: `activeLibrary` → `songSettings.activeLibrary`
    - Line 1274: `useBackingTrack` → `songSettings.useBackingTrack`
    - Line 1275: `snapToBeats` → `songSettings.snapToBeats`
    - Line 1276: `useBeatSyncDetection` → `songSettings.useBeatSyncDetection`
  - Action: Replace setters with hook setters
  - Notes: Keep local state for non-persisted values (status, songData, currentChord, etc.)

---

### Acceptance Criteria

#### Authentication

- [ ] **AC-1**: Given I'm on `/login`, when I enter valid email/password and click "Sign In", then I'm logged in and redirected to `/`
- [ ] **AC-2**: Given I'm on `/login`, when I enter invalid credentials, then I see an error message and remain on the page
- [ ] **AC-3**: Given I'm on `/login`, when I click "Sign in with Google", then I'm redirected to Google OAuth, and upon success, redirected back to `/`
- [ ] **AC-4**: Given I'm on `/signup`, when I enter email/password/confirm and click "Sign Up", then I see "Check your email" message
- [ ] **AC-5**: Given I'm on `/signup`, when passwords don't match, then I see a validation error
- [ ] **AC-6**: Given I'm logged in, when I view the navigation, then I see my avatar (or initials) in the top-right
- [ ] **AC-7**: Given I'm logged in, when I click my avatar, then I see a dropdown with "Profile" and "Logout"
- [ ] **AC-8**: Given I'm logged in and click "Logout", then my session is cleared and I see "Login" button in nav
- [ ] **AC-9**: Given I'm not logged in, when I view the navigation, then I see a "Login" button in the top-right

#### Profile

- [ ] **AC-10**: Given I'm logged in, when I visit `/profile`, then I see my avatar, display name, and email
- [ ] **AC-11**: Given I'm on `/profile`, when I edit my display name and save, then the change persists in the database
- [ ] **AC-12**: Given I'm on `/profile`, when I change my password successfully, then I can login with the new password
- [ ] **AC-13**: Given I'm not logged in, when I visit `/profile`, then I'm redirected to `/login`

#### Settings Persistence

- [ ] **AC-14**: Given I'm logged in and viewing a song, when I adjust stem volumes, then the changes are saved to the database within 1 second
- [ ] **AC-15**: Given I'm logged in, when I return to a song I've played before, then my previous stem volumes are restored
- [ ] **AC-16**: Given I'm logged in, when I change my active chord library preference, then it persists for that song
- [ ] **AC-17**: Given I'm logged in, when I change fretboard display settings (shapes, colors), then they persist across page refreshes
- [ ] **AC-18**: Given I'm logged in, when I visit a new song I've never played, then default settings are used
- [ ] **AC-19**: Given I'm NOT logged in, when I change any settings, then the app works normally with defaults (no errors)
- [ ] **AC-20**: Given I'm NOT logged in, when I refresh the page, then settings reset to defaults (expected behavior)

#### Edge Cases

- [ ] **AC-21**: Given Supabase is unreachable, when I try to login, then I see a user-friendly error message
- [ ] **AC-22**: Given I'm logged in and Supabase is unreachable, when I change settings, then the UI updates locally (graceful degradation)
- [ ] **AC-23**: Given I have settings saved for a song, when I delete my account, then all my data is cascade deleted

---

## Additional Context

### Dependencies

```json
{
  "@supabase/supabase-js": "^2.47.0",
  "@supabase/ssr": "^0.5.0"
}
```

### Environment Variables

```env
# product/app/.env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### Supabase Google OAuth Setup

1. Go to Google Cloud Console > APIs & Services > Credentials
2. Create OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`
4. Copy Client ID and Client Secret to Supabase Dashboard > Authentication > Providers > Google

### Testing Strategy

**Manual Testing Checklist:**

1. **Auth Flows**
   - [ ] Sign up with email → verify email → login
   - [ ] Sign up with Google → verify redirect → check profile data
   - [ ] Login with email/password
   - [ ] Login with Google
   - [ ] Logout
   - [ ] Access /profile when logged out (should redirect)
   - [ ] Change password

2. **Settings Persistence**
   - [ ] Login → open a song → change stem volumes → refresh → verify volumes restored
   - [ ] Login → change fretboard shapes → navigate away → return → verify shapes
   - [ ] Open same song in two tabs → change setting in one → refresh other → verify sync
   - [ ] Logout → change settings → verify no errors
   - [ ] Login as different user → verify different settings

3. **RLS Verification**
   - [ ] User A cannot see User B's song_settings (use Supabase dashboard to verify)
   - [ ] User A cannot see User B's preferences

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| OAuth redirect issues | Medium | High | Test thoroughly on localhost:4567 |
| Settings race conditions | Low | Medium | 500ms debounce prevents rapid saves |
| RLS policy gaps | Low | High | Test with multiple accounts |
| Session expiry mid-use | Low | Medium | Supabase handles refresh tokens |

### Notes

- **Parallel work**: Another agent is working on chord detection features. The `useSongSettings` hook extracts settings state without modifying chord detection logic - no merge conflicts expected.
- **Waiting for**: User may add more features before implementation begins
- **Supabase project**: User will create cloud project and provide credentials
- **Future enhancements**: Real-time sync, song/file storage, social features
