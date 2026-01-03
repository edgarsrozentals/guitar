import { createBrowserClient } from '@supabase/ssr'

import type { Database } from './types'

let client: ReturnType<typeof createBrowserClient<Database>> | null = null
let warnedAboutMissingConfig = false

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export function getSupabaseBrowserClient() {
  if (client) {
    return client
  }

  // Check if Supabase is properly configured
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    if (!warnedAboutMissingConfig && typeof window !== 'undefined') {
      warnedAboutMissingConfig = true
      console.warn(
        'Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local',
      )
    }
    // Return a client with placeholder values - auth operations will fail gracefully
    client = createBrowserClient<Database>(
      'https://placeholder.supabase.co',
      'placeholder-anon-key',
    )
    return client
  }

  client = createBrowserClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
  return client
}

export function resetSupabaseClient() {
  client = null
}
