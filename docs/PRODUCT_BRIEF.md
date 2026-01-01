# Guitar App - Product Brief

## Overview

This is a guitar learning and visualization application that helps musicians explore scales, chords, and music theory concepts on an interactive fretboard. The project was forked from [pentafret.com](https://pentafret.com) and is being extended with additional functionality to provide a more comprehensive learning experience.

## Tech Stack

- **TypeScript** - Type-safe development
- **Next.js** - Static site generation and routing
- **React** - Component-based UI
- **styled-components** - CSS-in-JS styling
- **Monorepo Structure** - Organized codebase for scalability

## Original Features (from fork)

- Interactive guitar fretboard visualization
- Scale explorer (full, pentatonic, blues scales)
- CAGED system visualization (chords and arpeggios)
- Triads within major scale patterns
- Song learning checklist

---

## New Features Developed

### 1. Chord Fingering System

A comprehensive CAGED-based chord shape system that displays actual fingering positions for various chord types.

**Supported Chord Types:**
| Type | Description | Intervals |
|------|-------------|-----------|
| Major | Major triad | 1, 3, 5 |
| Minor | Minor triad | 1, ♭3, 5 |
| 7 | Dominant 7th | 1, 3, 5, ♭7 |
| Maj7 | Major 7th | 1, 3, 5, 7 |
| Min7 | Minor 7th | 1, ♭3, 5, ♭7 |
| Dim | Diminished triad | 1, ♭3, ♭5 |
| Dim7 | Fully diminished 7th | 1, ♭3, ♭5, ♭♭7 |
| 9 | Dominant 9th | 1, 3, 5, ♭7, 9 |
| Maj9 | Major 9th | 1, 3, 5, 7, 9 |
| Min9 | Minor 9th | 1, ♭3, 5, ♭7, 9 |

**Shape System:**
- Based on CAGED system (C, A, G, E, D shapes)
- Each chord type has multiple moveable shapes
- Shapes are selected based on fret position for optimal playability
- Root notes are highlighted with distinct styling

### 2. Scale Overlay

Overlay scale notes on the chord fretboard to visualize how chords relate to scales.

**Features:**
- Toggle scale overlay on/off
- Select scale key (all 12 notes)
- Choose tonality (major/minor)
- Choose scale type (full, pentatonic, blues)
- Roman numeral indicators show scale degrees (I, ii, iii, IV, V, vi, vii°)
- Chord root notes not in the selected scale are grayed out

### 3. Blue Note Highlighting

When the blues scale is selected, the "blue note" (the chromatic note that distinguishes blues from pentatonic) is displayed with special blue styling.

- Blue outline and letter color for blue notes
- Red styling for root notes
- Green styling for other scale notes

### 4. Responsive Fretboard

The fretboard automatically adapts to different screen sizes.

**Breakpoints:**
| Screen Width | Mode | Fretboard Height | Note Size |
|--------------|------|------------------|-----------|
| ≥ 800px | Normal | 240px | 36px |
| < 800px | Compact | 168px | 24px |

**Responsive Elements:**
- Fretboard height
- Note circle size
- Nut width
- String thickness
- Fret markers
- Position slider alignment

### 5. Position Slider with Logarithmic Spacing

A custom slider control for navigating fret positions that mirrors the actual fret spacing on a guitar.

**Features:**
- Logarithmic positioning matches real guitar fret spacing
- Clickable fret numbers for direct navigation
- Draggable slider thumb
- Open position (fret 0) button
- Aligns visually with the fretboard below

---

## File Structure (Key Files)

```
product/
├── app/
│   ├── chords/
│   │   ├── ChordsPage.tsx           # Main chord page
│   │   ├── ChordFretboard.tsx       # Chord display component
│   │   ├── ControlGroup.tsx         # Styled control container
│   │   ├── manage/
│   │   │   ├── ManageChordRoot.tsx  # Root note selector with scale degrees
│   │   │   ├── ManageChordQuality.tsx
│   │   │   └── ManagePosition.tsx   # Logarithmic position slider
│   │   └── scale/
│   │       ├── ScaleOverlay.tsx     # Scale note overlay
│   │       ├── ScaleOverlayNote.tsx # Individual scale note
│   │       └── ManageScaleOverlay.tsx
│   └── guitar/
│       └── fretboard/
│           ├── Fretboard.tsx
│           ├── Note.tsx
│           ├── ResponsiveFretboardConfig.tsx  # Responsive sizing
│           └── ...
├── core/
│   ├── chords/
│   │   ├── cagedShapes.ts           # CAGED shape definitions
│   │   └── chordTypes.ts            # Chord quality definitions
│   └── scale/
│       ├── getScaleDegree.ts        # Roman numeral calculation
│       └── blues/
│           └── getBlueNote.ts       # Blue note detection
```

---

## Usage

### Chord Page (`/chords/[rootNote]/[quality]`)

1. **Select Scale** (optional)
   - Choose scale key, tonality, and type
   - Toggle overlay on/off
   - See which chord tones are in the scale

2. **Select Chord**
   - Choose root note (with scale degree indicators if scale is set)
   - Choose chord quality (Major, Minor, 7, etc.)

3. **Navigate Positions**
   - Use the slider to move up/down the neck
   - Click fret numbers for direct access
   - Fingerings automatically adjust to the selected position

---

## Future Considerations

- Additional chord types (sus2, sus4, add9, etc.)
- Augmented chord shapes
- Chord progression builder
- Audio playback of chords
- Custom tuning support
- Left-handed mode

---

## Development Notes

- The project uses a context-based approach for responsive configuration
- Chord shapes are defined as offset arrays relative to root position
- The CAGED system provides moveable shapes across the fretboard
- Scale degree calculations support both major and minor tonalities

---

*Last updated: January 2026*
