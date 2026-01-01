import { GroupedRadioInput } from '@lib/ui/inputs/GroupedRadioInput'
import { InputContainer } from '@lib/ui/inputs/InputContainer'
import { InputLabel } from '@lib/ui/inputs/InputLabel'
import { range } from '@lib/utils/array/range'
import { chromaticNotesNames, chromaticNotesNumber } from '@product/core/note'
import { getScaleDegree } from '@product/core/scale/getScaleDegree'
import styled from 'styled-components'

import { ScaleOverlaySettings } from '../scale/ManageScaleOverlay'
import { useChangeChords, useChords } from '../state/chords'

const OptionContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 24px;
`

const NoteName = styled.span<{ $inScale: boolean }>`
  font-weight: 600;
  font-size: 14px;
  opacity: ${({ $inScale }) => ($inScale ? 1 : 0.4)};
`

const RomanNumeral = styled.span<{ $inScale: boolean }>`
  font-size: 13px;
  font-weight: 500;
  opacity: ${({ $inScale }) => ($inScale ? 1 : 0.3)};
`

type ManageChordRootProps = {
  scaleSettings: ScaleOverlaySettings
}

export const ManageChordRoot = ({ scaleSettings }: ManageChordRootProps) => {
  const { rootNote } = useChords()
  const setValue = useChangeChords()

  return (
    <InputContainer>
      <InputLabel>Root: {chromaticNotesNames[rootNote]}</InputLabel>
      <GroupedRadioInput
        value={rootNote}
        onChange={(noteIndex) => {
          setValue({ rootNote: noteIndex })
        }}
        options={range(chromaticNotesNumber)}
        renderOption={(noteIndex) => {
          const noteName = chromaticNotesNames[noteIndex]
          const degreeInfo = getScaleDegree(
            noteIndex,
            scaleSettings.rootNote,
            scaleSettings.tonality,
          )

          const inScale = degreeInfo !== null

          return (
            <OptionContent>
              <NoteName $inScale={inScale}>{noteName}</NoteName>
              <RomanNumeral $inScale={inScale}>
                {degreeInfo?.roman ?? '–'}
              </RomanNumeral>
            </OptionContent>
          )
        }}
      />
    </InputContainer>
  )
}
