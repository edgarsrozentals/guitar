'use client'

/**
 * SaveToLibraryButton Component
 *
 * Button to save the current song to the user's library.
 * Shows different states: not authenticated, saving, saved.
 *
 * Epic: Cloud Song Storage (P0)
 * Story: 1.7 Frontend Integration
 */

import { getColor } from '@lib/ui/theme/getters'
import { useRouter } from 'next/router'
import styled from 'styled-components'

type SaveToLibraryButtonProps = {
  isAuthenticated: boolean
  isSaved: boolean
  canSave: boolean
  isSaving: boolean
  error: string | null
  onSave: () => void
}

const Button = styled.button<{ $variant: 'primary' | 'saved' | 'disabled' }>`
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: ${(props) => (props.$variant === 'disabled' ? 'default' : 'pointer')};
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 6px;

  ${(props) => {
    switch (props.$variant) {
      case 'saved':
        return `
          background: ${getColor('success')};
          border: none;
          color: white;
          opacity: 0.8;
        `
      case 'disabled':
        return `
          background: ${getColor('mist')};
          border: none;
          color: ${getColor('textSupporting')};
        `
      default:
        return `
          background: ${getColor('primary')};
          border: none;
          color: white;

          &:hover:not(:disabled) {
            filter: brightness(1.1);
          }

          &:disabled {
            opacity: 0.6;
            cursor: not-allowed;
          }
        `
    }
  }}
`

const LoginLink = styled.a`
  color: ${getColor('primary')};
  font-size: 13px;
  cursor: pointer;
  text-decoration: underline;

  &:hover {
    opacity: 0.8;
  }
`

const ErrorText = styled.span`
  color: ${getColor('alert')};
  font-size: 12px;
  margin-left: 8px;
`

export const SaveToLibraryButton = ({
  isAuthenticated,
  isSaved,
  canSave,
  isSaving,
  error,
  onSave,
}: SaveToLibraryButtonProps) => {
  const router = useRouter()

  if (!isAuthenticated) {
    return (
      <LoginLink
        onClick={() => {
          const currentPath = window.location.pathname + window.location.search
          router.push(`/login?redirect=${encodeURIComponent(currentPath)}`)
        }}
      >
        Sign in to save
      </LoginLink>
    )
  }

  if (isSaved) {
    return (
      <Button $variant="saved" disabled>
        ✓ Saved to Library
      </Button>
    )
  }

  if (!canSave) {
    return null
  }

  return (
    <>
      <Button $variant="primary" onClick={onSave} disabled={isSaving}>
        {isSaving ? 'Saving...' : '+ Save to Library'}
      </Button>
      {error && <ErrorText>{error}</ErrorText>}
    </>
  )
}
