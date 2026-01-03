import { PageMetaTags } from '@lib/next-ui/metadata/PageMetaTags'
import { HStack } from '@lib/ui/css/stack'
import { getColor } from '@lib/ui/theme/getters'
import {
  chordQualityNames,
  chordQualitySuffixes,
} from '@product/core/chords/chordTypes'
import { chromaticNotesNames } from '@product/core/note'
import styled from 'styled-components'

import { useChords } from './state/chords'

const Wrapper = styled(HStack)`
  gap: 1px;
  padding: 2px;
  border-radius: 8px;
  border: 1px solid ${getColor('mist')};
  width: 64px;
`

const ChordNamePill = styled.div`
  height: 28px;
  width: 100%;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${getColor('success')};
  color: ${getColor('background')};
  font-size: 13px;
  font-weight: 600;
`

export const ChordsPageTitle = () => {
  const { rootNote, quality } = useChords()

  const rootNoteName = chromaticNotesNames[rootNote]
  const qualityName = chordQualityNames[quality]
  const qualitySuffix = chordQualitySuffixes[quality]
  const fullChordName = `${rootNoteName} ${qualityName}`
  const shortChordName = `${rootNoteName}${qualitySuffix}`

  const title = `${fullChordName} Chord | Guitar Fretboard Positions`
  const description = `Interactive guide to ${fullChordName} chord positions across the guitar fretboard. Slide through positions to see chord tones at each fret range.`

  return (
    <>
      <PageMetaTags title={title} description={description} />
      <Wrapper>
        <ChordNamePill>{shortChordName}</ChordNamePill>
      </Wrapper>
    </>
  )
}
