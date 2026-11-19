import { NextRequest } from 'next/server'
import { jsonOk, handleApiError } from '@/lib/api-response'
import { exigirSesion } from '@/lib/session'
import { obtenerMetricasTablero } from '@/services/tablero.service'

/**
 * GET /api/tablero
 * Responde con los KPIs e información analítica de la pantalla de inicio (RF-T1 a RF-T3)
 */
export async function GET(_req: NextRequest) {
  try {
    await exigirSesion()
    const metricas = await obtenerMetricasTablero()
    return jsonOk(metricas)
  } catch (err) {
    return handleApiError(err)
  }
}
