import { getDb } from '../db'

import { decryptSecret, encryptSecret } from './auth'

export type ApiKeyService = 'lalal_ai' | 'assemblyai'

export async function getUserApiKey(
  userId: string,
  service: ApiKeyService,
): Promise<string | null> {
  const row = await getDb()
    .selectFrom('app_user_api_keys')
    .select('api_key_encrypted')
    .where('user_id', '=', userId)
    .where('service', '=', service)
    .executeTakeFirst()

  if (!row) return null
  return decryptSecret(row.api_key_encrypted)
}

export async function setUserApiKey(
  userId: string,
  service: ApiKeyService,
  apiKey: string,
): Promise<void> {
  const encrypted = encryptSecret(apiKey)
  await getDb()
    .insertInto('app_user_api_keys')
    .values({
      user_id: userId,
      service,
      api_key_encrypted: encrypted,
    })
    .onConflict((oc) =>
      oc.columns(['user_id', 'service']).doUpdateSet({
        api_key_encrypted: encrypted,
        updated_at: new Date(),
      }),
    )
    .execute()
}

export async function deleteUserApiKey(
  userId: string,
  service: ApiKeyService,
): Promise<void> {
  await getDb()
    .deleteFrom('app_user_api_keys')
    .where('user_id', '=', userId)
    .where('service', '=', service)
    .execute()
}

export async function listUserApiKeyServices(
  userId: string,
): Promise<{ service: string; last4: string; updatedAt: Date }[]> {
  const rows = await getDb()
    .selectFrom('app_user_api_keys')
    .select(['service', 'api_key_encrypted', 'updated_at'])
    .where('user_id', '=', userId)
    .execute()

  return rows.map((r) => {
    const decrypted = decryptSecret(r.api_key_encrypted) || ''
    const last4 = decrypted.length >= 4 ? decrypted.slice(-4) : decrypted
    return { service: r.service, last4, updatedAt: r.updated_at }
  })
}
