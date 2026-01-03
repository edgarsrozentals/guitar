import { Text } from '@lib/ui/text'
import { useEffect, useState } from 'react'
import styled from 'styled-components'

import { getSupabaseBrowserClient } from '../../lib/supabase/client'

const Container = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 80vh;
  padding: 20px;
  gap: 16px;
`

export default function AuthCallbackPage() {
  const [status, setStatus] = useState('Completing sign in...')

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = getSupabaseBrowserClient()

      // Parse URL parameters
      const hashParams = new URLSearchParams(window.location.hash.substring(1))
      const queryParams = new URLSearchParams(window.location.search)
      const code = queryParams.get('code')
      const errorParam = queryParams.get('error') || hashParams.get('error')
      const errorDescription =
        queryParams.get('error_description') ||
        hashParams.get('error_description')

      // Check for OAuth errors
      if (errorParam) {
        setStatus(`Error: ${errorDescription || errorParam}`)
        setTimeout(() => {
          window.location.href = '/login?error=oauth'
        }, 3000)
        return
      }

      try {
        // Handle PKCE flow (code exchange)
        if (code) {
          const exchangePromise = supabase.auth.exchangeCodeForSession(code)
          const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Exchange timeout')), 10000),
          )

          try {
            const { data, error } = (await Promise.race([
              exchangePromise,
              timeoutPromise,
            ])) as Awaited<typeof exchangePromise>

            if (error) {
              setStatus('Authentication failed. Redirecting...')
              setTimeout(() => {
                window.location.href = '/login?error=exchange'
              }, 3000)
              return
            }

            if (data.session) {
              window.location.href = '/'
              return
            }
          } catch {
            setStatus('Authentication timed out. Please try again.')
            setTimeout(() => {
              window.location.href = '/login?error=timeout'
            }, 3000)
            return
          }
        }

        // Check for existing session
        const {
          data: { session },
        } = await supabase.auth.getSession()

        if (session) {
          window.location.href = '/'
          return
        }

        // No session - wait briefly for auth state change
        setStatus('Waiting for authentication...')

        let resolved = false
        const timeout = setTimeout(() => {
          if (!resolved) {
            window.location.href = '/login?error=timeout'
          }
        }, 5000)

        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
          if (session && !resolved) {
            resolved = true
            clearTimeout(timeout)
            subscription.unsubscribe()
            window.location.href = '/'
          }
        })
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        setStatus(`Error: ${errorMsg}`)
        setTimeout(() => {
          window.location.href = '/login?error=exception'
        }, 3000)
      }
    }

    handleCallback()
  }, [])

  return (
    <Container>
      <Text size={18}>{status}</Text>
    </Container>
  )
}
