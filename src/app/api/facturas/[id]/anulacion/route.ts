import { NextRequest } from 'next/server'
import { jsonOk, handleApiError } from '@/lib/api-response'
import { exigirAdmin } from '@/lib/session'
import { anularFactura } from '@/services/facturas.service'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sesion = await exigirAdmin()
    const id = parseInt(params.id, 10)
    const body = await req.json()
    const facturaAnulada = await anularFactura(id, sesion.id, body.motivo || '')
    return jsonOk(facturaAnulada)
  } catch (err) {
    return handleApiError(err)
  }
}
