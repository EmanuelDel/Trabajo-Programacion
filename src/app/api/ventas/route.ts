import { NextRequest } from 'next/server'
import { jsonOk, handleApiError } from '@/lib/api-response'
import { exigirSesion } from '@/lib/session'
import { crearFactura, listarFacturas } from '@/services/facturas.service'

export async function GET(req: NextRequest) {
  try {
    await exigirSesion()
    const url = new URL(req.url)
    const clienteId = url.searchParams.get('clienteId')
      ? parseInt(url.searchParams.get('clienteId')!, 10)
      : undefined
    const estado = url.searchParams.get('estado') as 'EMITIDA' | 'ANULADA' | undefined
    const desde = url.searchParams.get('desde') || undefined
    const hasta = url.searchParams.get('hasta') || undefined
    const limite = url.searchParams.get('limite')
      ? parseInt(url.searchParams.get('limite')!, 10)
      : 100

    const facturas = await listarFacturas({
      clienteId,
      estado,
      desde,
      hasta,
      limite
    })

    const datos = facturas.map((f) => ({
      id: f.id,
      numero: f.numero,
      fecha: f.fecha,
      usuarioId: f.usuarioId,
      vendedorNombre: f.usuario?.nombre || 'Usuario',
      clienteId: f.clienteId,
      clienteNombre: f.clienteNombre,
      clienteDocumento: f.clienteDocumento,
      formaPago: f.formaPago,
      totalCentavos: f.totalCentavos,
      estado: f.estado,
      cantidadItems: f.detalles?.length || 0,
      detalles: f.detalles
    }))

    return jsonOk({ datos })
  } catch (err) {
    return handleApiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const sesion = await exigirSesion()
    const body = await req.json()

    // Normalizar forma de pago a minúsculas para el servicio ('contado' | 'tarjeta' | 'cuenta_corriente')
    let formaPago = (body.formaPago || body.forma || 'contado').toLowerCase()
    if (formaPago === 'cuenta corriente') formaPago = 'cuenta_corriente'

    // Aceptar tanto 'productos' como 'items'
    const listaItems = body.productos || body.items || []
    const items = listaItems.map((item: { productoId: number; cantidad: number }) => ({
      productoId: Number(item.productoId),
      cantidad: Number(item.cantidad)
    }))

    const resultado = await crearFactura({
      usuarioId: sesion.id,
      clienteId: body.clienteId ? Number(body.clienteId) : null,
      clienteNombre: body.clienteNombre,
      clienteDocumento: body.clienteDocumento,
      formaPago: formaPago as 'contado' | 'tarjeta' | 'cuenta_corriente',
      items,
      pagoMontoCentavos: body.pagoMontoCentavos ? Number(body.pagoMontoCentavos) : undefined,
      tarjetaTipo: body.tarjetaTipo,
      tarjetaMarca: body.tarjetaMarca,
      tarjetaUltimos4: body.tarjetaUltimos4
    })

    return jsonOk({
      id: resultado.factura.id,
      numero: resultado.factura.numero,
      fecha: resultado.factura.fecha,
      clienteId: resultado.factura.clienteId,
      clienteNombre: resultado.factura.clienteNombre,
      clienteDocumento: resultado.factura.clienteDocumento,
      formaPago: resultado.factura.formaPago,
      totalCentavos: resultado.factura.totalCentavos,
      pagoMontoCentavos: resultado.factura.pagoMontoCentavos,
      vueltoCentavos: resultado.factura.vueltoCentavos,
      productos: resultado.detalles.map((d) => ({
        productoId: d.productoId,
        descripcion: d.descripcion,
        cantidad: d.cantidad,
        precioUnitarioCentavos: d.precioUnitarioCentavos,
        subtotalCentavos: d.subtotalCentavos
      }))
    }, 201)
  } catch (err) {
    return handleApiError(err)
  }
}
