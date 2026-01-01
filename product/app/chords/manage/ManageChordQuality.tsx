import { GroupedRadioInput } from '@lib/ui/inputs/GroupedRadioInput'
import { InputContainer } from '@lib/ui/inputs/InputContainer'
import { InputLabel } from '@lib/ui/inputs/InputLabel'
import {
  chordQualities,
  chordQualityNames,
} from '@product/core/chords/chordTypes'

import { useChangeChords, useChords } from '../state/chords'

export const ManageChordQuality = () => {
  const { quality } = useChords()
  const setValue = useChangeChords()

  return (
    <InputContainer>
      <InputLabel>Quality: {chordQualityNames[quality]}</InputLabel>
      <GroupedRadioInput
        value={quality}
        onChange={(quality) => setValue({ quality })}
        options={chordQualities}
        renderOption={(q) => chordQualityNames[q]}
      />
    </InputContainer>
  )
}
