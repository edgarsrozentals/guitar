'use client'

/**
 * LibraryLoadingSkeleton Component
 *
 * Loading placeholder for the song library grid.
 *
 * Epic: Cloud Song Storage (P0)
 * Story: 1.7 Frontend Integration
 */

import { getColor } from '@lib/ui/theme/getters'
import styled, { keyframes } from 'styled-components'

type LibraryLoadingSkeletonProps = {
  count?: number
}

const shimmer = keyframes`
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
`

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
`

const SkeletonCard = styled.div`
  background: ${getColor('background')};
  border: 1px solid ${getColor('mist')};
  border-radius: 12px;
  padding: 16px;
`

const SkeletonElement = styled.div<{ $width?: string; $height?: string }>`
  background: linear-gradient(
    90deg,
    ${getColor('mist')} 25%,
    ${getColor('background')} 50%,
    ${getColor('mist')} 75%
  );
  background-size: 200% 100%;
  animation: ${shimmer} 1.5s infinite;
  border-radius: 4px;
  width: ${(props) => props.$width || '100%'};
  height: ${(props) => props.$height || '16px'};
`

const ThumbnailSkeleton = styled(SkeletonElement)`
  aspect-ratio: 16 / 9;
  height: auto;
  margin-bottom: 12px;
  border-radius: 8px;
`

const TextRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`

const MetaRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
`

export const LibraryLoadingSkeleton = ({
  count = 6,
}: LibraryLoadingSkeletonProps) => {
  return (
    <Grid>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index}>
          <ThumbnailSkeleton />
          <TextRow>
            <SkeletonElement $width="80%" $height="18px" />
            <SkeletonElement $width="50%" $height="14px" />
          </TextRow>
          <MetaRow>
            <SkeletonElement $width="40px" $height="12px" />
            <SkeletonElement $width="150px" $height="20px" />
          </MetaRow>
        </SkeletonCard>
      ))}
    </Grid>
  )
}
