import fs from 'fs'
import path from 'path'

import { getPool } from '../db'

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'migrations')

export async function runMigrations(): Promise<void> {
  const pool = getPool()

  await pool.query(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `)

  const { rows: appliedRows } = await pool.query<{ name: string }>(
    'SELECT name FROM _migrations',
  )
  const applied = new Set(appliedRows.map((r) => r.name))

  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  for (const file of files) {
    if (applied.has(file)) continue

    const sqlPath = path.join(MIGRATIONS_DIR, file)
    const sql = fs.readFileSync(sqlPath, 'utf-8')

    console.log(`[migrate] Applying ${file}`)

    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      await client.query(sql)
      await client.query('INSERT INTO _migrations (name) VALUES ($1)', [file])
      await client.query('COMMIT')
      console.log(`[migrate] Applied ${file}`)
    } catch (error) {
      await client.query('ROLLBACK')
      console.error(`[migrate] Failed ${file}:`, error)
      throw error
    } finally {
      client.release()
    }
  }
}
