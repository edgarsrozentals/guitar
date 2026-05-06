import { Kysely, PostgresDialect, Generated } from 'kysely'
import { Pool } from 'pg'

type AppUsersTable = {
  id: Generated<string>
  email: string
  password_hash: string
  is_admin: Generated<boolean>
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

type AppUserApiKeysTable = {
  user_id: string
  service: string
  api_key_encrypted: string
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export type Database = {
  app_users: AppUsersTable
  app_user_api_keys: AppUserApiKeysTable
}

let dbInstance: Kysely<Database> | null = null
let poolInstance: Pool | null = null

export function getPool(): Pool {
  if (!poolInstance) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) {
      throw new Error('DATABASE_URL is not set')
    }
    poolInstance = new Pool({ connectionString, max: 10 })
  }
  return poolInstance
}

export function getDb(): Kysely<Database> {
  if (!dbInstance) {
    dbInstance = new Kysely<Database>({
      dialect: new PostgresDialect({ pool: getPool() }),
    })
  }
  return dbInstance
}

export async function closeDb(): Promise<void> {
  if (dbInstance) {
    await dbInstance.destroy()
    dbInstance = null
    poolInstance = null
  }
}
