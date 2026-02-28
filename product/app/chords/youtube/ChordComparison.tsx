'use client'

import { getColor } from '@lib/ui/theme/getters'
import {
  compareChords,
  formatChord,
  type ComparisonResult,
} from '@product/core/chords/compareChords'
import { useMemo, useState } from 'react'
import styled from 'styled-components'

type ChordEvent = {
  time: number
  chord: { root: string; quality: string }
}

type ChordLibrary = 'essentia' | 'madmom' | 'btc' | 'chordify'

type ChordsByLibrary = {
  [K in ChordLibrary]?: ChordEvent[]
}

type ChordComparisonProps = {
  chordsByLibrary: ChordsByLibrary
  duration: number
  bpm?: number
  beats?: number[]
}

const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const Header = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`

const Title = styled.h3`
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: ${getColor('text')};
`

const GroundTruthBadge = styled.span`
  font-size: 10px;
  font-weight: 600;
  color: ${getColor('background')};
  background: ${getColor('success')};
  padding: 3px 8px;
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`

const NoDataMessage = styled.div`
  font-size: 13px;
  color: ${getColor('textSupporting')};
  text-align: center;
  padding: 20px;
  background: ${getColor('mist')};
  border-radius: 8px;
`

// Table styles
const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
`

const TableHeader = styled.th`
  text-align: left;
  padding: 8px 12px;
  border-bottom: 2px solid ${getColor('mist')};
  color: ${getColor('textSupporting')};
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  &:not(:first-child) {
    text-align: center;
  }
`

const TableRow = styled.tr`
  &:hover {
    background: ${getColor('mist')};
  }
`

const TableCell = styled.td`
  padding: 10px 12px;
  border-bottom: 1px solid ${getColor('mist')};

  &:not(:first-child) {
    text-align: center;
  }
`

const LibraryName = styled.span`
  font-weight: 600;
  color: ${getColor('text')};
`

const AccuracyValue = styled.span<{ $level: 'good' | 'medium' | 'poor' }>`
  font-weight: 600;
  color: ${({ $level }) =>
    $level === 'good'
      ? getColor('success')
      : $level === 'medium'
        ? '#f5a623'
        : getColor('alert')};
`

const SampleInfo = styled.div`
  font-size: 11px;
  color: ${getColor('textSupporting')};
  margin-top: 8px;
`

// Mismatch details toggle
const ToggleButton = styled.button`
  font-size: 12px;
  color: ${getColor('primary')};
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px 8px;
  margin-top: 8px;

  &:hover {
    text-decoration: underline;
  }
`

const MismatchesSection = styled.div`
  margin-top: 12px;
  padding: 12px;
  background: ${getColor('mist')};
  border-radius: 8px;
  max-height: 200px;
  overflow-y: auto;
`

const MismatchRow = styled.div`
  display: flex;
  gap: 12px;
  padding: 6px 0;
  border-bottom: 1px solid ${getColor('mistExtra')};
  font-size: 12px;

  &:last-child {
    border-bottom: none;
  }
`

const MismatchTime = styled.span`
  color: ${getColor('textSupporting')};
  font-family: monospace;
  min-width: 50px;
`

const MismatchChord = styled.span<{ $isCorrect?: boolean }>`
  font-weight: 600;
  color: ${({ $isCorrect }) =>
    $isCorrect ? getColor('success') : getColor('alert')};
`

const MismatchArrow = styled.span`
  color: ${getColor('textSupporting')};
`

const MismatchLibrary = styled.span`
  color: ${getColor('textSupporting')};
  font-size: 11px;
`

// Library display names
const LIBRARY_DISPLAY_NAMES: Record<ChordLibrary, string> = {
  essentia: 'Essentia',
  madmom: 'Madmom',
  btc: 'BTC',
  chordify: 'Chordify (Ground Truth)',
}

function getAccuracyLevel(percentage: number): 'good' | 'medium' | 'poor' {
  if (percentage >= 80) return 'good'
  if (percentage >= 60) return 'medium'
  return 'poor'
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

type ComparisonRow = {
  library: ChordLibrary
  result: ComparisonResult
}

export function ChordComparison({
  chordsByLibrary,
  duration,
  bpm,
  beats,
}: ChordComparisonProps) {
  const [showMismatches, setShowMismatches] = useState(false)
  const [selectedLibrary, setSelectedLibrary] = useState<ChordLibrary | null>(
    null,
  )

  // Get ground truth (Chordify) chords
  const groundTruth = chordsByLibrary.chordify

  // Calculate comparisons for each AI library
  const comparisons = useMemo(() => {
    if (!groundTruth || groundTruth.length === 0) return []

    const aiLibraries: ChordLibrary[] = ['essentia', 'madmom', 'btc']
    const results: ComparisonRow[] = []

    for (const library of aiLibraries) {
      const detected = chordsByLibrary[library]
      if (detected && detected.length > 0) {
        const result = compareChords({
          groundTruth,
          detected,
          duration,
          bpm,
          beats,
        })
        results.push({ library, result })
      }
    }

    // Sort by overall agreement (highest first)
    return results.sort(
      (a, b) => b.result.overallAgreement - a.result.overallAgreement,
    )
  }, [chordsByLibrary, groundTruth, duration, bpm, beats])

  // Get mismatches for selected library
  const selectedMismatches = useMemo(() => {
    if (!selectedLibrary) return []
    const comparison = comparisons.find((c) => c.library === selectedLibrary)
    return comparison?.result.mismatches || []
  }, [comparisons, selectedLibrary])

  // If no ground truth available, show message
  if (!groundTruth || groundTruth.length === 0) {
    return (
      <Container>
        <Header>
          <Title>Accuracy Comparison</Title>
        </Header>
        <NoDataMessage>
          No Chordify ground truth data available for this song. Import chord
          data from Chordify to enable accuracy comparison.
        </NoDataMessage>
      </Container>
    )
  }

  // If no AI libraries have been analyzed
  if (comparisons.length === 0) {
    return (
      <Container>
        <Header>
          <Title>Accuracy Comparison</Title>
          <GroundTruthBadge>
            Chordify: {groundTruth.length} chords
          </GroundTruthBadge>
        </Header>
        <NoDataMessage>
          No AI chord detection results available. Analyze the song with
          Essentia, Madmom, or BTC to compare accuracy.
        </NoDataMessage>
      </Container>
    )
  }

  const handleToggleMismatches = (library: ChordLibrary) => {
    if (selectedLibrary === library && showMismatches) {
      setShowMismatches(false)
      setSelectedLibrary(null)
    } else {
      setSelectedLibrary(library)
      setShowMismatches(true)
    }
  }

  // Get sample count from first comparison
  const sampleCount = comparisons[0]?.result.totalBeats || 0

  return (
    <Container>
      <Header>
        <Title>Accuracy Comparison vs Chordify</Title>
        <GroundTruthBadge>
          Ground Truth: {groundTruth.length} chords
        </GroundTruthBadge>
      </Header>

      <Table>
        <thead>
          <tr>
            <TableHeader>Library</TableHeader>
            <TableHeader>Agreement</TableHeader>
            <TableHeader>Root Acc</TableHeader>
            <TableHeader>Quality Acc</TableHeader>
            <TableHeader>Mismatches</TableHeader>
          </tr>
        </thead>
        <tbody>
          {comparisons.map(({ library, result }) => (
            <TableRow key={library}>
              <TableCell>
                <LibraryName>{LIBRARY_DISPLAY_NAMES[library]}</LibraryName>
              </TableCell>
              <TableCell>
                <AccuracyValue
                  $level={getAccuracyLevel(result.overallAgreement)}
                >
                  {result.overallAgreement}%
                </AccuracyValue>
              </TableCell>
              <TableCell>
                <AccuracyValue $level={getAccuracyLevel(result.rootAccuracy)}>
                  {result.rootAccuracy}%
                </AccuracyValue>
              </TableCell>
              <TableCell>
                <AccuracyValue
                  $level={getAccuracyLevel(result.qualityAccuracy)}
                >
                  {result.qualityAccuracy}%
                </AccuracyValue>
              </TableCell>
              <TableCell>
                <ToggleButton onClick={() => handleToggleMismatches(library)}>
                  {result.mismatches.length} errors
                  {selectedLibrary === library && showMismatches
                    ? ' (hide)'
                    : ''}
                </ToggleButton>
              </TableCell>
            </TableRow>
          ))}
        </tbody>
      </Table>

      <SampleInfo>
        Compared at {sampleCount} sample points
        {bpm ? ` (${Math.round(bpm)} BPM)` : ''}
        {beats && beats.length > 0 ? ' using detected beats' : ''}
      </SampleInfo>

      {showMismatches && selectedLibrary && selectedMismatches.length > 0 && (
        <MismatchesSection>
          <MismatchLibrary>
            Mismatches for {LIBRARY_DISPLAY_NAMES[selectedLibrary]}:
          </MismatchLibrary>
          {selectedMismatches.slice(0, 50).map((mismatch, index) => (
            <MismatchRow key={`${mismatch.time}-${index}`}>
              <MismatchTime>{formatTime(mismatch.time)}</MismatchTime>
              <MismatchChord $isCorrect>
                {formatChord(mismatch.groundTruth)}
              </MismatchChord>
              <MismatchArrow>-&gt;</MismatchArrow>
              <MismatchChord>{formatChord(mismatch.detected)}</MismatchChord>
              {mismatch.rootMatch && (
                <span style={{ fontSize: '10px', color: '#f5a623' }}>
                  (quality only)
                </span>
              )}
            </MismatchRow>
          ))}
          {selectedMismatches.length > 50 && (
            <div style={{ fontSize: '11px', color: '#888', marginTop: '8px' }}>
              Showing first 50 of {selectedMismatches.length} mismatches
            </div>
          )}
        </MismatchesSection>
      )}
    </Container>
  )
}
