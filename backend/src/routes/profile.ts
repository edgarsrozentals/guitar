import { Router } from 'express'

import { getDb } from '../db'
import {
  ApiKeyService,
  deleteUserApiKey,
  listUserApiKeyServices,
  setUserApiKey,
} from '../lib/apiKeys'
import { hashPassword, verifyPassword } from '../lib/auth'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.use(requireAuth)

const SUPPORTED_SERVICES: ApiKeyService[] = ['lalal_ai', 'assemblyai']

router.put('/password', async (req, res) => {
  const { currentPassword, newPassword } = req.body || {}
  if (
    typeof currentPassword !== 'string' ||
    typeof newPassword !== 'string' ||
    newPassword.length < 8
  ) {
    return res.status(400).json({
      error: 'currentPassword and newPassword (min 8 chars) are required',
    })
  }

  const user = req.user!
  const row = await getDb()
    .selectFrom('app_users')
    .select('password_hash')
    .where('id', '=', user.id)
    .executeTakeFirst()
  if (!row) return res.status(404).json({ error: 'User not found' })

  const ok = await verifyPassword(currentPassword, row.password_hash)
  if (!ok) return res.status(401).json({ error: 'Current password incorrect' })

  const hash = await hashPassword(newPassword)
  await getDb()
    .updateTable('app_users')
    .set({ password_hash: hash, updated_at: new Date() })
    .where('id', '=', user.id)
    .execute()

  res.json({ success: true })
})

router.get('/api-keys', async (req, res) => {
  const user = req.user!
  const keys = await listUserApiKeyServices(user.id)
  const byService: Record<
    string,
    { hasKey: boolean; last4: string; updatedAt: string }
  > = {}
  for (const service of SUPPORTED_SERVICES) {
    byService[service] = { hasKey: false, last4: '', updatedAt: '' }
  }
  for (const k of keys) {
    byService[k.service] = {
      hasKey: true,
      last4: k.last4,
      updatedAt: k.updatedAt.toISOString(),
    }
  }
  res.json({ apiKeys: byService })
})

router.put('/api-keys/:service', async (req, res) => {
  const service = req.params.service as ApiKeyService
  if (!SUPPORTED_SERVICES.includes(service)) {
    return res.status(400).json({
      error: `Unsupported service. Supported: ${SUPPORTED_SERVICES.join(', ')}`,
    })
  }
  const { apiKey } = req.body || {}
  if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
    return res
      .status(400)
      .json({ error: 'apiKey is required (string, non-empty)' })
  }
  await setUserApiKey(req.user!.id, service, apiKey.trim())
  res.json({ success: true })
})

router.delete('/api-keys/:service', async (req, res) => {
  const service = req.params.service as ApiKeyService
  if (!SUPPORTED_SERVICES.includes(service)) {
    return res.status(400).json({
      error: `Unsupported service. Supported: ${SUPPORTED_SERVICES.join(', ')}`,
    })
  }
  await deleteUserApiKey(req.user!.id, service)
  res.json({ success: true })
})

export default router
