import fs from 'fs'
import path from 'path'

const LALAL_API_URL = 'https://www.lalal.ai/api/v1'

export type StemType =
  | 'vocals'
  | 'drum'
  | 'bass'
  | 'electric_guitar'
  | 'acoustic_guitar'
  | 'piano'
  | 'synthesizer'
  | 'strings'
  | 'wind'

export type SplitterModel =
  | 'orion'
  | 'phoenix'
  | 'perseus'
  | 'andromeda'
  | 'lyra'

export type OutputFormat = 'mp3' | 'wav' | 'flac' | 'aac' | 'ogg'

export type TaskStatus = 'progress' | 'success' | 'error' | 'cancelled'

export type UploadResponse = {
  id: string
  name: string
  size: number
  duration: number
  expire: number
}

export type SplitResponse = {
  id: string
  status: string
}

export type SplitTrack = {
  type: 'stem' | 'back'
  label: string
  url: string
  name?: string
  size?: number
}

export type CheckResult = {
  id: string
  status: TaskStatus
  progress?: number
  result?: {
    tracks: SplitTrack[]
    duration: number
  }
  error?: string
}

export type StemResult = {
  type: string
  url: string
  duration: number
}

class LalalAIClient {
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  private getHeaders(contentType?: string): Record<string, string> {
    const headers: Record<string, string> = {
      'X-License-Key': this.apiKey,
    }
    if (contentType) {
      headers['Content-Type'] = contentType
    }
    return headers
  }

  async uploadFile(filePath: string): Promise<UploadResponse> {
    const filename = path.basename(filePath)
    const fileBuffer = fs.readFileSync(filePath)

    const response = await fetch(`${LALAL_API_URL}/upload/`, {
      method: 'POST',
      headers: {
        ...this.getHeaders('application/octet-stream'),
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
      body: fileBuffer,
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Upload failed: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    return data as UploadResponse
  }

  async splitMultistem(
    sourceId: string,
    stems: StemType[],
    options: {
      splitter?: SplitterModel
      format?: OutputFormat
      dereverb?: boolean
      extractionLevel?: 'deep_extraction' | 'clear_cut'
    } = {},
  ): Promise<string> {
    const {
      splitter = null,
      format = 'mp3',
      dereverb = false,
      extractionLevel = 'deep_extraction',
    } = options

    const requestBody = {
      source_id: sourceId,
      presets: {
        stem_list: stems,
        extraction_level: extractionLevel,
        splitter: splitter,
        dereverb_enabled: dereverb,
        encoder_format: format,
      },
    }

    console.log('[LALAL] Split request:', JSON.stringify(requestBody, null, 2))

    const response = await fetch(`${LALAL_API_URL}/split/multistem/`, {
      method: 'POST',
      headers: this.getHeaders('application/json'),
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Split request failed: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log('[LALAL] Split response:', JSON.stringify(data, null, 2))
    return data.task_id as string
  }

  async checkStatus(
    taskIds: string[],
    retryCount: number = 0,
  ): Promise<CheckResult[]> {
    const requestBody = { task_ids: taskIds }
    console.log('[LALAL] Check request:', JSON.stringify(requestBody))

    const response = await fetch(`${LALAL_API_URL}/check/`, {
      method: 'POST',
      headers: this.getHeaders('application/json'),
      body: JSON.stringify(requestBody),
    })

    // Handle rate limiting with retry
    if (response.status === 429 && retryCount < 3) {
      console.log(
        `[LALAL] Rate limited, waiting 4 seconds before retry ${retryCount + 1}/3`,
      )
      await this.delay(4000)
      return this.checkStatus(taskIds, retryCount + 1)
    }

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Check status failed: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log('[LALAL] Check response:', JSON.stringify(data, null, 2))

    // API returns { result: { task_id: { status, progress, ... } } }
    const resultData = data.result || data
    const results: CheckResult[] = []
    for (const taskId of taskIds) {
      if (resultData[taskId]) {
        results.push({
          id: taskId,
          ...resultData[taskId],
        })
      }
    }

    return results
  }

  async waitForCompletion(
    taskId: string,
    onProgress?: (progress: number) => void,
    pollIntervalMs: number = 3000, // 3 seconds to avoid rate limits
    timeoutMs: number = 600000, // 10 minutes
  ): Promise<StemResult[]> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeoutMs) {
      const [result] = await this.checkStatus([taskId])

      if (!result) {
        throw new Error(`Task ${taskId} not found`)
      }

      console.log(
        `[LALAL] Task status: ${result.status}, progress: ${result.progress}`,
      )

      if (result.status === 'progress') {
        if (onProgress && result.progress !== undefined) {
          onProgress(result.progress)
        }
        await this.delay(pollIntervalMs)
        continue
      }

      if (result.status === 'success' && result.result?.tracks) {
        const stems: StemResult[] = []
        for (const track of result.result.tracks) {
          // Include both stem tracks and the "back" (backing/instrumental) track
          stems.push({
            type: track.type === 'back' ? 'backing' : track.label,
            url: track.url,
            duration: result.result.duration,
          })
        }
        console.log(`[LALAL] Found ${stems.length} tracks (stems + backing)`)
        return stems
      }

      if (result.status === 'error') {
        throw new Error(
          `Stem separation failed: ${result.error || 'Unknown error'}`,
        )
      }

      if (result.status === 'cancelled') {
        throw new Error('Stem separation was cancelled')
      }

      // Unknown status, keep waiting
      await this.delay(pollIntervalMs)
    }

    throw new Error('Stem separation timed out')
  }

  async deleteSource(sourceId: string): Promise<void> {
    const response = await fetch(`${LALAL_API_URL}/delete/`, {
      method: 'POST',
      headers: this.getHeaders('application/json'),
      body: JSON.stringify({ source_id: sourceId }),
    })
    if (!response.ok) {
      const errorText = await response.text()
      console.warn('[LALAL] Delete source warning:', response.status, errorText)
    }
  }

  async getMinutesLeft(): Promise<number> {
    const response = await fetch(`${LALAL_API_URL}/limits/minutes_left/`, {
      method: 'POST',
      headers: this.getHeaders('application/json'),
      body: JSON.stringify({}),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[LALAL] Get minutes failed:', response.status, errorText)
      throw new Error('Failed to get minutes balance')
    }

    const data = await response.json()
    console.log('[LALAL] Minutes response:', data)
    return data.minutes_left || 0
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

export function createLalalAIClient(apiKey: string): LalalAIClient {
  return new LalalAIClient(apiKey)
}

export { LalalAIClient }
