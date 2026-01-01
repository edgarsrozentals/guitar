import { PageMetaTags } from '@lib/next-ui/metadata/PageMetaTags'
import { chordQualityNames } from '@product/core/chords/chordTypes'
import { chromaticNotesNames } from '@product/core/note'

import { PageTitle } from '../ui/PageTitle'

import { useChords } from './state/chords'

export const ChordsPageTitle = () => {
  const { rootNote, quality } = useChords()

  const rootNoteName = chromaticNotesNames[rootNote]
  const qualityName = chordQualityNames[quality]
  const chordName = `${rootNoteName} ${qualityName}`

  const title = `${chordName} Chord | Guitar Fretboard Positions`
  const description = `Interactive guide to ${chordName} chord positions across the guitar fretboard. Slide through positions to see chord tones at each fret range.`

  return (
    <>
      <PageMetaTags title={title} description={description} />
      <PageTitle>{chordName} Chord</PageTitle>
    </>
  )
}
