'use client'

import { HStack, VStack } from '@lib/ui/css/stack'
import { getColor } from '@lib/ui/theme/getters'
import { CAGEDShapeName } from '@product/core/chords/cagedShapes'
import { ChordQuality } from '@product/core/chords/chordTypes'
import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import styled from 'styled-components'

import { useAuth } from '../../state/auth/AuthProvider'
import {
  useSongSettings,
  type StemType,
  type ChordLibrary,
  type MediaTab,
  type EssentiaSettings,
  ALL_STEM_TYPES,
  DEFAULT_ESSENTIA_SETTINGS,
} from '../../state/settings/useSongSettings'
import { ControlGroup } from '../ControlGroup'
import {
  LyricsPanel,
  LyricsState,
  useLyricsSync,
  useLyricsGeneration,
} from '../lyrics'
import { useChangeChords, useSetChordsLive } from '../state/chords'
import { useFretboardSettings } from '../state/fretboardSettings'

const CAGED_SHAPES: CAGEDShapeName[] = ['C', 'A', 'G', 'E', 'D']

import { ChordComparison } from './ChordComparison'
import { ChordTimeline } from './ChordTimeline'
import { useSaveToLibrary } from './hooks'
import { PLAYBACK_RATES } from './PlaybackControls'
import { SaveToLibraryButton } from './SaveToLibraryButton'
import { YouTubePlayer, type YouTubePlayerHandle } from './YouTubePlayer'
import { YouTubeUrlInput } from './YouTubeUrlInput'

const BACKEND_URL = 'http://localhost:4568'

type ProcessingStatus = 'idle' | 'loading' | 'processing' | 'ready' | 'error'

type Chord = {
  root: string
  quality: string
}

type ChordEvent = {
  time: number
  chord: Chord
}

// Quantize chord change times to nearest beat
function quantizeChordsToBeats(
  chords: ChordEvent[],
  beats: number[],
): ChordEvent[] {
  if (!beats.length || !chords.length) return chords

  return chords.map((chord) => {
    // Find the nearest beat to this chord's time
    let nearestBeat = beats[0]
    let minDistance = Math.abs(beats[0] - chord.time)

    for (const beat of beats) {
      const distance = Math.abs(beat - chord.time)
      if (distance < minDistance) {
        minDistance = distance
        nearestBeat = beat
      }
    }

    return {
      ...chord,
      time: nearestBeat,
    }
  })
}

// Map Chordify chords to Essentia beat positions using beat indices
// Chordify chords are exactly on beats, so we map their beat indices to our detected beats
function alignChordifyToEssentiaBeats(
  chords: ChordEvent[],
  essentiaBpm: number,
  essentiaBeats: number[],
  chordifyBpm?: number,
): ChordEvent[] {
  if (!essentiaBeats.length || !chords.length) return chords

  // Use Chordify BPM if provided, otherwise estimate from Essentia
  const sourceBpm = chordifyBpm || essentiaBpm
  if (!sourceBpm || sourceBpm <= 0) return chords

  const sourceBeatDuration = 60 / sourceBpm

  return chords.map((chord) => {
    // Convert Chordify time back to beat index
    const beatIndex = Math.round(chord.time / sourceBeatDuration)

    // Map to Essentia beat position if within range
    if (beatIndex >= 0 && beatIndex < essentiaBeats.length) {
      return {
        ...chord,
        time: essentiaBeats[beatIndex],
      }
    }

    // If beat index is beyond Essentia's detected beats, extrapolate
    if (beatIndex >= essentiaBeats.length && essentiaBeats.length >= 2) {
      const lastBeat = essentiaBeats[essentiaBeats.length - 1]
      const avgBeatInterval =
        (essentiaBeats[essentiaBeats.length - 1] - essentiaBeats[0]) /
        (essentiaBeats.length - 1)
      const extraBeats = beatIndex - essentiaBeats.length + 1
      return {
        ...chord,
        time: lastBeat + extraBeats * avgBeatInterval,
      }
    }

    // Fallback: snap to nearest beat
    let nearestBeat = essentiaBeats[0]
    let minDistance = Math.abs(essentiaBeats[0] - chord.time)
    for (const beat of essentiaBeats) {
      const distance = Math.abs(beat - chord.time)
      if (distance < minDistance) {
        minDistance = distance
        nearestBeat = beat
      }
    }
    return { ...chord, time: nearestBeat }
  })
}

type KeyInfo = {
  root: string
  scale: 'major' | 'minor'
  strength: number
}

type TempoInfo = {
  bpm: number
  confidence: number
  beatCount: number
  beats?: number[]
}

type SongData = {
  videoId: string
  title: string
  duration: number
  audioUrl: string | null
  chords: ChordEvent[]
  key: KeyInfo | null
  tempo: TempoInfo | null
}

type ChordifyMetadata = {
  title?: string
  artist?: string
  duration?: number
  bpm?: number // Chordify's BPM for accurate beat alignment
  beatsPerBar?: number
  key?: { root: string; quality: string } | null // Chordify's detected key
  importedAt?: string
}

type ExtractionProgress = {
  progress: number
  status: string
  audioUrl: string | null
}

type StemInfo = {
  type: string
  url: string
}

type StemProgress = {
  progress: number
  status:
    | 'not_started'
    | 'pending'
    | 'uploading'
    | 'processing'
    | 'downloading'
    | 'complete'
    | 'error'
  stems?: StemInfo[]
  error?: string
}

// StemType, ChordLibrary, and ALL_STEM_TYPES imported from useSongSettings

type ChordLibraryInfo = {
  id: ChordLibrary
  name: string
  accuracy: string
  color?: string
  isGroundTruth?: boolean
}

const CHORD_LIBRARIES: ChordLibraryInfo[] = [
  {
    id: 'chordify',
    name: 'Chordify',
    accuracy: 'Ground Truth',
    color: '#9C27B0',
    isGroundTruth: true,
  },
  { id: 'essentia', name: 'Essentia', accuracy: '77-80%' },
  { id: 'madmom', name: 'Madmom', accuracy: '89.6%' },
  { id: 'btc', name: 'BTC', accuracy: '~90%' },
]

type ChordsByLibrary = {
  [K in ChordLibrary]?: ChordEvent[]
}

type ChordAnalysisProgress = {
  progress: number
  status: 'not_started' | 'pending' | 'processing' | 'complete' | 'error'
  error?: string
}

const STEM_LABELS: Record<string, string> = {
  vocals: 'Vocals',
  drum: 'Drums',
  bass: 'Bass',
  electric_guitar: 'Guitar',
  piano: 'Piano',
  backing: 'Backing Track',
}

// MediaTab imported from useSongSettings

// Stems tab is separate in its own column
const stemsTabs: readonly MediaTab[] = ['stems'] as const

// Other tabs in the right column
const otherTabs: readonly MediaTab[] = [
  'lyrics',
  'chords',
  'generation',
  'fretboard',
] as const

// All tabs combined (for backwards compatibility)
const mediaTabs: readonly MediaTab[] = [
  'chords',
  'generation',
  'stems',
  'lyrics',
  'fretboard',
] as const

const tabLabels: Record<MediaTab, string> = {
  audio: 'Audio',
  chords: 'Chords',
  generation: 'Generation',
  stems: 'Audio',
  fretboard: 'Fretboard',
  lyrics: 'Lyrics',
}

const StatusDot = styled.span<{ $isReady: boolean }>`
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${({ $isReady }) =>
    $isReady ? getColor('success') : getColor('alert')};
  margin-right: 6px;
  flex-shrink: 0;
`

const TabLabel = styled.span`
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
`

// Map note names to numbers (A=0, A#=1, B=2, etc.)
const noteNameToNumber: Record<string, number> = {
  A: 0,
  'A#': 1,
  Bb: 1,
  B: 2,
  C: 3,
  'C#': 4,
  Db: 4,
  D: 5,
  'D#': 6,
  Eb: 6,
  E: 7,
  F: 8,
  'F#': 9,
  Gb: 9,
  G: 10,
  'G#': 11,
  Ab: 11,
}

// Map backend quality names to ChordQuality type
const qualityNameToChordQuality: Record<string, ChordQuality> = {
  major: 'major',
  minor: 'minor',
  '7': '7',
  maj7: 'maj7',
  min7: 'min7',
  m7: 'min7',
  dim: 'dim',
  dim7: 'dim7',
  aug: 'aug',
  '9': '9',
  maj9: 'maj9',
  min9: 'min9',
  m9: 'min9',
}

// Roman numeral mapping for chord analysis
const ROMAN_NUMERALS_MAJOR = [
  'I',
  'bII',
  'II',
  'bIII',
  'III',
  'IV',
  'bV',
  'V',
  'bVI',
  'VI',
  'bVII',
  'VII',
]
const ROMAN_NUMERALS_MINOR = [
  'i',
  'bII',
  'ii',
  'bIII',
  'III',
  'iv',
  'bV',
  'v',
  'bVI',
  'VI',
  'bVII',
  'VII',
]

// Get semitone interval from key root to chord root
function getSemitoneInterval(keyRoot: string, chordRoot: string): number {
  const keyNum =
    noteNameToNumber[keyRoot] ??
    noteNameToNumber[keyRoot.replace('#', '♯').replace('b', '♭')] ??
    0
  const chordNum =
    noteNameToNumber[chordRoot] ??
    noteNameToNumber[chordRoot.replace('#', '♯').replace('b', '♭')] ??
    0
  return (chordNum - keyNum + 12) % 12
}

// Get Roman numeral for a chord given the key
function getChordRomanNumeral(
  chordRoot: string,
  chordQuality: string,
  keyRoot: string,
  keyScale: string,
): string {
  const interval = getSemitoneInterval(keyRoot, chordRoot)
  const isMajorKey = keyScale === 'major'
  const numerals = isMajorKey ? ROMAN_NUMERALS_MAJOR : ROMAN_NUMERALS_MINOR

  let numeral = numerals[interval] || '?'

  // Adjust case based on chord quality (lowercase for minor/dim, uppercase for major/aug)
  const isMinorChord =
    chordQuality === 'minor' ||
    chordQuality === 'min7' ||
    chordQuality === 'dim' ||
    chordQuality === 'dim7'
  if (isMinorChord) {
    numeral = numeral.toLowerCase()
  } else {
    numeral = numeral.toUpperCase()
  }

  // Add quality suffix
  if (chordQuality === 'dim' || chordQuality === 'dim7') numeral += '°'
  else if (chordQuality === 'aug') numeral += '+'
  else if (chordQuality === '7') numeral += '7'
  else if (chordQuality === 'maj7') numeral += 'maj7'
  else if (chordQuality === 'min7' || chordQuality === 'm7') numeral += '7'

  return numeral
}

// Analyze chords from timeline
type ChordAnalysis = {
  uniqueChords: Array<{
    root: string
    quality: string
    romanNumeral: string
    count: number
    percentage: number
  }>
  progression: string[]
  progressionNumerals: string[]
  totalChords: number
}

function analyzeChords(
  chords: Array<{ time: number; chord: { root: string; quality: string } }>,
  key: { root: string; scale: string } | null,
): ChordAnalysis {
  if (!chords || chords.length === 0) {
    return {
      uniqueChords: [],
      progression: [],
      progressionNumerals: [],
      totalChords: 0,
    }
  }

  // Count chord occurrences
  const chordCounts = new Map<
    string,
    { root: string; quality: string; count: number }
  >()
  const progressionSequence: string[] = []
  let lastChordKey = ''

  for (const event of chords) {
    const chordKey = `${event.chord.root}-${event.chord.quality}`

    // Track unique chords with counts
    const existing = chordCounts.get(chordKey)
    if (existing) {
      existing.count++
    } else {
      chordCounts.set(chordKey, {
        root: event.chord.root,
        quality: event.chord.quality,
        count: 1,
      })
    }

    // Build progression (only add when chord changes)
    if (chordKey !== lastChordKey) {
      progressionSequence.push(chordKey)
      lastChordKey = chordKey
    }
  }

  // Convert to sorted array (by count, descending)
  const uniqueChords = Array.from(chordCounts.values())
    .map((c) => ({
      root: c.root,
      quality: c.quality,
      romanNumeral: key
        ? getChordRomanNumeral(c.root, c.quality, key.root, key.scale)
        : '?',
      count: c.count,
      percentage: Math.round((c.count / chords.length) * 100),
    }))
    .sort((a, b) => b.count - a.count)

  // Get the main progression (first 8 unique chord changes, or detect repeating pattern)
  const mainProgression = progressionSequence.slice(0, 8)
  const progression = mainProgression.map((k) => {
    const parts = k.split('-')
    const quality = parts[1]
    return quality === 'major'
      ? parts[0]
      : `${parts[0]}${quality === 'minor' ? 'm' : quality}`
  })

  const progressionNumerals = key
    ? mainProgression.map((k) => {
        const parts = k.split('-')
        return getChordRomanNumeral(parts[0], parts[1], key.root, key.scale)
      })
    : []

  return {
    uniqueChords,
    progression,
    progressionNumerals,
    totalChords: chords.length,
  }
}

const Container = styled.div`
  width: 100%;
`

const ThreeColumnLayout = styled.div`
  display: flex;
  align-items: stretch;
  width: 100%;

  @media (max-width: 800px) {
    flex-direction: column;
  }
`

const VideoSection = styled.div<{ $width?: number }>`
  flex: ${({ $width }) => ($width ? `0 0 ${$width}px` : '0 0 auto')};
  margin-top: 16px; /* Align with tab panel content (below tabs) */
  min-width: 200px;
`

const StemsSection = styled.div<{ $width?: number }>`
  flex: ${({ $width }) => ($width ? `0 0 ${$width}px` : '1')};
  min-width: 280px;
  display: flex;
  flex-direction: column;
`

const OtherTabsSection = styled.div`
  flex: 1;
  min-width: 250px;
  display: flex;
  flex-direction: column;
`

const ResizableDivider = styled.div`
  width: 8px;
  cursor: col-resize;
  background: transparent;
  display: flex;
  align-items: stretch;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
  align-self: stretch;

  &::after {
    content: '';
    width: 2px;
    height: 100%;
    background: ${getColor('mist')};
    border-radius: 1px;
    transition: background 0.2s ease;
  }

  &:hover::after {
    background: ${getColor('textSupporting')};
  }

  &:active::after {
    background: ${getColor('primary')};
  }
`

// Keep for backwards compatibility but mark as deprecated
const VideoAndTabsLayout = styled.div`
  display: flex;
  gap: 16px;
  align-items: flex-start;

  @media (max-width: 800px) {
    flex-direction: column;
  }
`

const TabsSection = styled.div`
  flex: 1;
  min-width: 250px;
`

// Traditional tabs - connected to content
const TraditionalTabsContainer = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0;
`

const TabGroup = styled.div`
  display: flex;
  gap: 0;
`

const TraditionalTab = styled.button<{ $isActive: boolean }>`
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 500;
  border: 1px solid ${getColor('mist')};
  border-bottom: ${({ $isActive }) =>
    $isActive ? 'none' : `1px solid ${getColor('mist')}`};
  background: ${({ $isActive }) =>
    $isActive ? getColor('background') : 'transparent'};
  color: ${({ $isActive }) =>
    $isActive ? getColor('text') : getColor('textSupporting')};
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  border-radius: 8px 8px 0 0;
  margin-bottom: -1px;
  display: flex;
  align-items: center;
  gap: 6px;

  &:not(:first-child) {
    margin-left: -1px;
  }

  &:hover {
    color: ${getColor('text')};
    background: ${({ $isActive }) =>
      $isActive ? getColor('background') : getColor('mist')};
  }

  ${({ $isActive }) =>
    $isActive &&
    `
    z-index: 1;
  `}
`

const TabPanelContainer = styled.div`
  background: ${getColor('background')};
  border: 1px solid ${getColor('mist')};
  border-radius: 0 8px 8px 8px;
  padding: 16px;
  flex: 1;
  min-height: 280px;
  overflow-y: auto;
`

const TabsWrapper = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
`

const TabPlaceholder = styled.div`
  color: ${getColor('textSupporting')};
  font-size: 13px;
  text-align: center;
  padding: 24px 16px;
`

const StemControlsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

// Playback controls card for Audio tab
const PlaybackControlsCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border: 1px solid ${getColor('mist')};
  border-radius: 8px;
  margin-top: auto;
`

const PlaybackControlsRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

const PlaybackVolumeSlider = styled.input`
  flex: 1;
  min-width: 60px;
  height: 4px;
  -webkit-appearance: none;
  background: ${getColor('mist')};
  border-radius: 2px;
  outline: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    background: ${getColor('primary')};
    border-radius: 50%;
    cursor: pointer;
  }

  &:disabled {
    opacity: 0.5;
  }
`

const PlaybackSpeedSelect = styled.select`
  background: transparent;
  color: ${getColor('text')};
  border: 1px solid ${getColor('mist')};
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  min-width: 60px;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888' d='M3 4.5L6 8l3-3.5H3z'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 6px center;
  padding-right: 24px;

  &:hover {
    background-color: ${getColor('mist')};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  option {
    background: ${getColor('foreground')};
    color: ${getColor('text')};
  }
`

const PlaybackMuteButton = styled.button<{ $muted: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: 1px solid ${getColor('mist')};
  background: ${({ $muted }) => ($muted ? getColor('mist') : 'transparent')};
  color: ${getColor('text')};
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${getColor('mist')};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  svg {
    width: 16px;
    height: 16px;
  }
`

const StemRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 8px;
  background: ${getColor('background')};
  border-radius: 6px;
`

const StemLabel = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${getColor('text')};
  min-width: 60px;
`

const StemVolumeSlider = styled.input`
  flex: 1;
  min-width: 60px;
  height: 4px;
  -webkit-appearance: none;
  background: ${getColor('mist')};
  border-radius: 2px;
  outline: none;

  &::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    background: ${getColor('primary')};
    border-radius: 50%;
    cursor: pointer;
  }

  &:disabled {
    opacity: 0.5;
  }
`

const MuteButton = styled.button<{ $muted: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  background: ${({ $muted }) =>
    $muted ? getColor('alert') : getColor('mist')};
  color: ${({ $muted }) =>
    $muted ? getColor('background') : getColor('text')};
  cursor: pointer;
  transition: all 0.2s ease;

  svg {
    width: 16px;
    height: 16px;
  }

  &:hover {
    opacity: 0.8;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const SeparateButton = styled.button`
  padding: 10px 20px;
  background: ${getColor('primary')};
  color: ${getColor('background')};
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  align-self: flex-start;

  &:hover {
    opacity: 0.9;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

const StemProgressBar = styled.div`
  width: 100%;
  height: 6px;
  background: ${getColor('mist')};
  border-radius: 3px;
  overflow: hidden;
`

const StemProgressFill = styled.div<{ $progress: number }>`
  height: 100%;
  width: ${({ $progress }) => $progress}%;
  background: ${getColor('primary')};
  transition: width 0.3s ease;
`

const StemStatusText = styled.div`
  font-size: 12px;
  color: ${getColor('textSupporting')};
  text-align: center;
`

const StemSelectionContainer = styled.div`
  display: flex;
  gap: 24px;
  align-items: flex-start;
`

const StemSelectionList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
`

const StemToggleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`

const StemToggleSwitch = styled.button<{ $enabled: boolean }>`
  position: relative;
  width: 32px;
  height: 18px;
  border-radius: 9px;
  border: none;
  cursor: pointer;
  background: ${({ $enabled }) =>
    $enabled ? getColor('primary') : getColor('mist')};
  transition: background 0.2s ease;
  flex-shrink: 0;

  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: ${({ $enabled }) => ($enabled ? '16px' : '2px')};
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${getColor('background')};
    transition: left 0.2s ease;
  }
`

const StemToggleLabel = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: ${getColor('text')};
`

const FretboardSettingsSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const SettingsGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const SettingsGroupTitle = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${getColor('textSupporting')};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const ShapeTogglesRow = styled.div`
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
`

const ShapeToggle = styled.button<{ $enabled: boolean }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: 1px solid ${getColor('mist')};
  background: ${({ $enabled }) =>
    $enabled ? getColor('success') : getColor('background')};
  color: ${({ $enabled }) =>
    $enabled ? getColor('background') : getColor('textSupporting')};
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    background: ${({ $enabled }) =>
      $enabled ? getColor('success') : getColor('mist')};
  }
`

// Fretboard settings tab content
const FretboardTabContent = () => {
  const {
    settings,
    toggleShape,
    setShowAllPositions,
    setHighlightRoots,
    setColorByShape,
    setColorByPosition,
  } = useFretboardSettings()

  // Toggle color by shape (mutually exclusive with position)
  const handleColorByShapeToggle = () => {
    if (settings.colorByShape) {
      setColorByShape(false)
    } else {
      setColorByShape(true)
      setColorByPosition(false) // Turn off position coloring
    }
  }

  // Toggle color by position (mutually exclusive with shape)
  const handleColorByPositionToggle = () => {
    if (settings.colorByPosition) {
      setColorByPosition(false)
    } else {
      setColorByPosition(true)
      setColorByShape(false) // Turn off shape coloring
    }
  }

  return (
    <FretboardSettingsSection>
      <SettingsGroup>
        <SettingsGroupTitle>CAGED Shapes</SettingsGroupTitle>
        <ShapeTogglesRow>
          {CAGED_SHAPES.map((shape) => (
            <ShapeToggle
              key={shape}
              $enabled={settings.enabledShapes.has(shape)}
              onClick={() => toggleShape(shape)}
              title={`${settings.enabledShapes.has(shape) ? 'Disable' : 'Enable'} ${shape} shape`}
            >
              {shape}
            </ShapeToggle>
          ))}
        </ShapeTogglesRow>
      </SettingsGroup>

      <SettingsGroup>
        <SettingsGroupTitle>Display Options</SettingsGroupTitle>
        <StemToggleRow>
          <StemToggleSwitch
            $enabled={settings.showAllPositions}
            onClick={() => setShowAllPositions(!settings.showAllPositions)}
          />
          <StemToggleLabel>
            Show all positions (ignore position slider)
          </StemToggleLabel>
        </StemToggleRow>
        <StemToggleRow>
          <StemToggleSwitch
            $enabled={settings.highlightRoots}
            onClick={() => setHighlightRoots(!settings.highlightRoots)}
          />
          <StemToggleLabel>Highlight root notes</StemToggleLabel>
        </StemToggleRow>
      </SettingsGroup>

      <SettingsGroup>
        <SettingsGroupTitle>Note Coloring</SettingsGroupTitle>
        <StemToggleRow>
          <StemToggleSwitch
            $enabled={settings.colorByShape}
            onClick={handleColorByShapeToggle}
          />
          <StemToggleLabel>Color by CAGED shape</StemToggleLabel>
        </StemToggleRow>
        <StemToggleRow>
          <StemToggleSwitch
            $enabled={settings.colorByPosition}
            onClick={handleColorByPositionToggle}
          />
          <StemToggleLabel>Color by neck position</StemToggleLabel>
        </StemToggleRow>
      </SettingsGroup>
    </FretboardSettingsSection>
  )
}

const StemEstimateColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: ${getColor('background')};
  border-radius: 8px;
  min-width: 120px;
`

const EstimateLabel = styled.div`
  font-size: 10px;
  color: ${getColor('textSupporting')};
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const EstimateValue = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: ${getColor('text')};
`

const EstimateDetail = styled.div`
  font-size: 11px;
  color: ${getColor('textSupporting')};
`

const DeleteIconButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: transparent;
  color: ${getColor('alert')};
  border: 1px solid ${getColor('alert')};
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${getColor('alert')};
    color: ${getColor('background')};
  }

  svg {
    width: 16px;
    height: 16px;
  }
`

const ConfirmPopup = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`

const ConfirmDialog = styled.div`
  background: ${getColor('foreground')};
  border-radius: 12px;
  padding: 20px 24px;
  max-width: 320px;
  text-align: center;
`

const ConfirmTitle = styled.h3`
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: ${getColor('text')};
`

const ConfirmMessage = styled.p`
  margin: 0 0 20px 0;
  font-size: 13px;
  color: ${getColor('textSupporting')};
`

const ConfirmActions = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
`

const ConfirmButtonBase = styled.button`
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
`

const ConfirmButtonDanger = styled(ConfirmButtonBase)`
  background: ${getColor('alert')};
  color: white;
  border: none;

  &:hover {
    opacity: 0.9;
  }
`

const ConfirmButtonCancel = styled(ConfirmButtonBase)`
  background: ${getColor('mist')};
  color: ${getColor('text')};
  border: 1px solid ${getColor('textSupporting')};

  &:hover {
    background: ${getColor('mistExtra')};
  }
`

const StackedTimelinesContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const HiddenTimelinesRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 8px 12px;
  background: ${getColor('foreground')};
  border-radius: 6px;
  flex-wrap: wrap;
`

const HiddenTimelinesLabel = styled.span`
  font-size: 12px;
  color: ${getColor('textSupporting')};
`

const ShowHiddenButton = styled.button`
  font-size: 11px;
  padding: 4px 8px;
  background: ${getColor('mist')};
  color: ${getColor('text')};
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${getColor('mistExtra')};
  }
`

const VideoInfo = styled.div`
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 10px 14px;
  background: ${getColor('foreground')};
  border-radius: 8px;
  flex-wrap: wrap;
`

const VideoTitleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`

const YouTubeLink = styled.a`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${getColor('textSupporting')};
  transition: color 0.2s ease;
  flex-shrink: 0;

  &:hover {
    color: #ff0000;
  }

  svg {
    width: 20px;
    height: 20px;
  }
`

const DownloadIconButton = styled.a`
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${getColor('textSupporting')};
  transition: color 0.2s ease;
  flex-shrink: 0;
  margin-left: 8px;

  &:hover {
    color: ${getColor('primary')};
  }

  svg {
    width: 18px;
    height: 18px;
  }
`

const VideoTitle = styled.span`
  font-size: 18px;
  font-weight: 600;
  color: ${getColor('text')};
`

const CloseButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  padding: 4px;
  color: ${getColor('textSupporting')};
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 4px;

  &:hover {
    background: ${getColor('mist')};
    color: ${getColor('text')};
  }

  svg {
    width: 18px;
    height: 18px;
  }
`

const TimeDisplay = styled.span`
  font-size: 12px;
  color: ${getColor('textSupporting')};
  font-family: monospace;
`

// Progress bar styles
const ProgressContainer = styled.div`
  background: ${getColor('foreground')};
  border-radius: 8px;
  padding: 12px 16px;
`

const ProgressLabel = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
`

const ProgressText = styled.span`
  font-size: 12px;
  color: ${getColor('textSupporting')};
`

const ProgressPercent = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${getColor('primary')};
`

const ProgressBarTrack = styled.div`
  width: 100%;
  height: 8px;
  background: ${getColor('mist')};
  border-radius: 4px;
  overflow: hidden;
`

const ProgressBarFill = styled.div<{ $progress: number }>`
  height: 100%;
  width: ${({ $progress }) => $progress}%;
  background: ${getColor('primary')};
  border-radius: 4px;
  transition: width 0.3s ease;
`

const DownloadLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: ${getColor('primary')};
  text-decoration: none;
  padding: 6px 12px;
  background: ${getColor('foreground')};
  border-radius: 6px;
  transition: all 0.2s ease;

  &:hover {
    background: ${getColor('mist')};
  }
`

const AnalysisItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;
`

const AnalysisLabel = styled.span`
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${getColor('textSupporting')};
`

const AnalysisValue = styled.span`
  font-size: 16px;
  font-weight: 600;
  color: ${getColor('text')};
`

const KeyValue = styled(AnalysisValue)`
  color: ${getColor('primary')};
`

// Smaller variants for above video
const AnalysisItemSmall = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
`

const AnalysisIcon = styled.span`
  display: flex;
  align-items: center;
  color: ${getColor('textSupporting')};

  svg {
    width: 14px;
    height: 14px;
  }
`

const AnalysisValueSmall = styled.span`
  font-size: 13px;
  font-weight: 500;
  color: ${getColor('text')};
`

// Chords tab styled components
const ChordAnalysisSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const ProgressionSection = styled.div`
  background: ${getColor('background')};
  border-radius: 8px;
  padding: 12px;
`

const ProgressionLabel = styled.div`
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${getColor('textSupporting')};
  margin-bottom: 8px;
`

const ProgressionRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
  font-family: monospace;
`

const ProgressionChord = styled.span<{ $isNumeral?: boolean }>`
  font-size: ${({ $isNumeral }) => ($isNumeral ? '14px' : '13px')};
  font-weight: ${({ $isNumeral }) => ($isNumeral ? '600' : '500')};
  color: ${({ $isNumeral }) =>
    $isNumeral ? getColor('primary') : getColor('text')};
  min-width: 32px;
  text-align: center;
`

const ProgressionDivider = styled.span`
  color: ${getColor('textSupporting')};
  opacity: 0.5;
`

const UniqueChordsList = styled.div<{ $columns?: boolean }>`
  display: ${({ $columns }) => ($columns ? 'grid' : 'flex')};
  grid-template-columns: ${({ $columns }) => ($columns ? '1fr 1fr' : 'none')};
  flex-direction: column;
  gap: ${({ $columns }) => ($columns ? '4px 16px' : '4px')};
  max-width: 400px;
`

const UniqueChordRow = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background: ${getColor('background')};
  border-radius: 6px;
  border: none;
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: all 0.15s ease;

  &:hover {
    background: ${getColor('mist')};
  }
`

const UniqueChordName = styled.span`
  font-weight: 600;
  font-size: 14px;
  min-width: 60px;
  color: ${getColor('text')};
`

const ChordNumeral = styled.span`
  font-size: 13px;
  color: ${getColor('primary')};
  min-width: 50px;
  font-family: monospace;
`

const ChordStats = styled.span`
  font-size: 11px;
  color: ${getColor('textSupporting')};
  margin-left: auto;
`

// Chordify import button - styled with purple color
const ChordifyImportButton = styled.button<{ $loading?: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: ${({ $loading }) => ($loading ? '#7B1FA2' : '#9C27B0')};
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  cursor: ${({ $loading }) => ($loading ? 'wait' : 'pointer')};
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    background: #7b1fa2;
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

const GroundTruthBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: rgba(156, 39, 176, 0.15);
  color: #9c27b0;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const ImportStatusMessage = styled.div<{ $type: 'success' | 'error' }>`
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  background: ${({ $type }) =>
    $type === 'success'
      ? 'rgba(76, 175, 80, 0.15)'
      : 'rgba(244, 67, 54, 0.15)'};
  color: ${({ $type }) => ($type === 'success' ? '#4CAF50' : '#F44336')};
  margin-top: 8px;
`

const ManualHtmlInputSection = styled.div`
  margin-top: 12px;
  padding: 12px;
  background: rgba(156, 39, 176, 0.05);
  border: 1px solid rgba(156, 39, 176, 0.2);
  border-radius: 8px;
`

const ManualHtmlTextarea = styled.textarea`
  width: 100%;
  min-height: 80px;
  padding: 8px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: white;
  font-size: 11px;
  font-family: monospace;
  resize: vertical;
  margin-top: 8px;

  &::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }

  &:focus {
    outline: none;
    border-color: #9c27b0;
  }
`

const ManualHtmlHelp = styled.div`
  font-size: 11px;
  color: rgba(255, 255, 255, 0.6);
  line-height: 1.4;

  ol {
    margin: 8px 0 0 0;
    padding-left: 20px;
  }

  li {
    margin-bottom: 4px;
  }

  code {
    background: rgba(0, 0, 0, 0.3);
    padding: 1px 4px;
    border-radius: 3px;
    font-size: 10px;
  }
`

const ManualSubmitButton = styled.button`
  margin-top: 8px;
  padding: 6px 12px;
  background: #9c27b0;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: background 0.2s;

  &:hover:not(:disabled) {
    background: #7b1fa2;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`

// Generation tab styled components
const GenerationSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const GenSettingsCard = styled.div`
  background: ${getColor('background')};
  border-radius: 8px;
  padding: 12px;
`

const GenSettingsTitle = styled.div`
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: ${getColor('primary')};
  margin-bottom: 12px;
`

const SettingRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;

  &:last-child {
    margin-bottom: 0;
  }
`

const SettingLabel = styled.label`
  font-size: 13px;
  color: ${getColor('text')};
  flex: 1;
`

const SettingValue = styled.span`
  font-size: 12px;
  color: ${getColor('textSupporting')};
  min-width: 50px;
  text-align: right;
`

const SettingSlider = styled.input`
  width: 120px;
  height: 4px;
  appearance: none;
  background: ${getColor('mist')};
  border-radius: 2px;
  cursor: pointer;

  &::-webkit-slider-thumb {
    appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${getColor('primary')};
    cursor: pointer;
  }

  &::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${getColor('primary')};
    cursor: pointer;
    border: none;
  }
`

const SettingSelect = styled.select`
  background: ${getColor('mist')};
  color: ${getColor('text')};
  border: none;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;

  option {
    background: ${getColor('foreground')};
    color: ${getColor('text')};
  }
`

const PresetButton = styled.button<{ $active?: boolean }>`
  padding: 6px 12px;
  background: ${({ $active }) =>
    $active ? getColor('primary') : getColor('mist')};
  color: ${({ $active }) =>
    $active ? getColor('background') : getColor('text')};
  border: none;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    opacity: 0.85;
  }
`

const PresetRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`

const InfoIconWrapper = styled.div`
  position: relative;
  display: inline-flex;
  align-items: center;
  margin-left: 4px;
`

const InfoIcon = styled.button`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: ${getColor('mist')};
  color: ${getColor('textSupporting')};
  border: none;
  cursor: pointer;
  font-size: 10px;
  font-weight: 600;
  transition: all 0.2s;

  &:hover {
    background: ${getColor('primary')};
    color: ${getColor('background')};
  }
`

const InfoTooltip = styled.div<{ $visible: boolean }>`
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: ${getColor('foreground')};
  border: 1px solid ${getColor('mist')};
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 12px;
  color: ${getColor('text')};
  width: 240px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 100;
  opacity: ${({ $visible }) => ($visible ? 1 : 0)};
  visibility: ${({ $visible }) => ($visible ? 'visible' : 'hidden')};
  pointer-events: ${({ $visible }) => ($visible ? 'auto' : 'none')};
  transition:
    opacity 0.2s,
    visibility 0.2s;
  line-height: 1.4;

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: ${getColor('mist')};
  }
`

const SettingLabelWithInfo = styled.div`
  display: flex;
  align-items: center;
  flex: 1;
`

const HideTimelineButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: transparent;
  color: ${getColor('textSupporting')};
  border: 1px solid ${getColor('mist')};
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;

  &:hover {
    background: ${getColor('mist')};
    color: ${getColor('text')};
  }

  svg {
    width: 14px;
    height: 14px;
  }
`

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function getExtractionStatusText(status: string): string {
  switch (status) {
    case 'starting':
      return 'Starting extraction...'
    case 'downloading':
      return 'Downloading audio...'
    case 'converting':
      return 'Converting to MP3...'
    case 'complete':
      return 'Extraction complete'
    case 'error':
      return 'Extraction failed'
    default:
      return 'Waiting...'
  }
}

type YouTubeChordPlayerProps = {
  onKeyDetected?: (key: KeyInfo) => void
}

// Update URL with video ID (using History API directly)
function updateUrlVideoId(videoId: string | null) {
  if (typeof window === 'undefined') return

  const url = new URL(window.location.href)
  if (videoId) {
    url.searchParams.set('v', videoId)
  } else {
    url.searchParams.delete('v')
  }
  window.history.replaceState({}, '', url.toString())
}

// Get video ID from URL
function getUrlVideoId(): string | null {
  if (typeof window === 'undefined') return null
  const url = new URL(window.location.href)
  return url.searchParams.get('v')
}

export function YouTubeChordPlayer({
  onKeyDetected,
}: YouTubeChordPlayerProps = {}) {
  const { session } = useAuth()

  // Helper to build auth headers for backend requests
  const getAuthHeaders = useCallback((): Record<string, string> => {
    const headers: Record<string, string> = {}
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    }
    return headers
  }, [session?.access_token])

  // Initialize videoId from URL on client
  const [videoId, setVideoId] = useState<string | null>(null)
  const [status, setStatus] = useState<ProcessingStatus>('idle')
  const [songData, setSongData] = useState<SongData | null>(null)
  const [currentChord, setCurrentChord] = useState<Chord | null>(null)
  const [currentTimeSeconds, setCurrentTimeSeconds] = useState(0)
  const [extractionProgress, setExtractionProgress] =
    useState<ExtractionProgress | null>(null)

  // Song settings - persisted per user per song via Supabase
  const {
    settings: songSettings,
    setActiveTab,
    setSelectedStems,
    setStemVolumes,
    setStemMuted,
    setMasterStemsVolume,
    setActiveLibrary,
    setEnabledLibraries,
    setUseBackingTrack,
    setSnapToBeats,
    setUseBeatSyncDetection,
    setEssentiaSettings,
    setHiddenTimelines,
  } = useSongSettings(videoId)

  // Destructure settings for easier access
  const {
    activeTab,
    selectedStems,
    stemVolumes,
    stemMuted,
    masterStemsVolume,
    activeLibrary,
    enabledLibraries,
    useBackingTrack,
    snapToBeats,
    useBeatSyncDetection,
    essentiaSettings,
    hiddenTimelines,
  } = songSettings

  // Stem separation state (not persisted - depends on backend processing status)
  const [stemProgress, setStemProgress] = useState<StemProgress | null>(null)
  const [allStemsMuted, setAllStemsMuted] = useState(false)
  const stemPollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Chord library A/B testing state (chordsByLibrary is fetched from backend, not persisted)
  const [chordsByLibrary, setChordsByLibrary] = useState<ChordsByLibrary>({})
  const [chordifyMetadata, setChordifyMetadata] =
    useState<ChordifyMetadata | null>(null)
  const [analysisProgress, setAnalysisProgress] = useState<
    Record<ChordLibrary, ChordAnalysisProgress>
  >({
    essentia: { progress: 0, status: 'not_started' },
    madmom: { progress: 0, status: 'not_started' },
    btc: { progress: 0, status: 'not_started' },
    chordify: { progress: 0, status: 'not_started' },
  })
  const analysisPollRef = useRef<Record<string, NodeJS.Timeout | null>>({})

  // Check if backing track stem is available (for useBackingTrack toggle)
  const hasBackingTrack =
    stemProgress?.status === 'complete' &&
    stemProgress.stems?.some((s) => s.type === 'backing')

  // Lyrics state
  const [lyricsState, setLyricsState] = useState<LyricsState>({
    status: 'empty',
  })

  // Delete confirmation state
  const [confirmDelete, setConfirmDelete] = useState<'stems' | 'lyrics' | null>(
    null,
  )

  // Resizable column widths (for 3-column layout)
  const [stemsColumnWidth, setStemsColumnWidth] = useState(280)
  const [videoColumnWidth, setVideoColumnWidth] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState<'video' | 'stems' | null>(null)
  const layoutRef = useRef<HTMLDivElement>(null)
  const initialVideoWidthRef = useRef<number | null>(null)

  // Handle column resize
  const handleMouseDown = useCallback((column: 'video' | 'stems') => {
    // Capture initial video width on first drag
    if (
      column === 'video' &&
      layoutRef.current &&
      initialVideoWidthRef.current === null
    ) {
      const videoSection = layoutRef.current.querySelector(
        '[data-column="video"]',
      )
      if (videoSection) {
        initialVideoWidthRef.current =
          videoSection.getBoundingClientRect().width
      }
    }
    setIsDragging(column)
  }, [])

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !layoutRef.current) return

      const layoutRect = layoutRef.current.getBoundingClientRect()

      if (isDragging === 'video') {
        // Calculate new video width based on mouse position
        const newWidth = e.clientX - layoutRect.left - 4 // 4px for half divider
        const initialWidth = initialVideoWidthRef.current || newWidth
        const maxWidth = initialWidth + 120
        const minWidth = 200
        setVideoColumnWidth(Math.max(minWidth, Math.min(maxWidth, newWidth)))
      } else if (isDragging === 'stems') {
        // Calculate stems width based on position after video section
        const videoSection = layoutRef.current.querySelector(
          '[data-column="video"]',
        )
        const videoWidth = videoSection?.getBoundingClientRect().width || 0
        const newWidth = e.clientX - layoutRect.left - videoWidth - 8 // 8px for divider
        setStemsColumnWidth(Math.max(240, Math.min(500, newWidth)))
      }
    },
    [isDragging],
  )

  const handleMouseUp = useCallback(() => {
    setIsDragging(null)
  }, [])

  // Add/remove mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

  // Cloud library integration
  const {
    isAuthenticated,
    isSaved,
    canSave,
    saveStatus,
    error: saveError,
    saveToLibrary,
  } = useSaveToLibrary({
    metadata: songData
      ? {
          videoId: songData.videoId,
          title: songData.title,
          durationSeconds: songData.duration,
        }
      : null,
  })

  // Stem audio playback refs
  const stemAudioRefs = useRef<Record<string, HTMLAudioElement>>({})

  // Check if vocals stem is available for lyrics sync
  const vocalsAudioElement =
    stemProgress?.status === 'complete' &&
    stemProgress.stems?.some((s) => s.type === 'vocals')
      ? stemAudioRefs.current['vocals'] || null
      : null

  // Lyrics sync hook - manages audio element for lyrics display
  // Auto-uses vocals stem if available, otherwise uses proxy audio synced with YouTube
  const {
    audioElement: lyricsSyncAudioElement,
    updateTime: updateLyricsTime,
    setPlaying: setLyricsPlaying,
    seek: seekLyrics,
  } = useLyricsSync({
    stemAudioElement: vocalsAudioElement,
    useStems: !!vocalsAudioElement,
  })

  // Store lyrics sync functions in refs to avoid stale closures
  const updateLyricsTimeRef = useRef(updateLyricsTime)
  updateLyricsTimeRef.current = updateLyricsTime
  const setLyricsPlayingRef = useRef(setLyricsPlaying)
  setLyricsPlayingRef.current = setLyricsPlaying
  const seekLyricsRef = useRef(seekLyrics)
  seekLyricsRef.current = seekLyrics

  const isPlayingRef = useRef(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const lastSyncTimeRef = useRef(0)

  // Playback controls state (for Audio tab card)
  const [playbackVolume, setPlaybackVolume] = useState(100)
  const [playbackMuted, setPlaybackMuted] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)

  // YouTube player ref for controlling playback
  const playerRef = useRef<YouTubePlayerHandle>(null)

  // For user interactions (URL navigation)
  const changeChords = useChangeChords()
  const changeChordsRef = useRef(changeChords)
  changeChordsRef.current = changeChords

  // For real-time playback updates (no URL navigation - fast!)
  const setChordsLive = useSetChordsLive()
  const setChordsLiveRef = useRef(setChordsLive)
  setChordsLiveRef.current = setChordsLive

  const lastChordRef = useRef<string | null>(null)
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Find chord at current time
  const findChordAtTime = useCallback(
    (time: number, chords: ChordEvent[]): Chord | null => {
      if (!chords.length) return null

      let result = chords[0].chord
      for (const event of chords) {
        if (event.time <= time) {
          result = event.chord
        } else {
          break
        }
      }
      return result
    },
    [],
  )

  // Get aligned chords for the active library (matches what timeline displays)
  // This ensures fretboard and timeline show the same chord at the same time
  const alignedActiveChords = useMemo(() => {
    const rawChords =
      chordsByLibrary[activeLibrary] ||
      (activeLibrary === 'essentia' ? songData?.chords : []) ||
      []

    if (!rawChords.length) return rawChords

    // Check if this library is ground truth (Chordify)
    const isGroundTruth =
      CHORD_LIBRARIES.find((lib) => lib.id === activeLibrary)?.isGroundTruth ??
      false
    const beats = songData?.tempo?.beats
    const bpm = songData?.tempo?.bpm

    if (isGroundTruth && beats?.length && bpm) {
      // For Chordify: align to Essentia beat positions
      return alignChordifyToEssentiaBeats(
        rawChords,
        bpm,
        beats,
        chordifyMetadata?.bpm,
      )
    } else if (snapToBeats && beats?.length) {
      // For other libraries: snap to nearest beat if enabled
      return quantizeChordsToBeats(rawChords, beats)
    }

    return rawChords
  }, [
    chordsByLibrary,
    activeLibrary,
    songData?.chords,
    songData?.tempo?.beats,
    songData?.tempo?.bpm,
    chordifyMetadata?.bpm,
    snapToBeats,
  ])

  // Store aligned chords in ref for handleTimeUpdate callback
  const alignedActiveChordsRef = useRef(alignedActiveChords)
  alignedActiveChordsRef.current = alignedActiveChords

  // Update fretboard when chord changes (for initial load and manual seeking)
  // During playback, we update directly in handleTimeUpdate for responsiveness
  useEffect(() => {
    if (!currentChord) return
    const chordKey = `${currentChord.root}-${currentChord.quality}`
    // Skip if already handled by handleTimeUpdate
    if (chordKey === lastChordRef.current) return

    lastChordRef.current = chordKey
    const rootNote = noteNameToNumber[currentChord.root]
    const quality = qualityNameToChordQuality[currentChord.quality] || 'major'
    if (rootNote !== undefined) {
      // Use live state update (no URL navigation) for real-time performance
      setChordsLiveRef.current({ rootNote, quality })
    }
  }, [currentChord])

  // Store callback in ref
  const onKeyDetectedRef = useRef(onKeyDetected)
  onKeyDetectedRef.current = onKeyDetected

  // Poll for extraction progress and fetch updated song data
  const startProgressPolling = useCallback((videoId: string) => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
    }

    let hasNotifiedKey = false

    const poll = async () => {
      try {
        const response = await fetch(
          `${BACKEND_URL}/api/songs/${videoId}/progress`,
        )
        if (response.ok) {
          const data: ExtractionProgress = await response.json()
          setExtractionProgress(data)

          // When complete, fetch the full song data with key/tempo
          if (data.status === 'complete') {
            const songResponse = await fetch(
              `${BACKEND_URL}/api/songs/${videoId}`,
            )
            if (songResponse.ok) {
              const updatedSong: SongData = await songResponse.json()
              setSongData(updatedSong)

              // Notify about detected key (only once)
              if (updatedSong.key && !hasNotifiedKey) {
                hasNotifiedKey = true
                onKeyDetectedRef.current?.(updatedSong.key)
              }
            }
          }

          // Stop polling when complete or error
          if (data.status === 'complete' || data.status === 'error') {
            if (progressIntervalRef.current) {
              clearInterval(progressIntervalRef.current)
              progressIntervalRef.current = null
            }
          }
        }
      } catch (error) {
        console.error('Error polling progress:', error)
      }
    }

    // Poll immediately, then every 500ms
    poll()
    progressIntervalRef.current = setInterval(poll, 500)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
      }
    }
  }, [])

  // Auto-load video from URL parameter on mount
  const hasAutoLoadedRef = useRef(false)

  useEffect(() => {
    // Only run on client, once
    if (hasAutoLoadedRef.current) return

    const urlVideoId = getUrlVideoId()
    if (urlVideoId) {
      hasAutoLoadedRef.current = true

      setVideoId(urlVideoId)
      setStatus('loading')

      fetch(`${BACKEND_URL}/api/songs/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: urlVideoId }),
      })
        .then((response) => {
          if (!response.ok) throw new Error('Failed to process video')
          return response.json()
        })
        .then((data: SongData) => {
          setSongData(data)
          setStatus('ready')
          // Set initial chord and update fretboard (find first real chord, skip empty 'N' chords)
          if (data.chords.length > 0) {
            const firstRealChord = data.chords.find((c) => c.chord.root !== 'N')
            if (firstRealChord) {
              const firstChord = firstRealChord.chord
              setCurrentChord(firstChord)
              // Update fretboard with first real chord
              const rootNote = noteNameToNumber[firstChord.root]
              const quality =
                qualityNameToChordQuality[firstChord.quality] || 'major'
              if (rootNote !== undefined) {
                setChordsLiveRef.current({ rootNote, quality })
                lastChordRef.current = `${firstChord.root}-${firstChord.quality}`
              }
            }
          }
          startProgressPolling(urlVideoId)
        })
        .catch((error) => {
          console.error('Error auto-loading video:', error)
          setStatus('error')
        })
    }
  }, [startProgressPolling])

  const handleVideoSelect = useCallback(
    async (newVideoId: string) => {
      setVideoId(newVideoId)
      updateUrlVideoId(newVideoId)
      setStatus('loading')
      setSongData(null)
      setCurrentChord(null)
      setExtractionProgress(null)
      setActiveTab('audio')
      lastChordRef.current = null

      try {
        const response = await fetch(`${BACKEND_URL}/api/songs/process`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoId: newVideoId }),
        })

        if (!response.ok) {
          throw new Error('Failed to process video')
        }

        const data: SongData = await response.json()
        setSongData(data)
        setStatus('ready')

        // Set initial chord and update fretboard (find first real chord, skip empty 'N' chords)
        if (data.chords.length > 0) {
          const firstRealChord = data.chords.find((c) => c.chord.root !== 'N')
          if (firstRealChord) {
            const firstChord = firstRealChord.chord
            setCurrentChord(firstChord)
            // Update fretboard with first real chord
            const rootNote = noteNameToNumber[firstChord.root]
            const quality =
              qualityNameToChordQuality[firstChord.quality] || 'major'
            if (rootNote !== undefined) {
              setChordsLiveRef.current({ rootNote, quality })
              lastChordRef.current = `${firstChord.root}-${firstChord.quality}`
            }
          }
        }

        // Start polling for extraction progress
        startProgressPolling(newVideoId)
      } catch (error) {
        console.error('Error processing video:', error)
        setStatus('error')
      }
    },
    [startProgressPolling, setActiveTab],
  )

  const handleClear = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current)
      progressIntervalRef.current = null
    }
    if (stemPollIntervalRef.current) {
      clearInterval(stemPollIntervalRef.current)
      stemPollIntervalRef.current = null
    }
    // Stop and cleanup stem audio
    Object.values(stemAudioRefs.current).forEach((audio) => {
      audio.pause()
      audio.src = ''
    })
    stemAudioRefs.current = {}
    isPlayingRef.current = false

    setVideoId(null)
    updateUrlVideoId(null)
    setStatus('idle')
    setSongData(null)
    setCurrentChord(null)
    setCurrentTimeSeconds(0)
    setExtractionProgress(null)
    setStemProgress(null)
    setLyricsState({ status: 'empty' })
    lastChordRef.current = null
  }, [])

  // Poll for stem separation progress
  const pollStemProgress = useCallback(async (vid: string) => {
    try {
      const response = await fetch(
        `${BACKEND_URL}/api/songs/${vid}/stems/progress`,
      )
      if (response.ok) {
        const data: StemProgress = await response.json()
        setStemProgress(data)

        // Stop polling when complete or error
        if (data.status === 'complete' || data.status === 'error') {
          if (stemPollIntervalRef.current) {
            clearInterval(stemPollIntervalRef.current)
            stemPollIntervalRef.current = null
          }
        }
      }
    } catch (error) {
      console.error('Error polling stem progress:', error)
    }
  }, [])

  // Toggle stem selection
  const handleStemToggle = useCallback(
    (stemType: StemType) => {
      const next = new Set(selectedStems)
      if (next.has(stemType)) {
        next.delete(stemType)
      } else {
        next.add(stemType)
      }
      setSelectedStems(next)
    },
    [selectedStems, setSelectedStems],
  )

  // Start stem separation
  const handleSeparateStems = useCallback(async () => {
    if (!videoId || selectedStems.size === 0) return

    setStemProgress({ progress: 0, status: 'pending' })

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/songs/${videoId}/stems/separate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...getAuthHeaders(),
          },
          body: JSON.stringify({
            stems: Array.from(selectedStems),
          }),
        },
      )

      if (!response.ok) {
        const error = await response.json()
        setStemProgress({
          progress: 0,
          status: 'error',
          error: error.message || 'Failed to start stem separation',
        })
        return
      }

      const data = await response.json()

      // If already complete, set the stems
      if (data.status === 'complete' && data.stems) {
        setStemProgress({
          progress: 100,
          status: 'complete',
          stems: data.stems,
        })
        return
      }

      // Start polling for progress
      if (stemPollIntervalRef.current) {
        clearInterval(stemPollIntervalRef.current)
      }
      stemPollIntervalRef.current = setInterval(
        () => pollStemProgress(videoId),
        1000,
      )
    } catch (error) {
      console.error('Error starting stem separation:', error)
      setStemProgress({
        progress: 0,
        status: 'error',
        error: 'Failed to connect to server',
      })
    }
  }, [videoId, selectedStems, pollStemProgress, getAuthHeaders])

  // Handle volume change
  const handleVolumeChange = useCallback(
    (stemType: string, volume: number) => {
      setStemVolumes({ ...stemVolumes, [stemType]: volume })
    },
    [stemVolumes, setStemVolumes],
  )

  // Handle mute toggle
  const handleMuteToggle = useCallback(
    (stemType: string) => {
      setStemMuted({ ...stemMuted, [stemType]: !stemMuted[stemType] })
    },
    [stemMuted, setStemMuted],
  )

  // Delete stems and start over
  const handleDeleteStems = useCallback(async () => {
    if (!videoId) return

    // Stop and cleanup stem audio
    Object.values(stemAudioRefs.current).forEach((audio) => {
      audio.pause()
      audio.src = ''
    })
    stemAudioRefs.current = {}
    isPlayingRef.current = false

    try {
      await fetch(`${BACKEND_URL}/api/songs/${videoId}/stems`, {
        method: 'DELETE',
      })
    } catch (error) {
      console.error('Error deleting stems:', error)
    }

    // Reset stem progress to show selection UI again
    setStemProgress(null)
    setSelectedStems(new Set(ALL_STEM_TYPES))
  }, [videoId, setSelectedStems])

  // Poll for chord analysis progress
  const pollAnalysisProgress = useCallback(
    async (vid: string, library: ChordLibrary) => {
      try {
        const response = await fetch(
          `${BACKEND_URL}/api/songs/${vid}/analyze/${library}/progress`,
        )
        if (response.ok) {
          const data = await response.json()
          setAnalysisProgress((prev) => ({
            ...prev,
            [library]: data,
          }))

          // If complete, fetch the chords
          if (data.status === 'complete') {
            const chordsResponse = await fetch(
              `${BACKEND_URL}/api/songs/${vid}/chords?library=${library}`,
            )
            if (chordsResponse.ok) {
              const chordsData = await chordsResponse.json()
              setChordsByLibrary((prev) => ({
                ...prev,
                [library]: chordsData.chords,
              }))
            }

            // Stop polling
            if (analysisPollRef.current[library]) {
              clearInterval(analysisPollRef.current[library]!)
              analysisPollRef.current[library] = null
            }
          }

          if (data.status === 'error') {
            if (analysisPollRef.current[library]) {
              clearInterval(analysisPollRef.current[library]!)
              analysisPollRef.current[library] = null
            }
          }
        }
      } catch (error) {
        console.error(`Error polling ${library} analysis progress:`, error)
      }
    },
    [],
  )

  // Trigger analysis with a specific library
  const triggerLibraryAnalysis = useCallback(
    async (library: ChordLibrary) => {
      if (!videoId) return

      setAnalysisProgress((prev) => ({
        ...prev,
        [library]: { progress: 0, status: 'pending' },
      }))

      try {
        const response = await fetch(
          `${BACKEND_URL}/api/songs/${videoId}/analyze/${library}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              useBackingTrack: useBackingTrack && hasBackingTrack,
              useBeatSyncDetection,
              // Pass Essentia settings when analyzing with Essentia
              ...(library === 'essentia' && { essentiaSettings }),
            }),
          },
        )

        if (response.ok) {
          const data = await response.json()

          if (data.status === 'complete' && data.chords) {
            // Already analyzed
            setChordsByLibrary((prev) => ({
              ...prev,
              [library]: data.chords,
            }))
            setAnalysisProgress((prev) => ({
              ...prev,
              [library]: { progress: 100, status: 'complete' },
            }))
          } else {
            // Start polling for progress
            if (analysisPollRef.current[library]) {
              clearInterval(analysisPollRef.current[library]!)
            }
            analysisPollRef.current[library] = setInterval(
              () => pollAnalysisProgress(videoId, library),
              1000,
            )
          }
        }
      } catch (error) {
        console.error(`Error triggering ${library} analysis:`, error)
        setAnalysisProgress((prev) => ({
          ...prev,
          [library]: {
            progress: 0,
            status: 'error',
            error: 'Failed to start analysis',
          },
        }))
      }
    },
    [
      videoId,
      pollAnalysisProgress,
      useBackingTrack,
      hasBackingTrack,
      useBeatSyncDetection,
      essentiaSettings,
    ],
  )

  // Handle library toggle (checkbox)
  const handleLibraryToggle = useCallback(
    (library: ChordLibrary) => {
      const next = new Set(enabledLibraries)
      if (next.has(library)) {
        next.delete(library)
        // If we're disabling the active library, switch to another enabled one
        if (activeLibrary === library) {
          const remaining = Array.from(next) as ChordLibrary[]
          if (remaining.length > 0) {
            setActiveLibrary(remaining[0])
          }
        }
      } else {
        next.add(library)
        // If this library hasn't been analyzed yet, trigger analysis
        if (
          !chordsByLibrary[library] &&
          analysisProgress[library]?.status !== 'processing'
        ) {
          triggerLibraryAnalysis(library)
        }
      }
      setEnabledLibraries(next)
    },
    [
      enabledLibraries,
      activeLibrary,
      chordsByLibrary,
      analysisProgress,
      triggerLibraryAnalysis,
      setEnabledLibraries,
      setActiveLibrary,
    ],
  )

  // Handle selecting which library controls the fretboard
  const handleLibrarySelect = useCallback(
    (library: ChordLibrary) => {
      setActiveLibrary(library)
      // Reset lastChordRef to force fretboard update with new library's chord
      lastChordRef.current = null
    },
    [setActiveLibrary],
  )

  // Handle clicking on a chord block in timeline to show it on fretboard
  const handleChordClick = useCallback(
    (chord: { root: string; quality: string }) => {
      const rootNote = noteNameToNumber[chord.root]
      const quality = qualityNameToChordQuality[chord.quality] || 'major'
      if (rootNote !== undefined) {
        setChordsLiveRef.current({ rootNote, quality })
        setCurrentChord(chord)
        lastChordRef.current = `${chord.root}-${chord.quality}`
      }
    },
    [],
  )

  // Handle deleting chord analysis for a library (to regenerate)
  const handleLibraryDelete = useCallback(
    async (library: ChordLibrary) => {
      if (!videoId) return

      try {
        // Call backend to delete persisted chord data
        const response = await fetch(
          `${BACKEND_URL}/api/songs/${videoId}/chords/${library}`,
          { method: 'DELETE' },
        )

        if (!response.ok) {
          console.error('Failed to delete chord data:', await response.text())
        }
      } catch (error) {
        console.error('Error deleting chord data:', error)
      }

      // Clear local chords state
      setChordsByLibrary((prev) => {
        const next = { ...prev }
        delete next[library]
        return next
      })

      // Reset analysis progress to not_started (user can re-enable to trigger)
      setAnalysisProgress((prev) => ({
        ...prev,
        [library]: { progress: 0, status: 'not_started' },
      }))

      // If this was essentia (primary), also clear songData.chords
      if (library === 'essentia') {
        setSongData((prev) => (prev ? { ...prev, chords: [] } : prev))
      }

      // Disable this library (user toggles it back on to re-analyze)
      const next = new Set(enabledLibraries)
      next.delete(library)
      setEnabledLibraries(next)

      // If this was the active library, switch to another enabled one
      if (activeLibrary === library) {
        const remaining = Array.from(enabledLibraries).filter(
          (l) => l !== library,
        ) as ChordLibrary[]
        if (remaining.length > 0) {
          setActiveLibrary(remaining[0])
        }
      }
    },
    [
      videoId,
      activeLibrary,
      enabledLibraries,
      setEnabledLibraries,
      setActiveLibrary,
    ],
  )

  // Handle hide/show timeline toggle
  const handleTimelineVisibilityToggle = useCallback(
    (library: ChordLibrary) => {
      setHiddenTimelines({
        ...hiddenTimelines,
        [library]: !hiddenTimelines[library],
      })
    },
    [hiddenTimelines, setHiddenTimelines],
  )

  // Chordify import state
  const [chordifyImportStatus, setChordifyImportStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle')
  const [chordifyImportError, setChordifyImportError] = useState<string | null>(
    null,
  )
  const [showManualHtmlInput, setShowManualHtmlInput] = useState(false)
  const [manualHtml, setManualHtml] = useState('')

  // Import chords from Chordify using provided HTML
  const importChordifyWithHtml = useCallback(
    async (html: string) => {
      if (!videoId) return

      setChordifyImportStatus('loading')
      setChordifyImportError(null)
      setAnalysisProgress((prev) => ({
        ...prev,
        chordify: { progress: 50, status: 'processing' },
      }))

      try {
        const response = await fetch(
          `${BACKEND_URL}/api/songs/${videoId}/import-chordify`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ html }),
          },
        )

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Failed to parse Chordify HTML')
        }

        const result = await response.json()

        // Fetch updated chords from backend
        const chordsResponse = await fetch(
          `${BACKEND_URL}/api/songs/${videoId}/chords?library=chordify`,
        )
        if (chordsResponse.ok) {
          const chordsData = await chordsResponse.json()
          setChordsByLibrary((prev) => ({
            ...prev,
            chordify: chordsData.chords,
          }))
        }

        // Update analysis progress to complete
        setAnalysisProgress((prev) => ({
          ...prev,
          chordify: { progress: 100, status: 'complete' },
        }))

        // Enable chordify library and make it active
        const nextLibraries = new Set(enabledLibraries)
        nextLibraries.add('chordify')
        setEnabledLibraries(nextLibraries)
        setActiveLibrary('chordify')

        setChordifyImportStatus('success')
        setShowManualHtmlInput(false)
        setManualHtml('')
        console.log(
          `Imported ${result.data?.chordCount || 0} chords from Chordify`,
        )
      } catch (error) {
        console.error('Chordify import error:', error)
        setChordifyImportStatus('error')
        setChordifyImportError(
          error instanceof Error
            ? error.message
            : 'Failed to import from Chordify',
        )
        setAnalysisProgress((prev) => ({
          ...prev,
          chordify: {
            progress: 0,
            status: 'error',
            error:
              error instanceof Error
                ? error.message
                : 'Failed to import from Chordify',
          },
        }))
      }
    },
    [videoId, enabledLibraries, setEnabledLibraries, setActiveLibrary],
  )

  // Import chords from Chordify (ground truth) - try direct first, then show manual option
  const handleChordifyImport = useCallback(async () => {
    if (!videoId) return

    setChordifyImportStatus('loading')
    setChordifyImportError(null)
    setAnalysisProgress((prev) => ({
      ...prev,
      chordify: { progress: 50, status: 'processing' },
    }))

    try {
      const response = await fetch(
        `${BACKEND_URL}/api/songs/${videoId}/import-chordify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
      )

      if (!response.ok) {
        const error = await response.json()
        setChordifyImportStatus('error')

        // Determine error type and show appropriate message
        if (
          error.error?.includes('not found') ||
          error.error?.includes('NOT_FOUND') ||
          error.type === 'NOT_FOUND'
        ) {
          // Song not available on Chordify
          setChordifyImportError(
            'This song is not available on Chordify, or chords are unavailable for this video.',
          )
        } else if (
          error.error?.includes('No chord data') ||
          error.type === 'PARSE_ERROR'
        ) {
          // Chords didn't load - show manual fallback
          setChordifyImportError(
            'Could not load chord data. Try manual import below.',
          )
          setShowManualHtmlInput(true)
        } else {
          // Other errors - show manual fallback
          setChordifyImportError(
            error.error || 'Import failed. Try manual import below.',
          )
          setShowManualHtmlInput(true)
        }

        setAnalysisProgress((prev) => ({
          ...prev,
          chordify: { progress: 0, status: 'not_started' },
        }))
        return
      }

      const result = await response.json()

      // Fetch updated chords from backend
      const chordsResponse = await fetch(
        `${BACKEND_URL}/api/songs/${videoId}/chords?library=chordify`,
      )
      if (chordsResponse.ok) {
        const chordsData = await chordsResponse.json()
        setChordsByLibrary((prev) => ({
          ...prev,
          chordify: chordsData.chords,
        }))
      }

      setAnalysisProgress((prev) => ({
        ...prev,
        chordify: { progress: 100, status: 'complete' },
      }))

      const nextLibraries = new Set(enabledLibraries)
      nextLibraries.add('chordify')
      setEnabledLibraries(nextLibraries)
      setActiveLibrary('chordify')

      setChordifyImportStatus('success')
      console.log(
        `Imported ${result.data?.chordCount || 0} chords from Chordify`,
      )
    } catch (error) {
      console.error('Chordify import error:', error)
      setChordifyImportStatus('error')
      const message =
        error instanceof Error ? error.message : 'Unknown error occurred'
      setChordifyImportError(`Import failed: ${message}`)
      setShowManualHtmlInput(true)
      setAnalysisProgress((prev) => ({
        ...prev,
        chordify: { progress: 0, status: 'not_started' },
      }))
    }
  }, [videoId, enabledLibraries, setEnabledLibraries, setActiveLibrary])

  // Check if vocals stem is available for lyrics generation
  const hasVocalsStemForLyrics =
    (stemProgress?.status === 'complete' &&
      stemProgress.stems?.some((s) => s.type === 'vocals')) ||
    false

  // Lyrics generation API integration
  const {
    generateLyrics: handleGenerateLyrics,
    cancelGeneration: handleLyricsCancel,
  } = useLyricsGeneration({
    videoId,
    hasVocalsStem: hasVocalsStemForLyrics,
    onStateChange: setLyricsState,
    getAuthHeaders,
  })

  const handleLyricsRetry = useCallback(() => {
    handleGenerateLyrics()
  }, [handleGenerateLyrics])

  // Fetch existing lyrics when videoId changes
  useEffect(() => {
    if (!videoId) return

    const fetchExistingLyrics = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/lyrics/${videoId}`)
        if (response.ok) {
          const data = await response.json()
          if (data.status === 'complete' && data.lrcContent) {
            setLyricsState({
              status: 'loaded',
              lrcContent: data.lrcContent,
              hasWordTiming: data.hasWordTiming || false,
            })
          }
        }
      } catch (error) {
        // Lyrics don't exist yet, that's fine
        console.log('No existing lyrics found for', videoId)
      }
    }

    fetchExistingLyrics()
  }, [videoId])

  // Delete lyrics handler
  const handleDeleteLyrics = useCallback(async () => {
    if (!videoId) return

    try {
      await fetch(`${BACKEND_URL}/api/lyrics/${videoId}`, { method: 'DELETE' })
      setLyricsState({ status: 'empty' })
    } catch (error) {
      console.error('Failed to delete lyrics:', error)
    }
  }, [videoId])

  // Initialize audio elements when stems become available
  useEffect(() => {
    if (
      stemProgress?.status !== 'complete' ||
      !stemProgress.stems ||
      !videoId
    ) {
      return
    }

    // Create audio elements for each stem
    const audioRefs: Record<string, HTMLAudioElement> = {}
    for (const stem of stemProgress.stems) {
      const audio = new Audio()
      audio.src = `${BACKEND_URL}/stems/${videoId}/${stem.type}.mp3`
      audio.preload = 'auto'
      audio.volume = stemVolumes[stem.type] || 1
      audio.muted = stemMuted[stem.type] || false
      audioRefs[stem.type] = audio
    }
    stemAudioRefs.current = audioRefs

    // Cleanup function
    return () => {
      Object.values(stemAudioRefs.current).forEach((audio) => {
        audio.pause()
        audio.src = ''
      })
      stemAudioRefs.current = {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stemProgress?.status, stemProgress?.stems, videoId])

  // Update audio volumes when volume state changes
  useEffect(() => {
    const masterMultiplier = masterStemsVolume / 100
    Object.entries(stemAudioRefs.current).forEach(([type, audio]) => {
      audio.volume =
        allStemsMuted || stemMuted[type]
          ? 0
          : (stemVolumes[type] || 1) * masterMultiplier
    })
  }, [stemVolumes, stemMuted, allStemsMuted, masterStemsVolume])

  // Toggle all stems mute (used by video player mute button)
  const handleToggleAllStemsMute = useCallback(() => {
    setAllStemsMuted((prev) => !prev)
  }, [])

  // Change master stems volume (used by video player volume slider)
  const handleMasterStemsVolumeChange = useCallback(
    (volume: number) => {
      setMasterStemsVolume(volume)
      // If volume is changed from 0, unmute
      if (volume > 0 && allStemsMuted) {
        setAllStemsMuted(false)
      }
    },
    [allStemsMuted, setMasterStemsVolume],
  )

  // Handle YouTube play state changes
  const handlePlayStateChange = useCallback(
    (playing: boolean) => {
      isPlayingRef.current = playing
      setIsPlaying(playing)
      Object.values(stemAudioRefs.current).forEach((audio) => {
        if (playing) {
          audio.play().catch(() => {
            // Ignore autoplay errors
          })
        } else {
          audio.pause()
        }
      })
      // Update lyrics sync play state
      setLyricsPlayingRef.current(playing)
      // Auto-switch to lyrics tab when playback starts
      if (playing) {
        setActiveTab('lyrics')
      }
    },
    [setActiveTab],
  )

  // Handle YouTube seek
  const handleYouTubeSeek = useCallback((timeMs: number) => {
    const timeSeconds = timeMs / 1000

    // Validate that timeSeconds is a finite number
    if (!Number.isFinite(timeSeconds) || timeSeconds < 0) return

    // Update current time state so timeline also resets to new position
    setCurrentTimeSeconds(timeSeconds)

    lastSyncTimeRef.current = timeSeconds
    Object.values(stemAudioRefs.current).forEach((audio) => {
      audio.currentTime = timeSeconds
    })
    // Seek lyrics sync
    seekLyricsRef.current(timeMs)
  }, [])

  // Handle rewind - seeks to beginning and syncs everything
  const handleRewind = useCallback(() => {
    playerRef.current?.seekTo(0)
    handleYouTubeSeek(0)
  }, [handleYouTubeSeek])

  // Handle seek preview - updates chord timeline position during drag
  const handleSeekPreview = useCallback((timeMs: number) => {
    const timeSeconds = timeMs / 1000
    if (!Number.isFinite(timeSeconds) || timeSeconds < 0) return
    setCurrentTimeSeconds(timeSeconds)
  }, [])

  // Handle playback volume change
  const handlePlaybackVolumeChange = useCallback((volume: number) => {
    setPlaybackVolume(volume)
    playerRef.current?.setVolume(volume)
  }, [])

  // Handle playback mute toggle
  const handlePlaybackMuteToggle = useCallback(() => {
    setPlaybackMuted((prev) => {
      const newMuted = !prev
      if (newMuted !== playerRef.current?.isMuted()) {
        playerRef.current?.toggleMute()
      }
      return newMuted
    })
  }, [])

  // Handle playback rate change
  const handlePlaybackRateChange = useCallback((rate: number) => {
    setPlaybackRate(rate)
    playerRef.current?.setPlaybackRate(rate)
  }, [])

  // Cleanup stem polling on unmount
  useEffect(() => {
    return () => {
      if (stemPollIntervalRef.current) {
        clearInterval(stemPollIntervalRef.current)
      }
    }
  }, [])

  // Check for existing stems when video is loaded
  useEffect(() => {
    if (videoId && status === 'ready') {
      pollStemProgress(videoId)
    }
  }, [videoId, status, pollStemProgress])

  // Fetch chordsByLibrary when video is loaded
  useEffect(() => {
    if (!videoId || status !== 'ready') return

    const fetchChordsByLibrary = async () => {
      try {
        // Reset state for new video
        setChordifyMetadata(null)

        const response = await fetch(
          `${BACKEND_URL}/api/songs/${videoId}/chords`,
        )
        if (response.ok) {
          const data = await response.json()
          if (data.chordsByLibrary) {
            setChordsByLibrary(data.chordsByLibrary)
            // Update analysis progress for libraries that have been analyzed
            setAnalysisProgress((prev) => {
              const newProgress = { ...prev }
              for (const lib of Object.keys(
                data.chordsByLibrary,
              ) as ChordLibrary[]) {
                newProgress[lib] = { progress: 100, status: 'complete' }
              }
              return newProgress
            })
          }
          // Store Chordify metadata (contains BPM for alignment)
          if (data.chordifyMetadata) {
            setChordifyMetadata(data.chordifyMetadata)
          }
        }
      } catch (_error) {
        console.error('Error fetching chordsByLibrary:', _error)
      }
    }

    fetchChordsByLibrary()
  }, [videoId, status])

  // Auto-fetch Essentia and Chordify when a new song is loaded
  const autoFetchTriggeredRef = useRef<string | null>(null)
  useEffect(() => {
    if (!videoId || status !== 'ready' || !songData) return
    // Prevent double-triggering for the same video
    if (autoFetchTriggeredRef.current === videoId) return
    autoFetchTriggeredRef.current = videoId

    // Trigger Essentia if not already analyzed
    const essentiaProgress = analysisProgress.essentia
    const hasEssentia = (chordsByLibrary.essentia?.length ?? 0) > 0
    if (
      !hasEssentia &&
      essentiaProgress?.status !== 'processing' &&
      essentiaProgress?.status !== 'pending'
    ) {
      triggerLibraryAnalysis('essentia')
    }

    // Trigger Chordify import if not already analyzed
    // Note: Chordify uses a separate import endpoint, not the analyze endpoint
    const chordifyProgress = analysisProgress.chordify
    const hasChordify = (chordsByLibrary.chordify?.length ?? 0) > 0
    if (
      !hasChordify &&
      chordifyProgress?.status !== 'processing' &&
      chordifyProgress?.status !== 'pending' &&
      chordifyImportStatus !== 'loading'
    ) {
      handleChordifyImport()
    }
  }, [
    videoId,
    status,
    songData,
    chordsByLibrary,
    analysisProgress,
    triggerLibraryAnalysis,
    handleChordifyImport,
    chordifyImportStatus,
  ])

  // Cleanup analysis polling on unmount
  useEffect(() => {
    const pollRef = analysisPollRef.current
    return () => {
      Object.values(pollRef).forEach((interval) => {
        if (interval) clearInterval(interval)
      })
    }
  }, [])

  // Space bar to toggle play/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle space if not typing in an input/textarea
      if (
        e.code === 'Space' &&
        !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)
      ) {
        e.preventDefault()
        playerRef.current?.toggle()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Store songData in ref for direct access in callback (avoids stale closure)
  const songDataRef = useRef(songData)
  songDataRef.current = songData

  const handleTimeUpdate = useCallback(
    (timeMs: number) => {
      const timeSeconds = timeMs / 1000

      // Validate that timeSeconds is a finite number
      if (!Number.isFinite(timeSeconds) || timeSeconds < 0) return

      setCurrentTimeSeconds(timeSeconds)

      // Sync stem audio every 2 seconds to prevent drift
      if (
        isPlayingRef.current &&
        Math.abs(timeSeconds - lastSyncTimeRef.current) > 2
      ) {
        lastSyncTimeRef.current = timeSeconds
        Object.values(stemAudioRefs.current).forEach((audio) => {
          if (Math.abs(audio.currentTime - timeSeconds) > 0.3) {
            audio.currentTime = timeSeconds
          }
        })
      }

      // Update lyrics sync time (for proxy audio when not using stems)
      updateLyricsTimeRef.current(timeMs)

      // Use aligned chords (same transformation as timeline display)
      // This ensures fretboard and timeline show the same chord at the same time
      const activeChords = alignedActiveChordsRef.current

      if (activeChords?.length) {
        const chord = findChordAtTime(timeSeconds, activeChords)
        if (chord) {
          const chordKey = `${chord.root}-${chord.quality}`

          // Only update if chord actually changed (direct update, bypasses React effect)
          if (chordKey !== lastChordRef.current) {
            lastChordRef.current = chordKey
            setCurrentChord(chord)

            // Update fretboard directly here instead of waiting for effect
            // Use live state update (no URL navigation) for real-time performance
            const rootNote = noteNameToNumber[chord.root]
            const quality = qualityNameToChordQuality[chord.quality] || 'major'
            if (rootNote !== undefined) {
              setChordsLiveRef.current({ rootNote, quality })
            }
          }
        }
      }
    },
    [findChordAtTime],
  )

  const isLoading = status === 'loading' || status === 'processing'
  const showExtractionProgress =
    extractionProgress && extractionProgress.status !== 'complete'
  const audioUrl = extractionProgress?.audioUrl || songData?.audioUrl

  // Get tab status for showing ready/not-ready indicators
  const getTabStatus = useCallback(
    (tab: MediaTab): boolean => {
      switch (tab) {
        case 'audio':
          return !!audioUrl
        case 'stems':
          return (
            stemProgress?.status === 'complete' && !!stemProgress.stems?.length
          )
        case 'lyrics':
          return lyricsState.status === 'loaded'
        case 'chords':
          return !!(
            songData?.chords?.length ||
            Object.keys(chordsByLibrary).some(
              (k) => chordsByLibrary[k as ChordLibrary]?.length,
            )
          )
        case 'generation':
          return true // Always ready - it's a settings tab
        case 'fretboard':
          return true // Always ready - it's a settings tab
        default:
          return false
      }
    },
    [
      audioUrl,
      stemProgress,
      lyricsState.status,
      songData?.chords,
      chordsByLibrary,
    ],
  )

  // Render tab with status dot
  const renderTab = useCallback(
    (tab: MediaTab) => {
      const isReady = getTabStatus(tab)
      return (
        <TabLabel>
          <StatusDot $isReady={isReady} />
          {tabLabels[tab]}
        </TabLabel>
      )
    },
    [getTabStatus],
  )

  // Render the playback controls card (volume, mute, speed)
  const renderPlaybackControlsCard = () => {
    const isReady = status === 'ready'
    return (
      <PlaybackControlsCard>
        <PlaybackControlsRow>
          <PlaybackMuteButton
            $muted={playbackMuted}
            onClick={handlePlaybackMuteToggle}
            disabled={!isReady}
          >
            {playbackMuted || playbackVolume === 0 ? (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
              </svg>
            )}
          </PlaybackMuteButton>
          <PlaybackVolumeSlider
            type="range"
            min={0}
            max={100}
            value={playbackMuted ? 0 : playbackVolume}
            onChange={(e) => handlePlaybackVolumeChange(Number(e.target.value))}
            disabled={!isReady}
          />
          <PlaybackSpeedSelect
            value={playbackRate}
            onChange={(e) => handlePlaybackRateChange(Number(e.target.value))}
            disabled={!isReady}
          >
            {PLAYBACK_RATES.map((rate) => (
              <option key={rate} value={rate}>
                {rate}x
              </option>
            ))}
          </PlaybackSpeedSelect>
        </PlaybackControlsRow>
      </PlaybackControlsCard>
    )
  }

  // Separate function to render stems content (always visible in stems column)
  const renderStemsContent = () => {
    // Inner content based on state
    const renderInnerContent = () => {
      // No audio extracted yet
      if (!audioUrl) {
        return (
          <TabPlaceholder>
            Extract audio first to enable stem separation
          </TabPlaceholder>
        )
      }

      // Stems already available
      if (stemProgress?.status === 'complete' && stemProgress.stems) {
        return (
          <StemControlsContainer>
            {stemProgress.stems.map((stem) => (
              <StemRow key={stem.type}>
                <StemLabel>{STEM_LABELS[stem.type] || stem.type}</StemLabel>
                <StemVolumeSlider
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={stemMuted[stem.type] ? 0 : stemVolumes[stem.type] || 1}
                  onChange={(e) =>
                    handleVolumeChange(stem.type, parseFloat(e.target.value))
                  }
                  disabled={stemMuted[stem.type]}
                />
                <MuteButton
                  $muted={stemMuted[stem.type] || false}
                  onClick={() => handleMuteToggle(stem.type)}
                >
                  {stemMuted[stem.type] ? (
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      width="16"
                      height="16"
                    >
                      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                    </svg>
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      width="16"
                      height="16"
                    >
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                    </svg>
                  )}
                </MuteButton>
              </StemRow>
            ))}
            <HStack
              justifyContent="flex-end"
              alignItems="center"
              style={{ marginTop: 8 }}
            >
              <DeleteIconButton
                onClick={() => setConfirmDelete('stems')}
                title="Delete stems"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  <line x1="10" y1="11" x2="10" y2="17"></line>
                  <line x1="14" y1="11" x2="14" y2="17"></line>
                </svg>
              </DeleteIconButton>
            </HStack>
          </StemControlsContainer>
        )
      }

      // Separation in progress
      if (
        stemProgress &&
        stemProgress.status !== 'not_started' &&
        stemProgress.status !== 'error' &&
        stemProgress.status !== 'complete'
      ) {
        const statusLabels: Record<string, string> = {
          pending: 'Preparing...',
          uploading: 'Uploading audio...',
          processing: 'Separating stems...',
          downloading: 'Downloading stems...',
        }
        const statusText = statusLabels[stemProgress.status] || 'Processing...'

        return (
          <VStack gap={12}>
            <StemStatusText>{statusText}</StemStatusText>
            <StemProgressBar>
              <StemProgressFill $progress={stemProgress.progress} />
            </StemProgressBar>
            <StemStatusText>
              {Math.round(stemProgress.progress)}%
            </StemStatusText>
          </VStack>
        )
      }

      // Error state
      if (stemProgress?.status === 'error') {
        return (
          <VStack gap={12}>
            <TabPlaceholder style={{ color: 'var(--alert)' }}>
              {stemProgress.error || 'Stem separation failed'}
            </TabPlaceholder>
            <SeparateButton onClick={handleSeparateStems}>
              Try Again
            </SeparateButton>
          </VStack>
        )
      }

      // Ready to separate - show stem selection
      const songDuration = songData?.duration || 0
      const songMinutes = Math.ceil(songDuration / 60)
      const estimatedMinutes = songMinutes * selectedStems.size

      return (
        <VStack gap={16}>
          <StemSelectionContainer>
            <StemSelectionList>
              {ALL_STEM_TYPES.map((stemType) => (
                <StemToggleRow key={stemType}>
                  <StemToggleSwitch
                    $enabled={selectedStems.has(stemType)}
                    onClick={() => handleStemToggle(stemType)}
                  />
                  <StemToggleLabel>{STEM_LABELS[stemType]}</StemToggleLabel>
                </StemToggleRow>
              ))}
            </StemSelectionList>
            {songDuration > 0 && (
              <StemEstimateColumn>
                <EstimateLabel>Estimated</EstimateLabel>
                <EstimateValue>~{estimatedMinutes || 0} min</EstimateValue>
                {selectedStems.size > 0 && (
                  <EstimateDetail>
                    {songMinutes} min × {selectedStems.size} stem
                    {selectedStems.size !== 1 ? 's' : ''}
                  </EstimateDetail>
                )}
              </StemEstimateColumn>
            )}
          </StemSelectionContainer>
          <SeparateButton
            onClick={handleSeparateStems}
            disabled={selectedStems.size === 0}
          >
            {selectedStems.size === 0
              ? 'Select stems'
              : `Separate ${selectedStems.size} Stem${selectedStems.size !== 1 ? 's' : ''}`}
          </SeparateButton>
        </VStack>
      )
    }

    // Wrap everything with playback controls at the bottom
    return (
      <VStack gap={12} style={{ height: '100%' }}>
        <div style={{ flex: 1 }}>{renderInnerContent()}</div>
        {renderPlaybackControlsCard()}
      </VStack>
    )
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'stems':
        return renderStemsContent()
      case 'lyrics': {
        // Check if vocals stem is available
        const hasVocalsStem =
          stemProgress?.status === 'complete' &&
          stemProgress.stems?.some((s) => s.type === 'vocals')

        return (
          <LyricsPanel
            lyricsState={lyricsState}
            hasVocalsStem={hasVocalsStem || false}
            onGenerateLyrics={handleGenerateLyrics}
            onRetry={handleLyricsRetry}
            onCancel={handleLyricsCancel}
            onDelete={() => setConfirmDelete('lyrics')}
            isAudioAvailable={!!audioUrl}
            audioElement={lyricsSyncAudioElement}
          />
        )
      }
      case 'generation': {
        const updateEssentiaSetting = <K extends keyof EssentiaSettings>(
          key: K,
          value: EssentiaSettings[K],
        ) => {
          setEssentiaSettings({ ...essentiaSettings, [key]: value })
        }

        const applyPreset = (preset: 'default' | 'guitar' | 'precision') => {
          switch (preset) {
            case 'default':
              setEssentiaSettings(DEFAULT_ESSENTIA_SETTINGS)
              break
            case 'guitar':
              setEssentiaSettings({
                ...DEFAULT_ESSENTIA_SETTINGS,
                minFrequency: 80,
                maxFrequency: 3000,
                harmonics: 4,
                hpcpSize: 36,
              })
              break
            case 'precision':
              setEssentiaSettings({
                ...DEFAULT_ESSENTIA_SETTINGS,
                hpcpSize: 36,
                harmonics: 4,
                nonLinear: true,
                windowSize: 3,
                maxPeaks: 80,
              })
              break
          }
        }

        // Parameter descriptions for info tooltips
        const paramInfo: Record<string, string> = {
          silenceThreshold:
            'RMS energy threshold below which audio is considered silence. Lower values detect quieter passages as music, higher values mark more sections as rests.',
          hpcpSize:
            'Number of pitch class bins. 12 = one per semitone (standard), 36 = 3 per semitone (detects tuning variations), 120 = 10 per semitone (highest resolution).',
          harmonics:
            'Number of harmonic overtones to include. 0 = fundamental only. Higher values improve detection of instruments with rich harmonics like guitar.',
          nonLinear:
            'Applies logarithmic compression to emphasize weaker harmonics. Helps with quieter chord components but may increase noise sensitivity.',
          minFrequency:
            'Lowest frequency to analyze. Set higher (80-100 Hz) for guitar to ignore bass rumble, lower (20-40 Hz) to include bass notes.',
          maxFrequency:
            'Highest frequency to analyze. Guitar fundamentals are below 1500 Hz, but harmonics extend higher. 3000-5000 Hz is typical.',
          windowSize:
            'Duration in seconds over which to average chord detection. Larger windows = more stable but less responsive to quick chord changes.',
          maxPeaks:
            'Maximum spectral peaks to consider. More peaks = more harmonic detail but slower processing. 60-80 is a good balance.',
          beatSync:
            'Averages harmonic content over each beat period for more stable detection aligned to the rhythm.',
          snapToBeats:
            'Quantizes chord change times to the nearest detected beat after analysis. Quick visual adjustment, no re-analysis needed.',
          backingTrack:
            'Uses the instrumental backing track (vocals removed) for cleaner chord detection. Requires stem separation first.',
        }

        // Info tooltip component
        const SettingInfoTip = ({
          param,
          tooltip,
        }: {
          param: string
          tooltip: string
        }) => {
          const [show, setShow] = useState(false)
          return (
            <InfoIconWrapper>
              <InfoIcon
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
                onClick={(e) => {
                  e.preventDefault()
                  setShow(!show)
                }}
                type="button"
              >
                ?
              </InfoIcon>
              <InfoTooltip $visible={show}>{tooltip}</InfoTooltip>
            </InfoIconWrapper>
          )
        }

        return (
          <GenerationSection>
            {/* Analysis Options */}
            <GenSettingsCard>
              <GenSettingsTitle>Analysis Options</GenSettingsTitle>
              <StemToggleRow>
                <StemToggleSwitch
                  $enabled={!!(useBackingTrack && hasBackingTrack)}
                  onClick={() => {
                    if (hasBackingTrack) {
                      setUseBackingTrack(!useBackingTrack)
                    }
                  }}
                  style={{
                    opacity: hasBackingTrack ? 1 : 0.4,
                    cursor: hasBackingTrack ? 'pointer' : 'not-allowed',
                  }}
                />
                <SettingLabelWithInfo>
                  <StemToggleLabel
                    style={{ opacity: hasBackingTrack ? 1 : 0.5 }}
                  >
                    Use backing track
                    {!hasBackingTrack && ' (separate stems first)'}
                  </StemToggleLabel>
                  <SettingInfoTip
                    param="backingTrack"
                    tooltip={paramInfo.backingTrack}
                  />
                </SettingLabelWithInfo>
              </StemToggleRow>
              <StemToggleRow>
                <StemToggleSwitch
                  $enabled={snapToBeats}
                  onClick={() => setSnapToBeats(!snapToBeats)}
                />
                <SettingLabelWithInfo>
                  <StemToggleLabel>Snap chords to beats</StemToggleLabel>
                  <SettingInfoTip
                    param="snapToBeats"
                    tooltip={paramInfo.snapToBeats}
                  />
                </SettingLabelWithInfo>
              </StemToggleRow>
              <StemToggleRow>
                <StemToggleSwitch
                  $enabled={useBeatSyncDetection}
                  onClick={() => setUseBeatSyncDetection(!useBeatSyncDetection)}
                />
                <SettingLabelWithInfo>
                  <StemToggleLabel>Beat-synchronous detection</StemToggleLabel>
                  <SettingInfoTip
                    param="beatSync"
                    tooltip={paramInfo.beatSync}
                  />
                </SettingLabelWithInfo>
              </StemToggleRow>
            </GenSettingsCard>

            {/* Presets */}
            <GenSettingsCard>
              <GenSettingsTitle>Presets</GenSettingsTitle>
              <PresetRow>
                <PresetButton onClick={() => applyPreset('default')}>
                  Default
                </PresetButton>
                <PresetButton onClick={() => applyPreset('guitar')}>
                  Guitar-optimized
                </PresetButton>
                <PresetButton onClick={() => applyPreset('precision')}>
                  High Precision
                </PresetButton>
              </PresetRow>
            </GenSettingsCard>

            {/* Silence Detection */}
            <GenSettingsCard>
              <GenSettingsTitle>Silence Detection</GenSettingsTitle>
              <SettingRow>
                <SettingLabelWithInfo>
                  <SettingLabel>Threshold</SettingLabel>
                  <SettingInfoTip
                    param="silenceThreshold"
                    tooltip={paramInfo.silenceThreshold}
                  />
                </SettingLabelWithInfo>
                <SettingSlider
                  type="range"
                  min="0.001"
                  max="0.05"
                  step="0.001"
                  value={essentiaSettings.silenceThreshold}
                  onChange={(e) =>
                    updateEssentiaSetting(
                      'silenceThreshold',
                      parseFloat(e.target.value),
                    )
                  }
                />
                <SettingValue>
                  {essentiaSettings.silenceThreshold.toFixed(3)}
                </SettingValue>
              </SettingRow>
            </GenSettingsCard>

            {/* HPCP Settings */}
            <GenSettingsCard>
              <GenSettingsTitle>HPCP (Pitch Profile)</GenSettingsTitle>
              <SettingRow>
                <SettingLabelWithInfo>
                  <SettingLabel>Resolution</SettingLabel>
                  <SettingInfoTip
                    param="hpcpSize"
                    tooltip={paramInfo.hpcpSize}
                  />
                </SettingLabelWithInfo>
                <SettingSelect
                  value={essentiaSettings.hpcpSize}
                  onChange={(e) =>
                    updateEssentiaSetting('hpcpSize', parseInt(e.target.value))
                  }
                >
                  <option value={12}>12 bins (standard)</option>
                  <option value={36}>36 bins (3x resolution)</option>
                  <option value={120}>120 bins (10x resolution)</option>
                </SettingSelect>
              </SettingRow>
              <SettingRow>
                <SettingLabelWithInfo>
                  <SettingLabel>Harmonics</SettingLabel>
                  <SettingInfoTip
                    param="harmonics"
                    tooltip={paramInfo.harmonics}
                  />
                </SettingLabelWithInfo>
                <SettingSlider
                  type="range"
                  min="0"
                  max="8"
                  step="1"
                  value={essentiaSettings.harmonics}
                  onChange={(e) =>
                    updateEssentiaSetting('harmonics', parseInt(e.target.value))
                  }
                />
                <SettingValue>{essentiaSettings.harmonics}</SettingValue>
              </SettingRow>
              <SettingRow>
                <SettingLabelWithInfo>
                  <SettingLabel>Non-linear boost</SettingLabel>
                  <SettingInfoTip
                    param="nonLinear"
                    tooltip={paramInfo.nonLinear}
                  />
                </SettingLabelWithInfo>
                <StemToggleSwitch
                  $enabled={essentiaSettings.nonLinear}
                  onClick={() =>
                    updateEssentiaSetting(
                      'nonLinear',
                      !essentiaSettings.nonLinear,
                    )
                  }
                />
              </SettingRow>
              <SettingRow>
                <SettingLabelWithInfo>
                  <SettingLabel>Min frequency</SettingLabel>
                  <SettingInfoTip
                    param="minFrequency"
                    tooltip={paramInfo.minFrequency}
                  />
                </SettingLabelWithInfo>
                <SettingSlider
                  type="range"
                  min="20"
                  max="200"
                  step="10"
                  value={essentiaSettings.minFrequency}
                  onChange={(e) =>
                    updateEssentiaSetting(
                      'minFrequency',
                      parseInt(e.target.value),
                    )
                  }
                />
                <SettingValue>{essentiaSettings.minFrequency} Hz</SettingValue>
              </SettingRow>
              <SettingRow>
                <SettingLabelWithInfo>
                  <SettingLabel>Max frequency</SettingLabel>
                  <SettingInfoTip
                    param="maxFrequency"
                    tooltip={paramInfo.maxFrequency}
                  />
                </SettingLabelWithInfo>
                <SettingSlider
                  type="range"
                  min="2000"
                  max="5000"
                  step="100"
                  value={essentiaSettings.maxFrequency}
                  onChange={(e) =>
                    updateEssentiaSetting(
                      'maxFrequency',
                      parseInt(e.target.value),
                    )
                  }
                />
                <SettingValue>{essentiaSettings.maxFrequency} Hz</SettingValue>
              </SettingRow>
            </GenSettingsCard>

            {/* Chord Detection */}
            <GenSettingsCard>
              <GenSettingsTitle>Chord Detection</GenSettingsTitle>
              <SettingRow>
                <SettingLabelWithInfo>
                  <SettingLabel>Window size</SettingLabel>
                  <SettingInfoTip
                    param="windowSize"
                    tooltip={paramInfo.windowSize}
                  />
                </SettingLabelWithInfo>
                <SettingSlider
                  type="range"
                  min="1"
                  max="5"
                  step="0.5"
                  value={essentiaSettings.windowSize}
                  onChange={(e) =>
                    updateEssentiaSetting(
                      'windowSize',
                      parseFloat(e.target.value),
                    )
                  }
                />
                <SettingValue>{essentiaSettings.windowSize}s</SettingValue>
              </SettingRow>
              <SettingRow>
                <SettingLabelWithInfo>
                  <SettingLabel>Max peaks</SettingLabel>
                  <SettingInfoTip
                    param="maxPeaks"
                    tooltip={paramInfo.maxPeaks}
                  />
                </SettingLabelWithInfo>
                <SettingSlider
                  type="range"
                  min="30"
                  max="100"
                  step="10"
                  value={essentiaSettings.maxPeaks}
                  onChange={(e) =>
                    updateEssentiaSetting('maxPeaks', parseInt(e.target.value))
                  }
                />
                <SettingValue>{essentiaSettings.maxPeaks}</SettingValue>
              </SettingRow>
            </GenSettingsCard>

            {/* Re-analyze button */}
            <SeparateButton
              onClick={() => triggerLibraryAnalysis('essentia')}
              disabled={
                !audioUrl ||
                analysisProgress.essentia?.status === 'processing' ||
                analysisProgress.essentia?.status === 'pending'
              }
            >
              {analysisProgress.essentia?.status === 'processing' ||
              analysisProgress.essentia?.status === 'pending'
                ? 'Analyzing...'
                : 'Re-analyze with Current Settings'}
            </SeparateButton>

            {/* Chord Comparison vs Chordify Ground Truth */}
            {chordsByLibrary.chordify &&
              chordsByLibrary.chordify.length > 0 && (
                <ChordComparison
                  chordsByLibrary={
                    chordsByLibrary as Record<
                      'essentia' | 'madmom' | 'btc' | 'chordify',
                      ChordEvent[]
                    >
                  }
                  duration={songData?.duration || 0}
                  bpm={songData?.tempo?.bpm}
                  beats={songData?.tempo?.beats}
                />
              )}
          </GenerationSection>
        )
      }
      case 'chords': {
        // Get chords from active library
        const activeChords =
          chordsByLibrary[activeLibrary] ||
          (activeLibrary === 'essentia' ? songData?.chords : []) ||
          []

        if (activeChords.length === 0) {
          return (
            <VStack gap={12}>
              {/* Chordify import section */}
              <div style={{ marginTop: 8 }}>
                <HStack gap={12} alignItems="center">
                  <ChordifyImportButton
                    onClick={handleChordifyImport}
                    disabled={chordifyImportStatus === 'loading'}
                    $loading={chordifyImportStatus === 'loading'}
                  >
                    {chordifyImportStatus === 'loading' ? (
                      <>Importing...</>
                    ) : (
                      <>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Import from Chordify
                      </>
                    )}
                  </ChordifyImportButton>
                  <GroundTruthBadge>Ground Truth</GroundTruthBadge>
                </HStack>
                {chordifyImportStatus === 'success' && (
                  <ImportStatusMessage $type="success">
                    Successfully imported chords from Chordify!
                  </ImportStatusMessage>
                )}
                {chordifyImportStatus === 'error' && chordifyImportError && (
                  <ImportStatusMessage $type="error">
                    {chordifyImportError}
                  </ImportStatusMessage>
                )}
                {showManualHtmlInput && (
                  <ManualHtmlInputSection>
                    <ManualHtmlHelp>
                      <strong>Manual Import Instructions:</strong>
                      <ol>
                        <li>
                          Open{' '}
                          <code>chordify.net/search/youtube:{videoId}</code> in
                          your browser
                        </li>
                        <li>Click the song result to open the chord page</li>
                        <li>Wait for chords to fully load (scroll down)</li>
                        <li>Right-click → View Page Source (or Ctrl/Cmd+U)</li>
                        <li>Copy all HTML and paste below</li>
                      </ol>
                    </ManualHtmlHelp>
                    <ManualHtmlTextarea
                      value={manualHtml}
                      onChange={(e) => setManualHtml(e.target.value)}
                      placeholder="Paste the full HTML source from the Chordify page here..."
                    />
                    <HStack gap={8}>
                      <ManualSubmitButton
                        onClick={() => {
                          if (manualHtml.trim()) {
                            importChordifyWithHtml(manualHtml)
                          }
                        }}
                        disabled={
                          !manualHtml.trim() ||
                          chordifyImportStatus === 'loading'
                        }
                      >
                        Import from Pasted HTML
                      </ManualSubmitButton>
                      <ManualSubmitButton
                        onClick={() => {
                          setShowManualHtmlInput(false)
                          setManualHtml('')
                        }}
                        style={{ background: 'rgba(255,255,255,0.1)' }}
                      >
                        Cancel
                      </ManualSubmitButton>
                    </HStack>
                  </ManualHtmlInputSection>
                )}
              </div>

              <TabPlaceholder>
                No chords detected yet. Extract audio and wait for chord
                analysis, or import from Chordify.
              </TabPlaceholder>
            </VStack>
          )
        }

        const analysis = analyzeChords(activeChords, songData?.key || null)

        // Handler for clicking a chord to show it on fretboard
        const handleChordClick = (root: string, quality: string) => {
          const rootNote = noteNameToNumber[root]
          const chordQuality = qualityNameToChordQuality[quality] || 'major'
          if (rootNote !== undefined) {
            changeChordsRef.current({ rootNote, quality: chordQuality })
          }
        }

        return (
          <ChordAnalysisSection>
            {/* Chordify import section */}
            {!chordsByLibrary.chordify && (
              <div style={{ marginTop: 4 }}>
                <HStack gap={12} alignItems="center">
                  <ChordifyImportButton
                    onClick={handleChordifyImport}
                    disabled={chordifyImportStatus === 'loading'}
                    $loading={chordifyImportStatus === 'loading'}
                  >
                    {chordifyImportStatus === 'loading' ? (
                      <>Importing...</>
                    ) : (
                      <>
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                        Import from Chordify
                      </>
                    )}
                  </ChordifyImportButton>
                  <GroundTruthBadge>Ground Truth</GroundTruthBadge>
                </HStack>
                {chordifyImportStatus === 'success' && (
                  <ImportStatusMessage $type="success">
                    Successfully imported chords from Chordify!
                  </ImportStatusMessage>
                )}
                {chordifyImportStatus === 'error' && chordifyImportError && (
                  <ImportStatusMessage $type="error">
                    {chordifyImportError}
                  </ImportStatusMessage>
                )}
                {showManualHtmlInput && (
                  <ManualHtmlInputSection>
                    <ManualHtmlHelp>
                      <strong>Manual Import Instructions:</strong>
                      <ol>
                        <li>
                          Open{' '}
                          <code>chordify.net/search/youtube:{videoId}</code> in
                          your browser
                        </li>
                        <li>Click the song result to open the chord page</li>
                        <li>Wait for chords to fully load (scroll down)</li>
                        <li>Right-click → View Page Source (or Ctrl/Cmd+U)</li>
                        <li>Copy all HTML and paste below</li>
                      </ol>
                    </ManualHtmlHelp>
                    <ManualHtmlTextarea
                      value={manualHtml}
                      onChange={(e) => setManualHtml(e.target.value)}
                      placeholder="Paste the full HTML source from the Chordify page here..."
                    />
                    <HStack gap={8}>
                      <ManualSubmitButton
                        onClick={() => {
                          if (manualHtml.trim()) {
                            importChordifyWithHtml(manualHtml)
                          }
                        }}
                        disabled={
                          !manualHtml.trim() ||
                          chordifyImportStatus === 'loading'
                        }
                      >
                        Import from Pasted HTML
                      </ManualSubmitButton>
                      <ManualSubmitButton
                        onClick={() => {
                          setShowManualHtmlInput(false)
                          setManualHtml('')
                        }}
                        style={{ background: 'rgba(255,255,255,0.1)' }}
                      >
                        Cancel
                      </ManualSubmitButton>
                    </HStack>
                  </ManualHtmlInputSection>
                )}
              </div>
            )}

            {/* Progression */}
            {analysis.progression.length > 0 && (
              <ProgressionSection>
                <ProgressionLabel>
                  Chord Progression (first {analysis.progression.length}{' '}
                  changes)
                </ProgressionLabel>
                {analysis.progressionNumerals.length > 0 && (
                  <ProgressionRow style={{ marginBottom: 4 }}>
                    {analysis.progressionNumerals.map((numeral, i) => (
                      <span key={`num-${i}`}>
                        <ProgressionChord $isNumeral>
                          {numeral}
                        </ProgressionChord>
                        {i < analysis.progressionNumerals.length - 1 && (
                          <ProgressionDivider> - </ProgressionDivider>
                        )}
                      </span>
                    ))}
                  </ProgressionRow>
                )}
                <ProgressionRow>
                  {analysis.progression.map((chord, i) => (
                    <span key={`chord-${i}`}>
                      <ProgressionChord>{chord}</ProgressionChord>
                      {i < analysis.progression.length - 1 && (
                        <ProgressionDivider> - </ProgressionDivider>
                      )}
                    </span>
                  ))}
                </ProgressionRow>
              </ProgressionSection>
            )}

            {/* Unique chords list */}
            <div>
              <ProgressionLabel style={{ marginBottom: 8 }}>
                Unique Chords ({analysis.uniqueChords.length}) - Source:{' '}
                {activeLibrary}
              </ProgressionLabel>
              <UniqueChordsList $columns={analysis.uniqueChords.length > 5}>
                {analysis.uniqueChords.map((chord, i) => (
                  <UniqueChordRow
                    key={i}
                    onClick={() => handleChordClick(chord.root, chord.quality)}
                    title="Click to show on fretboard"
                  >
                    <UniqueChordName>
                      {chord.root}
                      {chord.quality === 'minor'
                        ? 'm'
                        : chord.quality === 'major'
                          ? ''
                          : chord.quality}
                    </UniqueChordName>
                    <ChordNumeral>{chord.romanNumeral}</ChordNumeral>
                    <ChordStats>{chord.count}×</ChordStats>
                  </UniqueChordRow>
                ))}
              </UniqueChordsList>
            </div>
          </ChordAnalysisSection>
        )
      }
      case 'audio':
        return (
          <VStack gap={12}>
            {/* Audio extraction progress */}
            {showExtractionProgress && (
              <ProgressContainer
                style={{ background: 'transparent', padding: 0 }}
              >
                <ProgressLabel>
                  <ProgressText>
                    {getExtractionStatusText(extractionProgress.status)}
                  </ProgressText>
                  <ProgressPercent>
                    {Math.round(extractionProgress.progress)}%
                  </ProgressPercent>
                </ProgressLabel>
                <ProgressBarTrack>
                  <ProgressBarFill $progress={extractionProgress.progress} />
                </ProgressBarTrack>
              </ProgressContainer>
            )}

            {/* Audio download link */}
            {audioUrl ? (
              <VStack gap={8}>
                <DownloadLink
                  href={`${BACKEND_URL}${audioUrl}`}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Download MP3
                </DownloadLink>
                <TimeDisplay style={{ opacity: 0.6, fontSize: 11 }}>
                  {BACKEND_URL}
                  {audioUrl}
                </TimeDisplay>
              </VStack>
            ) : !showExtractionProgress ? (
              <TabPlaceholder>
                Audio will be available after extraction
              </TabPlaceholder>
            ) : null}
          </VStack>
        )
      case 'fretboard':
        return <FretboardTabContent />
      default:
        return null
    }
  }

  const closeAction = videoId ? (
    <CloseButton onClick={handleClear} title="Close video">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <line x1="18" y1="6" x2="6" y2="18"></line>
        <line x1="6" y1="6" x2="18" y2="18"></line>
      </svg>
    </CloseButton>
  ) : null

  return (
    <Container>
      <ControlGroup title="Song" action={closeAction}>
        <VStack gap={12} fullWidth>
          {/* URL Input */}
          {!videoId && (
            <YouTubeUrlInput
              onVideoSelect={handleVideoSelect}
              isLoading={isLoading}
            />
          )}

          {/* Loading state */}
          {videoId && !songData && isLoading && (
            <VideoInfo>
              <VideoTitle>Loading...</VideoTitle>
            </VideoInfo>
          )}

          {/* Video title row - full width */}
          {videoId && songData && (
            <VideoTitleRow>
              <YouTubeLink
                href={`https://www.youtube.com/watch?v=${videoId}`}
                target="_blank"
                rel="noopener noreferrer"
                title="Open on YouTube"
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </YouTubeLink>
              <VideoTitle>{songData.title}</VideoTitle>
              <SaveToLibraryButton
                isAuthenticated={isAuthenticated}
                isSaved={isSaved}
                canSave={canSave}
                isSaving={saveStatus === 'saving'}
                error={saveError}
                onSave={saveToLibrary}
              />
              {audioUrl && (
                <DownloadIconButton
                  href={`${BACKEND_URL}${audioUrl}`}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Download MP3"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                </DownloadIconButton>
              )}
            </VideoTitleRow>
          )}

          {/* Video and Tab content in 3 columns: Video | Stems | Other Tabs */}
          {videoId && (
            <ThreeColumnLayout ref={layoutRef}>
              <VideoSection
                data-column="video"
                $width={videoColumnWidth ?? undefined}
              >
                <YouTubePlayer
                  ref={playerRef}
                  videoId={videoId}
                  onTimeUpdate={handleTimeUpdate}
                  onPlayStateChange={handlePlayStateChange}
                  onSeek={handleYouTubeSeek}
                  onSeekPreview={handleSeekPreview}
                  muteVideo={
                    stemProgress?.status === 'complete' &&
                    !!stemProgress.stems?.length
                  }
                />
              </VideoSection>

              <ResizableDivider onMouseDown={() => handleMouseDown('video')} />

              {/* Stems column - always visible, always shows stems content */}
              <StemsSection $width={stemsColumnWidth}>
                <TabsWrapper>
                  <TraditionalTabsContainer>
                    <TraditionalTab $isActive={true} onClick={() => {}}>
                      <StatusDot $isReady={getTabStatus('stems')} />
                      {tabLabels['stems']}
                    </TraditionalTab>
                  </TraditionalTabsContainer>
                  <TabPanelContainer>{renderStemsContent()}</TabPanelContainer>
                </TabsWrapper>
              </StemsSection>

              <ResizableDivider onMouseDown={() => handleMouseDown('stems')} />

              {/* Other tabs column */}
              <OtherTabsSection>
                <TabsWrapper>
                  <TraditionalTabsContainer>
                    <TabGroup>
                      {(['lyrics', 'chords'] as const).map((tab) => (
                        <TraditionalTab
                          key={tab}
                          $isActive={activeTab === tab}
                          onClick={() => setActiveTab(tab)}
                        >
                          <StatusDot $isReady={getTabStatus(tab)} />
                          {tabLabels[tab]}
                        </TraditionalTab>
                      ))}
                    </TabGroup>
                    <TabGroup>
                      {(['generation', 'fretboard'] as const).map((tab) => (
                        <TraditionalTab
                          key={tab}
                          $isActive={activeTab === tab}
                          onClick={() => setActiveTab(tab)}
                        >
                          {tabLabels[tab]}
                        </TraditionalTab>
                      ))}
                    </TabGroup>
                  </TraditionalTabsContainer>
                  <TabPanelContainer>{renderTabContent()}</TabPanelContainer>
                </TabsWrapper>
              </OtherTabsSection>
            </ThreeColumnLayout>
          )}

          {/* Library selector and chord timelines */}
          {videoId && status === 'ready' && songData && (
            <StackedTimelinesContainer>
              {CHORD_LIBRARIES.filter((lib) => !hiddenTimelines[lib.id]).map(
                (lib) => {
                  const chords =
                    chordsByLibrary[lib.id] ||
                    (lib.id === 'essentia' ? songData.chords : [])
                  const progress = analysisProgress[lib.id]
                  const isProcessing =
                    progress?.status === 'processing' ||
                    progress?.status === 'pending'
                  const isEnabled = enabledLibraries.has(lib.id)

                  // Apply beat alignment for ground truth (Chordify) or quantization for others
                  let displayChords = chords
                  const timelineBeats = songData.tempo?.beats
                  const timelineBpm = songData.tempo?.bpm

                  if (
                    lib.isGroundTruth &&
                    timelineBeats?.length &&
                    timelineBpm
                  ) {
                    // For Chordify: map beat indices to Essentia beat positions
                    // Use Chordify's BPM (from metadata) to correctly reverse-calculate beat indices
                    // Chordify's chord times were calculated as: beatIndex * (60/chordifyBpm)
                    const chordifyBpm = chordifyMetadata?.bpm
                    displayChords = alignChordifyToEssentiaBeats(
                      chords,
                      timelineBpm,
                      timelineBeats,
                      chordifyBpm, // Pass Chordify's BPM for accurate beat index calculation
                    )
                    console.log(
                      `[Chordify Align] essentiaBeats=${timelineBeats.length}, essentiaBpm=${timelineBpm}, chordifyBpm=${chordifyBpm}`,
                    )
                    console.log(
                      `[Chordify Align] First chord: original=${chords[0]?.time?.toFixed(2)}, aligned=${displayChords[0]?.time?.toFixed(2)}`,
                    )
                  } else if (snapToBeats && timelineBeats?.length) {
                    // For other libraries: snap to nearest beat if enabled
                    displayChords = quantizeChordsToBeats(chords, timelineBeats)
                  }

                  return (
                    <ChordTimeline
                      key={lib.id}
                      chords={displayChords}
                      currentTime={currentTimeSeconds}
                      duration={songData.duration}
                      libraryName={lib.name}
                      isActive={activeLibrary === lib.id}
                      onSelect={() => handleLibrarySelect(lib.id)}
                      enabled={isEnabled}
                      onRefresh={() =>
                        lib.id === 'chordify'
                          ? handleChordifyImport()
                          : triggerLibraryAnalysis(lib.id)
                      }
                      isLoading={isProcessing}
                      loadingProgress={progress?.progress}
                      beats={songData.tempo?.beats}
                      showBeats={isEnabled}
                      beatsPerBar={chordifyMetadata?.beatsPerBar || 4}
                      bpm={chordifyMetadata?.bpm || songData.tempo?.bpm || 120}
                      onDelete={() => handleLibraryDelete(lib.id)}
                      isGroundTruth={lib.isGroundTruth}
                      color={lib.color}
                      onHide={() => handleTimelineVisibilityToggle(lib.id)}
                      onChordClick={handleChordClick}
                      onRewind={handleRewind}
                      onToggle={() => playerRef.current?.toggle()}
                      isPlaying={isPlaying}
                      isReady={status === 'ready'}
                      songInfo={
                        lib.isGroundTruth
                          ? {
                              keyRoot:
                                chordifyMetadata?.key?.root ||
                                songData.key?.root,
                              keyQuality:
                                chordifyMetadata?.key?.quality ||
                                songData.key?.scale,
                              bpm: chordifyMetadata?.bpm || songData.tempo?.bpm,
                              timeSignature: chordifyMetadata?.beatsPerBar
                                ? `${chordifyMetadata.beatsPerBar}/4`
                                : undefined,
                            }
                          : undefined
                      }
                    />
                  )
                },
              )}
              {/* Show hidden timelines button */}
              {Object.values(hiddenTimelines).some(Boolean) && (
                <HiddenTimelinesRow>
                  <HiddenTimelinesLabel>
                    {
                      CHORD_LIBRARIES.filter((lib) => hiddenTimelines[lib.id])
                        .length
                    }{' '}
                    hidden timeline(s)
                  </HiddenTimelinesLabel>
                  {CHORD_LIBRARIES.filter((lib) => hiddenTimelines[lib.id]).map(
                    (lib) => (
                      <ShowHiddenButton
                        key={lib.id}
                        onClick={() => handleTimelineVisibilityToggle(lib.id)}
                      >
                        Show {lib.name}
                      </ShowHiddenButton>
                    ),
                  )}
                </HiddenTimelinesRow>
              )}
            </StackedTimelinesContainer>
          )}
        </VStack>
      </ControlGroup>

      {/* Delete confirmation popup */}
      {confirmDelete && (
        <ConfirmPopup onClick={() => setConfirmDelete(null)}>
          <ConfirmDialog onClick={(e) => e.stopPropagation()}>
            <ConfirmTitle>
              Delete {confirmDelete === 'stems' ? 'Stems' : 'Lyrics'}?
            </ConfirmTitle>
            <ConfirmMessage>
              {confirmDelete === 'stems'
                ? 'This will remove all separated stems. You can separate them again later.'
                : 'This will remove the lyrics. You can generate them again later.'}
            </ConfirmMessage>
            <ConfirmActions>
              <ConfirmButtonCancel onClick={() => setConfirmDelete(null)}>
                Cancel
              </ConfirmButtonCancel>
              <ConfirmButtonDanger
                onClick={() => {
                  if (confirmDelete === 'stems') {
                    handleDeleteStems()
                  } else {
                    handleDeleteLyrics()
                  }
                  setConfirmDelete(null)
                }}
              >
                Delete
              </ConfirmButtonDanger>
            </ConfirmActions>
          </ConfirmDialog>
        </ConfirmPopup>
      )}
    </Container>
  )
}
