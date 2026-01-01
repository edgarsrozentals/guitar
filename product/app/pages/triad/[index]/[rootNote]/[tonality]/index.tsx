import { range } from '@lib/utils/array/range'
import { chromaticNotesNumber } from '@product/core/note'
import { fromUriNote, toUriNote } from '@product/core/note/uriNote'
import { Tonality, tonalities } from '@product/core/tonality'
import { diatonicTriadsNumber } from '@product/core/triads'
import { GetStaticPaths, GetStaticProps } from 'next'

import { TriadPage } from '../../../../../triad/TriadPage'

export default TriadPage

type Params = {
  index: string
  rootNote: string
  tonality: Tonality
}

export const getStaticPaths: GetStaticPaths<Params> = async () => {
  const paths = range(chromaticNotesNumber).flatMap((rootNote) =>
    range(diatonicTriadsNumber).flatMap((index) =>
      tonalities.map((tonality) => ({
        params: {
          index: index.toString(),
          rootNote: toUriNote(rootNote),
          tonality,
        },
      })),
    ),
  )

  return {
    paths,
    fallback: false,
  }
}

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { rootNote, index, tonality } = params as Params

  return {
    props: {
      value: {
        rootNote: fromUriNote(rootNote),
        index: Number(index),
        tonality,
      },
    },
  }
}
