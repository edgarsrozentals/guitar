'use client'

import { HStack } from '@lib/ui/css/stack'
import { getColor } from '@lib/ui/theme/getters'
import styled from 'styled-components'

import { AudioSource } from './types'

type AudioSourceToggleProps = {
  hasVocalsStem: boolean
  audioSource: AudioSource
  onSourceChange: (source: AudioSource) => void
  disabled: boolean
}

const Container = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: ${getColor('background')};
  border-radius: 6px;
`

const Checkbox = styled.input`
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: ${getColor('primary')};

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`

const Label = styled.label<{ $disabled: boolean }>`
  font-size: 12px;
  color: ${({ $disabled }) =>
    $disabled ? getColor('textSupporting') : getColor('text')};
  cursor: ${({ $disabled }) => ($disabled ? 'not-allowed' : 'pointer')};
  user-select: none;
`

const InfoIcon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: ${getColor('mist')};
  color: ${getColor('textSupporting')};
  font-size: 10px;
  font-weight: 600;
  cursor: help;
  position: relative;

  &:hover::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    transform: translateX(-50%);
    padding: 8px 12px;
    background: ${getColor('foreground')};
    border: 1px solid ${getColor('mist')};
    border-radius: 6px;
    font-size: 11px;
    font-weight: 400;
    color: ${getColor('text')};
    white-space: nowrap;
    z-index: 100;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }
`

export function AudioSourceToggle({
  hasVocalsStem,
  audioSource,
  onSourceChange,
  disabled,
}: AudioSourceToggleProps) {
  // Only show if vocals stem is available
  if (!hasVocalsStem) {
    return null
  }

  const isChecked = audioSource === 'vocals_stem'

  const handleChange = () => {
    if (disabled) return
    onSourceChange(isChecked ? 'full_audio' : 'vocals_stem')
  }

  return (
    <Container>
      <HStack gap={8} alignItems="center">
        <Checkbox
          type="checkbox"
          id="audio-source-toggle"
          checked={isChecked}
          onChange={handleChange}
          disabled={disabled}
        />
        <Label
          htmlFor="audio-source-toggle"
          $disabled={disabled}
          onClick={disabled ? undefined : handleChange}
        >
          Use vocals stem for better accuracy
        </Label>
        <InfoIcon data-tooltip="Using the vocals-only track typically produces more accurate lyrics">
          ?
        </InfoIcon>
      </HStack>
    </Container>
  )
}
