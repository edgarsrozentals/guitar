import { HStack } from '@lib/ui/css/stack'
import { InvisibleHTMLRadio } from '@lib/ui/inputs/InvisibleHTMLRadio'
import { getColor } from '@lib/ui/theme/getters'
import {
  chordQualities,
  chordQualityNames,
} from '@product/core/chords/chordTypes'
import { useId } from 'react'
import styled, { css } from 'styled-components'

import { useChangeChords, useChords } from '../state/chords'

const RadioWrapper = styled(HStack)`
  gap: 1px;
  padding: 2px;
  border-radius: 8px;
  border: 1px solid ${getColor('mist')};
  flex-wrap: wrap;
`

const RadioOption = styled.label<{ $isActive: boolean }>`
  position: relative;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  ${({ $isActive }) =>
    $isActive
      ? css`
          background: ${getColor('success')};
          color: ${getColor('background')};
        `
      : css`
          color: ${getColor('textSupporting')};
          &:hover {
            background: ${getColor('mist')};
          }
        `}
`

export const ManageChordQuality = () => {
  const { quality } = useChords()
  const setValue = useChangeChords()
  const groupName = useId()

  return (
    <RadioWrapper>
      {chordQualities.map((q) => {
        const isSelected = q === quality

        return (
          <RadioOption $isActive={isSelected} key={q}>
            {chordQualityNames[q]}
            <InvisibleHTMLRadio
              isSelected={isSelected}
              value={q}
              groupName={groupName}
              onSelect={() => setValue({ quality: q })}
            />
          </RadioOption>
        )
      })}
    </RadioWrapper>
  )
}
