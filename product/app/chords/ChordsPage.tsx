import { VStack } from '@lib/ui/css/stack'
import { ValueProp } from '@lib/ui/props'
import { getColor } from '@lib/ui/theme/getters'
import { chordQualitySuffixes } from '@product/core/chords/chordTypes'
import { chromaticNotesNames } from '@product/core/note'
import { scalePatterns } from '@product/core/scale/ScaleType'
import { useCallback, useState, useMemo } from 'react'
import styled from 'styled-components'

import { ResponsiveFretboardConfigProvider } from '../guitar/fretboard/ResponsiveFretboardConfig'
import { PageContainer } from '../layout/PageContainer'

import { ChordFretboard } from './ChordFretboard'
import { ControlGroup } from './ControlGroup'
import { ManageChordQuality } from './manage/ManageChordQuality'
import { ManageChordRoot } from './manage/ManageChordRoot'
import { ManagePosition } from './manage/ManagePosition'
import {
  ManageScaleOverlay,
  ScaleOverlaySettings,
} from './scale/ManageScaleOverlay'
import { ScaleOverlay } from './scale/ScaleOverlay'
import { ChordsProvider, ChordsState, useChords } from './state/chords'
import {
  FretboardSettingsProvider,
  useFretboardSettings,
} from './state/fretboardSettings'
import { YouTubeChordPlayer } from './youtube'

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

const FretboardContainer = styled.div`
  background: ${getColor('foreground')};
  border-radius: 12px;
  padding: 16px 20px;
`

const HideButton = styled.button`
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

  &:hover {
    background: ${getColor('mist')};
    color: ${getColor('text')};
  }

  svg {
    width: 14px;
    height: 14px;
  }
`

const ShowChordControlsButton = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: ${getColor('foreground')};
  color: ${getColor('textSupporting')};
  border: 1px solid ${getColor('mist')};
  border-radius: 8px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s ease;

  &:hover {
    background: ${getColor('mist')};
    color: ${getColor('text')};
  }

  svg {
    width: 16px;
    height: 16px;
  }
`

// Fretboard with side panel layout
const FretboardLayout = styled.div`
  display: flex;
  gap: 16px;
  align-items: stretch;
`

const ChordSidePanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 115px;
  flex-shrink: 0;
`

const ChordCard = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${getColor('success')};
  border-radius: 12px;
  padding: 12px;
`

const ChordCardText = styled.span<{ $isLong?: boolean }>`
  font-size: ${({ $isLong }) => ($isLong ? '24px' : '32px')};
  font-weight: 700;
  color: white;
  text-align: center;
`

const RomanNumeralCard = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${getColor('mist')};
  border-radius: 12px;
  padding: 12px;
`

const RomanNumeralText = styled.span`
  font-size: 28px;
  font-weight: 600;
  color: ${getColor('textSupporting')};
  text-align: center;
`

const FretboardWrapper = styled.div`
  flex: 1;
  min-width: 0;
`

// Roman numeral calculation
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

function getRomanNumeral(
  chordRootNote: number,
  chordQuality: string,
  keyRootNote: number,
  keyScale: 'major' | 'minor',
): string {
  // Calculate interval (semitones from key root to chord root)
  const interval = (chordRootNote - keyRootNote + 12) % 12
  const numerals =
    keyScale === 'major' ? ROMAN_NUMERALS_MAJOR : ROMAN_NUMERALS_MINOR
  let numeral = numerals[interval] || '?'

  // Adjust case based on chord quality
  const isMinorChord =
    chordQuality === 'minor' ||
    chordQuality === 'min7' ||
    chordQuality === 'dim' ||
    chordQuality === 'dim7'
  const isMajorChord =
    chordQuality === 'major' ||
    chordQuality === 'maj7' ||
    chordQuality === 'dom7' ||
    chordQuality === 'aug'

  if (isMinorChord && numeral === numeral.toUpperCase()) {
    numeral = numeral.toLowerCase()
  } else if (isMajorChord && numeral === numeral.toLowerCase()) {
    numeral = numeral.toUpperCase()
  }

  return numeral
}

const defaultScaleSettings: ScaleOverlaySettings = {
  enabled: false,
  scaleType: 'pentatonic',
  tonality: 'major',
  rootNote: 0, // A
}

export const ChordsPage = ({ value }: ValueProp<ChordsState>) => {
  const [position, setPosition] = useState(0)
  const [scaleSettings, setScaleSettings] =
    useState<ScaleOverlaySettings>(defaultScaleSettings)

  // Handle key detection from video player - configure scale overlay settings (but don't auto-enable)
  const handleKeyDetected = useCallback(
    (key: { root: string; scale: 'major' | 'minor' }) => {
      const rootNote = noteNameToNumber[key.root]
      if (rootNote !== undefined) {
        setScaleSettings((prev) => ({
          ...prev,
          rootNote,
          tonality: key.scale,
        }))
      }
    },
    [],
  )

  const scaleOverlay = scaleSettings.enabled ? (
    <ScaleOverlay
      rootNote={scaleSettings.rootNote}
      pattern={scalePatterns[scaleSettings.scaleType][scaleSettings.tonality]}
      scaleType={scaleSettings.scaleType}
      tonality={scaleSettings.tonality}
    />
  ) : null

  return (
    <ResponsiveFretboardConfigProvider>
      <ChordsProvider value={value}>
        <FretboardSettingsProvider>
          <ChordsPageContent
            position={position}
            setPosition={setPosition}
            scaleSettings={scaleSettings}
            setScaleSettings={setScaleSettings}
            scaleOverlay={scaleOverlay}
            handleKeyDetected={handleKeyDetected}
          />
        </FretboardSettingsProvider>
      </ChordsProvider>
    </ResponsiveFretboardConfigProvider>
  )
}

// Separate component to access fretboard settings context
const ChordsPageContent = ({
  position,
  setPosition,
  scaleSettings,
  setScaleSettings,
  scaleOverlay,
  handleKeyDetected,
}: {
  position: number
  setPosition: (p: number) => void
  scaleSettings: ScaleOverlaySettings
  setScaleSettings: (s: ScaleOverlaySettings) => void
  scaleOverlay: React.ReactNode
  handleKeyDetected: (key: { root: string; scale: 'major' | 'minor' }) => void
}) => {
  const { settings } = useFretboardSettings()
  const [scaleControlsHidden, setScaleControlsHidden] = useState(true)
  const [chordControlsHidden, setChordControlsHidden] = useState(true)
  const chords = useChords()

  // Calculate chord display name
  const chordName = useMemo(() => {
    const noteName = chromaticNotesNames[chords.rootNote]
    const suffix = chordQualitySuffixes[chords.quality] || ''
    return `${noteName}${suffix}`
  }, [chords.rootNote, chords.quality])

  // Calculate roman numeral based on scale settings
  const romanNumeral = useMemo(() => {
    if (!scaleSettings.enabled) {
      // When scale overlay is disabled, still show roman numeral based on default key
      return getRomanNumeral(
        chords.rootNote,
        chords.quality,
        scaleSettings.rootNote,
        scaleSettings.tonality,
      )
    }
    return getRomanNumeral(
      chords.rootNote,
      chords.quality,
      scaleSettings.rootNote,
      scaleSettings.tonality,
    )
  }, [
    chords.rootNote,
    chords.quality,
    scaleSettings.rootNote,
    scaleSettings.tonality,
    scaleSettings.enabled,
  ])

  return (
    <PageContainer>
      <VStack gap={24}>
        {/* Scale controls at top */}
        {scaleControlsHidden ? (
          <ShowChordControlsButton
            onClick={() => setScaleControlsHidden(false)}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            Show Scale Controls
          </ShowChordControlsButton>
        ) : (
          <ControlGroup
            title="Scale"
            action={
              <HideButton
                onClick={() => setScaleControlsHidden(true)}
                title="Hide scale controls"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              </HideButton>
            }
          >
            <ManageScaleOverlay
              value={scaleSettings}
              onChange={setScaleSettings}
            />
          </ControlGroup>
        )}

        {/* Video player with chord timeline */}
        <YouTubeChordPlayer onKeyDetected={handleKeyDetected} />

        {/* Chord controls below song section */}
        {chordControlsHidden ? (
          <ShowChordControlsButton
            onClick={() => setChordControlsHidden(false)}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            Show Chord Controls
          </ShowChordControlsButton>
        ) : (
          <ControlGroup
            title="Chord"
            action={
              <HideButton
                onClick={() => setChordControlsHidden(true)}
                title="Hide chord controls"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                </svg>
              </HideButton>
            }
          >
            <ManageChordRoot scaleSettings={scaleSettings} />
            <ManageChordQuality />
          </ControlGroup>
        )}

        {/* Fretboard with chord side panel */}
        <FretboardContainer>
          <VStack gap={16}>
            {!settings.showAllPositions && (
              <ManagePosition
                value={position}
                onChange={setPosition}
                min={0}
                max={14}
              />
            )}
            <FretboardLayout>
              <ChordSidePanel>
                <ChordCard>
                  <ChordCardText $isLong={chordName.length > 4}>
                    {chordName}
                  </ChordCardText>
                </ChordCard>
                <RomanNumeralCard>
                  <RomanNumeralText>{romanNumeral}</RomanNumeralText>
                </RomanNumeralCard>
              </ChordSidePanel>
              <FretboardWrapper>
                <ChordFretboard
                  position={position}
                  scaleOverlay={scaleOverlay}
                />
              </FretboardWrapper>
            </FretboardLayout>
          </VStack>
        </FretboardContainer>
      </VStack>
    </PageContainer>
  )
}
