'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// Extend Window interface for YouTube IFrame API
declare global {
  interface Window {
    YT: typeof YT
    onYouTubeIframeAPIReady: (() => void) | undefined
  }
}

// Load YouTube IFrame API script
function loadYouTubeAPI(): Promise<void> {
  return new Promise((resolve) => {
    if (window.YT && window.YT.Player) {
      resolve()
      return
    }

    // Check if script is already loading
    const existingScript = document.querySelector(
      'script[src="https://www.youtube.com/iframe_api"]',
    )
    if (existingScript) {
      // Wait for API to be ready
      const checkReady = () => {
        if (window.YT && window.YT.Player) {
          resolve()
        } else {
          setTimeout(checkReady, 100)
        }
      }
      checkReady()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true

    window.onYouTubeIframeAPIReady = () => resolve()

    document.body.appendChild(script)
  })
}

export type YouTubePlayerState = {
  isReady: boolean
  isPlaying: boolean
  isPaused: boolean
  isBuffering: boolean
  currentTime: number
  duration: number
  playbackRate: number
  volume: number
  isMuted: boolean
}

export type YouTubePlayerControls = {
  play: () => void
  pause: () => void
  toggle: () => void
  seekTo: (seconds: number) => void
  setPlaybackRate: (rate: number) => void
  setVolume: (volume: number) => void
  toggleMute: () => void
}

type UseYouTubePlayerOptions = {
  videoId: string | null
  containerId: string
  onReady?: () => void
  onStateChange?: (state: YT.PlayerState) => void
  onError?: (error: number) => void
  onTimeUpdate?: (timeSeconds: number) => void
}

export function useYouTubePlayer({
  videoId,
  containerId,
  onReady,
  onStateChange,
  onError,
  onTimeUpdate,
}: UseYouTubePlayerOptions): [YouTubePlayerState, YouTubePlayerControls] {
  const playerRef = useRef<YT.Player | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const isPlayingRef = useRef(false)

  // Store callbacks in refs to avoid re-creating the player when they change
  const onReadyRef = useRef(onReady)
  const onStateChangeRef = useRef(onStateChange)
  const onErrorRef = useRef(onError)
  const onTimeUpdateRef = useRef(onTimeUpdate)

  // Keep refs updated
  useEffect(() => {
    onReadyRef.current = onReady
    onStateChangeRef.current = onStateChange
    onErrorRef.current = onError
    onTimeUpdateRef.current = onTimeUpdate
  }, [onReady, onStateChange, onError, onTimeUpdate])

  const [state, setState] = useState<YouTubePlayerState>({
    isReady: false,
    isPlaying: false,
    isPaused: false,
    isBuffering: false,
    currentTime: 0,
    duration: 0,
    playbackRate: 1,
    volume: 100,
    isMuted: false,
  })

  // Time update loop using requestAnimationFrame for smooth sync
  // Throttle state updates but call callback on every frame for responsive chord detection
  const lastStateUpdateRef = useRef(0)
  const startTimeUpdate = useCallback(() => {
    const update = () => {
      if (playerRef.current && isPlayingRef.current) {
        try {
          const currentTime = playerRef.current.getCurrentTime()

          // Call time update callback directly (bypasses React state for responsiveness)
          onTimeUpdateRef.current?.(currentTime)

          // Throttle React state updates to ~15fps for UI (controls display)
          const now = performance.now()
          if (now - lastStateUpdateRef.current > 66) {
            lastStateUpdateRef.current = now
            setState((prev) => ({ ...prev, currentTime }))
          }
        } catch {
          // Player might not be ready
        }
        animationFrameRef.current = requestAnimationFrame(update)
      }
    }
    animationFrameRef.current = requestAnimationFrame(update)
  }, [])

  const stopTimeUpdate = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }
  }, [])

  // Initialize player when videoId changes - only depend on videoId and containerId
  useEffect(() => {
    if (!videoId) return

    let isMounted = true
    let player: YT.Player | null = null

    const initPlayer = async () => {
      try {
        await loadYouTubeAPI()

        if (!isMounted) return

        // Check if container exists
        const container = document.getElementById(containerId)
        if (!container) {
          console.error('YouTube player container not found:', containerId)
          return
        }

        // Destroy existing player if any
        if (playerRef.current) {
          try {
            playerRef.current.destroy()
          } catch {
            // Ignore destroy errors
          }
          playerRef.current = null
        }

        player = new YT.Player(containerId, {
          videoId,
          playerVars: {
            controls: 0,
            disablekb: 1,
            enablejsapi: 1,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            origin: window.location.origin,
          },
          events: {
            onReady: (event) => {
              if (!isMounted) return
              const p = event.target
              playerRef.current = p
              setState((prev) => ({
                ...prev,
                isReady: true,
                duration: p.getDuration(),
                volume: p.getVolume(),
                isMuted: p.isMuted(),
              }))
              onReadyRef.current?.()
            },
            onStateChange: (event) => {
              if (!isMounted) return
              const playerState = event.data
              onStateChangeRef.current?.(playerState)

              const isPlaying = playerState === YT.PlayerState.PLAYING
              isPlayingRef.current = isPlaying

              setState((prev) => ({
                ...prev,
                isPlaying,
                isPaused: playerState === YT.PlayerState.PAUSED,
                isBuffering: playerState === YT.PlayerState.BUFFERING,
              }))

              if (isPlaying) {
                startTimeUpdate()
              } else {
                stopTimeUpdate()
                // Update current time one last time when paused
                if (playerRef.current) {
                  try {
                    setState((prev) => ({
                      ...prev,
                      currentTime: playerRef.current!.getCurrentTime(),
                    }))
                  } catch {
                    // Ignore
                  }
                }
              }
            },
            onError: (event) => {
              if (!isMounted) return
              console.error('YouTube player error:', event.data)
              onErrorRef.current?.(event.data)
            },
          },
        })
      } catch (err) {
        console.error('Failed to initialize YouTube player:', err)
      }
    }

    initPlayer()

    return () => {
      isMounted = false
      stopTimeUpdate()
      if (player) {
        try {
          player.destroy()
        } catch {
          // Ignore destroy errors
        }
      }
      playerRef.current = null
      // Reset state on unmount
      setState({
        isReady: false,
        isPlaying: false,
        isPaused: false,
        isBuffering: false,
        currentTime: 0,
        duration: 0,
        playbackRate: 1,
        volume: 100,
        isMuted: false,
      })
    }
    // Only re-run when videoId or containerId changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, containerId])

  // Controls - use refs to check player state
  const controls: YouTubePlayerControls = {
    play: useCallback(() => {
      if (
        playerRef.current &&
        typeof playerRef.current.playVideo === 'function'
      ) {
        playerRef.current.playVideo()
      }
    }, []),

    pause: useCallback(() => {
      if (
        playerRef.current &&
        typeof playerRef.current.pauseVideo === 'function'
      ) {
        playerRef.current.pauseVideo()
      }
    }, []),

    toggle: useCallback(() => {
      if (
        !playerRef.current ||
        typeof playerRef.current.playVideo !== 'function'
      )
        return
      if (isPlayingRef.current) {
        playerRef.current.pauseVideo()
      } else {
        playerRef.current.playVideo()
      }
    }, []),

    seekTo: useCallback((seconds: number) => {
      if (playerRef.current && typeof playerRef.current.seekTo === 'function') {
        playerRef.current.seekTo(seconds, true)
        setState((prev) => ({ ...prev, currentTime: seconds }))
      }
    }, []),

    setPlaybackRate: useCallback((rate: number) => {
      if (
        playerRef.current &&
        typeof playerRef.current.setPlaybackRate === 'function'
      ) {
        playerRef.current.setPlaybackRate(rate)
        setState((prev) => ({ ...prev, playbackRate: rate }))
      }
    }, []),

    setVolume: useCallback((volume: number) => {
      if (
        playerRef.current &&
        typeof playerRef.current.setVolume === 'function'
      ) {
        playerRef.current.setVolume(volume)
        setState((prev) => ({ ...prev, volume, isMuted: volume === 0 }))
      }
    }, []),

    toggleMute: useCallback(() => {
      if (!playerRef.current || typeof playerRef.current.isMuted !== 'function')
        return
      if (playerRef.current.isMuted()) {
        playerRef.current.unMute()
        setState((prev) => ({ ...prev, isMuted: false }))
      } else {
        playerRef.current.mute()
        setState((prev) => ({ ...prev, isMuted: true }))
      }
    }, []),
  }

  return [state, controls]
}
