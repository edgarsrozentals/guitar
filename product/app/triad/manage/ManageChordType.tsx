import { GroupedRadioInput } from '@lib/ui/inputs/GroupedRadioInput'
import { InputContainer } from '@lib/ui/inputs/InputContainer'
import { InputLabel } from '@lib/ui/inputs/InputLabel'
import { ChordType, chordTypes, chordTypeNames } from '@product/core/triads'

type ManageChordTypeProps = {
  value: ChordType
  onChange: (value: ChordType) => void
}

export const ManageChordType = ({ value, onChange }: ManageChordTypeProps) => {
  return (
    <InputContainer>
      <InputLabel>Chord type: {chordTypeNames[value]}</InputLabel>
      <GroupedRadioInput
        value={value}
        onChange={onChange}
        options={chordTypes}
        renderOption={(type) => chordTypeNames[type]}
      />
    </InputContainer>
  )
}
