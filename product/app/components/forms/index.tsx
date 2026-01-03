import { getColor } from '@lib/ui/theme/getters'
import styled from 'styled-components'

export const FormContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  padding: 20px;
`

export const FormCard = styled.div`
  background: ${getColor('foreground')};
  border-radius: 12px;
  padding: 32px;
  width: 100%;
  max-width: 400px;
`

export const FormTitle = styled.h1`
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 24px;
  text-align: center;
`

export const FormInput = styled.input`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid ${getColor('mist')};
  border-radius: 8px;
  background: ${getColor('background')};
  color: ${getColor('text')};
  font-size: 16px;

  &:focus {
    outline: none;
    border-color: ${getColor('primary')};
  }

  &::placeholder {
    color: ${getColor('textSupporting')};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`

export const FormLabel = styled.label`
  display: block;
  margin-bottom: 8px;
  font-size: 14px;
  color: ${getColor('textSupporting')};
`

export const FormGroup = styled.div`
  margin-bottom: 16px;
`

export const FormDivider = styled.div`
  display: flex;
  align-items: center;
  margin: 24px 0;

  &::before,
  &::after {
    content: '';
    flex: 1;
    border-bottom: 1px solid ${getColor('mist')};
  }

  span {
    padding: 0 16px;
    color: ${getColor('textSupporting')};
    font-size: 14px;
  }
`

export const FormError = styled.div`
  background: ${getColor('alert')};
  color: white;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
`

export const FormSuccess = styled.div`
  background: ${getColor('success')};
  color: white;
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
`

export const FormLink = styled.p`
  text-align: center;
  margin-top: 24px;
  font-size: 14px;
  color: ${getColor('textSupporting')};

  a {
    color: ${getColor('primary')};
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
`
