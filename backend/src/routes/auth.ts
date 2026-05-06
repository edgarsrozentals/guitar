import { Response, Router } from 'express'

import { getDb } from '../db'
import {
  AUTH_COOKIE_NAME,
  AUTH_TOKEN_TTL_SECONDS,
  signAuthToken,
  verifyPassword,
} from '../lib/auth'
import { requireAuth } from '../middleware/auth'

const router = Router()

function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: AUTH_TOKEN_TTL_SECONDS * 1000,
  })
}

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {}
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'email and password are required' })
  }

  const user = await getDb()
    .selectFrom('app_users')
    .select(['id', 'email', 'password_hash', 'is_admin'])
    .where('email', '=', email.toLowerCase())
    .executeTakeFirst()

  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  const ok = await verifyPassword(password, user.password_hash)
  if (!ok) {
    return res.status(401).json({ error: 'Invalid email or password' })
  }

  const token = await signAuthToken({
    sub: user.id,
    email: user.email,
    isAdmin: user.is_admin,
  })
  setAuthCookie(res, token)
  return res.json({
    user: { id: user.id, email: user.email, isAdmin: user.is_admin },
  })
})

router.post('/logout', (_req, res) => {
  res.clearCookie(AUTH_COOKIE_NAME, { path: '/' })
  res.json({ success: true })
})

router.get('/me', requireAuth, (req, res) => {
  const user = req.user!
  res.json({
    user: { id: user.id, email: user.email, isAdmin: user.isAdmin },
  })
})

export default router
