import { NextRequest } from 'next/server'
import { jsonOk, handleApiError } from '@/lib/api-response'
import { exigirSesion, exigirAdmin } from '@/lib/session'
import { obtenerFacturaPorId, anularFactura } from '@/services/facturas.service'

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await exigirSesion()
    const id = parseInt(params.id, 10)
    const factura = await obtenerFacturaPorId(id)

    return jsonOk({
      id: factura.id,
      numero: factura.numero,
      fecha: factura.fecha,
      usuarioId: factura.usuarioId,
      vendedorNombre: factura.usuario?.nombre,
      clienteId: factura.clienteId,
      clienteNombre: factura.clienteNombre,
      clienteDocumento: factura.clienteDocumento,
      formaPago: factura.formaPago,
      totalCentavos: factura.totalCentavos,
      pagoMontoCentavos: factura.pagoMontoCentavos,
      vueltoCentavos: factura.vueltoCentavos,
      tarjetaTipo: factura.tarjetaTipo,
      tarjetaMarca: factura.tarjetaMarca,
      tarjetaUltimos4: factura.tarjetaUltimos4,
      estado: factura.estado,
      motivoAnulacion: factura.motivoAnulacion,
      anuladaEn: factura.anuladaEn,
      productos: factura.detalles.map((d) => ({
        id: d.id,
        productoId: d.productoId,
        codigo: d.producto?.codigo,
        descripcion: d.descripcion,
        cantidad: d.cantidad,
        precioUnitarioCentavos: d.precioUnitarioCentavos,
        subtotalCentavos: d.subtotalCentavos
      }))
    })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sesion = await exigirAdmin()
    const id = parseInt(params.id, 10)
    const body = await req.json()
    const motivo = body.motivo || 'Anulación solicitada por administrador'

    const anulada = await anularFactura(id, sesion.id, motivo)
    return jsonOk(anulada)
  } catch (err) {
    return handleApiError(err)
  }
}
