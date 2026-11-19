import { NextRequest } from 'next/server'
import { jsonOk, handleApiError } from '@/lib/api-response'
import { exigirSesion } from '@/lib/session'
import { listarClientes, crearCliente } from '@/services/clientes.service'

export async function GET(req: NextRequest) {
  try {
    await exigirSesion()
    const url = new URL(req.url)
    const buscar = url.searchParams.get('buscar') || undefined
    const soloActivos = url.searchParams.get('todos') !== 'true'

    const clientes = await listarClientes({ buscar, soloActivos })
    return jsonOk(clientes)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    await exigirSesion()
    const body = await req.json()
    const nuevo = await crearCliente({
      tipoDocumento: body.tipoDocumento,
      documento: body.documento,
      nombre: body.nombre,
      domicilio: body.domicilio,
      telefono: body.telefono,
      email: body.email,
      habilitadoCuentaCorriente: body.habilitadoCuentaCorriente,
      limiteCreditoCentavos:
        body.limiteCreditoCentavos !== undefined && body.limiteCreditoCentavos !== null
          ? parseInt(body.limiteCreditoCentavos, 10)
          : null
    })
    return jsonOk(nuevo, 201)
  } catch (err) {
    return handleApiError(err)
  }
}
