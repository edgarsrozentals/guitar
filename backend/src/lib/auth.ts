import crypto from 'crypto'

import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'

const COOKIE_NAME = 'guitar_auth'
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30

export type AuthClaims = {
  sub: string
  email: string
  isAdmin: boolean
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters')
  }
  return new TextEncoder().encode(secret)
}

function getEncryptionKey(): Buffer {
  const raw = process.env.APP_ENCRYPTION_KEY
  if (!raw) {
    throw new Error('APP_ENCRYPTION_KEY must be set (32-byte base64 or hex)')
  }
  let key: Buffer
  if (/^[0-9a-f]{64}$/i.test(raw)) {
    key = Buffer.from(raw, 'hex')
  } else {
    key = Buffer.from(raw, 'base64')
  }
  if (key.length !== 32) {
    throw new Error('APP_ENCRYPTION_KEY must decode to 32 bytes')
  }
  return key
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12)
}

export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash)
}

export async function signAuthToken(claims: AuthClaims): Promise<string> {
  return new SignJWT({ email: claims.email, isAdmin: claims.isAdmin })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_SECONDS}s`)
    .sign(getJwtSecret())
}

export async function verifyAuthToken(
  token: string,
): Promise<AuthClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret())
    if (
      typeof payload.sub !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.isAdmin !== 'boolean'
    ) {
      return null
    }
    return {
      sub: payload.sub,
      email: payload.email,
      isAdmin: payload.isAdmin,
    }
  } catch {
    return null
  }
}

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', getEncryptionKey(), iv)
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf-8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  return Buffer.concat([iv, tag, ciphertext]).toString('base64')
}

export function decryptSecret(encoded: string): string | null {
  try {
    const buf = Buffer.from(encoded, 'base64')
    if (buf.length < 28) return null
    const iv = buf.subarray(0, 12)
    const tag = buf.subarray(12, 28)
    const ciphertext = buf.subarray(28)
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      getEncryptionKey(),
      iv,
    )
    decipher.setAuthTag(tag)
    return Buffer.concat([
      decipher.update(ciphertext),
      decipher.final(),
    ]).toString('utf-8')
  } catch {
    return null
  }
}

export function generateRandomPassword(length = 20): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  const bytes = crypto.randomBytes(length)
  let out = ''
  for (let i = 0; i < length; i++) {
    out += alphabet[bytes[i] % alphabet.length]
  }
  return out
}

export const AUTH_COOKIE_NAME = COOKIE_NAME
export const AUTH_TOKEN_TTL_SECONDS = TOKEN_TTL_SECONDS
