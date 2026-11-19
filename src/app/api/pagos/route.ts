import { NextRequest } from 'next/server'
import { jsonOk, handleApiError } from '@/lib/api-response'
import { exigirSesion } from '@/lib/session'
import { registrarPago, listarPagos } from '@/services/pagos.service'

export async function GET(req: NextRequest) {
  try {
    await exigirSesion()
    const url = new URL(req.url)
    const clienteId = url.searchParams.get('clienteId')
      ? parseInt(url.searchParams.get('clienteId')!, 10)
      : undefined
    const limite = url.searchParams.get('limite')
      ? parseInt(url.searchParams.get('limite')!, 10)
      : 50

    const lista = await listarPagos({ clienteId, limite })
    return jsonOk(lista)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const sesion = await exigirSesion()
    const body = await req.json()
    const resultado = await registrarPago({
      clienteId: parseInt(body.clienteId, 10),
      usuarioId: sesion.id,
      importeCentavos: parseInt(body.importeCentavos, 10),
      medio: body.medio,
      observacion: body.observacion
    })
    return jsonOk(resultado, 201)
  } catch (err) {
    return handleApiError(err)
  }
}
