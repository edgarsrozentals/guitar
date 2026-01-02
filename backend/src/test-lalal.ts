import fs from 'fs'
import path from 'path'

import dotenv from 'dotenv'

import { createLalalAIClient } from './lalalai'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') })

const BACKEND_URL = 'http://localhost:4568'
const TEST_VIDEO_ID = '-hOrxcS6Ot0' // YouTube video ID from user

async function testFullFlow() {
  console.log('=== LALAL.ai Integration Test ===\n')

  // Check API key
  const apiKey = process.env.LALAL_API_KEY
  if (!apiKey) {
    console.error('ERROR: LALAL_API_KEY not set')
    process.exit(1)
  }
  console.log('✓ API Key configured:', apiKey.substring(0, 8) + '...')

  const client = createLalalAIClient(apiKey)

  // Step 1: Check account balance
  console.log('\n--- Step 1: Check Account Balance ---')
  try {
    const minutes = await client.getMinutesLeft()
    console.log('✓ Minutes remaining:', minutes)
    if (minutes <= 0) {
      console.error('ERROR: No minutes left in account')
      process.exit(1)
    }
  } catch (error) {
    console.error('✗ Failed to check balance:', error)
    process.exit(1)
  }

  // Step 2: Check if audio file exists (extract first if needed)
  console.log('\n--- Step 2: Check Audio File ---')
  const audioPath = path.join(__dirname, '..', 'audio', `${TEST_VIDEO_ID}.mp3`)

  if (!fs.existsSync(audioPath)) {
    console.log('Audio not found, extracting via backend...')
    try {
      const response = await fetch(`${BACKEND_URL}/api/songs/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: TEST_VIDEO_ID }),
      })
      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}`)
      }
      console.log('✓ Processing started, waiting for audio extraction...')

      // Poll for audio file
      for (let i = 0; i < 60; i++) {
        await delay(2000)
        if (fs.existsSync(audioPath)) {
          console.log('✓ Audio file extracted:', audioPath)
          break
        }
        process.stdout.write('.')
      }
      console.log()
    } catch (error) {
      console.error('✗ Failed to extract audio:', error)
      process.exit(1)
    }
  } else {
    console.log('✓ Audio file exists:', audioPath)
  }

  if (!fs.existsSync(audioPath)) {
    console.error('✗ Audio file still not found after extraction')
    process.exit(1)
  }

  const stats = fs.statSync(audioPath)
  console.log('  File size:', (stats.size / 1024 / 1024).toFixed(2), 'MB')

  // Step 3: Upload to LALAL.ai
  console.log('\n--- Step 3: Upload to LALAL.ai ---')
  let sourceId: string
  try {
    const uploadResult = await client.uploadFile(audioPath)
    sourceId = uploadResult.id
    console.log('✓ Uploaded successfully')
    console.log('  Source ID:', sourceId)
    console.log('  Duration:', uploadResult.duration, 'seconds')
    if (uploadResult.expire) {
      console.log('  Expires:', uploadResult.expire)
    }
  } catch (error) {
    console.error('✗ Upload failed:', error)
    process.exit(1)
  }

  // Step 4: Start stem separation
  console.log('\n--- Step 4: Start Stem Separation ---')
  const stems = ['vocals', 'drum', 'bass'] as const // Start with fewer stems for faster test
  let taskId: string
  try {
    taskId = await client.splitMultistem(sourceId, [...stems], {
      format: 'mp3',
    })
    console.log('✓ Separation started')
    console.log('  Task ID:', taskId)
  } catch (error) {
    console.error('✗ Split request failed:', error)
    process.exit(1)
  }

  // Step 5: Poll for completion
  console.log('\n--- Step 5: Wait for Completion ---')
  try {
    const results = await client.waitForCompletion(
      taskId,
      (progress) => {
        process.stdout.write(`\r  Progress: ${progress}%`)
      },
      3000, // Poll every 3 seconds
      300000, // 5 minute timeout
    )
    console.log('\n✓ Separation complete!')
    console.log('  Stems received:', results.length)
    for (const stem of results) {
      console.log(`    - ${stem.type}: ${stem.url.substring(0, 60)}...`)
    }
  } catch (error) {
    console.error('\n✗ Separation failed:', error)
    process.exit(1)
  }

  // Step 6: Cleanup
  console.log('\n--- Step 6: Cleanup ---')
  try {
    await client.deleteSource(sourceId)
    console.log('✓ Source deleted from LALAL.ai')
  } catch (error) {
    console.warn('⚠ Cleanup warning:', error)
  }

  console.log('\n=== All Tests Passed! ===\n')
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Run the test
testFullFlow().catch((error) => {
  console.error('Test failed with error:', error)
  process.exit(1)
})
