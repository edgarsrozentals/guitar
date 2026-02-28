/**
 * Test script for Chordify import endpoint
 *
 * Usage: npx tsx src/test-chordify-import.ts
 */

import * as fs from 'fs'

async function testImport() {
  const videoId = 'YaMH_s7I7Mo'
  const htmlPath = '/tmp/spell-html.txt'

  // Check if HTML file exists
  if (!fs.existsSync(htmlPath)) {
    console.error(`HTML file not found: ${htmlPath}`)
    console.log('Please run the Hyperbrowser scrape first to get the HTML')
    process.exit(1)
  }

  const html = fs.readFileSync(htmlPath, 'utf-8')
  console.log(`Read HTML file: ${html.length} characters`)

  // Test the endpoint
  const response = await fetch(
    `http://localhost:4568/api/songs/${videoId}/import-chordify`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html }),
    },
  )

  const result = await response.json()
  console.log('Response status:', response.status)
  console.log('Result:', JSON.stringify(result, null, 2))
}

testImport().catch(console.error)
