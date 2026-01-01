import { VStack } from '@lib/ui/css/stack'
import { ValueProp } from '@lib/ui/props'
import { scalePatterns } from '@product/core/scale/ScaleType'
import { useState } from 'react'

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
        <PageContainer>
          <VStack gap={24}>
            <ControlGroup title="Scale">
              <ManageScaleOverlay
                value={scaleSettings}
                onChange={setScaleSettings}
              />
            </ControlGroup>
            <ControlGroup title="Chord">
              <ManageChordRoot scaleSettings={scaleSettings} />
              <ManageChordQuality />
            </ControlGroup>
            <ChordsPageTitle />
            <VStack gap={16}>
              <ManagePosition
                value={position}
                onChange={setPosition}
                min={0}
                max={14}
              />
              <ChordFretboard position={position} scaleOverlay={scaleOverlay} />
            </VStack>
          </VStack>
        </PageContainer>
      </ChordsProvider>
    </ResponsiveFretboardConfigProvider>
  )
}
