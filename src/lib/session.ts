import { cookies } from 'next/headers'
import { verifySessionCookie, SessionPayload } from './auth'
import { ApiError } from '../services/api-error'

export async function obtenerSesion(): Promise<SessionPayload | null> {
  const cookieStore = cookies()
  const token = cookieStore.get('session_token')?.value
  if (!token) return null
  return await verifySessionCookie(token)
}

export async function exigirSesion(): Promise<SessionPayload> {
  const sesion = await obtenerSesion()
  if (!sesion) {
    throw new ApiError(401, 'NO_AUTENTICADO', 'Debe iniciar sesión para realizar esta operación')
  }
  return sesion
}

export async function exigirAdmin(): Promise<SessionPayload> {
  const sesion = await exigirSesion()
  if (sesion.rol !== 'admin') {
    throw new ApiError(
      403,
      'ACCESO_DENEGADO',
      'Esta operación requiere permisos de administrador'
    )
  }
  return sesion
}
