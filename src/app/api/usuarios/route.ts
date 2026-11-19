import { NextRequest } from 'next/server'
import { jsonOk, handleApiError } from '@/lib/api-response'
import { exigirAdmin } from '@/lib/session'
import { listarUsuarios, crearUsuario } from '@/services/usuarios.service'

export async function GET() {
  try {
    await exigirAdmin()
    const lista = await listarUsuarios()
    return jsonOk({ datos: lista })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    await exigirAdmin()
    const body = await req.json()
    const rol = (body.rol || (body.administrador ? 'admin' : 'vendedor')) as 'admin' | 'vendedor'
    const password = body.password || body.contrasena || body.clave

    const nuevo = await crearUsuario({
      nombre: body.nombre,
      email: body.email || body.acceso,
      password: password,
      rol: rol === 'admin' ? 'admin' : 'vendedor'
    })

    return jsonOk(nuevo, 201)
  } catch (err) {
    return handleApiError(err)
  }
}
