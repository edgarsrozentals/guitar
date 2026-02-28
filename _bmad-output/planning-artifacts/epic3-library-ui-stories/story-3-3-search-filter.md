# Story 3.3: Search and Filter Songs

**Epic:** Song Library UI
**Priority:** P2 - Medium
**Size:** Medium
**Backend Required:** No (Frontend only, client-side filtering)

## User Story

As an authenticated user,
I want to search and filter my song library,
So that I can quickly find specific songs.

## Technical Context

Implement client-side search and filtering on the loaded song list. This provides instant feedback without additional API calls. Server-side pagination will handle large libraries.

## Acceptance Criteria

### Search Functionality

**Given** I am on the library page with multiple songs
**When** I type into the search input field
**Then**:
- Song list filters in real-time as I type
- Search matches against song title (case-insensitive)
- Search matches against artist name (case-insensitive)
- Matching text is highlighted in results

**Given** I have typed a search query with no matching results
**When** the filter is applied
**Then**:
- I see a message "No songs match your search"
- I see a button to clear the search
- Song count shows "0 songs"

### Filter Panel

**Given** I am on the library page
**When** I click the "Filter" button
**Then**:
- A filter panel expands/appears
- Filter options are visible:
  - Key dropdown (all detected keys)
  - Has Stems toggle
  - Has Lyrics toggle
  - Has Chords toggle

### Key Filter

**Given** I select a key filter (e.g., "A minor")
**When** the filter is applied
**Then**:
- Only songs with that detected key are shown
- Filter chip shows the active key filter
- Other filters remain active

### Feature Filters

**Given** I enable the "Has Stems" filter
**When** the filter is applied
**Then**:
- Only songs that have separated stems are shown
- Filter toggle shows active state

**Given** I enable "Has Lyrics" filter
**When** the filter is applied
**Then**:
- Only songs with lyrics are shown

### Combined Filters

**Given** I have multiple filters active (e.g., Key: A minor + Has Stems)
**When** viewing the filtered results
**Then**:
- Only songs matching ALL active filters are shown
- Active filter count is displayed
- "Clear Filters" button is visible

### Clear Filters

**Given** I have multiple filters active
**When** I click "Clear Filters"
**Then**:
- All filters are reset
- All songs are displayed
- Search input is cleared
- Filter panel collapses

### Search Debounce

**Given** I am typing in the search input
**When** typing rapidly
**Then**:
- Filtering is debounced (300ms delay)
- UI remains responsive
- No excessive re-renders

## Implementation Notes

### Search and Filter State
```typescript
// product/app/library/hooks/useSongFilter.ts
import { useState, useMemo, useCallback } from 'react';
import { useDebounce } from '@lib/hooks/useDebounce';
import { Song } from '../types';

interface FilterState {
  search: string;
  key: string | null;
  hasStems: boolean;
  hasLyrics: boolean;
  hasChords: boolean;
}

const initialFilters: FilterState = {
  search: '',
  key: null,
  hasStems: false,
  hasLyrics: false,
  hasChords: false,
};

export const useSongFilter = (songs: Song[]) => {
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const debouncedSearch = useDebounce(filters.search, 300);

  // Extract unique keys from songs
  const availableKeys = useMemo(() => {
    const keys = songs
      .filter(s => s.key)
      .map(s => `${s.key!.root} ${s.key!.scale}`)
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort();
    return keys;
  }, [songs]);

  // Filter songs
  const filteredSongs = useMemo(() => {
    return songs.filter(song => {
      // Search filter
      if (debouncedSearch) {
        const searchLower = debouncedSearch.toLowerCase();
        const titleMatch = song.title.toLowerCase().includes(searchLower);
        const artistMatch = song.artist?.toLowerCase().includes(searchLower);
        if (!titleMatch && !artistMatch) return false;
      }

      // Key filter
      if (filters.key) {
        const songKey = song.key ? `${song.key.root} ${song.key.scale}` : null;
        if (songKey !== filters.key) return false;
      }

      // Feature filters
      if (filters.hasStems && !song.hasStems) return false;
      if (filters.hasLyrics && !song.hasLyrics) return false;
      if (filters.hasChords && !song.hasChords) return false;

      return true;
    });
  }, [songs, debouncedSearch, filters]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.key) count++;
    if (filters.hasStems) count++;
    if (filters.hasLyrics) count++;
    if (filters.hasChords) count++;
    return count;
  }, [filters]);

  const setSearch = useCallback((search: string) => {
    setFilters(f => ({ ...f, search }));
  }, []);

  const setKey = useCallback((key: string | null) => {
    setFilters(f => ({ ...f, key }));
  }, []);

  const toggleHasStems = useCallback(() => {
    setFilters(f => ({ ...f, hasStems: !f.hasStems }));
  }, []);

  const toggleHasLyrics = useCallback(() => {
    setFilters(f => ({ ...f, hasLyrics: !f.hasLyrics }));
  }, []);

  const toggleHasChords = useCallback(() => {
    setFilters(f => ({ ...f, hasChords: !f.hasChords }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
  }, []);

  return {
    filteredSongs,
    filters,
    availableKeys,
    activeFilterCount,
    hasActiveFilters: activeFilterCount > 0 || !!filters.search,
    setSearch,
    setKey,
    toggleHasStems,
    toggleHasLyrics,
    toggleHasChords,
    clearFilters,
  };
};
```

### Search Input Component
```typescript
// product/app/library/SearchInput.tsx
import styled from 'styled-components';
import { SearchIcon, ClearIcon } from '@lib/ui/icons';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const SearchInput = ({
  value,
  onChange,
  placeholder = 'Search songs...'
}: SearchInputProps) => {
  return (
    <Container>
      <IconWrapper>
        <SearchIcon />
      </IconWrapper>
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <ClearButton onClick={() => onChange('')}>
          <ClearIcon />
        </ClearButton>
      )}
    </Container>
  );
};

const Container = styled.div`
  position: relative;
  width: 100%;
  max-width: 300px;
`;

const IconWrapper = styled.span`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #666;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 36px;
  border: 1px solid #333;
  border-radius: 8px;
  background: #1a1a1a;
  color: #fff;
  font-size: 14px;

  &:focus {
    outline: none;
    border-color: #4a9eff;
  }

  &::placeholder {
    color: #666;
  }
`;

const ClearButton = styled.button`
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: #666;
  cursor: pointer;
  padding: 4px;

  &:hover {
    color: #fff;
  }
`;
```

### Filter Panel Component
```typescript
// product/app/library/FilterPanel.tsx
import styled from 'styled-components';

interface FilterPanelProps {
  isOpen: boolean;
  availableKeys: string[];
  selectedKey: string | null;
  hasStems: boolean;
  hasLyrics: boolean;
  hasChords: boolean;
  onKeyChange: (key: string | null) => void;
  onToggleStems: () => void;
  onToggleLyrics: () => void;
  onToggleChords: () => void;
  onClear: () => void;
}

export const FilterPanel = ({
  isOpen,
  availableKeys,
  selectedKey,
  hasStems,
  hasLyrics,
  hasChords,
  onKeyChange,
  onToggleStems,
  onToggleLyrics,
  onToggleChords,
  onClear,
}: FilterPanelProps) => {
  if (!isOpen) return null;

  return (
    <Panel>
      <FilterGroup>
        <Label>Key</Label>
        <Select
          value={selectedKey || ''}
          onChange={(e) => onKeyChange(e.target.value || null)}
        >
          <option value="">All keys</option>
          {availableKeys.map(key => (
            <option key={key} value={key}>{key}</option>
          ))}
        </Select>
      </FilterGroup>

      <FilterGroup>
        <Label>Features</Label>
        <ToggleGroup>
          <ToggleButton $active={hasChords} onClick={onToggleChords}>
            🎸 Chords
          </ToggleButton>
          <ToggleButton $active={hasStems} onClick={onToggleStems}>
            🎚️ Stems
          </ToggleButton>
          <ToggleButton $active={hasLyrics} onClick={onToggleLyrics}>
            🎤 Lyrics
          </ToggleButton>
        </ToggleGroup>
      </FilterGroup>

      <ClearButton onClick={onClear}>
        Clear all filters
      </ClearButton>
    </Panel>
  );
};

const Panel = styled.div`
  background: #1a1a1a;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
  display: flex;
  gap: 24px;
  align-items: flex-end;
  flex-wrap: wrap;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-size: 12px;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const Select = styled.select`
  padding: 8px 12px;
  border: 1px solid #333;
  border-radius: 6px;
  background: #0a0a0a;
  color: #fff;
  font-size: 14px;
  min-width: 120px;

  &:focus {
    outline: none;
    border-color: #4a9eff;
  }
`;

const ToggleGroup = styled.div`
  display: flex;
  gap: 8px;
`;

const ToggleButton = styled.button<{ $active: boolean }>`
  padding: 8px 12px;
  border: 1px solid ${({ $active }) => $active ? '#4a9eff' : '#333'};
  border-radius: 6px;
  background: ${({ $active }) => $active ? 'rgba(74, 158, 255, 0.1)' : '#0a0a0a'};
  color: ${({ $active }) => $active ? '#4a9eff' : '#fff'};
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: #4a9eff;
  }
`;

const ClearButton = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #888;
  font-size: 13px;
  cursor: pointer;
  margin-left: auto;

  &:hover {
    color: #fff;
  }
`;
```

### No Results State
```typescript
// product/app/library/NoResults.tsx
import styled from 'styled-components';

interface NoResultsProps {
  searchQuery: string;
  onClear: () => void;
}

export const NoResults = ({ searchQuery, onClear }: NoResultsProps) => {
  return (
    <Container>
      <Icon>🔍</Icon>
      <Title>No songs found</Title>
      <Message>
        No songs match "{searchQuery}"
      </Message>
      <ClearButton onClick={onClear}>
        Clear search
      </ClearButton>
    </Container>
  );
};

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px;
  text-align: center;
`;

const Icon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.5;
`;

const Title = styled.h3`
  font-size: 18px;
  margin: 0 0 8px;
`;

const Message = styled.p`
  color: #888;
  margin: 0 0 16px;
`;

const ClearButton = styled.button`
  padding: 8px 16px;
  border: 1px solid #4a9eff;
  border-radius: 6px;
  background: transparent;
  color: #4a9eff;
  cursor: pointer;

  &:hover {
    background: rgba(74, 158, 255, 0.1);
  }
`;
```

## Testing Checklist
- [ ] Search filters songs by title
- [ ] Search filters songs by artist
- [ ] Search is case-insensitive
- [ ] Search is debounced (no lag while typing)
- [ ] No results message displays correctly
- [ ] Clear search button works
- [ ] Key filter dropdown populates with available keys
- [ ] Key filter works correctly
- [ ] Has Stems toggle works
- [ ] Has Lyrics toggle works
- [ ] Has Chords toggle works
- [ ] Multiple filters combine correctly (AND logic)
- [ ] Clear all filters button works
- [ ] Active filter count displays
- [ ] Filter panel opens/closes smoothly

## Dependencies
- useDebounce hook
- Song data with key/feature fields
- Styled-components

## Definition of Done
- [ ] Search input component created
- [ ] Filter panel component created
- [ ] useSongFilter hook implemented
- [ ] Debounced search working
- [ ] All filter types working
- [ ] Combined filters working
- [ ] No results state implemented
- [ ] Clear filters working
- [ ] Responsive layout verified