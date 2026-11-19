import { NextRequest, NextResponse } from 'next/server'
import { jsonOk, handleApiError } from '@/lib/api-response'
import { exigirSesion } from '@/lib/session'
import { db } from '@/db'
import { usuarios } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { verifyPassword, hashPassword } from '@/lib/auth'
import { ApiError } from '@/services/api-error'

/**
 * PUT /api/auth/password
 * Permite al usuario conectado cambiar su propia contraseña (RF-U5)
 */
export async function PUT(req: NextRequest) {
  try {
    const sesion = await exigirSesion()
    const body = await req.json()
    const actual = body.actual || body.passwordActual || body.contrasenaActual
    const nueva = body.nueva || body.passwordNueva || body.contrasenaNueva

    if (!actual || !nueva) {
      throw new ApiError(400, 'DATOS_REQUERIDOS', 'Debe ingresar la contraseña actual y la nueva')
    }

    if (nueva.length < 8) {
      throw new ApiError(422, 'PASSWORD_CORTO', 'La nueva contraseña debe tener al menos 8 caracteres')
    }

    const [usuario] = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.id, sesion.id))
      .limit(1)

    if (!usuario) {
      throw new ApiError(404, 'USUARIO_NO_ENCONTRADO', 'Usuario no encontrado')
    }

    const valida = verifyPassword(actual, usuario.passwordHash)
    if (!valida) {
      throw new ApiError(422, 'CONTRASENA_ACTUAL_INCORRECTA', 'La contraseña actual no es correcta')
    }

    const nuevoHash = hashPassword(nueva)
    await db
      .update(usuarios)
      .set({ passwordHash: nuevoHash })
      .where(eq(usuarios.id, sesion.id))

    return new NextResponse(null, { status: 204 })
  } catch (err) {
    return handleApiError(err)
  }
}
