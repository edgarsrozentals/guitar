import { HStack, VStack } from '@lib/ui/css/stack'
import { ValueProp } from '@lib/ui/props'
import { range } from '@lib/utils/array/range'
import { scalePatternsNumber } from '@product/core/scale/ScaleType'
import { ChordType } from '@product/core/triads'
import { useState } from 'react'

import { PageContainer } from '../layout/PageContainer'

import { ManageChordType } from './manage/ManageChordType'
import { ManageShowFullFretboard } from './manage/ManageShowFullFretboard'
import { ManageTriadIndex } from './manage/ManageTriadIndex'
import { ManageTriadRootNote } from './manage/ManageTriadRootNote'
import { ManageTriadTonality } from './manage/ManageTriadTonality'
import { TriadProvider, TriadState } from './state/triad'
import { TriadFullFretboard } from './TriadFullFretboard'
import { TriadOnScalePattern } from './TriadOnMajorScalePattern'
import { TriadPageTitle } from './TriadPageTitle'

export const TriadPage = ({ value }: ValueProp<TriadState>) => {
  const [showFullFretboard, setShowFullFretboard] = useState(false)
  const [chordType, setChordType] = useState<ChordType>('triad')

  return (
    <TriadProvider value={value}>
      <PageContainer>
        <VStack gap={80}>
          <VStack gap={40}>
            <VStack gap={20} alignItems="center">
              <HStack gap={40} wrap="wrap" justifyContent="center">
                <ManageTriadRootNote />
                <ManageTriadTonality />
              </HStack>
              <HStack gap={40} wrap="wrap" justifyContent="center">
                <ManageTriadIndex />
                <ManageChordType value={chordType} onChange={setChordType} />
              </HStack>
              <HStack gap={40} wrap="wrap" justifyContent="center">
                <ManageShowFullFretboard
                  value={showFullFretboard}
                  onChange={setShowFullFretboard}
                />
              </HStack>
            </VStack>
            <TriadPageTitle />
          </VStack>
          {showFullFretboard && <TriadFullFretboard chordType={chordType} />}
          {range(scalePatternsNumber).map((index) => (
            <TriadOnScalePattern
              key={index}
              scalePatternIndex={index}
              chordType={chordType}
            />
          ))}
        </VStack>
      </PageContainer>
    </TriadProvider>
  )
}
