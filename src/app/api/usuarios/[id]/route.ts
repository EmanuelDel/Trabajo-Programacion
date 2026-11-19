import { NextRequest } from 'next/server'
import { jsonOk, handleApiError } from '@/lib/api-response'
import { exigirAdmin } from '@/lib/session'
import { obtenerUsuarioPorId, actualizarUsuario, cambiarPassword } from '@/services/usuarios.service'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await exigirAdmin()
    const id = parseInt(params.id, 10)
    const usuario = await obtenerUsuarioPorId(id)
    return jsonOk(usuario)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sesion = await exigirAdmin()
    const id = parseInt(params.id, 10)
    const body = await req.json()

    // Validación: un admin no puede auto-desactivarse
    if (id === sesion.id && body.activo === false) {
      return jsonOk({ error: 'No puede desactivar su propio usuario administrador' }, 422)
    }

    const rol = body.rol || (body.administrador !== undefined ? (body.administrador ? 'admin' : 'vendedor') : undefined)

    const actualizado = await actualizarUsuario(id, {
      nombre: body.nombre,
      email: body.email || body.acceso,
      rol,
      activo: body.activo
    })

    const password = body.password || body.contrasena || body.clave
    if (password) {
      await cambiarPassword(id, password)
    }

    return jsonOk(actualizado)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sesion = await exigirAdmin()
    const id = parseInt(params.id, 10)
    if (id === sesion.id) {
      return jsonOk({ error: 'No puede desactivar su propio usuario administrador' }, 422)
    }
    const desactivado = await actualizarUsuario(id, { activo: false })
    return jsonOk(desactivado)
  } catch (err) {
    return handleApiError(err)
  }
}
