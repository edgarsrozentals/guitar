// Lyrics state types

export type AudioSource = 'vocals_stem' | 'full_audio'

export type LyricsEmptyState = {
  status: 'empty'
}

export type LyricsLoadingState = {
  status: 'loading'
  progress: number // 0-100
}

export type LyricsLoadedState = {
  status: 'loaded'
  lrcContent: string
  hasWordTiming: boolean
  audioSource?: AudioSource // Optional - auto-selected based on stem availability
}

export type LyricsErrorState = {
  status: 'error'
  errorType:
    | 'timeout'
    | 'no_vocals'
    | 'service_unavailable'
    | 'network'
    | 'unknown'
  message: string
}

export type LyricsState =
  | LyricsEmptyState
  | LyricsLoadingState
  | LyricsLoadedState
  | LyricsErrorState

export const ERROR_MESSAGES: Record<LyricsErrorState['errorType'], string> = {
  timeout: 'Lyrics generation took too long. Please try again.',
  no_vocals: 'No vocals detected in this track.',
  service_unavailable: 'Lyrics service temporarily unavailable.',
  network: 'Unable to connect. Please check your connection.',
  unknown: 'Something went wrong. Please try again.',
}
