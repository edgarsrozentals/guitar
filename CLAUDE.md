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
