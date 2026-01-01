import { GroupedRadioInput } from '@lib/ui/inputs/GroupedRadioInput'
import { InputContainer } from '@lib/ui/inputs/InputContainer'
import { InputLabel } from '@lib/ui/inputs/InputLabel'
import { capitalizeFirstLetter } from '@lib/utils/capitalizeFirstLetter'
import { chromaticNotesNames } from '@product/core/note'
import { scaleTypes, ScaleType } from '@product/core/scale/ScaleType'
import { Tonality, tonalities } from '@product/core/tonality'

type ScaleOverlaySettings = {
  enabled: boolean
  scaleType: ScaleType
  tonality: Tonality
  rootNote: number
}

type ManageScaleOverlayProps = {
  value: ScaleOverlaySettings
  onChange: (value: ScaleOverlaySettings) => void
}

export const ManageScaleOverlay = ({
  value,
  onChange,
}: ManageScaleOverlayProps) => {
  const { enabled, scaleType, tonality, rootNote } = value

  return (
    <>
      <InputContainer>
        <InputLabel>Scale Key</InputLabel>
        <GroupedRadioInput
          value={rootNote}
          onChange={(rootNote) => onChange({ ...value, rootNote })}
          options={Array.from({ length: 12 }, (_, i) => i)}
          renderOption={(note) => chromaticNotesNames[note]}
        />
      </InputContainer>

      <InputContainer>
        <InputLabel>Tonality</InputLabel>
        <GroupedRadioInput
          value={tonality}
          onChange={(tonality) => onChange({ ...value, tonality })}
          options={tonalities}
          renderOption={(t) => capitalizeFirstLetter(t)}
        />
      </InputContainer>

      <InputContainer>
        <InputLabel>Scale Type</InputLabel>
        <GroupedRadioInput
          value={scaleType}
          onChange={(scaleType) => onChange({ ...value, scaleType })}
          options={scaleTypes}
          renderOption={(type) => capitalizeFirstLetter(type)}
        />
      </InputContainer>

      <InputContainer>
        <InputLabel>Scale Overlay</InputLabel>
        <GroupedRadioInput
          value={enabled ? 'on' : 'off'}
          onChange={(v) => onChange({ ...value, enabled: v === 'on' })}
          options={['on', 'off'] as const}
          renderOption={(v) => capitalizeFirstLetter(v)}
        />
      </InputContainer>
    </>
  )
}

export type { ScaleOverlaySettings }
