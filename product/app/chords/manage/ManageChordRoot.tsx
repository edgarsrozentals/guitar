import { HStack } from '@lib/ui/css/stack'
import { InvisibleHTMLRadio } from '@lib/ui/inputs/InvisibleHTMLRadio'
import { getColor } from '@lib/ui/theme/getters'
import { range } from '@lib/utils/array/range'
import { chromaticNotesNames, chromaticNotesNumber } from '@product/core/note'
import { getScaleDegree } from '@product/core/scale/getScaleDegree'
import { useId } from 'react'
import styled, { css } from 'styled-components'

import { ScaleOverlaySettings } from '../scale/ManageScaleOverlay'
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
  padding: 0 8px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  cursor: pointer;
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

const OptionContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  min-width: 20px;
`

const NoteName = styled.span<{ $inScale: boolean }>`
  font-weight: 700;
  font-size: 12px;
  opacity: ${({ $inScale }) => ($inScale ? 1 : 0.4)};
`

const RomanNumeral = styled.span<{ $inScale: boolean }>`
  font-size: 10px;
  font-weight: 500;
  opacity: ${({ $inScale }) => ($inScale ? 1 : 0.3)};
`

type ManageChordRootProps = {
  scaleSettings: ScaleOverlaySettings
}

export const ManageChordRoot = ({ scaleSettings }: ManageChordRootProps) => {
  const { rootNote } = useChords()
  const setValue = useChangeChords()
  const groupName = useId()

  return (
    <RadioWrapper>
      {range(chromaticNotesNumber).map((noteIndex) => {
        const isSelected = noteIndex === rootNote
        const noteName = chromaticNotesNames[noteIndex]
        const degreeInfo = getScaleDegree(
          noteIndex,
          scaleSettings.rootNote,
          scaleSettings.tonality,
        )
        const inScale = degreeInfo !== null

        return (
          <RadioOption $isActive={isSelected} key={noteIndex}>
            <OptionContent>
              <NoteName $inScale={inScale}>{noteName}</NoteName>
              <RomanNumeral $inScale={inScale}>
                {degreeInfo?.roman ?? '–'}
              </RomanNumeral>
            </OptionContent>
            <InvisibleHTMLRadio
              isSelected={isSelected}
              value={noteIndex}
              groupName={groupName}
              onSelect={() => setValue({ rootNote: noteIndex })}
            />
          </RadioOption>
        )
      })}
    </RadioWrapper>
  )
}
