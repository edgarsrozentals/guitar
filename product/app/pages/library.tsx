/**
 * Library Page
 *
 * User's personal song library with authentication guard.
 *
 * Epic: Cloud Song Storage (P0)
 * Story: 1.7 Frontend Integration
 */

import { useRouter } from 'next/router'
import { useEffect } from 'react'

import { PageContainer } from '../layout/PageContainer'
import { LibraryLoadingSkeleton } from '../library/components/LibraryLoadingSkeleton'
import { SongLibrary } from '../library/SongLibrary'
import { useAuth } from '../state/auth/AuthProvider'

export default function LibraryPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/login?redirect=${encodeURIComponent('/library')}`)
    }
  }, [user, authLoading, router])

  if (authLoading) {
    return (
      <PageContainer>
        <div style={{ padding: '24px' }}>
          <h1 style={{ marginBottom: '32px' }}>My Library</h1>
          <LibraryLoadingSkeleton count={6} />
        </div>
      </PageContainer>
    )
  }

  if (!user) {
    // Redirecting to login...
    return null
  }

  return (
    <PageContainer>
      <SongLibrary />
    </PageContainer>
  )
}
