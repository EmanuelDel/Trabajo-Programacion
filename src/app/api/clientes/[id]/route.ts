import { NextRequest } from 'next/server'
import { jsonOk, handleApiError } from '@/lib/api-response'
import { exigirSesion } from '@/lib/session'
import { obtenerClientePorId, actualizarCliente } from '@/services/clientes.service'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await exigirSesion()
    const id = parseInt(params.id, 10)
    const cliente = await obtenerClientePorId(id)
    return jsonOk(cliente)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await exigirSesion()
    const id = parseInt(params.id, 10)
    const body = await req.json()
    const actualizado = await actualizarCliente(id, {
      ...body,
      limiteCreditoCentavos:
        body.limiteCreditoCentavos !== undefined && body.limiteCreditoCentavos !== null
          ? parseInt(body.limiteCreditoCentavos, 10)
          : body.limiteCreditoCentavos === null
          ? null
          : undefined
    })
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
