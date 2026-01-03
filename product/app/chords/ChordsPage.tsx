import { VStack } from '@lib/ui/css/stack'
import { ValueProp } from '@lib/ui/props'
import { getColor } from '@lib/ui/theme/getters'
import { scalePatterns } from '@product/core/scale/ScaleType'
import { useCallback, useState } from 'react'
import styled from 'styled-components'

import { ResponsiveFretboardConfigProvider } from '../guitar/fretboard/ResponsiveFretboardConfig'
import { PageContainer } from '../layout/PageContainer'

import { ChordFretboard } from './ChordFretboard'
import { ChordsPageTitle } from './ChordsPageTitle'
import { ControlGroup } from './ControlGroup'
import { ManageChordQuality } from './manage/ManageChordQuality'
import { ManageChordRoot } from './manage/ManageChordRoot'
import { ManagePosition } from './manage/ManagePosition'
import {
  ManageScaleOverlay,
  ScaleOverlaySettings,
} from './scale/ManageScaleOverlay'
import { ScaleOverlay } from './scale/ScaleOverlay'
import { ChordsProvider, ChordsState } from './state/chords'
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

  // Handle key detection from video player - auto-configure scale overlay
  const handleKeyDetected = useCallback(
    (key: { root: string; scale: 'major' | 'minor' }) => {
      const rootNote = noteNameToNumber[key.root]
      if (rootNote !== undefined) {
        setScaleSettings((prev) => ({
          ...prev,
          enabled: true,
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

  return (
    <PageContainer>
      <VStack gap={24}>
        {/* Scale controls at top */}
        <ControlGroup title="Scale">
          <ManageScaleOverlay
            value={scaleSettings}
            onChange={setScaleSettings}
          />
        </ControlGroup>

        {/* Video player with chord timeline */}
        <YouTubeChordPlayer onKeyDetected={handleKeyDetected} />

        {/* Chord controls below song section */}
        <ControlGroup title="Chord">
          <ChordsPageTitle />
          <ManageChordRoot scaleSettings={scaleSettings} />
          <ManageChordQuality />
        </ControlGroup>

        {/* Fretboard directly under video */}
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
            <ChordFretboard position={position} scaleOverlay={scaleOverlay} />
          </VStack>
        </FretboardContainer>
      </VStack>
    </PageContainer>
  )
}
