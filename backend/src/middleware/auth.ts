import { Request, Response, NextFunction } from 'express'

import { getDb } from '../db'
import { AUTH_COOKIE_NAME, verifyAuthToken } from '../lib/auth'

import '../types/express'

async function loadUserFromRequest(
  req: Request,
): Promise<{ id: string; email: string; isAdmin: boolean } | null> {
  const token = req.cookies?.[AUTH_COOKIE_NAME]
  if (!token) return null

  const claims = await verifyAuthToken(token)
  if (!claims) return null

  const row = await getDb()
    .selectFrom('app_users')
    .select(['id', 'email', 'is_admin'])
    .where('id', '=', claims.sub)
    .executeTakeFirst()

  if (!row) return null
  return { id: row.id, email: row.email, isAdmin: row.is_admin }
}

export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  req.user = await loadUserFromRequest(req)
  next()
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const user = await loadUserFromRequest(req)
  if (!user) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }
  req.user = user
  next()
}

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const user = await loadUserFromRequest(req)
  if (!user) {
    res.status(401).json({ error: 'Authentication required' })
    return
  }
  if (!user.isAdmin) {
    res.status(403).json({ error: 'Admin access required' })
    return
  }
  req.user = user
  next()
}
