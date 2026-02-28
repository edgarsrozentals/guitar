'use client'

import { VStack } from '@lib/ui/css/stack'
import {
  useCallback,
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
} from 'react'
import styled, { keyframes } from 'styled-components'

import { useYouTubePlayer } from './hooks/useYouTubePlayer'
import { PlaybackControls } from './PlaybackControls'

export type YouTubePlayerHandle = {
  toggle: () => void
  play: () => void
  pause: () => void
  seekTo: (seconds: number) => void
  // Playback controls
  getVolume: () => number
  setVolume: (volume: number) => void
  isMuted: () => boolean
  toggleMute: () => void
  getPlaybackRate: () => number
  setPlaybackRate: (rate: number) => void
  isReady: () => boolean
}

type YouTubePlayerProps = {
  videoId: string
  onTimeUpdate?: (timeMs: number) => void
  onPlayStateChange?: (isPlaying: boolean) => void
  onSeek?: (timeMs: number) => void
  onSeekPreview?: (timeMs: number) => void // Called during drag to preview position
  muteVideo?: boolean // Mute YouTube video (used when stems are playing)
}

const Container = styled.div`
  width: 100%;
  max-width: 400px; /* Compact player - YouTube minimum is ~200px */
`

const VideoContainer = styled.div`
  position: relative;
  width: 100%;
  padding-bottom: 56.25%; /* 16:9 aspect ratio */
  background: #000;
  border-radius: 8px;
  overflow: hidden;
`

const VideoFrame = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;

  iframe {
    width: 100%;
    height: 100%;
    border: none;
  }
`

const spin = keyframes`
  to { transform: rotate(360deg); }
`

const LoadingOverlay = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.8);
  z-index: 10;
`

const Spinner = styled.div`
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.2);
  border-top-color: #fff;
  border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
`

const LoadingText = styled.span`
  margin-top: 12px;
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
`

const PLAYER_CONTAINER_ID = 'youtube-player-container'

export const YouTubePlayer = forwardRef<
  YouTubePlayerHandle,
  YouTubePlayerProps
>(function YouTubePlayer(
  {
    videoId,
    onTimeUpdate,
    onPlayStateChange,
    onSeek,
    onSeekPreview,
    muteVideo,
  },
  ref,
) {
  // Store callbacks in refs for stable reference
  const onTimeUpdateRef = useRef(onTimeUpdate)
  const onPlayStateChangeRef = useRef(onPlayStateChange)
  const onSeekRef = useRef(onSeek)
  const onSeekPreviewRef = useRef(onSeekPreview)
  onTimeUpdateRef.current = onTimeUpdate
  onPlayStateChangeRef.current = onPlayStateChange
  onSeekRef.current = onSeek
  onSeekPreviewRef.current = onSeekPreview

  // Track last reported play state
  const lastPlayStateRef = useRef<boolean | null>(null)

  // Direct callback from animation frame - bypasses React state for responsiveness
  const handleTimeUpdate = useCallback((timeSeconds: number) => {
    onTimeUpdateRef.current?.(timeSeconds * 1000) // Convert to milliseconds
  }, [])

  const [playerState, controls] = useYouTubePlayer({
    videoId,
    containerId: PLAYER_CONTAINER_ID,
    onTimeUpdate: handleTimeUpdate,
    onStateChange: (state) => {
      console.log('Player state changed:', state)
      // Notify about play/pause changes
      const isPlaying = state === YT.PlayerState.PLAYING
      if (lastPlayStateRef.current !== isPlaying) {
        lastPlayStateRef.current = isPlaying
        onPlayStateChangeRef.current?.(isPlaying)
      }
    },
    onError: (error) => {
      console.error('YouTube player error:', error)
    },
  })

  // Wrap seek control to notify parent
  const handleSeek = useCallback(
    (seconds: number) => {
      controls.seekTo(seconds)
      onSeekRef.current?.(seconds * 1000)
    },
    [controls],
  )

  // Preview seek position (for chord timeline sync during drag)
  const handleSeekPreview = useCallback((seconds: number) => {
    onSeekPreviewRef.current?.(seconds * 1000)
  }, [])

  // Mute YouTube video when stems are playing (one-way: only force mute when muteVideo is true)
  // Don't auto-unmute - let user control that manually
  useEffect(() => {
    if (muteVideo && !playerState.isMuted) {
      controls.toggleMute()
    }
  }, [muteVideo, playerState.isMuted, controls])

  // Expose player controls to parent via ref
  useImperativeHandle(
    ref,
    () => ({
      toggle: controls.toggle,
      play: controls.play,
      pause: controls.pause,
      seekTo: controls.seekTo,
      // Playback controls
      getVolume: () => playerState.volume,
      setVolume: controls.setVolume,
      isMuted: () => playerState.isMuted,
      toggleMute: controls.toggleMute,
      getPlaybackRate: () => playerState.playbackRate,
      setPlaybackRate: controls.setPlaybackRate,
      isReady: () => playerState.isReady,
    }),
    [
      controls,
      playerState.volume,
      playerState.isMuted,
      playerState.playbackRate,
      playerState.isReady,
    ],
  )

  return (
    <Container>
      <VStack gap={6}>
        <VideoContainer>
          <VideoFrame id={PLAYER_CONTAINER_ID} />
          {!playerState.isReady && (
            <LoadingOverlay>
              <Spinner />
              <LoadingText>Loading player...</LoadingText>
            </LoadingOverlay>
          )}
        </VideoContainer>

        <PlaybackControls
          isReady={playerState.isReady}
          currentTime={playerState.currentTime}
          duration={playerState.duration}
          onSeek={handleSeek}
          onSeekPreview={handleSeekPreview}
        />
      </VStack>
    </Container>
  )
})
