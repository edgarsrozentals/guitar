'use client'

import { HStack, VStack } from '@lib/ui/css/stack'
import { getColor } from '@lib/ui/theme/getters'
import { CAGEDShapeName } from '@product/core/chords/cagedShapes'
import { ChordQuality } from '@product/core/chords/chordTypes'
import { useState, useCallback, useRef, useEffect } from 'react'
import styled from 'styled-components'

import {
  useSongSettings,
  type StemType,
  type ChordLibrary,
  type MediaTab,
  ALL_STEM_TYPES,
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

import { ChordTimeline } from './ChordTimeline'
import { YouTubePlayer } from './YouTubePlayer'
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
}

const CHORD_LIBRARIES: ChordLibraryInfo[] = [
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

const mediaTabs: readonly MediaTab[] = [
  'audio',
  'chords',
  'stems',
  'lyrics',
  'fretboard',
] as const

const tabLabels: Record<MediaTab, string> = {
  audio: 'Audio',
  chords: 'Chords',
  stems: 'Stems',
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

const VideoAndTabsLayout = styled.div`
  display: flex;
  gap: 16px;
  align-items: flex-start;

  @media (max-width: 800px) {
    flex-direction: column;
  }
`

const VideoSection = styled.div`
  flex: 0 0 auto;
  margin-top: 16px; /* Align with tab panel content (below tabs) */
`

const TabsSection = styled.div`
  flex: 1;
  min-width: 250px;
`

// Traditional tabs - connected to content
const TraditionalTabsContainer = styled.div`
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
  height: 280px;
  overflow-y: auto;
`

const TabsWrapper = styled.div`
  display: flex;
  flex-direction: column;
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
  gap: 12px;
`

const StemRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
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
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  background: ${({ $muted }) =>
    $muted ? getColor('alert') : getColor('mist')};
  color: ${({ $muted }) =>
    $muted ? getColor('background') : getColor('text')};
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s ease;

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

const VideoTitle = styled.span`
  font-size: 16px;
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
  } = songSettings

  // Stem separation state (not persisted - depends on backend processing status)
  const [stemProgress, setStemProgress] = useState<StemProgress | null>(null)
  const [allStemsMuted, setAllStemsMuted] = useState(false)
  const stemPollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Chord library A/B testing state (chordsByLibrary is fetched from backend, not persisted)
  const [chordsByLibrary, setChordsByLibrary] = useState<ChordsByLibrary>({})
  const [analysisProgress, setAnalysisProgress] = useState<
    Record<ChordLibrary, ChordAnalysisProgress>
  >({
    essentia: { progress: 0, status: 'not_started' },
    madmom: { progress: 0, status: 'not_started' },
    btc: { progress: 0, status: 'not_started' },
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
  const lastSyncTimeRef = useRef(0)

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
          if (data.chords.length > 0) {
            setCurrentChord(data.chords[0].chord)
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

        // Set initial chord
        if (data.chords.length > 0) {
          setCurrentChord(data.chords[0].chord)
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
          headers: { 'Content-Type': 'application/json' },
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
  }, [videoId, selectedStems, pollStemProgress])

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
  const handlePlayStateChange = useCallback((isPlaying: boolean) => {
    isPlayingRef.current = isPlaying
    Object.values(stemAudioRefs.current).forEach((audio) => {
      if (isPlaying) {
        audio.play().catch(() => {
          // Ignore autoplay errors
        })
      } else {
        audio.pause()
      }
    })
    // Update lyrics sync play state
    setLyricsPlayingRef.current(isPlaying)
  }, [])

  // Handle YouTube seek
  const handleYouTubeSeek = useCallback((timeMs: number) => {
    const timeSeconds = timeMs / 1000

    // Validate that timeSeconds is a finite number
    if (!Number.isFinite(timeSeconds) || timeSeconds < 0) return

    lastSyncTimeRef.current = timeSeconds
    Object.values(stemAudioRefs.current).forEach((audio) => {
      audio.currentTime = timeSeconds
    })
    // Seek lyrics sync
    seekLyricsRef.current(timeMs)
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
        }
      } catch (_error) {
        console.error('Error fetching chordsByLibrary:', _error)
      }
    }

    fetchChordsByLibrary()
  }, [videoId, status])

  // Cleanup analysis polling on unmount
  useEffect(() => {
    const pollRef = analysisPollRef.current
    return () => {
      Object.values(pollRef).forEach((interval) => {
        if (interval) clearInterval(interval)
      })
    }
  }, [])

  // Store songData in ref for direct access in callback (avoids stale closure)
  const songDataRef = useRef(songData)
  songDataRef.current = songData

  // Store chordsByLibrary and activeLibrary in refs for callback
  const chordsByLibraryRef = useRef(chordsByLibrary)
  chordsByLibraryRef.current = chordsByLibrary
  const activeLibraryRef = useRef(activeLibrary)
  activeLibraryRef.current = activeLibrary

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

      // Get chords from active library, fallback to songData.chords
      const currentSongData = songDataRef.current
      const activeChords =
        chordsByLibraryRef.current[activeLibraryRef.current] ||
        currentSongData?.chords

      if (activeChords) {
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

  const renderTabContent = () => {
    switch (activeTab) {
      case 'stems':
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
                    value={
                      stemMuted[stem.type] ? 0 : stemVolumes[stem.type] || 1
                    }
                    onChange={(e) =>
                      handleVolumeChange(stem.type, parseFloat(e.target.value))
                    }
                    disabled={stemMuted[stem.type]}
                  />
                  <MuteButton
                    $muted={stemMuted[stem.type] || false}
                    onClick={() => handleMuteToggle(stem.type)}
                  >
                    {stemMuted[stem.type] ? 'M' : '♪'}
                  </MuteButton>
                </StemRow>
              ))}
              <HStack
                justifyContent="space-between"
                alignItems="center"
                style={{ marginTop: 8 }}
              >
                <StemStatusText style={{ opacity: 0.7 }}>
                  Stems synced with video playback.
                </StemStatusText>
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
          const statusText =
            statusLabels[stemProgress.status] || 'Processing...'

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
        {
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
      case 'chords': {
        // Get chords from active library
        const activeChords =
          chordsByLibrary[activeLibrary] ||
          (activeLibrary === 'essentia' ? songData?.chords : []) ||
          []

        if (activeChords.length === 0) {
          return (
            <VStack gap={12}>
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
                <StemToggleLabel style={{ opacity: hasBackingTrack ? 1 : 0.5 }}>
                  Use backing track for analysis
                  {!hasBackingTrack && ' (separate stems first)'}
                </StemToggleLabel>
              </StemToggleRow>
              <StemToggleRow>
                <StemToggleSwitch
                  $enabled={snapToBeats}
                  onClick={() => setSnapToBeats(!snapToBeats)}
                  disabled
                  style={{ opacity: 0.4, cursor: 'not-allowed' }}
                />
                <StemToggleLabel style={{ opacity: 0.5 }}>
                  Snap chords to beats (no chords yet)
                </StemToggleLabel>
              </StemToggleRow>
              <StemToggleRow>
                <StemToggleSwitch
                  $enabled={useBeatSyncDetection}
                  onClick={() => setUseBeatSyncDetection(!useBeatSyncDetection)}
                />
                <StemToggleLabel>
                  Beat-synchronous detection (re-analyze to apply)
                </StemToggleLabel>
              </StemToggleRow>
              <TabPlaceholder>
                No chords detected yet. Extract audio and wait for chord
                analysis.
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
            {/* Backing track option */}
            <StemToggleRow style={{ marginBottom: 8 }}>
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
              <StemToggleLabel style={{ opacity: hasBackingTrack ? 1 : 0.5 }}>
                Use backing track for analysis
                {!hasBackingTrack && ' (separate stems first)'}
              </StemToggleLabel>
            </StemToggleRow>
            <StemToggleRow>
              <StemToggleSwitch
                $enabled={snapToBeats}
                onClick={() => setSnapToBeats(!snapToBeats)}
                style={{
                  opacity: songData?.tempo?.beats?.length ? 1 : 0.4,
                  cursor: songData?.tempo?.beats?.length
                    ? 'pointer'
                    : 'not-allowed',
                }}
              />
              <StemToggleLabel
                style={{ opacity: songData?.tempo?.beats?.length ? 1 : 0.5 }}
              >
                Snap chords to beats
                {!songData?.tempo?.beats?.length && ' (no beats detected)'}
              </StemToggleLabel>
            </StemToggleRow>
            <StemToggleRow>
              <StemToggleSwitch
                $enabled={useBeatSyncDetection}
                onClick={() => setUseBeatSyncDetection(!useBeatSyncDetection)}
              />
              <StemToggleLabel>
                Beat-synchronous detection (re-analyze to apply)
              </StemToggleLabel>
            </StemToggleRow>
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
            </VideoTitleRow>
          )}

          {/* Video and Tab content side by side */}
          {videoId && (
            <VideoAndTabsLayout>
              <VideoSection>
                {/* Key/Tempo info above video */}
                {songData && (songData.key || songData.tempo) && (
                  <HStack gap={12} style={{ marginBottom: 8 }}>
                    {songData.key && (
                      <AnalysisItemSmall>
                        <AnalysisIcon title="Key">
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
                          </svg>
                        </AnalysisIcon>
                        <AnalysisValueSmall>
                          {songData.key.root} {songData.key.scale}
                        </AnalysisValueSmall>
                      </AnalysisItemSmall>
                    )}
                    {songData.tempo && (
                      <AnalysisItemSmall>
                        <AnalysisIcon title="Tempo">
                          <svg viewBox="0 0 24 24" fill="currentColor">
                            <path d="M12 1.5l-8 4.5v9l8 4.5 8-4.5v-9l-8-4.5zm0 2.31l5.74 3.23L12 10.27 6.26 7.04 12 3.81zM5 14.69V8.27l6 3.38v6.42l-6-3.38zm8 3.38v-6.42l6-3.38v6.42l-6 3.38z" />
                          </svg>
                        </AnalysisIcon>
                        <AnalysisValueSmall>
                          {songData.tempo.bpm} BPM
                        </AnalysisValueSmall>
                      </AnalysisItemSmall>
                    )}
                  </HStack>
                )}
                <YouTubePlayer
                  videoId={videoId}
                  onTimeUpdate={handleTimeUpdate}
                  onPlayStateChange={handlePlayStateChange}
                  onSeek={handleYouTubeSeek}
                  muteVideo={
                    stemProgress?.status === 'complete' &&
                    !!stemProgress.stems?.length
                  }
                  stemsArePlaying={
                    stemProgress?.status === 'complete' &&
                    !!stemProgress.stems?.length
                  }
                  onStemsMuteToggle={handleToggleAllStemsMute}
                  stemsMuted={allStemsMuted}
                  stemsVolume={masterStemsVolume}
                  onStemsVolumeChange={handleMasterStemsVolumeChange}
                />
              </VideoSection>

              <TabsSection>
                <TabsWrapper>
                  <TraditionalTabsContainer>
                    {mediaTabs.map((tab) => (
                      <TraditionalTab
                        key={tab}
                        $isActive={activeTab === tab}
                        onClick={() => setActiveTab(tab)}
                      >
                        <StatusDot $isReady={getTabStatus(tab)} />
                        {tabLabels[tab]}
                      </TraditionalTab>
                    ))}
                  </TraditionalTabsContainer>
                  <TabPanelContainer>{renderTabContent()}</TabPanelContainer>
                </TabsWrapper>
              </TabsSection>
            </VideoAndTabsLayout>
          )}

          {/* Library selector and chord timelines */}
          {videoId && status === 'ready' && songData && (
            <StackedTimelinesContainer>
              {CHORD_LIBRARIES.map((lib) => {
                const chords =
                  chordsByLibrary[lib.id] ||
                  (lib.id === 'essentia' ? songData.chords : [])
                const progress = analysisProgress[lib.id]
                const isProcessing =
                  progress?.status === 'processing' ||
                  progress?.status === 'pending'
                const isEnabled = enabledLibraries.has(lib.id)

                // Apply beat quantization if enabled
                const displayChords =
                  snapToBeats && songData.tempo?.beats?.length
                    ? quantizeChordsToBeats(chords, songData.tempo.beats)
                    : chords

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
                    onToggle={() => handleLibraryToggle(lib.id)}
                    isLoading={isProcessing}
                    loadingProgress={progress?.progress}
                    beats={songData.tempo?.beats}
                    showBeats={isEnabled}
                    onDelete={() => handleLibraryDelete(lib.id)}
                  />
                )
              })}
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
