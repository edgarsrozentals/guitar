/**
 * Chordify Integration Unit Tests
 *
 * Tests for Epic 12 - Chordify Ground Truth Integration
 * Stories 12.2 (Metadata Extraction), 12.3 (First Beat Offset), 12.4 (Chord Parsing)
 */

import * as cheerio from 'cheerio'
import { describe, expect, it } from 'vitest'

import {
  calculateFirstBeatOffset,
  parseDuration,
  parseKeyNotation,
  parseMetadata,
  parseRawChords,
} from './scraper'
import {
  collapseChords,
  parseChordHandle,
  toSongMetadataFormat,
  transformChordifyHtml,
} from './transformer'

import type { RawChord } from './types'

// ============================================================================
// Story 12.2 - Metadata Extraction Tests
// ============================================================================

describe('Story 12.2 - Metadata Extraction', () => {
  describe('parseMetadata()', () => {
    it('extracts BPM from dt/dd structure', () => {
      const html = `
        <dl>
          <dt>bpm</dt><dd>97</dd>
        </dl>
      `
      const $ = cheerio.load(html)
      const metadata = parseMetadata($)

      expect(metadata.bpm).toBe(97)
    })

    it('extracts key from dt/dd structure', () => {
      const html = `
        <dl>
          <dt>key</dt><dd>Gₘ</dd>
        </dl>
      `
      const $ = cheerio.load(html)
      const metadata = parseMetadata($)

      expect(metadata.key).toEqual({ root: 'G', quality: 'minor' })
    })

    it('extracts artist from dt/dd structure', () => {
      const html = `
        <dl>
          <dt>artist</dt><dd><a href="/artist/test">Test Artist</a></dd>
        </dl>
      `
      const $ = cheerio.load(html)
      const metadata = parseMetadata($)

      expect(metadata.artist).toBe('Test Artist')
    })

    it('extracts title from dt/dd structure', () => {
      const html = `
        <dl>
          <dt>title</dt><dd>My Song Title</dd>
        </dl>
      `
      const $ = cheerio.load(html)
      const metadata = parseMetadata($)

      expect(metadata.title).toBe('My Song Title')
    })

    it('extracts time signature from barlength class', () => {
      const html = `
        <div id="chords" class="chords barlength-4"></div>
      `
      const $ = cheerio.load(html)
      const metadata = parseMetadata($)

      expect(metadata.timeSignature).toEqual({ beatsPerBar: 4 })
    })

    it('extracts time signature with 3 beats per bar (waltz)', () => {
      const html = `
        <div id="chords" class="chords barlength-3 other-class"></div>
      `
      const $ = cheerio.load(html)
      const metadata = parseMetadata($)

      expect(metadata.timeSignature).toEqual({ beatsPerBar: 3 })
    })

    it('extracts all metadata from complete HTML', () => {
      const html = `
        <dl>
          <dt>bpm</dt><dd>120</dd>
          <dt>key</dt><dd>C</dd>
          <dt>artist</dt><dd>The Beatles</dd>
          <dt>title</dt><dd>Let It Be</dd>
        </dl>
        <div id="chords" class="chords barlength-4"></div>
      `
      const $ = cheerio.load(html)
      const metadata = parseMetadata($)

      expect(metadata.bpm).toBe(120)
      expect(metadata.key).toEqual({ root: 'C', quality: 'major' })
      expect(metadata.artist).toBe('The Beatles')
      expect(metadata.title).toBe('Let It Be')
      expect(metadata.timeSignature).toEqual({ beatsPerBar: 4 })
    })

    it('handles missing metadata gracefully', () => {
      const html = '<div>No metadata here</div>'
      const $ = cheerio.load(html)
      const metadata = parseMetadata($)

      expect(metadata.bpm).toBeUndefined()
      expect(metadata.key).toBeUndefined()
      expect(metadata.artist).toBeUndefined()
      expect(metadata.title).toBeUndefined()
      expect(metadata.timeSignature).toBeUndefined()
    })
  })

  describe('parseKeyNotation()', () => {
    it('parses minor key with subscript m (Gₘ)', () => {
      const result = parseKeyNotation('Gₘ')
      expect(result).toEqual({ root: 'G', quality: 'minor' })
    })

    it('parses minor key with regular m suffix (Am)', () => {
      const result = parseKeyNotation('Am')
      expect(result).toEqual({ root: 'A', quality: 'minor' })
    })

    it('parses major key (C)', () => {
      const result = parseKeyNotation('C')
      expect(result).toEqual({ root: 'C', quality: 'major' })
    })

    it('parses flat notes with unicode symbol (B♭)', () => {
      const result = parseKeyNotation('B♭')
      expect(result).toEqual({ root: 'Bb', quality: 'major' })
    })

    it('parses flat minor key (B♭ₘ)', () => {
      const result = parseKeyNotation('B♭ₘ')
      expect(result).toEqual({ root: 'Bb', quality: 'minor' })
    })

    it('parses sharp notes with unicode symbol (F♯)', () => {
      const result = parseKeyNotation('F♯')
      expect(result).toEqual({ root: 'F#', quality: 'major' })
    })

    it('parses sharp minor key (F♯ₘ)', () => {
      const result = parseKeyNotation('F♯ₘ')
      expect(result).toEqual({ root: 'F#', quality: 'minor' })
    })

    it('parses E flat minor (E♭ₘ)', () => {
      const result = parseKeyNotation('E♭ₘ')
      expect(result).toEqual({ root: 'Eb', quality: 'minor' })
    })

    it('parses D major (D)', () => {
      const result = parseKeyNotation('D')
      expect(result).toEqual({ root: 'D', quality: 'major' })
    })

    it('returns null for empty string', () => {
      const result = parseKeyNotation('')
      expect(result).toBeNull()
    })

    it('returns null for null input', () => {
      // @ts-expect-error testing null input
      const result = parseKeyNotation(null)
      expect(result).toBeNull()
    })

    it('handles plain flat notation (Bb)', () => {
      const result = parseKeyNotation('Bb')
      expect(result).toEqual({ root: 'Bb', quality: 'major' })
    })

    it('handles plain sharp notation (F#)', () => {
      const result = parseKeyNotation('F#')
      expect(result).toEqual({ root: 'F#', quality: 'major' })
    })
  })

  describe('parseDuration()', () => {
    it('parses "06:17" to 377 seconds', () => {
      const result = parseDuration('06:17')
      expect(result).toBe(377)
    })

    it('parses "03:30" to 210 seconds', () => {
      const result = parseDuration('03:30')
      expect(result).toBe(210)
    })

    it('parses "00:30" to 30 seconds', () => {
      const result = parseDuration('00:30')
      expect(result).toBe(30)
    })

    it('parses "10:00" to 600 seconds', () => {
      const result = parseDuration('10:00')
      expect(result).toBe(600)
    })

    it('parses "01:00" to 60 seconds', () => {
      const result = parseDuration('01:00')
      expect(result).toBe(60)
    })

    it('parses "00:00" to 0 seconds', () => {
      const result = parseDuration('00:00')
      expect(result).toBe(0)
    })

    it('returns 0 for invalid format (no colon)', () => {
      const result = parseDuration('300')
      expect(result).toBe(0)
    })

    it('returns 0 for invalid format (empty string)', () => {
      const result = parseDuration('')
      expect(result).toBe(0)
    })

    it('returns 0 for malformed time (extra colon)', () => {
      const result = parseDuration('01:02:03')
      expect(result).toBe(0)
    })
  })
})

// ============================================================================
// Story 12.3 - First Beat Offset Tests
// ============================================================================

describe('Story 12.3 - First Beat Offset', () => {
  describe('calculateFirstBeatOffset()', () => {
    it('counts "N" entries and calculates correct offset', () => {
      const chords: RawChord[] = [
        { handle: 'N', beatIndex: 0 },
        { handle: 'N', beatIndex: 1 },
        { handle: 'N', beatIndex: 2 },
        { handle: 'N', beatIndex: 3 },
        { handle: 'G:maj', beatIndex: 4 },
        { handle: 'G:maj', beatIndex: 5 },
      ]
      const bpm = 120 // 0.5 seconds per beat

      const offset = calculateFirstBeatOffset(chords, bpm)

      // 4 "N" entries at 120 BPM = 4 * (60/120) = 4 * 0.5 = 2 seconds
      expect(offset).toBe(2)
    })

    it('returns 0 when first chord is at index 0', () => {
      const chords: RawChord[] = [
        { handle: 'C:maj', beatIndex: 0 },
        { handle: 'G:maj', beatIndex: 1 },
        { handle: 'Am:min', beatIndex: 2 },
      ]
      const bpm = 120

      const offset = calculateFirstBeatOffset(chords, bpm)

      expect(offset).toBe(0)
    })

    it('calculates offset = firstNonEmptyBeatIndex * (60 / BPM)', () => {
      const chords: RawChord[] = [
        { handle: 'N', beatIndex: 0 },
        { handle: 'N', beatIndex: 1 },
        { handle: 'N', beatIndex: 2 },
        { handle: 'N', beatIndex: 3 },
        { handle: 'N', beatIndex: 4 },
        { handle: 'N', beatIndex: 5 },
        { handle: 'N', beatIndex: 6 },
        { handle: 'N', beatIndex: 7 },
        { handle: 'N', beatIndex: 8 },
        { handle: 'N', beatIndex: 9 },
        { handle: 'N', beatIndex: 10 },
        { handle: 'Eb:maj', beatIndex: 11 }, // First real chord at index 11
      ]
      const bpm = 81 // From actual spell HTML

      const offset = calculateFirstBeatOffset(chords, bpm)

      // 11 "N" entries at 81 BPM = 11 * (60/81) = 11 * 0.7407... = ~8.148 seconds
      expect(offset).toBeCloseTo(11 * (60 / 81), 5)
    })

    it('returns 0 when all chords are "N"', () => {
      const chords: RawChord[] = [
        { handle: 'N', beatIndex: 0 },
        { handle: 'N', beatIndex: 1 },
        { handle: 'N', beatIndex: 2 },
      ]
      const bpm = 120

      const offset = calculateFirstBeatOffset(chords, bpm)

      expect(offset).toBe(0)
    })

    it('returns 0 for empty chord array', () => {
      const chords: RawChord[] = []
      const bpm = 120

      const offset = calculateFirstBeatOffset(chords, bpm)

      expect(offset).toBe(0)
    })

    it('returns 0 when BPM is 0', () => {
      const chords: RawChord[] = [
        { handle: 'N', beatIndex: 0 },
        { handle: 'G:maj', beatIndex: 1 },
      ]
      const bpm = 0

      const offset = calculateFirstBeatOffset(chords, bpm)

      expect(offset).toBe(0)
    })

    it('returns 0 when BPM is negative', () => {
      const chords: RawChord[] = [
        { handle: 'N', beatIndex: 0 },
        { handle: 'G:maj', beatIndex: 1 },
      ]
      const bpm = -120

      const offset = calculateFirstBeatOffset(chords, bpm)

      expect(offset).toBe(0)
    })

    it('handles single N followed by chord', () => {
      const chords: RawChord[] = [
        { handle: 'N', beatIndex: 0 },
        { handle: 'D:min', beatIndex: 1 },
      ]
      const bpm = 60 // 1 second per beat

      const offset = calculateFirstBeatOffset(chords, bpm)

      expect(offset).toBe(1) // 1 beat at 60 BPM = 1 second
    })

    it('calculates correctly with different BPM values', () => {
      const chords: RawChord[] = [
        { handle: 'N', beatIndex: 0 },
        { handle: 'N', beatIndex: 1 },
        { handle: 'A:min', beatIndex: 2 },
      ]

      // Test with 60 BPM (1 sec per beat)
      expect(calculateFirstBeatOffset(chords, 60)).toBe(2)

      // Test with 120 BPM (0.5 sec per beat)
      expect(calculateFirstBeatOffset(chords, 120)).toBe(1)

      // Test with 180 BPM (0.333... sec per beat)
      expect(calculateFirstBeatOffset(chords, 180)).toBeCloseTo(2 / 3, 5)

      // Test with 90 BPM (0.666... sec per beat)
      expect(calculateFirstBeatOffset(chords, 90)).toBeCloseTo(4 / 3, 5)
    })
  })
})

// ============================================================================
// Story 12.4 - Chord Parsing Tests
// ============================================================================

describe('Story 12.4 - Chord Parsing', () => {
  describe('parseRawChords()', () => {
    it('extracts all data-handle and data-i attributes', () => {
      const html = `
        <div class="chords">
          <div data-handle="N" data-i="0"></div>
          <div data-handle="G:maj" data-i="1"></div>
          <div data-handle="C:min" data-i="2"></div>
        </div>
      `
      const $ = cheerio.load(html)
      const chords = parseRawChords($)

      expect(chords).toHaveLength(3)
      expect(chords[0]).toEqual({ handle: 'N', beatIndex: 0 })
      expect(chords[1]).toEqual({ handle: 'G:maj', beatIndex: 1 })
      expect(chords[2]).toEqual({ handle: 'C:min', beatIndex: 2 })
    })

    it('sorts chords by beat index', () => {
      const html = `
        <div class="chords">
          <div data-handle="C:maj" data-i="5"></div>
          <div data-handle="G:min" data-i="1"></div>
          <div data-handle="D:7" data-i="10"></div>
          <div data-handle="N" data-i="0"></div>
        </div>
      `
      const $ = cheerio.load(html)
      const chords = parseRawChords($)

      expect(chords).toHaveLength(4)
      expect(chords[0].beatIndex).toBe(0)
      expect(chords[1].beatIndex).toBe(1)
      expect(chords[2].beatIndex).toBe(5)
      expect(chords[3].beatIndex).toBe(10)
    })

    it('handles elements without data-handle or data-i', () => {
      const html = `
        <div class="chords">
          <div data-handle="G:maj" data-i="0"></div>
          <div data-handle="missing-index"></div>
          <div data-i="1"></div>
          <div>no attributes</div>
          <div data-handle="C:min" data-i="2"></div>
        </div>
      `
      const $ = cheerio.load(html)
      const chords = parseRawChords($)

      // Only elements with both attributes should be included
      expect(chords).toHaveLength(2)
      expect(chords[0]).toEqual({ handle: 'G:maj', beatIndex: 0 })
      expect(chords[1]).toEqual({ handle: 'C:min', beatIndex: 2 })
    })

    it('returns empty array for HTML without chord data', () => {
      const html = '<div>No chords here</div>'
      const $ = cheerio.load(html)
      const chords = parseRawChords($)

      expect(chords).toHaveLength(0)
    })

    it('parses extended chord types correctly', () => {
      const html = `
        <div class="chords">
          <div data-handle="G:maj7" data-i="0"></div>
          <div data-handle="A:min7" data-i="1"></div>
          <div data-handle="D:7" data-i="2"></div>
          <div data-handle="B:dim" data-i="3"></div>
          <div data-handle="C:aug" data-i="4"></div>
          <div data-handle="F:sus4" data-i="5"></div>
        </div>
      `
      const $ = cheerio.load(html)
      const chords = parseRawChords($)

      expect(chords).toHaveLength(6)
      expect(chords.map((c) => c.handle)).toEqual([
        'G:maj7',
        'A:min7',
        'D:7',
        'B:dim',
        'C:aug',
        'F:sus4',
      ])
    })
  })

  describe('parseChordHandle()', () => {
    it('converts "G:min" to {root: "G", quality: "minor"}', () => {
      const result = parseChordHandle('G:min')
      expect(result).toEqual({ root: 'G', quality: 'minor' })
    })

    it('converts "D:maj" to {root: "D", quality: "major"}', () => {
      const result = parseChordHandle('D:maj')
      expect(result).toEqual({ root: 'D', quality: 'major' })
    })

    it('converts "A:7" to {root: "A", quality: "7"}', () => {
      const result = parseChordHandle('A:7')
      expect(result).toEqual({ root: 'A', quality: '7' })
    })

    it('converts "Bb:maj7" to {root: "Bb", quality: "maj7"}', () => {
      const result = parseChordHandle('Bb:maj7')
      expect(result).toEqual({ root: 'Bb', quality: 'maj7' })
    })

    it('converts "F#:min7" to {root: "F#", quality: "min7"}', () => {
      const result = parseChordHandle('F#:min7')
      expect(result).toEqual({ root: 'F#', quality: 'min7' })
    })

    it('returns null for "N" (no chord)', () => {
      const result = parseChordHandle('N')
      expect(result).toBeNull()
    })

    it('handles chord without quality (assumes major)', () => {
      const result = parseChordHandle('E')
      expect(result).toEqual({ root: 'E', quality: 'major' })
    })

    // Extended chord types
    it('converts "C:dim" to {root: "C", quality: "dim"}', () => {
      const result = parseChordHandle('C:dim')
      expect(result).toEqual({ root: 'C', quality: 'dim' })
    })

    it('converts "G:aug" to {root: "G", quality: "aug"}', () => {
      const result = parseChordHandle('G:aug')
      expect(result).toEqual({ root: 'G', quality: 'aug' })
    })

    it('converts "D:sus4" to {root: "D", quality: "sus4"}', () => {
      const result = parseChordHandle('D:sus4')
      expect(result).toEqual({ root: 'D', quality: 'sus4' })
    })

    it('converts "A:sus2" to {root: "A", quality: "sus2"}', () => {
      const result = parseChordHandle('A:sus2')
      expect(result).toEqual({ root: 'A', quality: 'sus2' })
    })

    it('converts "G:add9" to {root: "G", quality: "add9"}', () => {
      const result = parseChordHandle('G:add9')
      expect(result).toEqual({ root: 'G', quality: 'add9' })
    })

    it('converts "C:9" to {root: "C", quality: "9"}', () => {
      const result = parseChordHandle('C:9')
      expect(result).toEqual({ root: 'C', quality: '9' })
    })

    it('converts "F:11" to {root: "F", quality: "11"}', () => {
      const result = parseChordHandle('F:11')
      expect(result).toEqual({ root: 'F', quality: '11' })
    })

    it('converts "D:13" to {root: "D", quality: "13"}', () => {
      const result = parseChordHandle('D:13')
      expect(result).toEqual({ root: 'D', quality: '13' })
    })

    it('converts "A:6" to {root: "A", quality: "6"}', () => {
      const result = parseChordHandle('A:6')
      expect(result).toEqual({ root: 'A', quality: '6' })
    })

    it('converts "E:min6" to {root: "E", quality: "min6"}', () => {
      const result = parseChordHandle('E:min6')
      expect(result).toEqual({ root: 'E', quality: 'min6' })
    })

    it('converts "B:dim7" to {root: "B", quality: "dim7"}', () => {
      const result = parseChordHandle('B:dim7')
      expect(result).toEqual({ root: 'B', quality: 'dim7' })
    })

    it('converts "F:hdim7" to {root: "F", quality: "m7b5"} (half-diminished)', () => {
      const result = parseChordHandle('F:hdim7')
      expect(result).toEqual({ root: 'F', quality: 'm7b5' })
    })

    it('converts "G:7sus4" to {root: "G", quality: "7sus4"}', () => {
      const result = parseChordHandle('G:7sus4')
      expect(result).toEqual({ root: 'G', quality: '7sus4' })
    })

    it('handles flat roots correctly', () => {
      expect(parseChordHandle('Eb:maj7')).toEqual({
        root: 'Eb',
        quality: 'maj7',
      })
      expect(parseChordHandle('Ab:min')).toEqual({
        root: 'Ab',
        quality: 'minor',
      })
      expect(parseChordHandle('Db:7')).toEqual({ root: 'Db', quality: '7' })
    })

    it('handles sharp roots correctly', () => {
      expect(parseChordHandle('C#:maj')).toEqual({
        root: 'C#',
        quality: 'major',
      })
      expect(parseChordHandle('G#:min7')).toEqual({
        root: 'G#',
        quality: 'min7',
      })
    })

    it('passes through unknown qualities', () => {
      const result = parseChordHandle('C:unknown')
      expect(result).toEqual({ root: 'C', quality: 'unknown' })
    })
  })

  describe('collapseChords()', () => {
    it('removes consecutive duplicate chords', () => {
      const rawChords: RawChord[] = [
        { handle: 'G:maj', beatIndex: 0 },
        { handle: 'G:maj', beatIndex: 1 },
        { handle: 'G:maj', beatIndex: 2 },
        { handle: 'C:min', beatIndex: 3 },
        { handle: 'C:min', beatIndex: 4 },
      ]
      const bpm = 120

      const result = collapseChords(rawChords, bpm)

      expect(result).toHaveLength(2)
      expect(result[0].chord).toEqual({ root: 'G', quality: 'major' })
      expect(result[1].chord).toEqual({ root: 'C', quality: 'minor' })
    })

    it('preserves non-consecutive identical chords', () => {
      const rawChords: RawChord[] = [
        { handle: 'G:maj', beatIndex: 0 },
        { handle: 'C:maj', beatIndex: 1 },
        { handle: 'G:maj', beatIndex: 2 }, // Same as first, but not consecutive
        { handle: 'D:maj', beatIndex: 3 },
      ]
      const bpm = 120

      const result = collapseChords(rawChords, bpm)

      expect(result).toHaveLength(4)
      expect(result[0].chord.root).toBe('G')
      expect(result[1].chord.root).toBe('C')
      expect(result[2].chord.root).toBe('G')
      expect(result[3].chord.root).toBe('D')
    })

    it('skips "N" (no chord) entries', () => {
      const rawChords: RawChord[] = [
        { handle: 'N', beatIndex: 0 },
        { handle: 'N', beatIndex: 1 },
        { handle: 'G:maj', beatIndex: 2 },
        { handle: 'N', beatIndex: 3 },
        { handle: 'C:min', beatIndex: 4 },
      ]
      const bpm = 120

      const result = collapseChords(rawChords, bpm)

      expect(result).toHaveLength(2)
      expect(result[0].chord).toEqual({ root: 'G', quality: 'major' })
      expect(result[1].chord).toEqual({ root: 'C', quality: 'minor' })
    })

    it('calculates correct timestamps based on BPM', () => {
      const rawChords: RawChord[] = [
        { handle: 'G:maj', beatIndex: 0 },
        { handle: 'C:maj', beatIndex: 4 },
        { handle: 'D:maj', beatIndex: 8 },
      ]
      const bpm = 120 // 0.5 seconds per beat

      const result = collapseChords(rawChords, bpm)

      expect(result[0].time).toBe(0) // 0 * 0.5 = 0
      expect(result[1].time).toBe(2) // 4 * 0.5 = 2
      expect(result[2].time).toBe(4) // 8 * 0.5 = 4
    })

    it('returns empty array for zero BPM', () => {
      const rawChords: RawChord[] = [{ handle: 'G:maj', beatIndex: 0 }]

      const result = collapseChords(rawChords, 0)

      expect(result).toHaveLength(0)
    })

    it('returns empty array for negative BPM', () => {
      const rawChords: RawChord[] = [{ handle: 'G:maj', beatIndex: 0 }]

      const result = collapseChords(rawChords, -120)

      expect(result).toHaveLength(0)
    })

    it('handles complex chord progression with duplicates and N entries', () => {
      const rawChords: RawChord[] = [
        { handle: 'N', beatIndex: 0 },
        { handle: 'N', beatIndex: 1 },
        { handle: 'Eb:maj', beatIndex: 2 },
        { handle: 'Eb:maj7', beatIndex: 3 }, // Different from Eb:maj!
        { handle: 'Eb:maj7', beatIndex: 4 },
        { handle: 'A:7', beatIndex: 5 },
        { handle: 'A:7', beatIndex: 6 },
        { handle: 'D:7', beatIndex: 7 },
        { handle: 'N', beatIndex: 8 }, // Silence in middle
        { handle: 'G:min7', beatIndex: 9 },
      ]
      const bpm = 120

      const result = collapseChords(rawChords, bpm)

      expect(result).toHaveLength(5)
      expect(result.map((c) => c.chord.root)).toEqual([
        'Eb',
        'Eb',
        'A',
        'D',
        'G',
      ])
      expect(result.map((c) => c.chord.quality)).toEqual([
        'major',
        'maj7',
        '7',
        '7',
        'min7',
      ])
    })
  })
})

// ============================================================================
// Integration Tests with Real HTML Structure
// ============================================================================

describe('Integration Tests', () => {
  describe('transformChordifyHtml()', () => {
    it('transforms complete HTML into ChordifyImportResult', () => {
      const html = `
        <dl>
          <dt>bpm</dt><dd>120</dd>
          <dt>key</dt><dd>Gₘ</dd>
          <dt>artist</dt><dd><a href="/test">Test Artist</a></dd>
          <dt>title</dt><dd>Test Song</dd>
        </dl>
        <div id="chords" class="chords barlength-4">
          <div data-handle="N" data-i="0"></div>
          <div data-handle="N" data-i="1"></div>
          <div data-handle="G:min" data-i="2"></div>
          <div data-handle="G:min" data-i="3"></div>
          <div data-handle="C:maj" data-i="4"></div>
          <div data-handle="D:7" data-i="5"></div>
          <div data-handle="D:7" data-i="6"></div>
        </div>
      `

      const result = transformChordifyHtml(html, 'test-video-123')

      expect(result.videoId).toBe('test-video-123')
      expect(result.source).toBe('chordify')
      expect(result.metadata.bpm).toBe(120)
      expect(result.metadata.key).toEqual({ root: 'G', quality: 'minor' })
      expect(result.metadata.artist).toBe('Test Artist')
      expect(result.metadata.title).toBe('Test Song')
      expect(result.metadata.timeSignature).toEqual({ beatsPerBar: 4 })
      expect(result.metadata.firstBeatOffset).toBe(1) // 2 N's at 120 BPM = 1 second
      expect(result.rawChordCount).toBe(7)

      // Check collapsed chords
      expect(result.chords).toHaveLength(3)
      expect(result.chords[0]).toEqual({
        time: 1, // beatIndex 2 * (60/120) = 1
        chord: { root: 'G', quality: 'minor' },
      })
      expect(result.chords[1]).toEqual({
        time: 2, // beatIndex 4 * (60/120) = 2
        chord: { root: 'C', quality: 'major' },
      })
      expect(result.chords[2]).toEqual({
        time: 2.5, // beatIndex 5 * (60/120) = 2.5
        chord: { root: 'D', quality: '7' },
      })
    })

    it('provides fallback values for missing metadata', () => {
      const html = `
        <div id="chords" class="chords">
          <div data-handle="G:maj" data-i="0"></div>
        </div>
      `

      const result = transformChordifyHtml(html, 'test-video')

      expect(result.metadata.title).toBe('Unknown Title')
      expect(result.metadata.artist).toBe('Unknown Artist')
      expect(result.metadata.bpm).toBe(120) // fallback BPM
      expect(result.metadata.key).toBeNull()
      expect(result.metadata.timeSignature).toEqual({ beatsPerBar: 4 })
      expect(result.metadata.duration).toBe(0)
      expect(result.metadata.firstBeatOffset).toBe(0)
    })
  })

  describe('toSongMetadataFormat()', () => {
    it('converts ChordifyImportResult to songs-metadata.json format', () => {
      const importResult = {
        videoId: 'test-123',
        source: 'chordify' as const,
        metadata: {
          title: 'Test Song',
          artist: 'Test Artist',
          bpm: 120,
          key: { root: 'G', quality: 'minor' },
          timeSignature: { beatsPerBar: 4 },
          duration: 240,
          firstBeatOffset: 2.5,
        },
        chords: [
          { time: 2.5, chord: { root: 'G', quality: 'minor' } },
          { time: 5.0, chord: { root: 'C', quality: 'major' } },
        ],
        rawChordCount: 100,
      }

      const result = toSongMetadataFormat(importResult)

      expect(result.chords).toEqual(importResult.chords)
      expect(result.tempo).toEqual({
        bpm: 120,
        firstBeatOffset: 2.5,
        beatsPerBar: 4,
      })
      expect(result.key).toEqual({ root: 'G', quality: 'minor' })
      expect(result.chordifyMetadata.title).toBe('Test Song')
      expect(result.chordifyMetadata.artist).toBe('Test Artist')
      expect(result.chordifyMetadata.duration).toBe(240)
      expect(result.chordifyMetadata.importedAt).toBeDefined()
      expect(
        new Date(result.chordifyMetadata.importedAt).getTime(),
      ).not.toBeNaN()
    })
  })

  describe('Real HTML Sample (Spell)', () => {
    // This test uses the real spell-html.txt if it exists
    it('parses sample HTML with correct structure', () => {
      // Simulating data from the spell HTML based on our grep analysis:
      // - BPM: 81
      // - Time signature: 3 beats per bar (barlength-3)
      // - 11 "N" entries before first chord at index 11 (Eb:maj)
      // - 510 total chord entries

      const html = `
        <dl>
          <dt>bpm</dt><dd>81</dd>
        </dl>
        <div id="chords" class="chords barlength-3">
          <div data-handle="N" data-i="0"></div>
          <div data-handle="N" data-i="1"></div>
          <div data-handle="N" data-i="2"></div>
          <div data-handle="N" data-i="3"></div>
          <div data-handle="N" data-i="4"></div>
          <div data-handle="N" data-i="5"></div>
          <div data-handle="N" data-i="6"></div>
          <div data-handle="N" data-i="7"></div>
          <div data-handle="N" data-i="8"></div>
          <div data-handle="N" data-i="9"></div>
          <div data-handle="N" data-i="10"></div>
          <div data-handle="Eb:maj" data-i="11"></div>
          <div data-handle="Eb:maj7" data-i="12"></div>
          <div data-handle="Eb:maj7" data-i="13"></div>
          <div data-handle="Eb:maj7" data-i="14"></div>
          <div data-handle="A:7" data-i="15"></div>
          <div data-handle="A:7" data-i="16"></div>
          <div data-handle="A:7" data-i="17"></div>
          <div data-handle="D:7" data-i="18"></div>
          <div data-handle="D:7" data-i="19"></div>
          <div data-handle="D:7" data-i="20"></div>
          <div data-handle="G:min7" data-i="21"></div>
          <div data-handle="G:min7" data-i="22"></div>
          <div data-handle="F:min7" data-i="23"></div>
          <div data-handle="Bb:7" data-i="24"></div>
        </div>
      `

      const result = transformChordifyHtml(html, 'spell-video')

      // Verify BPM extraction
      expect(result.metadata.bpm).toBe(81)

      // Verify time signature (waltz-like 3/4 time)
      expect(result.metadata.timeSignature).toEqual({ beatsPerBar: 3 })

      // Verify first beat offset calculation
      // 11 "N" entries at 81 BPM = 11 * (60/81) seconds
      const expectedOffset = 11 * (60 / 81)
      expect(result.metadata.firstBeatOffset).toBeCloseTo(expectedOffset, 5)

      // Verify chord collapsing
      const chordRoots = result.chords.map((c) => c.chord.root)
      expect(chordRoots).toEqual([
        'Eb', // index 11
        'Eb', // index 12 (maj7 - different quality!)
        'A', // index 15
        'D', // index 18
        'G', // index 21
        'F', // index 23
        'Bb', // index 24
      ])

      // Verify qualities
      const qualities = result.chords.map((c) => c.chord.quality)
      expect(qualities).toEqual([
        'major', // Eb:maj
        'maj7', // Eb:maj7
        '7', // A:7
        '7', // D:7
        'min7', // G:min7
        'min7', // F:min7
        '7', // Bb:7
      ])
    })
  })
})
