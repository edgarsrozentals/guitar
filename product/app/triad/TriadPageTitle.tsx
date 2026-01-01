import { PageMetaTags } from '@lib/next-ui/metadata/PageMetaTags'
import { chromaticNotesNames } from '@product/core/note'
import { tonalityNames } from '@product/core/tonality'
import { getTriadName, triadRomanNumerals } from '@product/core/triads'

import { PageTitle } from '../ui/PageTitle'

import { useTriad } from './state/triad'

export const TriadPageTitle = () => {
  const { rootNote, index, tonality } = useTriad()

  const rootNoteName = chromaticNotesNames[rootNote]
  const triadName = getTriadName(index, tonality)
  const romanNumeral = triadRomanNumerals[tonality][index]
  const tonalityName = tonalityNames[tonality]

  const title = `${rootNoteName} ${tonalityName} Scale - ${triadName} | Guitar Fretboard Patterns`
  const description = `Interactive guide to the ${triadName} (${romanNumeral}) in the ${rootNoteName} ${tonalityName.toLowerCase()} scale. Learn how this triad appears across all standard scale patterns on the guitar fretboard.`

  return (
    <>
      <PageMetaTags title={title} description={description} />
      <PageTitle>
        {rootNoteName} {tonalityName} Scale - {triadName}
      </PageTitle>
    </>
  )
}
