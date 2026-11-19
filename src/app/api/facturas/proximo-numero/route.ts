import { NextRequest } from 'next/server'
import { jsonOk, handleApiError } from '@/lib/api-response'
import { exigirSesion } from '@/lib/session'
import { obtenerProximoNumeroFactura } from '@/services/facturas.service'

/**
 * GET /api/facturas/proximo-numero
 * Devuelve el próximo número de factura estimado en formato 0001-0000XXXX (RF-V1)
 */
export async function GET(_req: NextRequest) {
  try {
    await exigirSesion()
    const proximo = await obtenerProximoNumeroFactura()
    return jsonOk(proximo)
  } catch (err) {
    return handleApiError(err)
  }
}
