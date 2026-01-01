import { range } from '@lib/utils/array/range'
import {
  ChordQuality,
  chordQualities,
} from '@product/core/chords/chordTypes'
import { chromaticNotesNumber } from '@product/core/note'
import { fromUriNote, toUriNote } from '@product/core/note/uriNote'
import { GetStaticPaths, GetStaticProps } from 'next'

import { ChordsPage } from '../../../../chords/ChordsPage'

export default ChordsPage

type Params = {
  rootNote: string
  quality: ChordQuality
}

export const getStaticPaths: GetStaticPaths<Params> = async () => {
  const paths = range(chromaticNotesNumber).flatMap((rootNote) =>
    chordQualities.map((quality) => ({
      params: {
        rootNote: toUriNote(rootNote),
        quality,
      },
    })),
  )

  return {
    paths,
    fallback: false,
  }
}

export const getStaticProps: GetStaticProps = async ({ params }) => {
  const { rootNote, quality } = params as Params

  return {
    props: {
      value: {
        rootNote: fromUriNote(rootNote),
        quality,
      },
    },
  }
}
