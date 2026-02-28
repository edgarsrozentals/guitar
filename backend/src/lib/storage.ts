import { getSupabaseAdmin } from './supabase'

// Storage bucket name
export const USER_SONGS_BUCKET = 'user-songs'

/**
 * Storage path helpers for consistent file organization.
 *
 * Structure:
 * user-songs/
 * ├── {user_id}/
 * │   ├── audio/
 * │   │   └── {video_id}.mp3
 * │   ├── stems/
 * │   │   └── {video_id}/
 * │   │       ├── vocals.mp3
 * │   │       ├── backing.mp3
 * │   │       ├── drums.mp3
 * │   │       ├── bass.mp3
 * │   │       └── other.mp3
 * │   └── lyrics/
 * │       └── {video_id}.lrc
 */

export type StemType =
  | 'vocals'
  | 'backing'
  | 'drums'
  | 'bass'
  | 'guitar'
  | 'piano'
  | 'other'

export const getStoragePaths = (userId: string, videoId: string) => ({
  audio: `${userId}/audio/${videoId}.mp3`,
  stems: {
    vocals: `${userId}/stems/${videoId}/vocals.mp3`,
    backing: `${userId}/stems/${videoId}/backing.mp3`,
    drums: `${userId}/stems/${videoId}/drums.mp3`,
    bass: `${userId}/stems/${videoId}/bass.mp3`,
    guitar: `${userId}/stems/${videoId}/guitar.mp3`,
    piano: `${userId}/stems/${videoId}/piano.mp3`,
    other: `${userId}/stems/${videoId}/other.mp3`,
  } as Record<StemType, string>,
  lyrics: `${userId}/lyrics/${videoId}.lrc`,
})

export const getAudioPath = (userId: string, videoId: string): string =>
  `${userId}/audio/${videoId}.mp3`

export const getStemPath = (
  userId: string,
  videoId: string,
  stemType: StemType,
): string => `${userId}/stems/${videoId}/${stemType}.mp3`

export const getLyricsPath = (userId: string, videoId: string): string =>
  `${userId}/lyrics/${videoId}.lrc`

/**
 * Generate a signed URL for secure file access.
 *
 * @param userId - The user ID who owns the file
 * @param storagePath - Full storage path (e.g., "user-id/audio/video-id.mp3")
 * @param expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns Signed URL string
 * @throws Error if path doesn't belong to user or generation fails
 */
export const generateSignedUrl = async (
  userId: string,
  storagePath: string,
  expiresIn: number = 3600,
): Promise<string> => {
  const supabase = getSupabaseAdmin()

  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  // Validate user owns the file
  if (!storagePath.startsWith(`${userId}/`)) {
    throw new Error('Access denied to requested resource')
  }

  const { data, error } = await supabase.storage
    .from(USER_SONGS_BUCKET)
    .createSignedUrl(storagePath, expiresIn)

  if (error) {
    console.error('Signed URL generation failed:', error)
    throw new Error('Failed to generate file access URL')
  }

  return data.signedUrl
}

/**
 * Generate signed URLs for multiple files efficiently.
 *
 * @param userId - The user ID who owns the files
 * @param paths - Array of storage paths
 * @returns Object mapping paths to signed URLs (empty string if failed)
 */
export const generateSignedUrls = async (
  userId: string,
  paths: string[],
): Promise<Record<string, string>> => {
  const urls: Record<string, string> = {}

  await Promise.all(
    paths.map(async (path) => {
      try {
        urls[path] = await generateSignedUrl(userId, path)
      } catch (error) {
        console.error(`Failed to generate URL for ${path}:`, error)
        urls[path] = ''
      }
    }),
  )

  return urls
}

/**
 * Upload a file to Supabase Storage.
 *
 * @param storagePath - Full storage path
 * @param file - File buffer or Blob
 * @param contentType - MIME type of the file
 * @returns Upload result with path
 */
export const uploadFile = async (
  storagePath: string,
  file: Buffer | Blob,
  contentType: string = 'audio/mpeg',
): Promise<{ path: string }> => {
  const supabase = getSupabaseAdmin()

  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  const { data, error } = await supabase.storage
    .from(USER_SONGS_BUCKET)
    .upload(storagePath, file, {
      contentType,
      upsert: true, // Overwrite if exists
    })

  if (error) {
    console.error('File upload failed:', error)
    throw new Error(`Failed to upload file: ${error.message}`)
  }

  return { path: data.path }
}

/**
 * Delete a file from Supabase Storage.
 *
 * @param storagePath - Full storage path
 */
export const deleteFile = async (storagePath: string): Promise<void> => {
  const supabase = getSupabaseAdmin()

  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  const { error } = await supabase.storage
    .from(USER_SONGS_BUCKET)
    .remove([storagePath])

  if (error) {
    console.error('File deletion failed:', error)
    throw new Error(`Failed to delete file: ${error.message}`)
  }
}

/**
 * Delete multiple files from Supabase Storage.
 *
 * @param storagePaths - Array of storage paths
 */
export const deleteFiles = async (storagePaths: string[]): Promise<void> => {
  const supabase = getSupabaseAdmin()

  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  const { error } = await supabase.storage
    .from(USER_SONGS_BUCKET)
    .remove(storagePaths)

  if (error) {
    console.error('Files deletion failed:', error)
    throw new Error(`Failed to delete files: ${error.message}`)
  }
}

/**
 * List files in a directory.
 *
 * @param prefix - Directory prefix (e.g., "user-id/stems/video-id")
 * @returns Array of file metadata
 */
export const listFiles = async (
  prefix: string,
): Promise<Array<{ name: string; id: string; created_at: string }>> => {
  const supabase = getSupabaseAdmin()

  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  const { data, error } = await supabase.storage
    .from(USER_SONGS_BUCKET)
    .list(prefix)

  if (error) {
    console.error('List files failed:', error)
    throw new Error(`Failed to list files: ${error.message}`)
  }

  return data || []
}

/**
 * Download a file from Supabase Storage.
 *
 * @param storagePath - Full storage path
 * @returns File as Blob
 */
export const downloadFile = async (storagePath: string): Promise<Blob> => {
  const supabase = getSupabaseAdmin()

  if (!supabase) {
    throw new Error('Supabase not configured')
  }

  const { data, error } = await supabase.storage
    .from(USER_SONGS_BUCKET)
    .download(storagePath)

  if (error) {
    console.error('File download failed:', error)
    throw new Error(`Failed to download file: ${error.message}`)
  }

  return data
}
