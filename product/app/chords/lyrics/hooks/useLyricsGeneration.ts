'use client'

import { useCallback, useRef, useState } from 'react'

import { AudioSource, LyricsState } from '../types'

const BACKEND_URL = 'http://localhost:4568'

type UseLyricsGenerationInput = {
  videoId: string | null
  hasVocalsStem: boolean
  onStateChange: (state: LyricsState) => void
  getAuthHeaders?: () => Record<string, string>
}

type UseLyricsGenerationOutput = {
  generateLyrics: () => void
  cancelGeneration: () => void
  isGenerating: boolean
}

export function useLyricsGeneration({
  videoId,
  hasVocalsStem,
  onStateChange,
  getAuthHeaders,
}: UseLyricsGenerationInput): UseLyricsGenerationOutput {
  // Auto-select audio source based on vocals stem availability
  const audioSource: AudioSource = hasVocalsStem ? 'vocals_stem' : 'full_audio'
  const [isGenerating, setIsGenerating] = useState(false)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const jobIdRef = useRef<string | null>(null)
  const cancelledRef = useRef(false)

  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }, [])

  const pollJobStatus = useCallback(
    async (jobId: string) => {
      if (cancelledRef.current) {
        stopPolling()
        return
      }

      try {
        const response = await fetch(
          `${BACKEND_URL}/api/lyrics/status/${jobId}`,
        )
        if (!response.ok) {
          throw new Error('Failed to get job status')
        }

        const data = await response.json()

        if (cancelledRef.current) {
          stopPolling()
          return
        }

        if (data.status === 'processing' || data.status === 'pending') {
          onStateChange({
            status: 'loading',
            progress: data.progress || 0,
          })
        } else if (data.status === 'complete') {
          stopPolling()
          setIsGenerating(false)
          onStateChange({
            status: 'loaded',
            lrcContent: data.lrcContent,
            hasWordTiming: data.hasWordTiming || false,
            audioSource,
          })
        } else if (data.status === 'error') {
          stopPolling()
          setIsGenerating(false)
          onStateChange({
            status: 'error',
            errorType: 'unknown',
            message: data.error || 'Lyrics generation failed',
          })
        }
      } catch (error) {
        console.error('Error polling job status:', error)
        // Don't stop polling on network errors, just continue
      }
    },
    [audioSource, onStateChange, stopPolling],
  )

  const generateLyrics = useCallback(async () => {
    if (!videoId) return

    cancelledRef.current = false
    setIsGenerating(true)
    onStateChange({ status: 'loading', progress: 0 })

    try {
      // First, check if lyrics already exist
      const existingResponse = await fetch(
        `${BACKEND_URL}/api/lyrics/${videoId}`,
      )
      if (existingResponse.ok) {
        const existing = await existingResponse.json()
        if (existing.status === 'complete') {
          setIsGenerating(false)
          onStateChange({
            status: 'loaded',
            lrcContent: existing.lrcContent,
            hasWordTiming: existing.hasWordTiming || false,
            audioSource,
          })
          return
        }
      }

      // Start generation
      const response = await fetch(`${BACKEND_URL}/api/lyrics/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(getAuthHeaders?.() ?? {}),
        },
        body: JSON.stringify({
          videoId,
          audioSource,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to start lyrics generation')
      }

      const data = await response.json()

      if (data.status === 'complete') {
        // Already complete
        setIsGenerating(false)
        onStateChange({
          status: 'loaded',
          lrcContent: data.lrcContent,
          hasWordTiming: data.hasWordTiming || false,
          audioSource,
        })
        return
      }

      // Store job ID and start polling
      jobIdRef.current = data.jobId
      onStateChange({ status: 'loading', progress: data.progress || 0 })

      // Poll for status every 500ms
      pollIntervalRef.current = setInterval(() => {
        if (jobIdRef.current) {
          pollJobStatus(jobIdRef.current)
        }
      }, 500)
    } catch (error) {
      console.error('Error generating lyrics:', error)
      setIsGenerating(false)

      // Determine error type
      let errorType:
        | 'timeout'
        | 'no_vocals'
        | 'service_unavailable'
        | 'network'
        | 'unknown' = 'unknown'
      const message = error instanceof Error ? error.message : 'Unknown error'

      if (message.includes('timeout')) {
        errorType = 'timeout'
      } else if (message.includes('vocals') || message.includes('Vocals')) {
        errorType = 'no_vocals'
      } else if (message.includes('unavailable') || message.includes('503')) {
        errorType = 'service_unavailable'
      } else if (message.includes('fetch') || message.includes('network')) {
        errorType = 'network'
      }

      onStateChange({
        status: 'error',
        errorType,
        message,
      })
    }
  }, [videoId, audioSource, onStateChange, pollJobStatus, getAuthHeaders])

  const cancelGeneration = useCallback(() => {
    cancelledRef.current = true
    stopPolling()
    setIsGenerating(false)
    jobIdRef.current = null
    onStateChange({ status: 'empty' })
  }, [onStateChange, stopPolling])

  return {
    generateLyrics,
    cancelGeneration,
    isGenerating,
  }
}
