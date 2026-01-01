import { GroupedRadioInput } from '@lib/ui/inputs/GroupedRadioInput'
import { InputContainer } from '@lib/ui/inputs/InputContainer'
import { InputLabel } from '@lib/ui/inputs/InputLabel'
import { tonalityNames, tonalities } from '@product/core/tonality'

import { useChangeTriad, useTriad } from '../state/triad'

export const ManageTriadTonality = () => {
  const { tonality } = useTriad()
  const setValue = useChangeTriad()

  return (
    <InputContainer>
      <InputLabel>Tonality: {tonalityNames[tonality]}</InputLabel>
      <GroupedRadioInput
        value={tonality}
        onChange={(tonality) => setValue({ tonality })}
        options={tonalities}
        renderOption={(tonality) => tonalityNames[tonality]}
      />
    </InputContainer>
  )
}
