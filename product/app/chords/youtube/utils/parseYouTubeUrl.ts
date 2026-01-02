const YOUTUBE_URL_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  /^([a-zA-Z0-9_-]{11})$/, // Just the video ID
]

export type ParseYouTubeUrlResult =
  | { success: true; videoId: string }
  | { success: false; error: string }

export function parseYouTubeUrl(input: string): ParseYouTubeUrlResult {
  const trimmed = input.trim()

  if (!trimmed) {
    return { success: false, error: 'Please enter a YouTube URL' }
  }

  for (const pattern of YOUTUBE_URL_PATTERNS) {
    const match = trimmed.match(pattern)
    if (match && match[1]) {
      return { success: true, videoId: match[1] }
    }
  }

  return {
    success: false,
    error: 'Invalid YouTube URL. Please enter a valid YouTube video link.',
  }
}

export function getYouTubeThumbnail(
  videoId: string,
  quality: 'default' | 'medium' | 'high' | 'maxres' = 'medium',
): string {
  const qualityMap = {
    default: 'default',
    medium: 'mqdefault',
    high: 'hqdefault',
    maxres: 'maxresdefault',
  }
  return `https://img.youtube.com/vi/${videoId}/${qualityMap[quality]}.jpg`
}
