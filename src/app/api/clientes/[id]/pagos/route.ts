import { NextRequest } from 'next/server'
import { jsonOk, handleApiError } from '@/lib/api-response'
import { exigirSesion } from '@/lib/session'
import { registrarPago, listarPagos } from '@/services/pagos.service'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await exigirSesion()
    const clienteId = parseInt(params.id, 10)
    const lista = await listarPagos({ clienteId, limite: 100 })
    return jsonOk(lista)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sesion = await exigirSesion()
    const clienteId = parseInt(params.id, 10)
    const body = await req.json()
    const importe = parseInt(body.importeCentavos ?? body.importe, 10)

    const resultado = await registrarPago({
      clienteId,
      usuarioId: sesion.id,
      importeCentavos: importe,
      medio: body.medio || 'efectivo',
      observacion: body.observacion
    })
    return jsonOk(resultado, 201)
  } catch (err) {
    return handleApiError(err)
  }
}
