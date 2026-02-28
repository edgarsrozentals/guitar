/**
 * Supabase Storage Setup Script
 *
 * This script sets up the storage buckets and configurations for the Guitar App.
 * Run with: npx tsx supabase/setup-storage.ts
 *
 * Epic: Cloud Song Storage (P0)
 * Story: 1.2 Storage Bucket Setup
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js'

// ============================================
// CONFIGURATION
// ============================================

const BUCKET_NAME = 'user-songs'

const BUCKET_CONFIG = {
  public: false,
  fileSizeLimit: 100 * 1024 * 1024, // 100MB
  allowedMimeTypes: [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/x-wav',
    'application/octet-stream',
  ],
}

// ============================================
// STORAGE PATH HELPERS
// ============================================

/**
 * Generates the storage path for a song's main audio file.
 * Path format: {userId}/{videoId}/audio.mp3
 */
export function getAudioPath(userId: string, videoId: string): string {
  return `${userId}/${videoId}/audio.mp3`
}

/**
 * Generates the storage path for a stem file.
 * Path format: {userId}/{videoId}/stems/{stemType}.mp3
 *
 * @param stemType - One of: vocals, backing, drums, bass, guitar, piano, other
 */
export function getStemPath(
  userId: string,
  videoId: string,
  stemType: string,
): string {
  return `${userId}/${videoId}/stems/${stemType}.mp3`
}

/**
 * Generates the storage path for a lyrics file.
 * Path format: {userId}/{videoId}/lyrics.lrc
 */
export function getLyricsPath(userId: string, videoId: string): string {
  return `${userId}/${videoId}/lyrics.lrc`
}

/**
 * Parses a storage path to extract userId and videoId.
 * Returns null if the path format is invalid.
 */
export function parseStoragePath(
  path: string,
): { userId: string; videoId: string } | null {
  const parts = path.split('/')
  if (parts.length < 2) {
    return null
  }
  return {
    userId: parts[0],
    videoId: parts[1],
  }
}

/**
 * Validates that a storage path belongs to the given user.
 */
export function validateUserOwnership(path: string, userId: string): boolean {
  const parsed = parseStoragePath(path)
  return parsed !== null && parsed.userId === userId
}

// ============================================
// BUCKET SETUP
// ============================================

type SetupStorageInput = {
  supabaseUrl: string
  supabaseServiceRoleKey: string
}

type SetupResult = {
  success: boolean
  message: string
  bucket?: {
    name: string
    public: boolean
    fileSizeLimit: number
    allowedMimeTypes: string[]
  }
  error?: string
}

/**
 * Creates or updates the user-songs storage bucket with the required configuration.
 */
async function setupStorageBucket(
  supabase: SupabaseClient,
): Promise<SetupResult> {
  console.log(`\nSetting up storage bucket: ${BUCKET_NAME}`)
  console.log('Configuration:')
  console.log(`  - Public: ${BUCKET_CONFIG.public}`)
  console.log(
    `  - Max file size: ${BUCKET_CONFIG.fileSizeLimit / 1024 / 1024}MB`,
  )
  console.log(
    `  - Allowed MIME types: ${BUCKET_CONFIG.allowedMimeTypes.join(', ')}`,
  )

  // Check if bucket already exists
  const { data: existingBuckets, error: listError } =
    await supabase.storage.listBuckets()

  if (listError) {
    return {
      success: false,
      message: 'Failed to list buckets',
      error: listError.message,
    }
  }

  const bucketExists = existingBuckets?.some((b) => b.name === BUCKET_NAME)

  if (bucketExists) {
    console.log(
      `\nBucket '${BUCKET_NAME}' already exists. Updating configuration...`,
    )

    // Update existing bucket
    const { error: updateError } = await supabase.storage.updateBucket(
      BUCKET_NAME,
      {
        public: BUCKET_CONFIG.public,
        fileSizeLimit: BUCKET_CONFIG.fileSizeLimit,
        allowedMimeTypes: BUCKET_CONFIG.allowedMimeTypes,
      },
    )

    if (updateError) {
      return {
        success: false,
        message: 'Failed to update bucket',
        error: updateError.message,
      }
    }

    return {
      success: true,
      message: `Bucket '${BUCKET_NAME}' updated successfully`,
      bucket: {
        name: BUCKET_NAME,
        ...BUCKET_CONFIG,
      },
    }
  }

  // Create new bucket
  console.log(`\nCreating new bucket '${BUCKET_NAME}'...`)

  const { error: createError } = await supabase.storage.createBucket(
    BUCKET_NAME,
    {
      public: BUCKET_CONFIG.public,
      fileSizeLimit: BUCKET_CONFIG.fileSizeLimit,
      allowedMimeTypes: BUCKET_CONFIG.allowedMimeTypes,
    },
  )

  if (createError) {
    return {
      success: false,
      message: 'Failed to create bucket',
      error: createError.message,
    }
  }

  return {
    success: true,
    message: `Bucket '${BUCKET_NAME}' created successfully`,
    bucket: {
      name: BUCKET_NAME,
      ...BUCKET_CONFIG,
    },
  }
}

/**
 * Verifies the bucket configuration after setup.
 */
async function verifyBucketSetup(
  supabase: SupabaseClient,
): Promise<{ verified: boolean; details?: Record<string, unknown> }> {
  const { data: bucket, error } = await supabase.storage.getBucket(BUCKET_NAME)

  if (error || !bucket) {
    return { verified: false }
  }

  return {
    verified: true,
    details: {
      id: bucket.id,
      name: bucket.name,
      public: bucket.public,
      fileSizeLimit: bucket.file_size_limit,
      allowedMimeTypes: bucket.allowed_mime_types,
      createdAt: bucket.created_at,
      updatedAt: bucket.updated_at,
    },
  }
}

// ============================================
// MAIN EXECUTION
// ============================================

async function main(): Promise<void> {
  console.log('='.repeat(60))
  console.log('Guitar App - Supabase Storage Setup')
  console.log('='.repeat(60))

  // Load environment variables
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    console.error('\nError: SUPABASE_URL environment variable is not set')
    console.error('Please set it before running this script.')
    process.exit(1)
  }

  if (!supabaseServiceRoleKey) {
    console.error(
      '\nError: SUPABASE_SERVICE_ROLE_KEY environment variable is not set',
    )
    console.error('Please set it before running this script.')
    process.exit(1)
  }

  console.log(`\nConnecting to Supabase: ${supabaseUrl}`)

  // Create Supabase client with service role key (bypasses RLS)
  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  // Setup the storage bucket
  const result = await setupStorageBucket(supabase)

  if (!result.success) {
    console.error(`\nSetup failed: ${result.message}`)
    console.error(`Error: ${result.error}`)
    process.exit(1)
  }

  console.log(`\n${result.message}`)

  // Verify the setup
  console.log('\nVerifying bucket configuration...')
  const verification = await verifyBucketSetup(supabase)

  if (!verification.verified) {
    console.error('\nVerification failed: Could not retrieve bucket details')
    process.exit(1)
  }

  console.log('\nBucket details:')
  console.log(JSON.stringify(verification.details, null, 2))

  console.log('\n' + '='.repeat(60))
  console.log('Storage setup completed successfully!')
  console.log('='.repeat(60))

  console.log('\nNext steps:')
  console.log('1. Apply the storage RLS policies migration:')
  console.log('   supabase db push')
  console.log(
    '   or run: supabase/migrations/20260104000002_storage_policies.sql',
  )
  console.log('')
  console.log('2. Test file uploads with authenticated users')
  console.log('')
}

// Run if executed directly
main().catch((error) => {
  console.error('\nUnexpected error:', error)
  process.exit(1)
})

// ============================================
// EXPORTS FOR USE IN OTHER MODULES
// ============================================

export {
  BUCKET_NAME,
  BUCKET_CONFIG,
  setupStorageBucket,
  verifyBucketSetup,
  type SetupStorageInput,
  type SetupResult,
}
