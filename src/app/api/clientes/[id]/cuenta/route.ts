import { NextRequest } from 'next/server'
import { jsonOk, handleApiError } from '@/lib/api-response'
import { exigirSesion } from '@/lib/session'
import { obtenerCuentaCorriente } from '@/services/clientes.service'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await exigirSesion()
    const id = parseInt(params.id, 10)
    const estadoCuenta = await obtenerCuentaCorriente(id)
    return jsonOk(estadoCuenta)
  } catch (err) {
    return handleApiError(err)
  }
}
