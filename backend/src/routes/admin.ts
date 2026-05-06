import { Router } from 'express'

import { getDb } from '../db'
import { hashPassword } from '../lib/auth'
import { requireAdmin } from '../middleware/auth'

const router = Router()

router.use(requireAdmin)

router.get('/users', async (_req, res) => {
  const users = await getDb()
    .selectFrom('app_users')
    .select(['id', 'email', 'is_admin', 'created_at', 'updated_at'])
    .orderBy('created_at', 'asc')
    .execute()

  res.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      isAdmin: u.is_admin,
      createdAt: u.created_at.toISOString(),
      updatedAt: u.updated_at.toISOString(),
    })),
  })
})

router.post('/users', async (req, res) => {
  const { email, password, isAdmin } = req.body || {}
  if (
    typeof email !== 'string' ||
    !email.includes('@') ||
    typeof password !== 'string' ||
    password.length < 8
  ) {
    return res.status(400).json({
      error: 'email (valid) and password (min 8 chars) are required',
    })
  }

  const existing = await getDb()
    .selectFrom('app_users')
    .select('id')
    .where('email', '=', email.toLowerCase())
    .executeTakeFirst()
  if (existing) {
    return res
      .status(409)
      .json({ error: 'User with this email already exists' })
  }

  const hash = await hashPassword(password)
  const row = await getDb()
    .insertInto('app_users')
    .values({
      email: email.toLowerCase(),
      password_hash: hash,
      is_admin: isAdmin === true,
    })
    .returning(['id', 'email', 'is_admin', 'created_at'])
    .executeTakeFirstOrThrow()

  res.status(201).json({
    user: {
      id: row.id,
      email: row.email,
      isAdmin: row.is_admin,
      createdAt: row.created_at.toISOString(),
    },
  })
})

router.delete('/users/:id', async (req, res) => {
  const target = req.params.id
  const me = req.user!
  if (target === me.id) {
    return res
      .status(400)
      .json({ error: 'You cannot delete your own admin account' })
  }
  const result = await getDb()
    .deleteFrom('app_users')
    .where('id', '=', target)
    .executeTakeFirst()
  if (Number(result.numDeletedRows) === 0) {
    return res.status(404).json({ error: 'User not found' })
  }
  res.json({ success: true })
})

router.put('/users/:id/password', async (req, res) => {
  const target = req.params.id
  const { newPassword } = req.body || {}
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return res.status(400).json({ error: 'newPassword (min 8 chars) required' })
  }
  const hash = await hashPassword(newPassword)
  const result = await getDb()
    .updateTable('app_users')
    .set({ password_hash: hash, updated_at: new Date() })
    .where('id', '=', target)
    .executeTakeFirst()
  if (Number(result.numUpdatedRows) === 0) {
    return res.status(404).json({ error: 'User not found' })
  }
  res.json({ success: true })
})

export default router
