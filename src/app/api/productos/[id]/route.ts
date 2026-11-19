import { NextRequest } from 'next/server'
import { jsonOk, handleApiError } from '@/lib/api-response'
import { exigirAdmin, exigirSesion } from '@/lib/session'
import {
  obtenerProductoPorId,
  actualizarProducto,
  desactivarProducto
} from '@/services/productos.service'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await exigirSesion()
    const id = parseInt(params.id, 10)
    const prod = await obtenerProductoPorId(id)
    return jsonOk(prod)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await exigirAdmin()
    const id = parseInt(params.id, 10)
    const body = await req.json()
    const actualizado = await actualizarProducto(id, body)
    return jsonOk(actualizado)
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
    const desactivado = await desactivarProducto(id)
    return jsonOk(desactivado)
  } catch (err) {
    return handleApiError(err)
  }
}
