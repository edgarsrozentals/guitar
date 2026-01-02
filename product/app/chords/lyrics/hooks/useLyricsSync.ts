'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Create a mock audio element that tracks time internally
 * This is used for syncing lyrics with YouTube player since YouTube
 * doesn't expose an actual HTMLMediaElement
 */
function createMockAudioElement(): HTMLAudioElement {
  let _currentTime = 0
  let _paused = true
  let _playbackRate = 1

  // Create a real audio element as base (needed for some checks)
  const audio = new Audio()

  // Override currentTime with getter/setter
  Object.defineProperty(audio, 'currentTime', {
    get() {
      return _currentTime
    },
    set(value: number) {
      if (Number.isFinite(value) && value >= 0) {
        _currentTime = value
      }
    },
    configurable: true,
  })

  // Override paused
  Object.defineProperty(audio, 'paused', {
    get() {
      return _paused
    },
    configurable: true,
  })

  // Override playbackRate
  Object.defineProperty(audio, 'playbackRate', {
    get() {
      return _playbackRate
    },
    set(value: number) {
      if (Number.isFinite(value) && value > 0) {
        _playbackRate = value
      }
    },
    configurable: true,
  })

  // Override play/pause
  audio.play = async () => {
    _paused = false
  }

  const originalPause = audio.pause.bind(audio)
  audio.pause = () => {
    _paused = true
    originalPause()
  }

  // Set volume to 0
  audio.volume = 0

  return audio
}

type UseLyricsSyncInput = {
  /** Audio element to sync lyrics with (from stems) */
  stemAudioElement: HTMLAudioElement | null
  /** Whether to use stem audio or YouTube proxy */
  useStems: boolean
}

type UseLyricsSyncOutput = {
  /** The audio element to pass to RabbitLyrics */
  audioElement: HTMLAudioElement | null
  /** Update the proxy time from YouTube player */
  updateTime: (timeMs: number) => void
  /** Update play state for the proxy */
  setPlaying: (playing: boolean) => void
  /** Seek to a specific time */
  seek: (timeMs: number) => void
  /** Set playback speed */
  setPlaybackSpeed: (speed: number) => void
}

/**
 * Hook to manage lyrics synchronization with either:
 * 1. Stem audio element (when stems are available)
 * 2. A proxy audio element synced with YouTube player time
 *
 * The proxy is needed because RabbitLyrics requires an HTMLMediaElement,
 * but YouTube IFrame API doesn't expose one.
 */
export function useLyricsSync({
  stemAudioElement,
  useStems,
}: UseLyricsSyncInput): UseLyricsSyncOutput {
  const [proxyAudio, setProxyAudio] = useState<HTMLAudioElement | null>(null)
  const lastSyncTimeRef = useRef<number>(0)
  const isPlayingRef = useRef(false)

  // Create the proxy audio element on mount
  useEffect(() => {
    // Create a mock audio element that tracks time internally
    // This allows us to set currentTime to any value without needing a real audio file
    const audio = createMockAudioElement()
    setProxyAudio(audio)

    return () => {
      audio.pause()
    }
  }, [])

  // Return stem audio if using stems, otherwise proxy
  const audioElement =
    useStems && stemAudioElement ? stemAudioElement : proxyAudio

  // Update proxy time from YouTube player
  const updateTime = useCallback(
    (timeMs: number) => {
      if (useStems || !proxyAudio) return

      const timeSeconds = timeMs / 1000

      // Validate that timeSeconds is a finite number
      if (!Number.isFinite(timeSeconds) || timeSeconds < 0) return

      // Only update if significantly different to avoid jitter
      if (Math.abs(proxyAudio.currentTime - timeSeconds) > 0.1) {
        proxyAudio.currentTime = timeSeconds
        lastSyncTimeRef.current = timeSeconds
      }
    },
    [useStems, proxyAudio],
  )

  // Update play state
  const setPlaying = useCallback(
    (playing: boolean) => {
      isPlayingRef.current = playing

      if (useStems || !proxyAudio) return

      if (playing) {
        proxyAudio.play().catch(() => {
          // Ignore autoplay errors
        })
      } else {
        proxyAudio.pause()
      }
    },
    [useStems, proxyAudio],
  )

  // Seek to specific time
  const seek = useCallback(
    (timeMs: number) => {
      if (useStems || !proxyAudio) return

      const timeSeconds = timeMs / 1000

      // Validate that timeSeconds is a finite number
      if (!Number.isFinite(timeSeconds) || timeSeconds < 0) return

      proxyAudio.currentTime = timeSeconds
      lastSyncTimeRef.current = timeSeconds
    },
    [useStems, proxyAudio],
  )

  // Set playback speed
  const setPlaybackSpeed = useCallback(
    (speed: number) => {
      if (useStems) {
        // For stems, playback speed is managed by the stem audio elements
        return
      }

      // Validate that speed is a valid positive number
      if (!Number.isFinite(speed) || speed <= 0) return

      if (proxyAudio) {
        proxyAudio.playbackRate = speed
      }
    },
    [useStems, proxyAudio],
  )

  return {
    audioElement,
    updateTime,
    setPlaying,
    seek,
    setPlaybackSpeed,
  }
}
