import { NextRequest } from 'next/server'
import { jsonOk, handleApiError } from '@/lib/api-response'
import { exigirAdmin, exigirSesion } from '@/lib/session'
import { listarProductos, crearProducto } from '@/services/productos.service'

export async function GET(req: NextRequest) {
  try {
    await exigirSesion()
    const url = new URL(req.url)
    const buscar = url.searchParams.get('buscar') || undefined
    const categoriaId = url.searchParams.get('categoriaId')
      ? parseInt(url.searchParams.get('categoriaId')!, 10)
      : undefined
    const stockBajo = url.searchParams.get('stockBajo') === 'true'
    const soloActivos = url.searchParams.get('todos') !== 'true'

    const lista = await listarProductos({
      buscar,
      categoriaId,
      stockBajo,
      soloActivos
    })

    return jsonOk(lista)
  } catch (err) {
    return handleApiError(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const sesion = await exigirAdmin()
    const body = await req.json()
    const nuevo = await crearProducto({
      codigo: body.codigo,
      descripcion: body.descripcion,
      categoriaId: parseInt(body.categoriaId, 10),
      precioVentaCentavos: parseInt(body.precioVentaCentavos, 10),
      existenciaInicial: body.existenciaInicial !== undefined ? parseInt(body.existenciaInicial, 10) : 0,
      stockMinimo: body.stockMinimo !== undefined ? parseInt(body.stockMinimo, 10) : 0,
      usuarioId: sesion.id
    })
    return jsonOk(nuevo, 201)
  } catch (err) {
    return handleApiError(err)
  }
}
