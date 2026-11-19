import { NextRequest } from 'next/server'
import { jsonOk, handleApiError } from '@/lib/api-response'
import { exigirAdmin, exigirSesion } from '@/lib/session'
import { listarMovimientos, registrarAjusteManual } from '@/services/stock.service'

export async function GET(req: NextRequest) {
  try {
    await exigirSesion()
    const url = new URL(req.url)
    const productoId = url.searchParams.get('productoId')
      ? parseInt(url.searchParams.get('productoId')!, 10)
      : undefined
    const limite = url.searchParams.get('limite')
      ? parseInt(url.searchParams.get('limite')!, 10)
      : 50

    const movimientos = await listarMovimientos({ productoId, limite })
    return jsonOk(movimientos)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const sesion = await exigirAdmin()
    const body = await req.json()
    const movimiento = await registrarAjusteManual({
      productoId: parseInt(body.productoId, 10),
      tipo: body.tipo,
      cantidad: parseInt(body.cantidad, 10),
      motivo: body.motivo,
      usuarioId: sesion.id
    })
    return jsonOk(movimiento, 201)
  } catch (err) {
    return handleApiError(err)
  }
}
