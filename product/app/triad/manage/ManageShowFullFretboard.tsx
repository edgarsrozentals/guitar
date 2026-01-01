import { GroupedRadioInput } from '@lib/ui/inputs/GroupedRadioInput'
import { InputContainer } from '@lib/ui/inputs/InputContainer'
import { InputLabel } from '@lib/ui/inputs/InputLabel'

const options = ['hide', 'show'] as const
type Option = (typeof options)[number]

const optionLabels: Record<Option, string> = {
  hide: 'Hide',
  show: 'Show',
}

type ManageShowFullFretboardProps = {
  value: boolean
  onChange: (value: boolean) => void
}

export const ManageShowFullFretboard = ({
  value,
  onChange,
}: ManageShowFullFretboardProps) => {
  const currentOption: Option = value ? 'show' : 'hide'

  return (
    <InputContainer>
      <InputLabel>Full fretboard: {optionLabels[currentOption]}</InputLabel>
      <GroupedRadioInput
        value={currentOption}
        onChange={(option) => onChange(option === 'show')}
        options={options}
        renderOption={(option) => optionLabels[option]}
      />
    </InputContainer>
  )
}
