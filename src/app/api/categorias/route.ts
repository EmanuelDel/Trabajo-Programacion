import { NextRequest } from 'next/server'
import { jsonOk, handleApiError } from '@/lib/api-response'
import { exigirAdmin, exigirSesion } from '@/lib/session'
import { listarCategorias, crearCategoria } from '@/services/categorias.service'

export async function GET() {
  try {
    await exigirSesion()
    const categorias = await listarCategorias()
    return jsonOk(categorias)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    await exigirAdmin()
    const body = await req.json()
    const nueva = await crearCategoria(body.nombre)
    return jsonOk(nueva, 201)
  } catch (err) {
    return handleApiError(err)
  }
}
