# Story 3.4: Delete Song from Library

**Epic:** Song Library UI
**Priority:** P1 - High
**Size:** Medium
**Backend Required:** Yes (API call)

## User Story

As an authenticated user,
I want to delete songs from my library,
So that I can remove songs I no longer need and free up storage.

## Technical Context

Implement song deletion with confirmation dialog and proper cascade cleanup. The backend handles deleting all associated data (audio, chords, stems, lyrics).

## Acceptance Criteria

### Delete Button Visibility

**Given** I am viewing a song in my library (grid or list view)
**When** I hover over the song card/item
**Then**:
- A delete button (trash icon) appears
- Button is positioned clearly without obscuring content
- Button has appropriate hover state

### Confirmation Dialog

**Given** I click the delete button on a song
**When** the dialog appears
**Then**:
- Dialog title shows: "Delete Song?"
- Song title is displayed in the dialog
- Warning message: "This will permanently delete the song and all associated data (audio, stems, lyrics, chord analysis)."
- Two buttons: "Cancel" and "Delete"
- Delete button is styled as destructive (red)

### Cancel Deletion

**Given** the delete confirmation dialog is open
**When** I click "Cancel"
**Then**:
- Dialog closes
- No deletion occurs
- Song remains in the library
- I can also close by pressing Escape or clicking outside

### Confirm Deletion

**Given** the delete confirmation dialog is open
**When** I click "Delete"
**Then**:
- Dialog shows loading state (spinner on delete button)
- Delete button is disabled during request
- On success:
  - Dialog closes
  - Song is immediately removed from the list (optimistic)
  - Toast notification: "Song deleted"
- Song count updates

### Delete Failure Handling

**Given** I confirm deletion but the request fails
**When** the error occurs
**Then**:
- Dialog shows error: "Failed to delete song. Please try again."
- "Delete" button becomes active again
- User can retry or cancel
- Song is not removed from list

### Delete from Chord Player

**Given** I am on a song's chord player page
**When** I access the song menu (three dots or similar)
**Then**:
- "Delete from Library" option is available
- Clicking shows the same confirmation dialog
- After successful deletion, I am redirected to /library

### Keyboard Accessibility

**Given** the delete dialog is open
**When** I press Enter
**Then**:
- The focused button is activated
- If no button is focused, nothing happens

## Implementation Notes

### Delete Dialog Component
```typescript
// product/app/library/DeleteSongDialog.tsx
import styled from 'styled-components';
import { Dialog } from '@lib/ui/Dialog';
import { Button } from '@lib/ui/Button';
import { Song } from './types';

interface DeleteSongDialogProps {
  song: Song | null;
  isOpen: boolean;
  isDeleting: boolean;
  error: string | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteSongDialog = ({
  song,
  isOpen,
  isDeleting,
  error,
  onClose,
  onConfirm,
}: DeleteSongDialogProps) => {
  if (!song) return null;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Song?"
    >
      <Content>
        <SongTitle>"{song.title}"</SongTitle>

        <Warning>
          This will permanently delete the song and all associated data:
        </Warning>

        <DataList>
          <li>Audio file</li>
          {song.hasChords && <li>Chord analysis</li>}
          {song.hasStems && <li>Separated stems</li>}
          {song.hasLyrics && <li>Synced lyrics</li>}
        </DataList>

        <WarningText>This action cannot be undone.</WarningText>

        {error && <ErrorMessage>{error}</ErrorMessage>}
      </Content>

      <Actions>
        <Button variant="ghost" onClick={onClose} disabled={isDeleting}>
          Cancel
        </Button>
        <Button
          variant="destructive"
          onClick={onConfirm}
          disabled={isDeleting}
          loading={isDeleting}
        >
          {isDeleting ? 'Deleting...' : 'Delete'}
        </Button>
      </Actions>
    </Dialog>
  );
};

const Content = styled.div`
  padding: 16px 0;
`;

const SongTitle = styled.div`
  font-size: 16px;
  font-weight: 500;
  margin-bottom: 16px;
  color: #fff;
`;

const Warning = styled.p`
  color: #888;
  margin: 0 0 12px;
  font-size: 14px;
`;

const DataList = styled.ul`
  margin: 0 0 16px;
  padding-left: 20px;
  color: #888;
  font-size: 14px;

  li {
    margin-bottom: 4px;
  }
`;

const WarningText = styled.p`
  color: #ff6b6b;
  font-size: 13px;
  margin: 0;
`;

const ErrorMessage = styled.div`
  background: rgba(255, 107, 107, 0.1);
  border: 1px solid rgba(255, 107, 107, 0.3);
  color: #ff6b6b;
  padding: 12px;
  border-radius: 6px;
  margin-top: 16px;
  font-size: 14px;
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #333;
`;
```

### useDeleteSong Hook
```typescript
// product/app/library/hooks/useDeleteSong.ts
import { useState, useCallback } from 'react';
import { songLibraryApi } from '../../services/songLibraryApi';
import { toast } from '@lib/ui/toast';

interface UseDeleteSongResult {
  isDeleting: boolean;
  error: string | null;
  deleteSong: (songId: string) => Promise<boolean>;
  clearError: () => void;
}

export const useDeleteSong = (onSuccess?: () => void): UseDeleteSongResult => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const deleteSong = useCallback(async (songId: string): Promise<boolean> => {
    setIsDeleting(true);
    setError(null);

    try {
      await songLibraryApi.deleteSong(songId);
      toast.success('Song deleted');
      onSuccess?.();
      return true;
    } catch (err) {
      const message = err instanceof Error
        ? err.message
        : 'Failed to delete song. Please try again.';
      setError(message);
      return false;
    } finally {
      setIsDeleting(false);
    }
  }, [onSuccess]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isDeleting,
    error,
    deleteSong,
    clearError,
  };
};
```

### Integration with Library
```typescript
// product/app/library/SongLibrary.tsx (updated)
import { useState, useCallback } from 'react';
import { useUserSongs } from './hooks/useUserSongs';
import { useDeleteSong } from './hooks/useDeleteSong';
import { DeleteSongDialog } from './DeleteSongDialog';
import { Song } from './types';

export const SongLibrary = () => {
  const { songs, isLoading, error: fetchError, refresh } = useUserSongs();
  const [songToDelete, setSongToDelete] = useState<Song | null>(null);

  const {
    isDeleting,
    error: deleteError,
    deleteSong,
    clearError
  } = useDeleteSong(() => {
    setSongToDelete(null);
    refresh();
  });

  const handleDeleteClick = useCallback((song: Song) => {
    setSongToDelete(song);
    clearError();
  }, [clearError]);

  const handleDeleteConfirm = useCallback(async () => {
    if (songToDelete) {
      await deleteSong(songToDelete.id);
    }
  }, [songToDelete, deleteSong]);

  const handleDialogClose = useCallback(() => {
    if (!isDeleting) {
      setSongToDelete(null);
      clearError();
    }
  }, [isDeleting, clearError]);

  return (
    <Container>
      {/* ... header and song grid/list ... */}

      <SongGrid
        songs={songs}
        onDeleteSong={handleDeleteClick}
      />

      <DeleteSongDialog
        song={songToDelete}
        isOpen={!!songToDelete}
        isDeleting={isDeleting}
        error={deleteError}
        onClose={handleDialogClose}
        onConfirm={handleDeleteConfirm}
      />
    </Container>
  );
};
```

### Delete from Chord Player
```typescript
// product/app/chords/youtube/SongMenu.tsx
import { useState } from 'react';
import { useRouter } from 'next/router';
import { Menu, MenuItem } from '@lib/ui/Menu';
import { DeleteSongDialog } from '@product/app/library/DeleteSongDialog';
import { useDeleteSong } from '@product/app/library/hooks/useDeleteSong';

interface SongMenuProps {
  song: Song;
}

export const SongMenu = ({ song }: SongMenuProps) => {
  const router = useRouter();
  const [showDelete, setShowDelete] = useState(false);
  const { isDeleting, error, deleteSong, clearError } = useDeleteSong(() => {
    router.push('/library');
  });

  return (
    <>
      <Menu>
        <MenuItem onClick={() => setShowDelete(true)} destructive>
          Delete from Library
        </MenuItem>
      </Menu>

      <DeleteSongDialog
        song={song}
        isOpen={showDelete}
        isDeleting={isDeleting}
        error={error}
        onClose={() => {
          setShowDelete(false);
          clearError();
        }}
        onConfirm={() => deleteSong(song.id)}
      />
    </>
  );
};
```

## Testing Checklist
- [ ] Delete button appears on hover (grid view)
- [ ] Delete button appears on hover (list view)
- [ ] Confirmation dialog opens on click
- [ ] Dialog shows correct song title
- [ ] Dialog lists data to be deleted
- [ ] Cancel button closes dialog
- [ ] Escape key closes dialog
- [ ] Click outside closes dialog
- [ ] Delete button shows loading state
- [ ] Successful deletion removes song from list
- [ ] Success toast notification appears
- [ ] Failed deletion shows error in dialog
- [ ] Retry after failure works
- [ ] Delete from chord player works
- [ ] Redirect to library after chord player delete

## Dependencies
- Dialog component from @lib/ui
- Toast notification system
- Backend DELETE endpoint

## Definition of Done
- [ ] Delete button added to song cards/items
- [ ] Confirmation dialog implemented
- [ ] Loading and error states working
- [ ] Optimistic update on success
- [ ] Toast notification working
- [ ] Delete from chord player implemented
- [ ] Keyboard accessibility verified
- [ ] Error recovery working