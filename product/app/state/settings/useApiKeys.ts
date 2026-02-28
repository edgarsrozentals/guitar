import { useCallback, useEffect, useState } from 'react'

import { getSupabaseBrowserClient } from '../../lib/supabase/client'
import { useAuth } from '../auth/AuthProvider'

type ApiService = 'lalal_ai' | 'assemblyai'

type ApiKeys = Record<ApiService, string>

type UseApiKeysReturn = {
  apiKeys: ApiKeys
  loading: boolean
  saving: boolean
  updateApiKey: (service: ApiService, key: string) => void
  saveApiKey: (service: ApiService) => Promise<{ error?: string }>
  deleteApiKey: (service: ApiService) => Promise<{ error?: string }>
}

const EMPTY_KEYS: ApiKeys = {
  lalal_ai: '',
  assemblyai: '',
}

export function useApiKeys(): UseApiKeysReturn {
  const { user } = useAuth()
  const [apiKeys, setApiKeys] = useState<ApiKeys>(EMPTY_KEYS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const supabase = getSupabaseBrowserClient()

  useEffect(() => {
    const loadKeys = async () => {
      if (!user) {
        setApiKeys(EMPTY_KEYS)
        setLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('user_api_keys')
          .select('service, api_key')
          .eq('user_id', user.id)

        if (error) {
          console.error('Error loading API keys:', error)
        } else if (data) {
          const keys = { ...EMPTY_KEYS }
          for (const row of data as Array<{
            service: ApiService
            api_key: string
          }>) {
            keys[row.service] = row.api_key
          }
          setApiKeys(keys)
        }
      } catch (err) {
        console.error('Error loading API keys:', err)
      } finally {
        setLoading(false)
      }
    }

    loadKeys()
  }, [user, supabase])

  const updateApiKey = useCallback((service: ApiService, key: string) => {
    setApiKeys((prev) => ({ ...prev, [service]: key }))
  }, [])

  const saveApiKey = useCallback(
    async (service: ApiService): Promise<{ error?: string }> => {
      if (!user) return { error: 'Not authenticated' }

      const key = apiKeys[service]
      if (!key.trim()) return { error: 'API key cannot be empty' }

      setSaving(true)
      try {
        const { error } = await supabase.from('user_api_keys').upsert(
          {
            user_id: user.id,
            service,
            api_key: key.trim(),
            updated_at: new Date().toISOString(),
          } as any,
          { onConflict: 'user_id,service' },
        )

        if (error) {
          console.error('Error saving API key:', error)
          return { error: error.message }
        }

        return {}
      } catch (err) {
        console.error('Error saving API key:', err)
        return { error: 'Failed to save API key' }
      } finally {
        setSaving(false)
      }
    },
    [user, supabase, apiKeys],
  )

  const deleteApiKey = useCallback(
    async (service: ApiService): Promise<{ error?: string }> => {
      if (!user) return { error: 'Not authenticated' }

      setSaving(true)
      try {
        const { error } = await supabase
          .from('user_api_keys')
          .delete()
          .eq('user_id', user.id)
          .eq('service', service)

        if (error) {
          console.error('Error deleting API key:', error)
          return { error: error.message }
        }

        setApiKeys((prev) => ({ ...prev, [service]: '' }))
        return {}
      } catch (err) {
        console.error('Error deleting API key:', err)
        return { error: 'Failed to delete API key' }
      } finally {
        setSaving(false)
      }
    },
    [user, supabase],
  )

  return {
    apiKeys,
    loading,
    saving,
    updateApiKey,
    saveApiKey,
    deleteApiKey,
  }
}
