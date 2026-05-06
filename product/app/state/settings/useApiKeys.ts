import { useCallback, useEffect, useState } from 'react'

import { useAuth } from '../auth/AuthProvider'

type ApiService = 'lalal_ai' | 'assemblyai'

type ApiKeyState = {
  hasKey: boolean
  last4: string
  updatedAt: string
}

type ApiKeyMap = Record<ApiService, ApiKeyState>

type UseApiKeysReturn = {
  apiKeys: ApiKeyMap
  loading: boolean
  saving: boolean
  saveApiKey: (
    service: ApiService,
    apiKey: string,
  ) => Promise<{ error?: string }>
  deleteApiKey: (service: ApiService) => Promise<{ error?: string }>
  refresh: () => Promise<void>
}

const EMPTY: ApiKeyMap = {
  lalal_ai: { hasKey: false, last4: '', updatedAt: '' },
  assemblyai: { hasKey: false, last4: '', updatedAt: '' },
}

export function useApiKeys(): UseApiKeysReturn {
  const { user } = useAuth()
  const [apiKeys, setApiKeys] = useState<ApiKeyMap>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const refresh = useCallback(async () => {
    if (!user) {
      setApiKeys(EMPTY)
      setLoading(false)
      return
    }
    try {
      const res = await fetch('/api/profile/api-keys', {
        credentials: 'include',
      })
      if (res.ok) {
        const data = (await res.json()) as { apiKeys: ApiKeyMap }
        setApiKeys({ ...EMPTY, ...data.apiKeys })
      }
    } catch (err) {
      console.error('Error loading API keys:', err)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    refresh()
  }, [refresh])

  const saveApiKey = useCallback(
    async (
      service: ApiService,
      apiKey: string,
    ): Promise<{ error?: string }> => {
      if (!user) return { error: 'Not authenticated' }
      if (!apiKey.trim()) return { error: 'API key cannot be empty' }
      setSaving(true)
      try {
        const res = await fetch(`/api/profile/api-keys/${service}`, {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: apiKey.trim() }),
        })
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string
          }
          return { error: data.error || 'Failed to save API key' }
        }
        await refresh()
        return {}
      } finally {
        setSaving(false)
      }
    },
    [user, refresh],
  )

  const deleteApiKey = useCallback(
    async (service: ApiService): Promise<{ error?: string }> => {
      if (!user) return { error: 'Not authenticated' }
      setSaving(true)
      try {
        const res = await fetch(`/api/profile/api-keys/${service}`, {
          method: 'DELETE',
          credentials: 'include',
        })
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string
          }
          return { error: data.error || 'Failed to delete API key' }
        }
        await refresh()
        return {}
      } finally {
        setSaving(false)
      }
    },
    [user, refresh],
  )

  return { apiKeys, loading, saving, saveApiKey, deleteApiKey, refresh }
}
