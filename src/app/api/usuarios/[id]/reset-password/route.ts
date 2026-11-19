import { NextRequest } from 'next/server'
import { jsonOk, handleApiError } from '@/lib/api-response'
import { exigirAdmin } from '@/lib/session'
import { cambiarPassword, obtenerUsuarioPorId } from '@/services/usuarios.service'
import crypto from 'node:crypto'

/**
 * POST /api/usuarios/[id]/reset-password
 * Permite al administrador generar una contraseña temporal aleatoria para un usuario (RF-U5)
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await exigirAdmin()
    const id = parseInt(params.id, 10)
    await obtenerUsuarioPorId(id)

    // Generar contraseña temporal segura
    const passwordTemporal = 'Temp-' + crypto.randomBytes(4).toString('hex')
    await cambiarPassword(id, passwordTemporal)

    return jsonOk({ passwordTemporal })
  } catch (err) {
    return handleApiError(err)
  }
}
