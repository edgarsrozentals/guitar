/**
 * Chordify Scraper
 *
 * Fetches and parses chord data from Chordify.net public pages.
 * No authentication required - all data is publicly accessible in HTML.
 *
 * NOTE: Chordify loads chord data via JavaScript, so browser automation
 * (Puppeteer) is required to get the actual chord timeline data.
 */

import * as cheerio from 'cheerio'

import type { RawChord, ChordifyMetadata, ChordifyError } from './types'

const CHORDIFY_BASE_URL = 'https://chordify.net'

// Puppeteer instance (lazy loaded)
let puppeteerModule: typeof import('puppeteer') | null = null

async function getPuppeteer() {
  if (!puppeteerModule) {
    puppeteerModule = await import('puppeteer')
  }
  return puppeteerModule
}

// Browser-like headers to avoid Cloudflare blocks
const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept:
    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  Pragma: 'no-cache',
  'Sec-Ch-Ua':
    '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
  'Sec-Ch-Ua-Mobile': '?0',
  'Sec-Ch-Ua-Platform': '"macOS"',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
}

/**
 * Search Chordify for a YouTube video and get the song page URL
 * Uses Puppeteer to bypass Cloudflare protection
 */
export async function findChordifyUrl(videoId: string): Promise<string | null> {
  const searchUrl = `${CHORDIFY_BASE_URL}/search/youtube:${videoId}`

  // Try with Puppeteer first
  const puppeteer = await getPuppeteer()
  let browser = null

  try {
    console.log('Searching Chordify with browser...')
    browser = await puppeteer.default.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    })

    const page = await browser.newPage()
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    )

    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 })

    // Wait for search results
    await page.waitForSelector('a[href*="/chords/"]', { timeout: 10000 })

    const html = await page.content()
    const $ = cheerio.load(html)

    // Find the first song result link (look for links to /chords/ path, excluding search links)
    const songLink = $('a[href*="/chords/"]')
      .filter((_, el) => {
        const href = $(el).attr('href') || ''
        // Exclude search result links and navigation links, only get actual song pages
        return !href.includes('/search/') && !href.includes('?category=')
      })
      .first()
      .attr('href')

    if (!songLink) {
      console.log('No song results found in search')
      return null
    }

    console.log('Found song:', songLink)
    // Append the YouTube version parameter only if not already present
    const fullUrl = songLink.includes('?version=')
      ? `${CHORDIFY_BASE_URL}${songLink}`
      : `${CHORDIFY_BASE_URL}${songLink}?version=youtube:${videoId}`
    return fullUrl
  } catch (err) {
    console.warn('Browser search failed:', err)
    // Fallback to simple fetch
    return findChordifyUrlSimple(videoId)
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

/**
 * Simple fetch-based search (may fail due to Cloudflare)
 */
async function findChordifyUrlSimple(videoId: string): Promise<string | null> {
  const searchUrl = `${CHORDIFY_BASE_URL}/search/youtube:${videoId}`

  const response = await fetch(searchUrl, {
    headers: BROWSER_HEADERS,
  })

  if (!response.ok) {
    return null
  }

  const html = await response.text()

  // Check for Cloudflare challenge
  if (
    html.includes('Just a moment...') ||
    html.includes('challenge-platform')
  ) {
    console.warn(
      'Cloudflare challenge detected - cannot bypass without browser automation',
    )
    return null
  }

  const $ = cheerio.load(html)

  // Find the first song result link (look for links to /chords/ path, excluding search links)
  const songLink = $('a[href*="/chords/"]')
    .filter((_, el) => {
      const href = $(el).attr('href') || ''
      // Exclude search result links and navigation links, only get actual song pages
      return !href.includes('/search/') && !href.includes('?category=')
    })
    .first()
    .attr('href')

  if (!songLink) {
    return null
  }

  // Append the YouTube version parameter only if not already present
  return songLink.includes('?version=')
    ? `${CHORDIFY_BASE_URL}${songLink}`
    : `${CHORDIFY_BASE_URL}${songLink}?version=youtube:${videoId}`
}

/**
 * Fetch the Chordify page HTML
 */
export async function fetchChordifyPage(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: BROWSER_HEADERS,
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch Chordify page: ${response.status}`)
  }

  const html = await response.text()

  // Check for Cloudflare challenge
  if (
    html.includes('Just a moment...') ||
    html.includes('challenge-platform')
  ) {
    throw new Error(
      'Cloudflare challenge detected - browser automation required',
    )
  }

  return html
}

/**
 * Parse raw chord data from HTML
 */
export function parseRawChords($: cheerio.CheerioAPI): RawChord[] {
  const chords: RawChord[] = []

  $('[data-handle][data-i]').each((_, el) => {
    const $el = $(el)
    const handle = $el.attr('data-handle')
    const beatIndex = $el.attr('data-i')

    if (handle && beatIndex) {
      chords.push({
        handle,
        beatIndex: parseInt(beatIndex, 10),
      })
    }
  })

  // Sort by beat index (should already be sorted, but ensure)
  return chords.sort((a, b) => a.beatIndex - b.beatIndex)
}

/**
 * Parse metadata from HTML
 */
export function parseMetadata(
  $: cheerio.CheerioAPI,
): Partial<ChordifyMetadata> {
  const metadata: Partial<ChordifyMetadata> = {}

  // BPM: <dt>bpm</dt><dd>97</dd>
  $('dt').each((_, el) => {
    const $dt = $(el)
    const label = $dt.text().toLowerCase().trim()
    const $dd = $dt.next('dd')
    const value = $dd.text().trim()

    switch (label) {
      case 'bpm':
        metadata.bpm = parseInt(value, 10)
        break
      case 'key':
        metadata.key = parseKeyNotation(value)
        break
      case 'artist':
        metadata.artist = $dd.find('a').text().trim() || value
        break
      case 'title':
        metadata.title = value
        break
    }
  })

  // Time signature from class="chords barlength-4"
  const chordsContainer = $('#chords')
  const classAttr = chordsContainer.attr('class') || ''
  const barlengthMatch = classAttr.match(/barlength-(\d+)/)
  if (barlengthMatch) {
    metadata.timeSignature = {
      beatsPerBar: parseInt(barlengthMatch[1], 10),
    }
  }

  // Duration from timeline (e.g., "06:17")
  const durationText = $('.e1pja73g .txdese3').text().trim()
  if (durationText) {
    metadata.duration = parseDuration(durationText)
  }

  return metadata
}

/**
 * Parse key notation like "Gₘ" or "B♭" into our format
 */
export function parseKeyNotation(
  keyText: string,
): { root: string; quality: string } | null {
  if (!keyText) return null

  // Check for minor indicator (subscript m or regular m at end)
  const isMinor = keyText.includes('ₘ') || keyText.endsWith('m')

  // Extract root note
  const root = keyText
    .replace('ₘ', '')
    .replace(/m$/, '')
    .replace('♭', 'b')
    .replace('♯', '#')
    .trim()

  if (!root) return null

  return {
    root,
    quality: isMinor ? 'minor' : 'major',
  }
}

/**
 * Parse duration string "MM:SS" to seconds
 */
export function parseDuration(durationText: string): number {
  const parts = durationText.split(':')
  if (parts.length !== 2) return 0

  const minutes = parseInt(parts[0], 10)
  const seconds = parseInt(parts[1], 10)

  return minutes * 60 + seconds
}

/**
 * Calculate first beat offset from "N" (no chord) entries at the start
 */
export function calculateFirstBeatOffset(
  chords: RawChord[],
  bpm: number,
): number {
  if (!bpm || bpm <= 0) return 0

  // Find first non-N chord
  const firstRealChordIndex = chords.findIndex((c) => c.handle !== 'N')

  // If no N chords at start, or all N, offset is 0
  if (firstRealChordIndex <= 0) return 0

  // Calculate time offset
  return firstRealChordIndex * (60 / bpm)
}

/**
 * Fetch Chordify page using Puppeteer (with JavaScript execution)
 * This is necessary because chord data is loaded dynamically via JS
 */
export async function fetchChordifyWithBrowser(url: string): Promise<string> {
  const puppeteer = await getPuppeteer()

  let browser = null
  try {
    console.log('Launching browser for Chordify scraping...')
    browser = await puppeteer.default.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    })

    const page = await browser.newPage()

    // Set viewport and user agent
    await page.setViewport({ width: 1280, height: 800 })
    await page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    )

    console.log(`Navigating to ${url}...`)
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 })

    // Wait for chord elements to appear (they load via JavaScript)
    console.log('Waiting for chord data to load...')
    await page.waitForSelector('[data-handle]', { timeout: 15000 })

    // Extra wait to ensure all chords are rendered
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Get the full page HTML
    const html = await page.content()

    console.log('Successfully fetched Chordify page with browser')
    return html
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

/**
 * Main scraping function - fetches and parses all data from Chordify
 * Uses Puppeteer for browser-based scraping to handle JavaScript-rendered content
 */
export async function scrapeChordify(
  videoId: string,
): Promise<
  | { success: true; html: string; url: string }
  | { success: false; error: ChordifyError }
> {
  try {
    // First, find the Chordify URL for this video using simple fetch
    // (the search page doesn't require JS for the results)
    const url = await findChordifyUrl(videoId)

    if (!url) {
      return {
        success: false,
        error: {
          type: 'NOT_FOUND',
          message: 'Song not found on Chordify',
        },
      }
    }

    // Now fetch the actual chord page using Puppeteer
    // This is required because chord data is loaded via JavaScript
    let html: string
    try {
      html = await fetchChordifyWithBrowser(url)
    } catch (browserError) {
      // Fall back to simple fetch if browser fails
      console.warn(
        'Browser scraping failed, trying simple fetch:',
        browserError,
      )
      html = await fetchChordifyPage(url)
    }

    // Validate we have chord data
    if (!html.includes('data-handle=')) {
      return {
        success: false,
        error: {
          type: 'PARSE_ERROR',
          message:
            'No chord data found on page - JavaScript may not have loaded',
        },
      }
    }

    return { success: true, html, url }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return {
      success: false,
      error: {
        type: 'NETWORK_ERROR',
        message: `Failed to fetch Chordify: ${message}`,
      },
    }
  }
}
