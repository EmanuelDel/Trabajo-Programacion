import { NextRequest } from 'next/server'
import { jsonOk, handleApiError } from '@/lib/api-response'
import { exigirAdmin } from '@/lib/session'
import { actualizarCategoria, eliminarCategoria } from '@/services/categorias.service'

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await exigirAdmin()
    const id = parseInt(params.id, 10)
    const body = await req.json()
    const actualizada = await actualizarCategoria(id, body)
    return jsonOk(actualizada)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return PUT(req, { params })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await exigirAdmin()
    const id = parseInt(params.id, 10)
    await eliminarCategoria(id)
    return jsonOk({ ok: true })
  } catch (err) {
    return handleApiError(err)
  }
}
