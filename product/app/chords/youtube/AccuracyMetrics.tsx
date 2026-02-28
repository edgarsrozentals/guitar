'use client'

import { getColor } from '@lib/ui/theme/getters'
import styled from 'styled-components'

import type { ComparisonResult } from '@product/core/chords/compareChords'

type AccuracyMetricsProps = {
  result: ComparisonResult
  libraryName: string
}

const Container = styled.div`
  display: flex;
  gap: 16px;
  align-items: center;
`

const MetricBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 70px;
`

const MetricValue = styled.span<{ $level: 'good' | 'medium' | 'poor' }>`
  font-size: 20px;
  font-weight: 700;
  color: ${({ $level }) =>
    $level === 'good'
      ? getColor('success')
      : $level === 'medium'
        ? '#f5a623'
        : getColor('alert')};
`

const MetricLabel = styled.span`
  font-size: 10px;
  color: ${getColor('textSupporting')};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  text-align: center;
`

const LibraryBadge = styled.span`
  font-size: 11px;
  font-weight: 600;
  color: ${getColor('text')};
  background: ${getColor('mist')};
  padding: 4px 8px;
  border-radius: 4px;
`

function getAccuracyLevel(percentage: number): 'good' | 'medium' | 'poor' {
  if (percentage >= 80) return 'good'
  if (percentage >= 60) return 'medium'
  return 'poor'
}

export function AccuracyMetrics({ result, libraryName }: AccuracyMetricsProps) {
  return (
    <Container>
      <LibraryBadge>{libraryName}</LibraryBadge>
      <MetricBox>
        <MetricValue $level={getAccuracyLevel(result.overallAgreement)}>
          {result.overallAgreement}%
        </MetricValue>
        <MetricLabel>Agreement</MetricLabel>
      </MetricBox>
      <MetricBox>
        <MetricValue $level={getAccuracyLevel(result.rootAccuracy)}>
          {result.rootAccuracy}%
        </MetricValue>
        <MetricLabel>Root Acc</MetricLabel>
      </MetricBox>
      <MetricBox>
        <MetricValue $level={getAccuracyLevel(result.qualityAccuracy)}>
          {result.qualityAccuracy}%
        </MetricValue>
        <MetricLabel>Quality Acc</MetricLabel>
      </MetricBox>
    </Container>
  )
}

// Compact version for use in tables
type CompactMetricsProps = {
  result: ComparisonResult
}

const CompactContainer = styled.div`
  display: flex;
  gap: 8px;
  align-items: center;
`

const CompactValue = styled.span<{ $level: 'good' | 'medium' | 'poor' }>`
  font-size: 13px;
  font-weight: 600;
  color: ${({ $level }) =>
    $level === 'good'
      ? getColor('success')
      : $level === 'medium'
        ? '#f5a623'
        : getColor('alert')};
  min-width: 40px;
  text-align: center;
`

export function CompactAccuracyMetrics({ result }: CompactMetricsProps) {
  return (
    <CompactContainer>
      <CompactValue $level={getAccuracyLevel(result.overallAgreement)}>
        {result.overallAgreement}%
      </CompactValue>
      <CompactValue $level={getAccuracyLevel(result.rootAccuracy)}>
        {result.rootAccuracy}%
      </CompactValue>
      <CompactValue $level={getAccuracyLevel(result.qualityAccuracy)}>
        {result.qualityAccuracy}%
      </CompactValue>
    </CompactContainer>
  )
}
