import 'dotenv/config'
import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema'

const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || 'file:local.db'
const authToken = process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN

export const client = createClient({
  url,
  authToken
})

export const db = drizzle(client, { schema })

export type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0]

export function esErrorDeConcurrencia(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const msg = String((err as { message?: string }).message || '').toLowerCase()
  const code = String((err as { code?: string }).code || '').toLowerCase()
  return (
    code.includes('sqlite_busy') ||
    code.includes('sqlite_locked') ||
    msg.includes('sqlite_busy') ||
    msg.includes('sqlite_locked') ||
    msg.includes('database is locked') ||
    msg.includes('interactive transaction') ||
    msg.includes('retry the transaction')
  )
}

/**
 * Ejecuta una transacción con bloqueo inmediato (BEGIN IMMEDIATE)
 * y reintentos automáticos con backoff exponencial si hay contención (SQLITE_BUSY).
 */
export async function ejecutarTransaccion<T>(
  fn: (tx: DbTx) => Promise<T>,
  maxReintentos = 5
): Promise<T> {
  let ultimoError: unknown
  for (let intento = 0; intento <= maxReintentos; intento++) {
    try {
      return await db.transaction(fn, { behavior: 'immediate' })
    } catch (err) {
      ultimoError = err
      if (esErrorDeConcurrencia(err) && intento < maxReintentos) {
        const esperaMs = 60 * Math.pow(2, intento) + Math.floor(Math.random() * 50)
        await new Promise((resolve) => setTimeout(resolve, esperaMs))
        continue
      }
      throw err
    }
  }
  throw ultimoError
}
