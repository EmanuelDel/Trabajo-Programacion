import { desc, eq, max } from 'drizzle-orm'
import { db } from '../db'
import { pagos, Pago } from '../db/schema'
import { ApiError } from './api-error'
import { calcularSaldoCliente, obtenerClientePorId } from './clientes.service'

export interface RegistrarPagoParams {
  clienteId: number
  usuarioId: number
  importeCentavos: number
  medio: 'efectivo' | 'transferencia' | 'tarjeta'
  observacion?: string
}

export async function registrarPago(params: RegistrarPagoParams): Promise<{
  pago: Pago
  saldoActualCentavos: number
}> {
  if (params.importeCentavos <= 0) {
    throw new ApiError(400, 'IMPORTE_INVALIDO', 'El importe del pago debe ser mayor a cero')
  }

  // Verificar que el cliente existe
  await obtenerClientePorId(params.clienteId)

  return await db.transaction(async (tx) => {
    // Obtener siguiente número de recibo de forma atómica
    const [maxRecibo] = await tx
      .select({ maximo: max(pagos.numeroRecibo) })
      .from(pagos)

    const siguienteNumero = (maxRecibo?.maximo ?? 0) + 1

    const [nuevoPago] = await tx
      .insert(pagos)
      .values({
        numeroRecibo: siguienteNumero,
        fecha: new Date().toISOString(),
        clienteId: params.clienteId,
        usuarioId: params.usuarioId,
        importeCentavos: params.importeCentavos,
        medio: params.medio,
        observacion: params.observacion?.trim() || null
      })
      .returning()

    const nuevoSaldo = await calcularSaldoCliente(params.clienteId)

    return {
      pago: nuevoPago,
      saldoActualCentavos: nuevoSaldo
    }
  })
}

export async function listarPagos(filtros: { clienteId?: number; limite?: number } = {}) {
  const limite = filtros.limite || 50

  return await db.query.pagos.findMany({
    where: filtros.clienteId ? eq(pagos.clienteId, filtros.clienteId) : undefined,
    with: {
      cliente: true,
      usuario: {
        columns: {
          id: true,
          nombre: true,
          email: true,
          rol: true
        }
      }
    },
    orderBy: [desc(pagos.id)],
    limit: limite
  })
}
