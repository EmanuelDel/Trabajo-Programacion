import crypto from 'node:crypto'
import { SignJWT, jwtVerify } from 'jose'

const DEFAULT_SECRET = 'cambiar-por-un-secreto-seguro-de-al-menos-32-caracteres-en-produccion'
const SECRET_KEY = process.env.SESSION_SECRET || DEFAULT_SECRET
const key = new TextEncoder().encode(SECRET_KEY)

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, originalHash] = stored.split(':')
  if (!salt || !originalHash) return false
  const attempt = crypto.scryptSync(password, salt, 64).toString('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(originalHash, 'hex'), Buffer.from(attempt, 'hex'))
  } catch {
    return false
  }
}

export interface SessionPayload {
  id: number
  email: string
  nombre: string
  rol: 'admin' | 'vendedor'
}

export async function createSessionCookie(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(key)
}

export async function verifySessionCookie(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}
