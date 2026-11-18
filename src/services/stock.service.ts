import { desc, eq } from 'drizzle-orm'
import { db } from '../db'
import { movimientosStock } from '../db/schema'
import { moverStock } from './productos.service'
import { ApiError } from './api-error'

export interface AjusteStockParams {
  productoId: number
  tipo: 'INGRESO' | 'EGRESO'
  cantidad: number
  motivo: string
  usuarioId: number
}

export async function registrarAjusteManual(params: AjusteStockParams) {
  const motivoLimpio = params.motivo.trim()
  if (!motivoLimpio) {
    throw new ApiError(400, 'DATOS_INVALIDOS', 'Debe especificar el motivo del ajuste')
  }

  return await moverStock(
    params.productoId,
    params.cantidad,
    params.tipo,
    motivoLimpio,
    'MANUAL',
    params.usuarioId
  )
}

export async function listarMovimientos(filtros: { productoId?: number; limite?: number } = {}) {
  const limite = filtros.limite || 100

  return await db.query.movimientosStock.findMany({
    where: filtros.productoId ? eq(movimientosStock.productoId, filtros.productoId) : undefined,
    with: {
      producto: true,
      usuario: {
        columns: {
          id: true,
          nombre: true,
          email: true,
          rol: true
        }
      },
      factura: true
    },
    orderBy: [desc(movimientosStock.id)],
    limit: limite
  })
}
