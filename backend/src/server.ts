import { exec, spawn } from 'child_process'
import fs from 'fs'
import path from 'path'
import { promisify } from 'util'

import { AssemblyAI } from 'assemblyai'
import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'

import { createLalalAIClient, StemType } from './lalalai'

// Load environment variables from root .env file
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') })

const execAsync = promisify(exec)

const app = express()
const PORT = 4568

app.use(cors())
app.use(express.json())

// Directory to store extracted audio files
const AUDIO_DIR = path.join(__dirname, '..', 'audio')
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true })
}

// Directory to store separated stems
const STEMS_DIR = path.join(__dirname, '..', 'stems')
if (!fs.existsSync(STEMS_DIR)) {
  fs.mkdirSync(STEMS_DIR, { recursive: true })
}

// Directory to store lyrics files
const LYRICS_DIR = path.join(__dirname, '..', 'lyrics')
if (!fs.existsSync(LYRICS_DIR)) {
  fs.mkdirSync(LYRICS_DIR, { recursive: true })
}

// LALAL.ai client (initialized if API key is present)
const LALAL_API_KEY = process.env.LALAL_API_KEY || ''
const lalalClient = LALAL_API_KEY ? createLalalAIClient(LALAL_API_KEY) : null

// AssemblyAI client for lyrics transcription
const ASSEMBLYAI_API_KEY = process.env.ASSEMBLYAI_API_KEY || ''
const assemblyClient = ASSEMBLYAI_API_KEY
  ? new AssemblyAI({ apiKey: ASSEMBLYAI_API_KEY })
  : null

// In-memory cache for processed songs
const songCache: Map<string, SongData> = new Map()

// File to persist song metadata
const SONGS_METADATA_FILE = path.join(__dirname, '..', 'songs-metadata.json')

// Load persisted song metadata on startup
function loadSongsMetadata() {
  try {
    if (fs.existsSync(SONGS_METADATA_FILE)) {
      const data = JSON.parse(fs.readFileSync(SONGS_METADATA_FILE, 'utf-8'))
      for (const song of data) {
        // Verify audio file still exists
        const audioPath = path.join(AUDIO_DIR, `${song.videoId}.mp3`)
        if (fs.existsSync(audioPath)) {
          song.audioPath = audioPath
          song.audioUrl = `/audio/${song.videoId}.mp3`
          // Ensure new fields exist (migration for old data)
          song.chordsByLibrary = song.chordsByLibrary || {}
          song.analyzedWith = song.analyzedWith || []
          // If we have chords but no chordsByLibrary.essentia, migrate
          if (song.chords?.length > 0 && !song.chordsByLibrary.essentia) {
            song.chordsByLibrary.essentia = song.chords
            song.analyzedWith = ['essentia']
          }
          songCache.set(song.videoId, song)
        }
      }
      console.log(`Loaded ${songCache.size} songs from metadata file`)
    }
  } catch (error) {
    console.error('Error loading songs metadata:', error)
  }
}

// Save song metadata to file
function saveSongsMetadata() {
  try {
    const songs = Array.from(songCache.values()).map((song) => ({
      videoId: song.videoId,
      title: song.title,
      duration: song.duration,
      chords: song.chords,
      chordsByLibrary: song.chordsByLibrary || {},
      key: song.key,
      tempo: song.tempo,
      analyzedWith: song.analyzedWith || [],
    }))
    fs.writeFileSync(SONGS_METADATA_FILE, JSON.stringify(songs, null, 2))
  } catch (error) {
    console.error('Error saving songs metadata:', error)
  }
}

// Load metadata on startup
loadSongsMetadata()

// Track extraction progress
const extractionProgress: Map<string, { progress: number; status: string }> =
  new Map()

// Track stem separation progress
type StemProgress = {
  progress: number
  status:
    | 'pending'
    | 'uploading'
    | 'processing'
    | 'downloading'
    | 'complete'
    | 'error'
  taskId?: string
  stems?: StemInfo[]
  error?: string
}

type StemInfo = {
  type: string
  url: string // Local URL to download from our server
  originalUrl?: string // Original URL from LALAL.ai
}

const stemProgress: Map<string, StemProgress> = new Map()

type Chord = {
  root: string
  quality: string
}

type ChordEvent = {
  time: number // seconds
  chord: Chord
}

type KeyInfo = {
  root: string
  scale: 'major' | 'minor'
  strength: number
}

type TempoInfo = {
  bpm: number
  confidence: number
  beatCount: number
}

type AudioAnalysis = {
  chords: ChordEvent[]
  key: KeyInfo
  tempo: TempoInfo
}

// Supported chord detection libraries
type ChordLibrary = 'essentia' | 'madmom' | 'btc'

const CHORD_LIBRARY_INFO: Record<
  ChordLibrary,
  { name: string; accuracy: string }
> = {
  essentia: { name: 'Essentia', accuracy: '77-80%' },
  madmom: { name: 'Madmom', accuracy: '89.6%' },
  btc: { name: 'BTC (Transformer)', accuracy: '~90%' },
}

type ChordsByLibrary = {
  [K in ChordLibrary]?: ChordEvent[]
}

type SongData = {
  videoId: string
  title: string
  duration: number
  audioPath: string | null
  audioUrl: string | null
  chords: ChordEvent[] // Default/primary for backward compat
  chordsByLibrary: ChordsByLibrary
  key: KeyInfo | null
  tempo: TempoInfo | null
  analyzedWith: ChordLibrary[]
}

// Get video info using yt-dlp
async function getVideoInfo(
  videoId: string,
): Promise<{ title: string; duration: number }> {
  const url = `https://www.youtube.com/watch?v=${videoId}`
  try {
    const { stdout } = await execAsync(
      `yt-dlp --print "%(title)s|||%(duration)s" --no-download "${url}"`,
      { timeout: 30000 },
    )
    const [title, durationStr] = stdout.trim().split('|||')
    return {
      title: title || 'Unknown Title',
      duration: parseFloat(durationStr) || 180,
    }
  } catch (error) {
    console.error('Error getting video info:', error)
    return { title: 'Unknown Title', duration: 180 }
  }
}

// Analyze audio using Python Essentia script (chords, key, tempo)
function analyzeAudio(audioPath: string): Promise<AudioAnalysis | null> {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, 'detect_chords.py')
    const venvPython = path.join(__dirname, '..', 'venv', 'bin', 'python')

    console.log(`Running audio analysis on: ${audioPath}`)

    const python = spawn(venvPython, [scriptPath, audioPath])

    let stdout = ''
    let stderr = ''

    python.stdout.on('data', (data) => {
      stdout += data.toString()
    })

    python.stderr.on('data', (data) => {
      stderr += data.toString()
    })

    python.on('close', (code) => {
      if (code === 0) {
        try {
          const result = JSON.parse(stdout)
          if (result.error) {
            console.error('Audio analysis error:', result.error)
            resolve(null)
          } else if (result.chords && result.key && result.tempo) {
            console.log(
              `Analysis complete: ${result.chords.length} chords, key: ${result.key.root} ${result.key.scale}, tempo: ${result.tempo.bpm} BPM`,
            )
            resolve(result as AudioAnalysis)
          } else {
            console.error('Unexpected analysis result format')
            resolve(null)
          }
        } catch (e) {
          console.error('Failed to parse audio analysis output:', e)
          console.error('stdout:', stdout)
          resolve(null)
        }
      } else {
        console.error('Audio analysis failed with code:', code)
        console.error('stderr:', stderr)
        resolve(null)
      }
    })

    python.on('error', (error) => {
      console.error('Python script error:', error)
      resolve(null)
    })
  })
}

// Extract audio using yt-dlp with progress tracking
function extractAudioWithProgress(videoId: string): Promise<string | null> {
  return new Promise((resolve) => {
    const url = `https://www.youtube.com/watch?v=${videoId}`
    const outputPath = path.join(AUDIO_DIR, `${videoId}.mp3`)

    // Check if already extracted
    if (fs.existsSync(outputPath)) {
      console.log(`Audio already extracted: ${outputPath}`)
      extractionProgress.set(videoId, { progress: 100, status: 'complete' })
      resolve(outputPath)
      return
    }

    extractionProgress.set(videoId, { progress: 0, status: 'starting' })

    const ytdlp = spawn('yt-dlp', [
      '-x',
      '--audio-format',
      'mp3',
      '--audio-quality',
      '0',
      '--newline', // Progress on new lines
      '-o',
      outputPath,
      url,
    ])

    let lastProgress = 0

    ytdlp.stdout.on('data', (data) => {
      const output = data.toString()
      // Parse progress from yt-dlp output
      const match = output.match(/(\d+\.?\d*)%/)
      if (match) {
        const progress = parseFloat(match[1])
        if (progress > lastProgress) {
          lastProgress = progress
          extractionProgress.set(videoId, { progress, status: 'downloading' })
        }
      }
    })

    ytdlp.stderr.on('data', (data) => {
      const output = data.toString()
      // yt-dlp sometimes outputs progress to stderr
      const match = output.match(/(\d+\.?\d*)%/)
      if (match) {
        const progress = parseFloat(match[1])
        if (progress > lastProgress) {
          lastProgress = progress
          extractionProgress.set(videoId, { progress, status: 'downloading' })
        }
      }
      // Check for conversion phase
      if (output.includes('Destination:') || output.includes('ffmpeg')) {
        extractionProgress.set(videoId, { progress: 95, status: 'converting' })
      }
    })

    ytdlp.on('close', (code) => {
      if (code === 0 && fs.existsSync(outputPath)) {
        console.log(`Audio extracted: ${outputPath}`)
        extractionProgress.set(videoId, { progress: 100, status: 'complete' })
        resolve(outputPath)
      } else {
        console.error('yt-dlp failed with code:', code)
        extractionProgress.set(videoId, { progress: 0, status: 'error' })
        resolve(null)
      }
    })

    ytdlp.on('error', (error) => {
      console.error('yt-dlp error:', error)
      extractionProgress.set(videoId, { progress: 0, status: 'error' })
      resolve(null)
    })
  })
}

// API Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// List all processed songs
app.get('/api/songs', (req, res) => {
  const songs = Array.from(songCache.values()).map((song) => ({
    videoId: song.videoId,
    title: song.title,
    duration: song.duration,
    hasAudio: !!song.audioUrl,
    hasStems: fs.existsSync(path.join(STEMS_DIR, song.videoId)),
    key: song.key,
    tempo: song.tempo,
  }))
  // Sort by title
  songs.sort((a, b) => a.title.localeCompare(b.title))
  res.json(songs)
})

// Process a YouTube video
app.post('/api/songs/process', async (req, res) => {
  const { videoId } = req.body

  if (!videoId) {
    return res.status(400).json({ error: 'videoId is required' })
  }

  // Check cache first
  if (songCache.has(videoId)) {
    const cached = songCache.get(videoId)!
    // Update audioUrl if file exists now
    const audioPath = path.join(AUDIO_DIR, `${videoId}.mp3`)
    if (fs.existsSync(audioPath)) {
      cached.audioPath = audioPath
      cached.audioUrl = `/audio/${videoId}.mp3`
    }
    console.log(`Returning cached data for ${videoId}`)
    return res.json(cached)
  }

  try {
    console.log(`Processing video: ${videoId}`)

    // Get video info
    const { title, duration } = await getVideoInfo(videoId)
    console.log(`Video info: ${title}, ${duration}s`)

    // Start audio extraction (with progress tracking), then analyze audio
    extractAudioWithProgress(videoId).then(async (audioPath) => {
      if (audioPath) {
        const cached = songCache.get(videoId)
        if (cached) {
          cached.audioPath = audioPath
          cached.audioUrl = `/audio/${videoId}.mp3`

          // Run full audio analysis (chords, key, tempo)
          extractionProgress.set(videoId, {
            progress: 100,
            status: 'analyzing',
          })
          const analysis = await analyzeAudio(audioPath)

          if (analysis) {
            cached.chords = analysis.chords
            cached.chordsByLibrary = { essentia: analysis.chords }
            cached.key = analysis.key
            cached.tempo = analysis.tempo
            cached.analyzedWith = ['essentia']
            console.log(`Updated ${videoId} with Essentia analysis`)
            // Persist metadata
            saveSongsMetadata()
          }
          extractionProgress.set(videoId, { progress: 100, status: 'complete' })
        }
      }
    })

    const songData: SongData = {
      videoId,
      title,
      duration,
      audioPath: null,
      audioUrl: null,
      chords: [], // Empty until real analysis completes
      chordsByLibrary: {},
      key: null,
      tempo: null,
      analyzedWith: [],
    }

    // Cache the result
    songCache.set(videoId, songData)

    res.json(songData)
  } catch (error) {
    console.error('Error processing video:', error)
    res.status(500).json({ error: 'Failed to process video' })
  }
})

// Get song data
app.get('/api/songs/:videoId', (req, res) => {
  const { videoId } = req.params

  if (songCache.has(videoId)) {
    const cached = songCache.get(videoId)!
    // Update audioUrl if file exists now
    const audioPath = path.join(AUDIO_DIR, `${videoId}.mp3`)
    if (fs.existsSync(audioPath)) {
      cached.audioPath = audioPath
      cached.audioUrl = `/audio/${videoId}.mp3`
    }
    return res.json(cached)
  }

  res
    .status(404)
    .json({ error: 'Song not found. Call POST /api/songs/process first.' })
})

// Get extraction progress
app.get('/api/songs/:videoId/progress', (req, res) => {
  const { videoId } = req.params

  const progress = extractionProgress.get(videoId)
  if (progress) {
    // Check if file exists (extraction might be complete)
    const audioPath = path.join(AUDIO_DIR, `${videoId}.mp3`)
    const audioExists = fs.existsSync(audioPath)
    return res.json({
      ...progress,
      audioUrl: audioExists ? `/audio/${videoId}.mp3` : null,
    })
  }

  // Check if file already exists
  const audioPath = path.join(AUDIO_DIR, `${videoId}.mp3`)
  if (fs.existsSync(audioPath)) {
    return res.json({
      progress: 100,
      status: 'complete',
      audioUrl: `/audio/${videoId}.mp3`,
    })
  }

  res.json({ progress: 0, status: 'not_started', audioUrl: null })
})

// Server-Sent Events for progress streaming
app.get('/api/songs/:videoId/progress/stream', (req, res) => {
  const { videoId } = req.params

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  const sendProgress = () => {
    const progress = extractionProgress.get(videoId)
    const audioPath = path.join(AUDIO_DIR, `${videoId}.mp3`)
    const audioExists = fs.existsSync(audioPath)

    const data = progress || { progress: 0, status: 'not_started' }
    res.write(
      `data: ${JSON.stringify({ ...data, audioUrl: audioExists ? `/audio/${videoId}.mp3` : null })}\n\n`,
    )

    if (data.status === 'complete' || data.status === 'error') {
      res.end()
      return
    }
  }

  // Send initial progress
  sendProgress()

  // Poll every 500ms
  const interval = setInterval(() => {
    const progress = extractionProgress.get(videoId)
    sendProgress()

    if (progress?.status === 'complete' || progress?.status === 'error') {
      clearInterval(interval)
    }
  }, 500)

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(interval)
  })
})

// Get current chord at a specific time
app.get('/api/songs/:videoId/chord', (req, res) => {
  const { videoId } = req.params
  const time = parseFloat(req.query.time as string) || 0

  const song = songCache.get(videoId)
  if (!song) {
    return res.status(404).json({ error: 'Song not found' })
  }

  // Find the chord at the current time
  let currentChord = song.chords[0]?.chord || null
  for (const event of song.chords) {
    if (event.time <= time) {
      currentChord = event.chord
    } else {
      break
    }
  }

  res.json({ time, chord: currentChord })
})

// ============ CHORD LIBRARY ANALYSIS ENDPOINTS ============

// Track chord analysis progress per library
type ChordAnalysisProgress = {
  progress: number
  status: 'pending' | 'processing' | 'complete' | 'error'
  error?: string
}
const chordAnalysisProgress: Map<string, ChordAnalysisProgress> = new Map()

// Get available chord libraries
app.get('/api/chord-libraries', (req, res) => {
  res.json({
    libraries: Object.entries(CHORD_LIBRARY_INFO).map(([id, info]) => ({
      id,
      ...info,
    })),
  })
})

// Get chords for a specific library
app.get('/api/songs/:videoId/chords', (req, res) => {
  const { videoId } = req.params
  const library = req.query.library as ChordLibrary | undefined

  const song = songCache.get(videoId)
  if (!song) {
    return res.status(404).json({ error: 'Song not found' })
  }

  if (library) {
    // Return chords from specific library
    const chords = song.chordsByLibrary?.[library]
    if (!chords) {
      return res.status(404).json({
        error: `No chords analyzed with ${library}`,
        availableLibraries: song.analyzedWith || [],
      })
    }
    return res.json({
      library,
      chords,
      libraryInfo: CHORD_LIBRARY_INFO[library],
    })
  }

  // Return all available chord data
  res.json({
    defaultChords: song.chords,
    chordsByLibrary: song.chordsByLibrary || {},
    analyzedWith: song.analyzedWith || [],
  })
})

// Analyze with a specific library
app.post('/api/songs/:videoId/analyze/:library', async (req, res) => {
  const { videoId, library } = req.params

  if (!['essentia', 'madmom', 'btc'].includes(library)) {
    return res.status(400).json({
      error: 'Invalid library',
      validLibraries: Object.keys(CHORD_LIBRARY_INFO),
    })
  }

  const song = songCache.get(videoId)
  if (!song) {
    return res.status(404).json({ error: 'Song not found' })
  }

  const audioPath = path.join(AUDIO_DIR, `${videoId}.mp3`)
  if (!fs.existsSync(audioPath)) {
    return res.status(400).json({
      error: 'Audio file not found',
      message: 'Please extract audio first',
    })
  }

  // Check if already analyzed with this library
  if (song.chordsByLibrary?.[library as ChordLibrary]) {
    return res.json({
      status: 'complete',
      library,
      chords: song.chordsByLibrary[library as ChordLibrary],
      message: 'Already analyzed with this library',
    })
  }

  // Check if analysis is in progress
  const progressKey = `${videoId}:${library}`
  const existing = chordAnalysisProgress.get(progressKey)
  if (existing && existing.status === 'processing') {
    return res.json({
      status: 'processing',
      progress: existing.progress,
    })
  }

  // Start analysis in background
  chordAnalysisProgress.set(progressKey, { progress: 0, status: 'pending' })

  if (library === 'essentia') {
    // Run local Essentia analysis
    runEssentiaAnalysis(videoId, audioPath, progressKey)
  } else if (library === 'madmom') {
    // Run Madmom analysis (via Cloud Run)
    runMadmomAnalysis(videoId, audioPath, progressKey)
  } else if (library === 'btc') {
    // Run BTC (Bi-directional Transformer) analysis (via Cloud Run)
    runBtcAnalysis(videoId, audioPath, progressKey)
  }

  res.json({
    status: 'started',
    message: `Started ${library} analysis`,
  })
})

// Get analysis progress for a library
app.get('/api/songs/:videoId/analyze/:library/progress', (req, res) => {
  const { videoId, library } = req.params
  const progressKey = `${videoId}:${library}`

  const progress = chordAnalysisProgress.get(progressKey)
  if (!progress) {
    // Check if already analyzed
    const song = songCache.get(videoId)
    if (song?.chordsByLibrary?.[library as ChordLibrary]) {
      return res.json({ status: 'complete', progress: 100 })
    }
    return res.json({ status: 'not_started', progress: 0 })
  }

  res.json(progress)
})

// Run Essentia analysis in background
async function runEssentiaAnalysis(
  videoId: string,
  audioPath: string,
  progressKey: string,
) {
  try {
    chordAnalysisProgress.set(progressKey, {
      progress: 10,
      status: 'processing',
    })

    const analysis = await analyzeAudio(audioPath)

    if (analysis) {
      const song = songCache.get(videoId)
      if (song) {
        song.chordsByLibrary = song.chordsByLibrary || {}
        song.chordsByLibrary.essentia = analysis.chords
        song.analyzedWith = song.analyzedWith || []
        if (!song.analyzedWith.includes('essentia')) {
          song.analyzedWith.push('essentia')
        }
        // Also update default chords if not set
        if (song.chords.length === 0) {
          song.chords = analysis.chords
          song.key = analysis.key
          song.tempo = analysis.tempo
        }
        saveSongsMetadata()
      }
      chordAnalysisProgress.set(progressKey, {
        progress: 100,
        status: 'complete',
      })
    } else {
      chordAnalysisProgress.set(progressKey, {
        progress: 0,
        status: 'error',
        error: 'Essentia analysis failed',
      })
    }
  } catch (error) {
    console.error('Essentia analysis error:', error)
    chordAnalysisProgress.set(progressKey, {
      progress: 0,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

// Cloud Run service URLs for chord analysis
const MADMOM_SERVICE_URL = process.env.MADMOM_SERVICE_URL || ''
const BTC_SERVICE_URL = process.env.BTC_SERVICE_URL || ''

// Get GCP identity token for authenticated Cloud Run calls
async function getGcpIdentityToken(): Promise<string | null> {
  try {
    const { execSync } = await import('child_process')
    const token = execSync('gcloud auth print-identity-token', {
      encoding: 'utf-8',
      timeout: 10000,
    }).trim()
    return token
  } catch (error) {
    console.error('Failed to get GCP identity token:', error)
    return null
  }
}

// Run Madmom analysis via Cloud Run
async function runMadmomAnalysis(
  videoId: string,
  audioPath: string,
  progressKey: string,
) {
  if (!MADMOM_SERVICE_URL) {
    chordAnalysisProgress.set(progressKey, {
      progress: 0,
      status: 'error',
      error:
        'Madmom service not configured. Set MADMOM_SERVICE_URL environment variable.',
    })
    return
  }

  try {
    chordAnalysisProgress.set(progressKey, {
      progress: 10,
      status: 'processing',
    })

    // Read audio file and send to Cloud Run
    const audioBuffer = fs.readFileSync(audioPath)
    const audioBase64 = audioBuffer.toString('base64')

    chordAnalysisProgress.set(progressKey, {
      progress: 20,
      status: 'processing',
    })

    // Get identity token for authenticated Cloud Run call
    const identityToken = await getGcpIdentityToken()
    if (!identityToken) {
      throw new Error(
        'Failed to get GCP identity token. Make sure you are logged in with: gcloud auth login',
      )
    }

    chordAnalysisProgress.set(progressKey, {
      progress: 30,
      status: 'processing',
    })

    const response = await fetch(`${MADMOM_SERVICE_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${identityToken}`,
      },
      body: JSON.stringify({
        audio_data: audioBase64,
        filename: `${videoId}.mp3`,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Madmom service error: ${response.status} - ${errorText}`)
    }

    chordAnalysisProgress.set(progressKey, {
      progress: 80,
      status: 'processing',
    })

    const result = await response.json()

    if (result.chords) {
      const song = songCache.get(videoId)
      if (song) {
        song.chordsByLibrary = song.chordsByLibrary || {}
        song.chordsByLibrary.madmom = result.chords
        song.analyzedWith = song.analyzedWith || []
        if (!song.analyzedWith.includes('madmom')) {
          song.analyzedWith.push('madmom')
        }
        saveSongsMetadata()
      }
      chordAnalysisProgress.set(progressKey, {
        progress: 100,
        status: 'complete',
      })
    } else {
      throw new Error('No chords in Madmom response')
    }
  } catch (error) {
    console.error('Madmom analysis error:', error)
    chordAnalysisProgress.set(progressKey, {
      progress: 0,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

// Run BTC (Bi-directional Transformer) analysis via Cloud Run
async function runBtcAnalysis(
  videoId: string,
  audioPath: string,
  progressKey: string,
) {
  if (!BTC_SERVICE_URL) {
    chordAnalysisProgress.set(progressKey, {
      progress: 0,
      status: 'error',
      error:
        'BTC service not configured. Set BTC_SERVICE_URL environment variable.',
    })
    return
  }

  try {
    chordAnalysisProgress.set(progressKey, {
      progress: 10,
      status: 'processing',
    })

    // Read audio file and send to Cloud Run
    const audioBuffer = fs.readFileSync(audioPath)
    const audioBase64 = audioBuffer.toString('base64')

    chordAnalysisProgress.set(progressKey, {
      progress: 20,
      status: 'processing',
    })

    // Get identity token for authenticated Cloud Run call
    const identityToken = await getGcpIdentityToken()
    if (!identityToken) {
      throw new Error(
        'Failed to get GCP identity token. Make sure you are logged in with: gcloud auth login',
      )
    }

    chordAnalysisProgress.set(progressKey, {
      progress: 30,
      status: 'processing',
    })

    const response = await fetch(`${BTC_SERVICE_URL}/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${identityToken}`,
      },
      body: JSON.stringify({
        audio_data: audioBase64,
        filename: `${videoId}.mp3`,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`BTC service error: ${response.status} - ${errorText}`)
    }

    chordAnalysisProgress.set(progressKey, {
      progress: 80,
      status: 'processing',
    })

    const result = await response.json()

    if (result.chords) {
      const song = songCache.get(videoId)
      if (song) {
        song.chordsByLibrary = song.chordsByLibrary || {}
        song.chordsByLibrary.btc = result.chords
        song.analyzedWith = song.analyzedWith || []
        if (!song.analyzedWith.includes('btc')) {
          song.analyzedWith.push('btc')
        }
        saveSongsMetadata()
      }
      chordAnalysisProgress.set(progressKey, {
        progress: 100,
        status: 'complete',
      })
    } else {
      throw new Error('No chords in BTC response')
    }
  } catch (error) {
    console.error('BTC analysis error:', error)
    chordAnalysisProgress.set(progressKey, {
      progress: 0,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

// ============ STEM SEPARATION ENDPOINTS ============

// Start stem separation for a video
app.post('/api/songs/:videoId/stems/separate', async (req, res) => {
  const { videoId } = req.params
  const { stems = ['vocals', 'drum', 'bass', 'electric_guitar', 'piano'] } =
    req.body

  if (!lalalClient) {
    return res.status(503).json({
      error: 'Stem separation not available',
      message: 'LALAL_API_KEY not configured',
    })
  }

  // Check if audio file exists
  const audioPath = path.join(AUDIO_DIR, `${videoId}.mp3`)
  if (!fs.existsSync(audioPath)) {
    return res.status(400).json({
      error: 'Audio file not found',
      message: 'Please extract audio first before separating stems',
    })
  }

  // Check if already processing or complete
  const existing = stemProgress.get(videoId)
  if (
    existing &&
    (existing.status === 'processing' || existing.status === 'uploading')
  ) {
    return res.json({
      status: existing.status,
      progress: existing.progress,
      message: 'Stem separation already in progress',
    })
  }

  if (existing?.status === 'complete' && existing.stems) {
    return res.json({
      status: 'complete',
      stems: existing.stems,
    })
  }

  // Start stem separation in background
  stemProgress.set(videoId, { progress: 0, status: 'pending' })

  separateStems(videoId, audioPath, stems as StemType[]).catch((error) => {
    console.error(`Stem separation failed for ${videoId}:`, error)
    stemProgress.set(videoId, {
      progress: 0,
      status: 'error',
      error: error.message,
    })
  })

  res.json({
    status: 'started',
    message: 'Stem separation started',
  })
})

// Get stem separation progress
app.get('/api/songs/:videoId/stems/progress', (req, res) => {
  const { videoId } = req.params

  const progress = stemProgress.get(videoId)
  if (!progress) {
    // Check if stems already exist locally
    const stemDir = path.join(STEMS_DIR, videoId)
    if (fs.existsSync(stemDir)) {
      const files = fs.readdirSync(stemDir).filter((f) => f.endsWith('.mp3'))
      if (files.length > 0) {
        const stems = files.map((f) => ({
          type: f.replace('.mp3', ''),
          url: `/stems/${videoId}/${f}`,
        }))
        return res.json({
          status: 'complete',
          progress: 100,
          stems,
        })
      }
    }
    return res.json({
      status: 'not_started',
      progress: 0,
    })
  }

  res.json(progress)
})

// Get available stems for a video
app.get('/api/songs/:videoId/stems', (req, res) => {
  const { videoId } = req.params

  const stemDir = path.join(STEMS_DIR, videoId)
  if (!fs.existsSync(stemDir)) {
    return res.json({ stems: [] })
  }

  const files = fs.readdirSync(stemDir).filter((f) => f.endsWith('.mp3'))
  const stems = files.map((f) => ({
    type: f.replace('.mp3', ''),
    url: `/stems/${videoId}/${f}`,
  }))

  res.json({ stems })
})

// Delete stems for a video
app.delete('/api/songs/:videoId/stems', (req, res) => {
  const { videoId } = req.params
  const stemDir = path.join(STEMS_DIR, videoId)

  // Delete stem files if they exist
  if (fs.existsSync(stemDir)) {
    fs.rmSync(stemDir, { recursive: true })
    console.log(`[Stems] Deleted stems for ${videoId}`)
  }

  // Clear in-memory progress state
  stemProgress.delete(videoId)

  res.json({ success: true, message: 'Stems deleted' })
})

// Check LALAL.ai account balance
app.get('/api/stems/balance', async (req, res) => {
  if (!lalalClient) {
    return res.status(503).json({
      error: 'Stem separation not available',
      message: 'LALAL_API_KEY not configured',
    })
  }

  try {
    const minutesLeft = await lalalClient.getMinutesLeft()
    res.json({ minutesLeft })
  } catch (_error) {
    res.status(500).json({ error: 'Failed to check balance' })
  }
})

// Background stem separation function
async function separateStems(
  videoId: string,
  audioPath: string,
  stems: StemType[],
) {
  if (!lalalClient) throw new Error('LALAL.ai client not initialized')

  const stemDir = path.join(STEMS_DIR, videoId)
  if (!fs.existsSync(stemDir)) {
    fs.mkdirSync(stemDir, { recursive: true })
  }

  try {
    // Step 1: Upload audio file
    console.log(`[Stems] Uploading audio for ${videoId}...`)
    stemProgress.set(videoId, { progress: 5, status: 'uploading' })

    const uploadResult = await lalalClient.uploadFile(audioPath)
    console.log(`[Stems] Uploaded: ${uploadResult.id}`)

    // Step 2: Start stem separation
    console.log(`[Stems] Starting separation for stems: ${stems.join(', ')}`)
    stemProgress.set(videoId, { progress: 10, status: 'processing' })

    const taskId = await lalalClient.splitMultistem(uploadResult.id, stems, {
      format: 'mp3',
    })

    stemProgress.set(videoId, {
      progress: 15,
      status: 'processing',
      taskId,
    })

    // Step 3: Wait for completion with progress updates
    const results = await lalalClient.waitForCompletion(taskId, (progress) => {
      // Scale progress from 15-85%
      const scaledProgress = 15 + progress * 0.7
      stemProgress.set(videoId, {
        progress: scaledProgress,
        status: 'processing',
        taskId,
      })
    })

    // Step 4: Download stems
    console.log(`[Stems] Downloading ${results.length} stems...`)
    stemProgress.set(videoId, { progress: 85, status: 'downloading', taskId })

    const stemInfos: StemInfo[] = []

    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      const stemPath = path.join(stemDir, `${result.type}.mp3`)

      console.log(`[Stems] Downloading ${result.type} from ${result.url}`)

      // Download the stem file
      const response = await fetch(result.url)
      if (!response.ok) {
        throw new Error(`Failed to download ${result.type}: ${response.status}`)
      }

      const buffer = Buffer.from(await response.arrayBuffer())
      fs.writeFileSync(stemPath, buffer)

      stemInfos.push({
        type: result.type,
        url: `/stems/${videoId}/${result.type}.mp3`,
        originalUrl: result.url,
      })

      // Update progress
      const downloadProgress = 85 + ((i + 1) / results.length) * 15
      stemProgress.set(videoId, {
        progress: downloadProgress,
        status: 'downloading',
        taskId,
      })
    }

    // Step 5: Complete
    console.log(`[Stems] Separation complete for ${videoId}`)
    stemProgress.set(videoId, {
      progress: 100,
      status: 'complete',
      taskId,
      stems: stemInfos,
    })

    // Cleanup: Delete source from LALAL.ai
    try {
      await lalalClient.deleteSource(uploadResult.id)
    } catch (e) {
      console.warn('[Stems] Failed to cleanup source:', e)
    }
  } catch (error) {
    console.error(`[Stems] Error separating stems for ${videoId}:`, error)
    throw error
  }
}

// ============ LYRICS TRANSCRIPTION ENDPOINTS ============

type AudioSourceType = 'vocals_stem' | 'full_audio'

type LyricsJobStatus = 'pending' | 'processing' | 'complete' | 'error'

type LyricsJob = {
  jobId: string
  videoId: string
  audioSource: AudioSourceType
  status: LyricsJobStatus
  progress: number
  lrcContent?: string
  hasWordTiming?: boolean
  error?: string
  createdAt: Date
  completedAt?: Date
}

// In-memory storage for lyrics jobs
const lyricsJobs: Map<string, LyricsJob> = new Map()

// Cache for completed lyrics by videoId
const lyricsCache: Map<
  string,
  { lrcContent: string; hasWordTiming: boolean; audioSource: AudioSourceType }
> = new Map()

// Load existing lyrics from disk on startup
function loadExistingLyrics() {
  try {
    if (fs.existsSync(LYRICS_DIR)) {
      const files = fs.readdirSync(LYRICS_DIR).filter((f) => f.endsWith('.lrc'))
      for (const file of files) {
        const videoId = file.replace('.lrc', '')
        const lrcPath = path.join(LYRICS_DIR, file)
        const lrcContent = fs.readFileSync(lrcPath, 'utf-8')
        // Check for word-level timing (enhanced LRC has <> for word timing)
        const hasWordTiming = lrcContent.includes('<')
        lyricsCache.set(videoId, {
          lrcContent,
          hasWordTiming,
          audioSource: 'full_audio',
        })
      }
      console.log(`Loaded ${lyricsCache.size} lyrics files from disk`)
    }
  } catch (error) {
    console.error('Error loading existing lyrics:', error)
  }
}
loadExistingLyrics()

// Generate a unique job ID
function generateJobId(): string {
  return `lyrics_${Date.now()}_${Math.random().toString(36).substring(7)}`
}

// Start lyrics generation
app.post('/api/lyrics/generate', async (req, res) => {
  const { videoId, audioSource = 'full_audio' } = req.body

  if (!videoId) {
    return res.status(400).json({ error: 'videoId is required' })
  }

  if (!['vocals_stem', 'full_audio'].includes(audioSource)) {
    return res
      .status(400)
      .json({ error: 'audioSource must be vocals_stem or full_audio' })
  }

  // Check if lyrics already exist
  if (lyricsCache.has(videoId)) {
    return res.json({
      status: 'complete',
      ...lyricsCache.get(videoId),
    })
  }

  // Check if there's already a job in progress
  for (const job of lyricsJobs.values()) {
    if (
      job.videoId === videoId &&
      (job.status === 'pending' || job.status === 'processing')
    ) {
      return res.json({
        status: job.status,
        jobId: job.jobId,
        progress: job.progress,
      })
    }
  }

  // Get the audio file path
  let audioPath: string
  if (audioSource === 'vocals_stem') {
    audioPath = path.join(STEMS_DIR, videoId, 'vocals.mp3')
    if (!fs.existsSync(audioPath)) {
      return res.status(400).json({
        error: 'Vocals stem not found',
        message: 'Please separate stems first or use full_audio source',
      })
    }
  } else {
    audioPath = path.join(AUDIO_DIR, `${videoId}.mp3`)
    if (!fs.existsSync(audioPath)) {
      return res.status(400).json({
        error: 'Audio file not found',
        message: 'Please extract audio first',
      })
    }
  }

  // Create a new job
  const jobId = generateJobId()
  const job: LyricsJob = {
    jobId,
    videoId,
    audioSource: audioSource as AudioSourceType,
    status: 'pending',
    progress: 0,
    createdAt: new Date(),
  }
  lyricsJobs.set(jobId, job)

  // Start lyrics generation in background
  generateLyrics(job, audioPath).catch((error) => {
    console.error(`Lyrics generation failed for ${videoId}:`, error)
    job.status = 'error'
    job.error = error.message
  })

  res.json({
    status: 'started',
    jobId,
    message: 'Lyrics generation started',
  })
})

// Get lyrics job status
app.get('/api/lyrics/status/:jobId', (req, res) => {
  const { jobId } = req.params

  const job = lyricsJobs.get(jobId)
  if (!job) {
    return res.status(404).json({ error: 'Job not found' })
  }

  res.json({
    jobId: job.jobId,
    videoId: job.videoId,
    status: job.status,
    progress: job.progress,
    lrcContent: job.lrcContent,
    hasWordTiming: job.hasWordTiming,
    error: job.error,
  })
})

// Get lyrics for a video
app.get('/api/lyrics/:videoId', (req, res) => {
  const { videoId } = req.params

  // Check cache first
  if (lyricsCache.has(videoId)) {
    return res.json({
      status: 'complete',
      ...lyricsCache.get(videoId),
    })
  }

  // Check for pending job
  for (const job of lyricsJobs.values()) {
    if (job.videoId === videoId) {
      return res.json({
        status: job.status,
        jobId: job.jobId,
        progress: job.progress,
        error: job.error,
      })
    }
  }

  // Check if lyrics file exists on disk
  const lrcPath = path.join(LYRICS_DIR, `${videoId}.lrc`)
  if (fs.existsSync(lrcPath)) {
    const lrcContent = fs.readFileSync(lrcPath, 'utf-8')
    const hasWordTiming = lrcContent.includes('<')
    const result = {
      lrcContent,
      hasWordTiming,
      audioSource: 'full_audio' as AudioSourceType,
    }
    lyricsCache.set(videoId, result)
    return res.json({
      status: 'complete',
      ...result,
    })
  }

  res.status(404).json({
    status: 'not_found',
    error: 'Lyrics not generated yet',
  })
})

// Delete lyrics for a video
app.delete('/api/lyrics/:videoId', (req, res) => {
  const { videoId } = req.params

  // Remove from cache
  lyricsCache.delete(videoId)

  // Delete file if exists
  const lrcPath = path.join(LYRICS_DIR, `${videoId}.lrc`)
  if (fs.existsSync(lrcPath)) {
    fs.unlinkSync(lrcPath)
  }

  // Cancel any pending jobs
  for (const [jobId, job] of lyricsJobs.entries()) {
    if (job.videoId === videoId) {
      lyricsJobs.delete(jobId)
    }
  }

  res.json({ success: true, message: 'Lyrics deleted' })
})

// Convert milliseconds to LRC timestamp format [MM:SS.cc]
function msToLrcTimestamp(ms: number): string {
  const totalSeconds = ms / 1000
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toFixed(2).padStart(5, '0')}`
}

// Convert AssemblyAI transcript to enhanced LRC format with word-level timing
function transcriptToLrc(
  transcript: {
    words?: Array<{ text: string; start: number; end: number }> | null
  },
  videoId: string,
): { lrcContent: string; hasWordTiming: boolean } {
  const lines: string[] = [
    `[ti:Lyrics for ${videoId}]`,
    '[ar:Unknown Artist]',
    '[al:Unknown Album]',
    '[by:Guitar App - AssemblyAI]',
    '',
  ]

  if (!transcript.words || transcript.words.length === 0) {
    lines.push('[00:00.00]No lyrics detected in audio')
    return { lrcContent: lines.join('\n'), hasWordTiming: false }
  }

  // Group words into lines (split on pauses > 1.5 seconds or every ~10 words)
  const wordGroups: Array<{
    words: typeof transcript.words
    startTime: number
  }> = []
  let currentGroup: typeof transcript.words = []
  let groupStartTime = transcript.words[0].start

  for (let i = 0; i < transcript.words.length; i++) {
    const word = transcript.words[i]
    const prevWord = i > 0 ? transcript.words[i - 1] : null

    // Start new group on long pause or after ~12 words
    const longPause = prevWord && word.start - prevWord.end > 1500
    const manyWords = currentGroup.length >= 12

    if ((longPause || manyWords) && currentGroup.length > 0) {
      wordGroups.push({ words: currentGroup, startTime: groupStartTime })
      currentGroup = []
      groupStartTime = word.start
    }

    currentGroup.push(word)
  }

  // Don't forget the last group
  if (currentGroup.length > 0) {
    wordGroups.push({ words: currentGroup, startTime: groupStartTime })
  }

  // Generate enhanced LRC with word-level timing
  for (const group of wordGroups) {
    const lineTimestamp = `[${msToLrcTimestamp(group.startTime)}]`
    const wordsWithTiming = group.words
      .map((w) => `<${msToLrcTimestamp(w.start)}>${w.text}`)
      .join(' ')
    lines.push(`${lineTimestamp}${wordsWithTiming}`)
  }

  return { lrcContent: lines.join('\n'), hasWordTiming: true }
}

// Background lyrics generation function using AssemblyAI
async function generateLyrics(job: LyricsJob, audioPath: string) {
  try {
    job.status = 'processing'
    job.progress = 10

    console.log(
      `[Lyrics] Starting generation for ${job.videoId} using ${job.audioSource}`,
    )

    // Check if AssemblyAI is configured
    if (!assemblyClient) {
      throw new Error(
        'AssemblyAI not configured. Please set ASSEMBLYAI_API_KEY in .env',
      )
    }

    job.progress = 20

    // Read audio file
    const audioBuffer = fs.readFileSync(audioPath)
    console.log(
      `[Lyrics] Audio file size: ${(audioBuffer.length / 1024 / 1024).toFixed(2)} MB`,
    )

    job.progress = 30

    // Start transcription with AssemblyAI
    console.log(`[Lyrics] Uploading to AssemblyAI...`)

    const transcript = await assemblyClient.transcripts.transcribe({
      audio: audioBuffer,
      language_detection: true,
    })

    job.progress = 70

    console.log(`[Lyrics] Transcription status: ${transcript.status}`)

    if (transcript.status === 'error') {
      throw new Error(`Transcription failed: ${transcript.error}`)
    }

    job.progress = 80

    // Convert transcript to LRC format
    const { lrcContent, hasWordTiming } = transcriptToLrc(
      transcript,
      job.videoId,
    )

    job.progress = 90

    // Save to file
    const lrcPath = path.join(LYRICS_DIR, `${job.videoId}.lrc`)
    fs.writeFileSync(lrcPath, lrcContent)

    // Update cache
    lyricsCache.set(job.videoId, {
      lrcContent,
      hasWordTiming,
      audioSource: job.audioSource,
    })

    // Complete the job
    job.status = 'complete'
    job.progress = 100
    job.lrcContent = lrcContent
    job.hasWordTiming = hasWordTiming
    job.completedAt = new Date()

    console.log(
      `[Lyrics] Generation complete for ${job.videoId} - ${transcript.words?.length || 0} words transcribed`,
    )
  } catch (error) {
    console.error(`[Lyrics] Error generating lyrics for ${job.videoId}:`, error)
    job.status = 'error'
    job.error = error instanceof Error ? error.message : 'Unknown error'
    throw error
  }
}

// Serve extracted audio files
app.use('/audio', express.static(AUDIO_DIR))

// Serve separated stem files
app.use('/stems', express.static(STEMS_DIR))

// Serve lyrics files
app.use('/lyrics', express.static(LYRICS_DIR))

app.listen(PORT, () => {
  console.log(`Backend server running at http://localhost:${PORT}`)
  console.log(`Audio files directory: ${AUDIO_DIR}`)
  console.log(`Stems files directory: ${STEMS_DIR}`)
  console.log(`Lyrics files directory: ${LYRICS_DIR}`)
  console.log(
    `LALAL.ai API: ${lalalClient ? 'Configured' : 'Not configured (set LALAL_API_KEY)'}`,
  )
  console.log(
    `AssemblyAI API: ${assemblyClient ? 'Configured' : 'Not configured (set ASSEMBLYAI_API_KEY)'}`,
  )
})
