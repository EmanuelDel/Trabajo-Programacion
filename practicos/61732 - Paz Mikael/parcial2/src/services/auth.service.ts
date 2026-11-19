import crypto from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { usuarios, type Usuario } from '../db/schema.js'

// Almacén de sesiones en memoria con expiración
interface SesionData {
  userId: number
  expiresAt: number
}

const sesiones = new Map<string, SesionData>()
const TIEMPO_SESION_MS = 24 * 60 * 60 * 1000 // 24 horas

export function hashearClave(clave: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(clave, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verificarClave(clave: string, claveAlmacenada: string): boolean {
  const [salt, hashOriginal] = claveAlmacenada.split(':')
  if (!salt || !hashOriginal) return false
  const hashIntento = crypto.scryptSync(clave, salt, 64).toString('hex')
  return crypto.timingSafeEqual(Buffer.from(hashOriginal, 'hex'), Buffer.from(hashIntento, 'hex'))
}

export function crearSesion(userId: number): string {
  const token = crypto.randomBytes(32).toString('hex')
  sesiones.set(token, {
    userId,
    expiresAt: Date.now() + TIEMPO_SESION_MS
  })
  return token
}

export function invalidarSesion(token: string): void {
  sesiones.delete(token)
}

export function invalidarSesionesDeUsuario(userId: number): void {
  for (const [token, data] of sesiones.entries()) {
    if (data.userId === userId) {
      sesiones.delete(token)
    }
  }
}

export function obtenerUsuarioPorToken(token?: string): Usuario | null {
  if (!token) return null
  const sesion = sesiones.get(token)
  if (!sesion) return null

  if (Date.now() > sesion.expiresAt) {
    sesiones.delete(token)
    return null
  }

  // Renovar vigencia de sesión (sliding expiration)
  sesion.expiresAt = Date.now() + TIEMPO_SESION_MS

  const usuario = db.select().from(usuarios).where(eq(usuarios.id, sesion.userId)).get()
  if (!usuario || !usuario.activo) {
    sesiones.delete(token)
    return null
  }

  return usuario
}

