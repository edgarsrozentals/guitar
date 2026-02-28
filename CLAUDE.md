# CLAUDE.md

This file provides guidance for Claude Code when working in this repository.

## Project Overview

A guitar learning and visualization application for exploring scales, chords, and music theory on an interactive fretboard. Forked from [pentafret.com](https://pentafret.com) with extended functionality.

## Tech Stack

- TypeScript, Next.js 15, React 19, styled-components
- Yarn 4.7.0 monorepo

## Development Servers

**IMPORTANT: Use non-traditional port numbers to avoid conflicts with other apps.**

| Service | Port | Command |
|---------|------|---------|
| Frontend (Next.js) | 4567 | `cd product/app && yarn dev` |
| Backend (Express) | 4568 | `cd backend && npx tsx src/server.ts` |
| Madmom Service | Cloud Run | `https://madmom-service-598884178881.us-central1.run.app` |

Standard ports like 3000, 3001, 8080 are often used by other applications. Always use ports in the 4xxx-5xxx range for this project.

## Commands

```bash
# Development (from product/app)
yarn dev              # Start dev server on port 4567

# Backend (from backend/)
npx tsx src/server.ts # Start backend server on port 4568

# Build
yarn build            # Build Next.js app (from product/app)

# Linting & Formatting (from root)
yarn lint             # Run ESLint
yarn lint:fix         # Fix ESLint issues
yarn format           # ESLint fix + Prettier

# Type Checking
yarn typecheck        # Check types (root or product/app)

# Dependencies
yarn                  # Install all dependencies
yarn add <pkg>        # Add dependency
yarn add -D <pkg>     # Add dev dependency
yarn sync-packages    # Fix version mismatches
```

## Architecture

```
lib/                  # Shared packages (import via @lib/*)
├── ui/               # UI components, props, CSS utilities
├── utils/            # Utility functions (attempt, match, etc.)
├── next-ui/          # Next.js-specific UI utilities
└── codegen/          # Code generation tools

product/              # Application code (import via @product/*)
├── app/              # Next.js app
│   ├── chords/       # Chord page & components
│   ├── guitar/       # Fretboard visualization
│   └── ...
├── core/             # Business logic
│   ├── chords/       # Chord types, CAGED shapes
│   ├── scale/        # Scale calculations, blue notes
│   └── note/         # Note utilities
└── config/           # App configuration
```

## Key Features

- **CAGED Chord System**: Moveable chord shapes (E, A, D, G, C) for all chord types
- **Scale Overlay**: Overlay scale notes on chords with Roman numeral degrees
- **Blue Note Highlighting**: Special styling for blues scale notes
- **Responsive Fretboard**: Adapts to screen size (breakpoint: 800px)

## Coding Conventions

### TypeScript

- Use `type` over `interface` (exception: class contracts)
- Functions with >1 parameter use object pattern with `{FunctionName}Input` type
- Use `shouldBePresent()` for required values, not optional chaining with defaults
- Use `assertField()` for required object properties

### Error Handling

- Use `attempt()` from `@lib/utils/attempt` instead of try-catch
- Pattern match results: `if ('data' in result)` / `if ('error' in result)`
- Use `withFallback()` for default values on errors

### Pattern Matching

- Use `match()` from `@lib/utils/match` instead of switch statements
- Use `<Match>` component for conditional React rendering
- Use `Record<K, V>` for simple value mappings

### Code Reuse

- Check `@lib/ui/props` for reusable prop types (ChildrenProp, KindProp, etc.)
- Check `@lib/utils` before creating utility functions
- Check `@lib/ui` for existing components

## Important Files

- `product/core/chords/cagedShapes.ts` - CAGED shape definitions
- `product/core/chords/chordTypes.ts` - Chord quality intervals
- `product/app/guitar/fretboard/ResponsiveFretboardConfig.tsx` - Responsive sizing
- `product/app/chords/ChordsPage.tsx` - Main chord page

## YouTube Chord Detection System

### Overview

The `/chords/youtube` page allows users to load YouTube videos, detect chords using multiple libraries, and visualize them on a timeline synchronized with the video.

### Multi-Library Chord Detection

Three chord detection libraries are supported for A/B testing accuracy:

| Library | Location | Chord Types | Notes |
|---------|----------|-------------|-------|
| **Essentia** | Local Python | major, minor, 7th, dim, aug | Frame-based or beat-synchronous |
| **Madmom** | Cloud Run | major, minor, 7th, dim, aug | Deep learning based |
| **BTC** | Cloud Run | major, minor only (25 classes) | Transformer model |

### Key Files

- `product/app/chords/youtube/YouTubeChordPlayer.tsx` - Main component
- `product/app/chords/youtube/ChordTimeline.tsx` - Timeline visualization
- `backend/src/server.ts` - Express API server
- `backend/src/detect_chords.py` - Essentia chord detection (Python)

### Beat Detection Features

Two toggles in the **Chords** tab improve chord timing accuracy:

#### 1. Snap Chords to Beats (Post-processing)
- **Toggle:** "Snap chords to beats"
- **Effect:** Quantizes chord change times to nearest detected beat
- **Implementation:** Client-side post-processing via `quantizeChordsToBeats()` function
- **No re-analysis required** - works instantly on existing chord data

#### 2. Beat-Synchronous Detection (Re-analysis)
- **Toggle:** "Beat-sync detection"
- **Effect:** Averages HPCP (Harmonic Pitch Class Profile) over each beat period before chord detection
- **Implementation:**
  - Frontend passes `useBeatSyncDetection: true` in POST body
  - Backend passes `mode='beat_sync'` to Python script
  - `detect_chords.py` uses `detect_chords_beat_sync()` function
- **Requires re-analysis** - click Analyze button after enabling

### Backing Track Analysis

- **Toggle:** "Use backing track for analysis" (Chords tab)
- **Requires:** Stem separation via LALAL.ai (Audio tab → "Separate Stems")
- **Effect:** Uses `stems/{videoId}/backing.mp3` instead of full audio
- **Purpose:** Removes vocals for cleaner chord detection

### API Endpoints

```
POST /api/songs/:videoId/analyze
Body: { library?: string, useBackingTrack?: boolean, useBeatSyncDetection?: boolean }

GET /api/songs/:videoId/chords?library=essentia|madmom|btc

DELETE /api/songs/:videoId/chords/:library
```

### Data Storage

Chord analysis results stored in `backend/songs-metadata.json`:
```json
{
  "videoId": "abc123",
  "chordsByLibrary": {
    "essentia": [{ "time": 0, "chord": { "root": "A", "quality": "minor" } }],
    "madmom": [...],
    "btc": [...]
  },
  "tempo": { "bpm": 120, "beats": [0.5, 1.0, 1.5, ...] },
  "key": { "root": "A", "scale": "minor" }
}


## Core Memory

This project uses Core Memory for persistent knowledge storage shared across all Claude Code instances.

- **Label:** guitar-app
- **Label ID:** `proj_b3bf0b4a3744e8b1d8945572`
- When ingesting memories, ALWAYS include this label ID in the `labelIds` array
- Use `memory_search` at the start of conversations to check for relevant context
- Use `memory_ingest` at the end of conversations to store important decisions, solutions, and insights
