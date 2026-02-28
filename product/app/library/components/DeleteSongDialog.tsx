'use client'

/**
 * DeleteSongDialog Component
 *
 * Confirmation dialog for deleting a song from the library.
 *
 * Epic: Cloud Song Storage (P0)
 * Story: 1.7 Frontend Integration
 */

import { getColor } from '@lib/ui/theme/getters'
import styled from 'styled-components'

import { Song } from '../../services/songLibraryApi'

type DeleteSongDialogProps = {
  song: Song | null
  isOpen: boolean
  isDeleting: boolean
  error: string | null
  onClose: () => void
  onConfirm: () => void
}

const Overlay = styled.div<{ $isOpen: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: ${(props) => (props.$isOpen ? 'flex' : 'none')};
  align-items: center;
  justify-content: center;
  z-index: 1000;
`

const Dialog = styled.div`
  background: ${getColor('background')};
  border-radius: 12px;
  padding: 24px;
  max-width: 400px;
  width: 90%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
`

const Title = styled.h2`
  font-size: 18px;
  font-weight: 600;
  color: ${getColor('text')};
  margin: 0 0 12px 0;
`

const Message = styled.p`
  font-size: 14px;
  color: ${getColor('textSupporting')};
  margin: 0 0 8px 0;
  line-height: 1.5;
`

const SongName = styled.span`
  font-weight: 600;
  color: ${getColor('text')};
`

const Warning = styled.p`
  font-size: 13px;
  color: ${getColor('alert')};
  margin: 16px 0;
  padding: 12px;
  background: rgba(255, 59, 48, 0.1);
  border-radius: 8px;
`

const ErrorMessage = styled.p`
  font-size: 13px;
  color: ${getColor('alert')};
  margin: 12px 0 0 0;
`

const ButtonRow = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
`

const Button = styled.button<{ $variant?: 'danger' | 'secondary' }>`
  padding: 10px 20px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;

  ${(props) =>
    props.$variant === 'danger'
      ? `
    background: ${getColor('alert')};
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
      : `
    background: transparent;
    border: 1px solid ${getColor('mist')};
    color: ${getColor('text')};

    &:hover {
      background: ${getColor('mist')};
    }
  `}
`

export const DeleteSongDialog = ({
  song,
  isOpen,
  isDeleting,
  error,
  onClose,
  onConfirm,
}: DeleteSongDialogProps) => {
  if (!song) return null

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && !isDeleting) {
      onClose()
    }
  }

  return (
    <Overlay $isOpen={isOpen} onClick={handleOverlayClick}>
      <Dialog>
        <Title>Delete Song</Title>
        <Message>
          Are you sure you want to delete <SongName>{song.title}</SongName>?
        </Message>
        <Warning>
          This will permanently delete the song and all associated data
          including chord analyses, stems, and lyrics. This action cannot be
          undone.
        </Warning>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <ButtonRow>
          <Button onClick={onClose} disabled={isDeleting}>
            Cancel
          </Button>
          <Button $variant="danger" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </ButtonRow>
      </Dialog>
    </Overlay>
  )
}
