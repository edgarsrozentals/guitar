import { getDb } from '../db'

import { generateRandomPassword, hashPassword } from './auth'

export async function bootstrapAdminIfEmpty(): Promise<void> {
  const db = getDb()

  const existing = await db
    .selectFrom('app_users')
    .select(db.fn.count<number>('id').as('count'))
    .executeTakeFirst()

  if (existing && Number(existing.count) > 0) return

  const email = process.env.ADMIN_EMAIL
  if (!email) {
    console.warn(
      '[bootstrap] No app_users found and ADMIN_EMAIL not set — skipping admin seed',
    )
    return
  }

  const providedPassword = process.env.ADMIN_PASSWORD
  const password = providedPassword || generateRandomPassword(20)
  const passwordHash = await hashPassword(password)

  await db
    .insertInto('app_users')
    .values({
      email: email.toLowerCase(),
      password_hash: passwordHash,
      is_admin: true,
    })
    .execute()

  console.log('====================================================')
  console.log('[bootstrap] Created initial admin user')
  console.log(`[bootstrap]   email:    ${email}`)
  if (!providedPassword) {
    console.log(`[bootstrap]   password: ${password}`)
    console.log('[bootstrap]   ^ SAVE THIS — it will not be shown again')
  } else {
    console.log('[bootstrap]   password: (from ADMIN_PASSWORD env)')
  }
  console.log('====================================================')
}
