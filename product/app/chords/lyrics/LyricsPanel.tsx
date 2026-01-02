'use client'

import { getColor } from '@lib/ui/theme/getters'
import { match } from '@lib/utils/match'
import { useState, useCallback } from 'react'
import styled from 'styled-components'

import { LyricsDisplay } from './LyricsDisplay'
import { LyricsEmptyState } from './LyricsEmptyState'
import { LyricsErrorState } from './LyricsErrorState'
import { LyricsLoadingState } from './LyricsLoadingState'
import { LyricsLoadedState, LyricsState } from './types'

const PanelContainer = styled.div`
  min-height: 200px;
  position: relative;
`

type LyricsPanelProps = {
  lyricsState: LyricsState
  hasVocalsStem: boolean
  onGenerateLyrics: () => void
  onRetry: () => void
  onCancel?: () => void
  onDelete?: () => void
  isAudioAvailable: boolean
  audioElement: HTMLAudioElement | null
}

const Toolbar = styled.div`
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 6px;
  z-index: 10;
`

const ToolbarButton = styled.button<{ $variant?: 'danger' }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: rgba(40, 40, 40, 0.9);
  color: ${({ $variant }) =>
    $variant === 'danger' ? getColor('alert') : getColor('textSupporting')};
  border: 1px solid
    ${({ $variant }) =>
      $variant === 'danger' ? getColor('alert') : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${({ $variant }) =>
      $variant === 'danger' ? getColor('alert') : 'rgba(60, 60, 60, 0.9)'};
    color: ${({ $variant }) =>
      $variant === 'danger' ? 'white' : getColor('text')};
  }

  svg {
    width: 14px;
    height: 14px;
  }
`

const MIN_FONT_SIZE = 12
const MAX_FONT_SIZE = 24
const DEFAULT_FONT_SIZE = 14

export function LyricsPanel({
  lyricsState,
  hasVocalsStem,
  onGenerateLyrics,
  onRetry,
  onCancel,
  onDelete,
  isAudioAvailable,
  audioElement,
}: LyricsPanelProps) {
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE)

  const handleCopy = useCallback(() => {
    if (lyricsState.status !== 'loaded') return
    const loadedState = lyricsState as LyricsLoadedState
    // Extract plain text from LRC (remove timestamps)
    const plainText = loadedState.lrcContent
      .split('\n')
      .filter((line) => !line.match(/^\[(ti|ar|al|by|offset):/i))
      .map((line) =>
        line
          .replace(/^\[\d{2}:\d{2}\.\d{2}\]/, '')
          .replace(/<\d{2}:\d{2}\.\d{2}>/g, ''),
      )
      .filter((line) => line.trim())
      .join('\n')
    navigator.clipboard.writeText(plainText)
  }, [lyricsState])

  const handleFontSizeDecrease = useCallback(() => {
    setFontSize((prev) => Math.max(MIN_FONT_SIZE, prev - 2))
  }, [])

  const handleFontSizeIncrease = useCallback(() => {
    setFontSize((prev) => Math.min(MAX_FONT_SIZE, prev + 2))
  }, [])

  const showToolbar = lyricsState.status === 'loaded'

  return (
    <PanelContainer>
      {showToolbar && (
        <Toolbar>
          {/* Font size controls */}
          <ToolbarButton
            onClick={handleFontSizeDecrease}
            title="Decrease font size"
            disabled={fontSize <= MIN_FONT_SIZE}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </ToolbarButton>
          <ToolbarButton
            onClick={handleFontSizeIncrease}
            title="Increase font size"
            disabled={fontSize >= MAX_FONT_SIZE}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </ToolbarButton>
          {/* Copy button */}
          <ToolbarButton onClick={handleCopy} title="Copy lyrics">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
          </ToolbarButton>
          {/* Delete button */}
          {onDelete && (
            <ToolbarButton
              $variant="danger"
              onClick={onDelete}
              title="Delete lyrics"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                <line x1="10" y1="11" x2="10" y2="17"></line>
                <line x1="14" y1="11" x2="14" y2="17"></line>
              </svg>
            </ToolbarButton>
          )}
        </Toolbar>
      )}
      {match(lyricsState.status, {
        empty: () => (
          <LyricsEmptyState
            onGenerate={onGenerateLyrics}
            isDisabled={!isAudioAvailable}
            hasVocalsStem={hasVocalsStem}
          />
        ),
        loading: () => (
          <LyricsLoadingState
            progress={
              (lyricsState as { status: 'loading'; progress: number }).progress
            }
            onCancel={onCancel}
          />
        ),
        error: () => {
          const errorState = lyricsState as {
            status: 'error'
            errorType:
              | 'timeout'
              | 'no_vocals'
              | 'service_unavailable'
              | 'network'
              | 'unknown'
            message: string
          }
          return (
            <LyricsErrorState
              errorType={errorState.errorType}
              message={errorState.message}
              onRetry={onRetry}
            />
          )
        },
        loaded: () => {
          const loadedState = lyricsState as LyricsLoadedState
          return (
            <LyricsDisplay
              lrcContent={loadedState.lrcContent}
              hasWordTiming={loadedState.hasWordTiming}
              audioElement={audioElement}
              fontSize={fontSize}
            />
          )
        },
      })}
    </PanelContainer>
  )
}
