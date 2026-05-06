'use client'

import { useRouter } from 'next/router'
import { ReactNode, useEffect } from 'react'

import { useAuth } from './AuthProvider'

const PUBLIC_ROUTES = new Set(['/login'])

type AuthGateProps = {
  children: ReactNode
}

export const AuthGate = ({ children }: AuthGateProps) => {
  const router = useRouter()
  const { user, loading } = useAuth()

  const isPublic = PUBLIC_ROUTES.has(router.pathname)

  useEffect(() => {
    if (loading) return
    if (!user && !isPublic) {
      router.replace(`/login?next=${encodeURIComponent(router.asPath)}`)
    }
    if (user && router.pathname === '/login') {
      const next =
        typeof router.query.next === 'string' ? router.query.next : '/'
      router.replace(next)
    }
  }, [loading, user, isPublic, router])

  if (loading && !isPublic) return null
  if (!user && !isPublic) return null
  return <>{children}</>
}
