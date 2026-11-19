import { NextRequest } from 'next/server'
import { jsonOk, handleApiError } from '@/lib/api-response'
import { exigirSesion, exigirAdmin } from '@/lib/session'
import { listarMovimientos, registrarAjusteManual } from '@/services/stock.service'

/**
 * GET /api/productos/[id]/movimientos
 * Historial de movimientos de inventario de un producto en particular (RF-P6)
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await exigirSesion()
    const productoId = parseInt(params.id, 10)
    const url = new URL(req.url)
    const limite = url.searchParams.get('limite')
      ? parseInt(url.searchParams.get('limite')!, 10)
      : 100

    const movimientos = await listarMovimientos({ productoId, limite })
    return jsonOk(movimientos)
  } catch (err) {
    return handleApiError(err)
  }
}

/**
 * POST /api/productos/[id]/movimientos
 * Registra un movimiento de stock manual (ingreso o egreso) (RF-P4, RF-P5)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sesion = await exigirAdmin()
    const productoId = parseInt(params.id, 10)
    const body = await req.json()

    const tipoRaw = (body.tipo || '').toUpperCase()
    const tipo = tipoRaw === 'EGRESO' ? 'EGRESO' : 'INGRESO'
    const cantidad = Math.abs(parseInt(body.cantidad, 10))
    const motivo = body.motivo || body.observacion || 'Ajuste de inventario'

    const movimiento = await registrarAjusteManual({
      productoId,
      tipo,
      cantidad,
      motivo,
      usuarioId: sesion.id
    })

    return jsonOk(movimiento, 201)
  } catch (err) {
    return handleApiError(err)
  }
}
