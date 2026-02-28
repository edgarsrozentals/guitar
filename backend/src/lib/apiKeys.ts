import { getSupabaseAdmin } from './supabase'

type ApiService = 'lalal_ai' | 'assemblyai'

type CacheEntry = {
  key: string
  fetchedAt: number
}

const CACHE_TTL_MS = 60_000 // 60 seconds
const cache = new Map<string, CacheEntry>()

function getCacheKey(userId: string, service: ApiService): string {
  return `${userId}:${service}`
}

/**
 * Fetch a user's API key for a given service from Supabase.
 * Results are cached in memory for 60 seconds.
 * Returns null if not found or Supabase is unavailable.
 */
export async function getUserApiKey(
  userId: string,
  service: ApiService,
): Promise<string | null> {
  const key = getCacheKey(userId, service)

  // Check cache first
  const cached = cache.get(key)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return cached.key
  }

  const supabase = getSupabaseAdmin()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('user_api_keys')
      .select('api_key')
      .eq('user_id', userId)
      .eq('service', service)
      .single()

    if (error || !data) return null

    const apiKey = (data as { api_key: string }).api_key

    // Cache the result
    cache.set(key, { key: apiKey, fetchedAt: Date.now() })

    return apiKey
  } catch {
    return null
  }
}

/**
 * Invalidate the cache for a specific user/service pair.
 */
export function invalidateApiKeyCache(
  userId: string,
  service: ApiService,
): void {
  cache.delete(getCacheKey(userId, service))
}
