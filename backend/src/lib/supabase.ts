import { createClient, SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '../types/database'

// Supabase client for backend operations
// Uses service role key for admin operations (bypasses RLS)
// Note: env vars are read lazily (not at module load) because dotenv.config()
// in server.ts runs after imports are evaluated.

// Admin client with service role (bypasses RLS)
let adminClient: SupabaseClient<Database> | null = null

export function getSupabaseAdmin(): SupabaseClient<Database> | null {
  if (adminClient) {
    return adminClient
  }

  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    console.warn(
      'Supabase admin client not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    )
    return null
  }

  adminClient = createClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })

  return adminClient
}

// Anon client for user-scoped operations (respects RLS)
let anonClient: SupabaseClient<Database> | null = null

export function getSupabaseAnon(): SupabaseClient<Database> | null {
  if (anonClient) {
    return anonClient
  }

  const url = process.env.SUPABASE_URL
  const anonKey = process.env.SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    console.warn(
      'Supabase anon client not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.',
    )
    return null
  }

  anonClient = createClient<Database>(url, anonKey)
  return anonClient
}

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  const url = process.env.SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const anonKey = process.env.SUPABASE_ANON_KEY
  return !!(url && (serviceRoleKey || anonKey))
}

// Get the Supabase URL for client-side operations
export function getSupabaseUrl(): string | undefined {
  return SUPABASE_URL
}
