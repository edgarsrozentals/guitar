'use client'

import { useEffect, useRef, useState, useMemo } from 'react'
import styled from 'styled-components'

type LyricsDisplayProps = {
  lrcContent: string
  hasWordTiming: boolean
  audioElement: HTMLAudioElement | null
  fontSize?: number
}

type Word = {
  time: number // seconds
  text: string
}

type LyricLine = {
  time: number // seconds
  words: Word[]
  fullText: string
}

// Parse LRC content into lines with word-level timestamps
function parseLrc(lrcContent: string): LyricLine[] {
  const lines: LyricLine[] = []
  const lrcLines = lrcContent.split('\n')

  for (const line of lrcLines) {
    // Skip metadata lines like [ti:...], [ar:...], etc.
    if (line.match(/^\[(ti|ar|al|by|offset):/i)) {
      continue
    }

    // Skip empty lines
    if (!line.trim()) continue

    // Match line timestamp [MM:SS.cc] or [MM:SS]
    const lineMatch = line.match(/^\[(\d{2}):(\d{2})\.?(\d{0,2})\](.*)$/)

    let lineTime = 0
    let content = line

    if (lineMatch) {
      const minutes = parseInt(lineMatch[1], 10)
      const seconds = parseInt(lineMatch[2], 10)
      const centiseconds = lineMatch[3]
        ? parseInt(lineMatch[3].padEnd(2, '0'), 10)
        : 0
      lineTime = minutes * 60 + seconds + centiseconds / 100
      content = lineMatch[4] || ''
    }

    // Parse word-level timestamps <MM:SS.cc>word
    const words: Word[] = []
    const wordPattern = /<(\d{2}):(\d{2})\.(\d{2})>([^<]*)/g
    let match

    while ((match = wordPattern.exec(content)) !== null) {
      const minutes = parseInt(match[1], 10)
      const seconds = parseInt(match[2], 10)
      const centiseconds = parseInt(match[3], 10)
      const time = minutes * 60 + seconds + centiseconds / 100
      const text = match[4].trim()

      if (text) {
        words.push({ time, text })
      }

      // Use first word time as line time if no line timestamp
      if (lineTime === 0 && words.length === 1) {
        lineTime = time
      }
    }

    // If no word timestamps found, treat the whole line as one word
    if (words.length === 0) {
      const cleanText = content.replace(/<\d{2}:\d{2}\.\d{2}>/g, '').trim()
      if (cleanText) {
        words.push({ time: lineTime, text: cleanText })
      }
    }

    if (words.length > 0) {
      const fullText = words.map((w) => w.text).join(' ')
      lines.push({ time: lineTime, words, fullText })
    }
  }

  // Sort by time
  lines.sort((a, b) => a.time - b.time)

  return lines
}

const LyricsContainer = styled.div`
  height: 300px;
  overflow-y: auto;
  scroll-behavior: smooth;
  padding: 16px;
  padding-top: 40px; /* Space for toolbar */

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 3px;

    &:hover {
      background: rgba(255, 255, 255, 0.25);
    }
  }
`

const LyricsLine = styled.div<{
  $isActive: boolean
  $isPast: boolean
  $fontSize: number
}>`
  padding: 10px 14px;
  margin: 4px 0;
  border-radius: 6px;
  font-size: ${({ $isActive, $fontSize }) =>
    $isActive ? `${$fontSize + 3}px` : `${$fontSize}px`};
  font-weight: ${({ $isActive }) => ($isActive ? '500' : '400')};
  background: ${({ $isActive }) =>
    $isActive ? 'rgba(255, 255, 255, 0.05)' : 'transparent'};
  transition: all 0.2s ease;
  line-height: 1.6;
  text-align: center;
`

const WordSpan = styled.span<{
  $isActive: boolean
  $isPast: boolean
  $isInActiveLine: boolean
}>`
  color: ${({ $isActive, $isPast, $isInActiveLine }) =>
    $isActive
      ? '#22c55e' // Green for currently sung word
      : $isPast
        ? $isInActiveLine
          ? '#888'
          : '#666'
        : $isInActiveLine
          ? '#ccc'
          : '#888'};
  font-weight: ${({ $isActive }) => ($isActive ? '700' : 'inherit')};
  transition: color 0.15s ease;
  margin-right: 0.3em;
`

const PlaceholderText = styled.div`
  text-align: center;
  color: #666;
  font-size: 14px;
  padding: 40px 20px;
`

export function LyricsDisplay({
  lrcContent,
  audioElement,
  fontSize = 14,
}: LyricsDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [userScrolling, setUserScrolling] = useState(false)
  const userScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const activeLineRef = useRef<HTMLDivElement | null>(null)

  // Parse LRC content
  const lyrics = useMemo(() => parseLrc(lrcContent), [lrcContent])

  // Find current line index
  const currentLineIndex = useMemo(() => {
    if (lyrics.length === 0) return -1

    let index = -1
    for (let i = 0; i < lyrics.length; i++) {
      if (lyrics[i].time <= currentTime) {
        index = i
      } else {
        break
      }
    }
    return index
  }, [lyrics, currentTime])

  // Listen to audio time updates
  useEffect(() => {
    if (!audioElement) return

    const handleTimeUpdate = () => {
      setCurrentTime(audioElement.currentTime)
    }

    // Use more frequent updates for smoother word highlighting
    const interval = setInterval(() => {
      if (audioElement && !audioElement.paused) {
        setCurrentTime(audioElement.currentTime)
      }
    }, 50) // Update every 50ms for smooth word transitions

    audioElement.addEventListener('timeupdate', handleTimeUpdate)
    setCurrentTime(audioElement.currentTime)

    return () => {
      audioElement.removeEventListener('timeupdate', handleTimeUpdate)
      clearInterval(interval)
    }
  }, [audioElement])

  // Handle user scroll - pause auto-scroll for 3 seconds
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleScroll = () => {
      if (userScrollTimeoutRef.current) {
        clearTimeout(userScrollTimeoutRef.current)
      }
      setUserScrolling(true)
      userScrollTimeoutRef.current = setTimeout(() => {
        setUserScrolling(false)
      }, 3000)
    }

    container.addEventListener('wheel', handleScroll)
    container.addEventListener('touchmove', handleScroll)

    return () => {
      container.removeEventListener('wheel', handleScroll)
      container.removeEventListener('touchmove', handleScroll)
      if (userScrollTimeoutRef.current) {
        clearTimeout(userScrollTimeoutRef.current)
      }
    }
  }, [])

  // Auto-scroll to active line
  useEffect(() => {
    if (userScrolling || !activeLineRef.current || !containerRef.current) return

    const container = containerRef.current
    const activeLine = activeLineRef.current

    const containerRect = container.getBoundingClientRect()
    const lineRect = activeLine.getBoundingClientRect()

    // Position active line in upper third of container
    const targetPosition = containerRect.top + containerRect.height * 0.33
    const currentPosition = lineRect.top
    const scrollOffset = currentPosition - targetPosition

    if (Math.abs(scrollOffset) > 30) {
      container.scrollBy({
        top: scrollOffset,
        behavior: 'smooth',
      })
    }
  }, [currentLineIndex, userScrolling])

  if (!lrcContent || lyrics.length === 0) {
    return (
      <LyricsContainer>
        <PlaceholderText>No lyrics available</PlaceholderText>
      </LyricsContainer>
    )
  }

  return (
    <LyricsContainer ref={containerRef}>
      {lyrics.map((line, lineIndex) => {
        const isActiveLine = lineIndex === currentLineIndex
        const isPastLine = lineIndex < currentLineIndex

        // Find active word index in this line
        let activeWordIndex = -1
        if (isActiveLine) {
          for (let i = 0; i < line.words.length; i++) {
            if (line.words[i].time <= currentTime) {
              activeWordIndex = i
            } else {
              break
            }
          }
        }

        return (
          <LyricsLine
            key={`${lineIndex}-${line.time}`}
            $isActive={isActiveLine}
            $isPast={isPastLine}
            $fontSize={fontSize}
            ref={isActiveLine ? activeLineRef : null}
          >
            {line.words.map((word, wordIndex) => {
              const isActiveWord = isActiveLine && wordIndex === activeWordIndex
              const isPastWord =
                isPastLine || (isActiveLine && wordIndex < activeWordIndex)

              return (
                <WordSpan
                  key={`${wordIndex}-${word.time}`}
                  $isActive={isActiveWord}
                  $isPast={isPastWord}
                  $isInActiveLine={isActiveLine}
                >
                  {word.text}
                </WordSpan>
              )
            })}
          </LyricsLine>
        )
      })}
    </LyricsContainer>
  )
}
