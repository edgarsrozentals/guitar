import { exec } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { promisify } from 'util'

import type { NextApiRequest, NextApiResponse } from 'next'

const execAsync = promisify(exec)

type ExtractRequest = {
  videoId: string
}

type ExtractResponse = {
  success: boolean
  videoId: string
  title?: string
  duration?: number
  audioPath?: string
  error?: string
}

type VideoMetadata = {
  title: string
  duration: number
  uploader: string
  thumbnail: string
}

async function getVideoMetadata(videoId: string): Promise<VideoMetadata> {
  const url = `https://www.youtube.com/watch?v=${videoId}`

  const { stdout } = await execAsync(
    `yt-dlp --dump-json --no-download "${url}"`,
    { maxBuffer: 10 * 1024 * 1024 }, // 10MB buffer for JSON output
  )

  const metadata = JSON.parse(stdout)

  return {
    title: metadata.title || 'Unknown',
    duration: metadata.duration || 0,
    uploader: metadata.uploader || 'Unknown',
    thumbnail: metadata.thumbnail || '',
  }
}

async function extractAudio(
  videoId: string,
  outputDir: string,
): Promise<string> {
  const url = `https://www.youtube.com/watch?v=${videoId}`
  const outputTemplate = path.join(outputDir, `${videoId}.%(ext)s`)

  // Extract audio as mp3 with best quality
  await execAsync(
    `yt-dlp -x --audio-format mp3 --audio-quality 0 -o "${outputTemplate}" "${url}"`,
    { maxBuffer: 50 * 1024 * 1024 }, // 50MB buffer
  )

  // Find the extracted file
  const files = fs.readdirSync(outputDir)
  const audioFile = files.find(
    (f) => f.startsWith(videoId) && f.endsWith('.mp3'),
  )

  if (!audioFile) {
    throw new Error('Audio extraction failed - no output file found')
  }

  return path.join(outputDir, audioFile)
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ExtractResponse>,
) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      videoId: '',
      error: 'Method not allowed',
    })
  }

  const { videoId } = req.body as ExtractRequest

  if (!videoId || typeof videoId !== 'string') {
    return res.status(400).json({
      success: false,
      videoId: videoId || '',
      error: 'Missing or invalid videoId',
    })
  }

  // Validate videoId format (11 characters, alphanumeric + underscore + hyphen)
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).json({
      success: false,
      videoId,
      error: 'Invalid YouTube video ID format',
    })
  }

  try {
    // Create temp directory for this extraction
    const tempDir = path.join(os.tmpdir(), 'guitar-app-audio', videoId)
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    // Get video metadata first
    console.log(`[Extract] Getting metadata for ${videoId}...`)
    const metadata = await getVideoMetadata(videoId)
    console.log(
      `[Extract] Title: ${metadata.title}, Duration: ${metadata.duration}s`,
    )

    // Extract audio
    console.log(`[Extract] Extracting audio...`)
    const audioPath = await extractAudio(videoId, tempDir)
    console.log(`[Extract] Audio saved to: ${audioPath}`)

    // Get file stats
    const stats = fs.statSync(audioPath)
    console.log(
      `[Extract] File size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`,
    )

    return res.status(200).json({
      success: true,
      videoId,
      title: metadata.title,
      duration: metadata.duration,
      audioPath,
    })
  } catch (error) {
    console.error('[Extract] Error:', error)

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred'

    return res.status(500).json({
      success: false,
      videoId,
      error: errorMessage,
    })
  }
}

export const config = {
  api: {
    bodyParser: true,
    responseLimit: false,
  },
}
