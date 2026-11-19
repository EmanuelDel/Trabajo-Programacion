import { NextRequest } from 'next/server'
import { jsonOk, handleApiError } from '@/lib/api-response'
import { exigirSesion } from '@/lib/session'
import { db } from '@/db'
import { pagos } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { ApiError } from '@/services/api-error'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await exigirSesion()
    const id = parseInt(params.id, 10)
    const pago = await db.query.pagos.findFirst({
      where: eq(pagos.id, id),
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
      }
    })

    if (!pago) {
      throw new ApiError(404, 'PAGO_NO_ENCONTRADO', 'Pago o recibo no encontrado')
    }

    return jsonOk(pago)
  } catch (err) {
    return handleApiError(err)
  }
}
