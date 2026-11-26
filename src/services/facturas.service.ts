import { and, desc, eq, gte, lte, max } from 'drizzle-orm'
import { db, ejecutarTransaccion } from '../db'
import { facturas, detallesFactura, Factura, DetalleFactura, productos } from '../db/schema'
import { ApiError } from './api-error'
import { moverStock } from './productos.service'
import { calcularSaldoCliente, obtenerClientePorId } from './clientes.service'

export interface ItemFacturaInput {
  productoId: number
  cantidad: number
}

export interface CrearFacturaParams {
  usuarioId: number
  clienteId?: number | null
  clienteNombre?: string
  clienteDocumento?: string
  formaPago: 'contado' | 'tarjeta' | 'cuenta_corriente'
  items: ItemFacturaInput[]
  // Datos contado
  pagoMontoCentavos?: number
  // Datos tarjeta
  tarjetaTipo?: 'debito' | 'credito'
  tarjetaMarca?: 'visa' | 'mastercard' | 'amex' | 'otra'
  tarjetaUltimos4?: string
}

export async function crearFactura(params: CrearFacturaParams) {
  if (!params.items || params.items.length === 0) {
    throw new ApiError(400, 'ITEMS_REQUERIDOS', 'La factura debe contener al menos un producto')
  }

  // Validar y agrupar items repetidos si hubiera
  const itemsMap = new Map<number, number>()
  for (const item of params.items) {
    if (item.cantidad <= 0) {
      throw new ApiError(400, 'CANTIDAD_INVALIDA', 'La cantidad de cada producto debe ser mayor a cero')
    }
    itemsMap.set(item.productoId, (itemsMap.get(item.productoId) || 0) + item.cantidad)
  }

  // Obtener productos desde la base de datos
  const itemsAProcesar: Array<{
    productoId: number
    descripcion: string
    cantidad: number
    precioUnitarioCentavos: number
    subtotalCentavos: number
    existenciaActual: number
  }> = []

  let totalCentavos = 0

  for (const [productoId, cantidad] of Array.from(itemsMap.entries())) {
    const [prod] = await db
      .select()
      .from(productos)
      .where(eq(productos.id, productoId))
      .limit(1)

    if (!prod || !prod.activo) {
      throw new ApiError(404, 'PRODUCTO_NO_ENCONTRADO', `Producto con ID ${productoId} no disponible`)
    }

    if (prod.existencia < cantidad) {
      throw new ApiError(
        400,
        'STOCK_INSUFICIENTE',
        `Stock insuficiente para "${prod.descripcion}". Disponible: ${prod.existencia}, requerido: ${cantidad}`,
        {
          productoId: prod.id,
          codigo: prod.codigo,
          descripcion: prod.descripcion,
          existenciaActual: prod.existencia,
          cantidadRequerida: cantidad
        }
      )
    }

    const subtotal = prod.precioVentaCentavos * cantidad
    totalCentavos += subtotal

    itemsAProcesar.push({
      productoId: prod.id,
      descripcion: prod.descripcion,
      cantidad,
      precioUnitarioCentavos: prod.precioVentaCentavos,
      subtotalCentavos: subtotal,
      existenciaActual: prod.existencia
    })
  }

  // Validar forma de pago
  let pagoMontoCentavos: number | null = null
  let vueltoCentavos: number | null = null
  let tarjetaTipo: 'debito' | 'credito' | null = null
  let tarjetaMarca: 'visa' | 'mastercard' | 'amex' | 'otra' | null = null
  let tarjetaUltimos4: string | null = null
  let clienteFinalNombre = params.clienteNombre?.trim() || 'Consumidor Final'
  let clienteFinalDoc = params.clienteDocumento?.trim() || null

  if (params.formaPago === 'contado') {
    if (params.pagoMontoCentavos === undefined || params.pagoMontoCentavos < totalCentavos) {
      throw new ApiError(
        400,
        'PAGO_INSUFICIENTE',
        `El importe entregado ($${((params.pagoMontoCentavos || 0) / 100).toFixed(2)}) es menor al total ($${(totalCentavos / 100).toFixed(2)})`
      )
    }
    pagoMontoCentavos = params.pagoMontoCentavos
    vueltoCentavos = pagoMontoCentavos - totalCentavos
  } else if (params.formaPago === 'tarjeta') {
    if (!params.tarjetaTipo || !params.tarjetaMarca || !params.tarjetaUltimos4) {
      throw new ApiError(
        400,
        'DATOS_TARJETA_INCOMPLETOS',
        'Debe especificar tipo de tarjeta, marca y los últimos 4 dígitos'
      )
    }
    if (!/^\d{4}$/.test(params.tarjetaUltimos4)) {
      throw new ApiError(
        400,
        'TARJETA_INVALIDA',
        'Los últimos 4 dígitos de la tarjeta deben contener exactamente 4 números'
      )
    }
    tarjetaTipo = params.tarjetaTipo
    tarjetaMarca = params.tarjetaMarca
    tarjetaUltimos4 = params.tarjetaUltimos4
  } else if (params.formaPago === 'cuenta_corriente') {
    if (!params.clienteId) {
      throw new ApiError(
        400,
        'CLIENTE_REQUERIDO',
        'Se requiere seleccionar un cliente registrado para vender a cuenta corriente'
      )
    }

    const cliente = await obtenerClientePorId(params.clienteId)
    if (!cliente.habilitadoCuentaCorriente) {
      throw new ApiError(
        400,
        'CUENTA_CORRIENTE_DESHABILITADA',
        `El cliente ${cliente.nombre} no tiene habilitada la cuenta corriente`
      )
    }

    const saldoActual = await calcularSaldoCliente(cliente.id)
    const nuevoSaldo = saldoActual + totalCentavos

    if (cliente.limiteCreditoCentavos !== null && nuevoSaldo > cliente.limiteCreditoCentavos) {
      throw new ApiError(
        400,
        'LIMITE_CREDITO_EXCEDIDO',
        `Límite de crédito excedido. Límite: $${(cliente.limiteCreditoCentavos / 100).toFixed(2)}, Saldo actual: $${(saldoActual / 100).toFixed(2)}, Nuevo saldo: $${(nuevoSaldo / 100).toFixed(2)}`,
        {
          clienteId: cliente.id,
          nombre: cliente.nombre,
          limiteCentavos: cliente.limiteCreditoCentavos,
          saldoActualCentavos: saldoActual,
          nuevoSaldoCentavos: nuevoSaldo
        }
      )
    }

    clienteFinalNombre = cliente.nombre
    clienteFinalDoc = cliente.documento
  }

  // Transacción atómica de facturación + descarga de stock
  return await ejecutarTransaccion(async (tx) => {
    // 1. Obtener siguiente número de factura correlativo
    const [maxNum] = await tx
      .select({ maximo: max(facturas.numero) })
      .from(facturas)

    const siguienteNumero = (maxNum?.maximo ?? 0) + 1
    const ahora = new Date().toISOString()

    // 2. Insertar cabecera de factura
    const [facturaInsertada] = await tx
      .insert(facturas)
      .values({
        numero: siguienteNumero,
        fecha: ahora,
        usuarioId: params.usuarioId,
        clienteId: params.clienteId || null,
        clienteNombre: clienteFinalNombre,
        clienteDocumento: clienteFinalDoc,
        formaPago: params.formaPago,
        totalCentavos,
        pagoMontoCentavos,
        vueltoCentavos,
        tarjetaTipo,
        tarjetaMarca,
        tarjetaUltimos4,
        estado: 'EMITIDA'
      })
      .returning()

    // 3. Insertar renglones y descargar stock
    const detallesInsertados: DetalleFactura[] = []

    for (const item of itemsAProcesar) {
      const [det] = await tx
        .insert(detallesFactura)
        .values({
          facturaId: facturaInsertada.id,
          productoId: item.productoId,
          descripcion: item.descripcion,
          cantidad: item.cantidad,
          precioUnitarioCentavos: item.precioUnitarioCentavos,
          subtotalCentavos: item.subtotalCentavos
        })
        .returning()

      detallesInsertados.push(det)

      // Invariante de stock: mover stock mediante función central
      await moverStock(
        item.productoId,
        item.cantidad,
        'EGRESO',
        `Venta en Factura #${String(siguienteNumero).padStart(8, '0')}`,
        'VENTA',
        params.usuarioId,
        facturaInsertada.id,
        tx
      )
    }

    return {
      factura: facturaInsertada,
      detalles: detallesInsertados
    }
  })
}

export async function anularFactura(
  facturaId: number,
  usuarioId: number,
  motivo: string
) {
  const motivoLimpio = motivo.trim()
  if (!motivoLimpio) {
    throw new ApiError(400, 'MOTIVO_REQUERIDO', 'Debe especificar el motivo de anulación')
  }

  const factura = await db.query.facturas.findFirst({
    where: eq(facturas.id, facturaId),
    with: {
      detalles: true
    }
  })

  if (!factura) {
    throw new ApiError(404, 'FACTURA_NO_ENCONTRADA', 'Factura no encontrada')
  }

  if (factura.estado === 'ANULADA') {
    throw new ApiError(400, 'FACTURA_YA_ANULADA', 'La factura ya se encuentra anulada')
  }

  return await ejecutarTransaccion(async (tx) => {
    const ahora = new Date().toISOString()

    // 1. Marcar factura como ANULADA
    const [facturaAnulada] = await tx
      .update(facturas)
      .set({
        estado: 'ANULADA',
        motivoAnulacion: motivoLimpio,
        anuladaEn: ahora,
        anuladaPorUsuarioId: usuarioId
      })
      .where(eq(facturas.id, facturaId))
      .returning()

    // 2. Reingresar stock por cada detalle de la factura
    for (const detalle of factura.detalles) {
      await moverStock(
        detalle.productoId,
        detalle.cantidad,
        'INGRESO',
        `Anulación Factura #${String(factura.numero).padStart(8, '0')}: ${motivoLimpio}`,
        'ANULACION',
        usuarioId,
        factura.id,
        tx
      )
    }

    return facturaAnulada
  })
}

export async function listarFacturas(filtros: {
  clienteId?: number
  estado?: 'EMITIDA' | 'ANULADA'
  desde?: string
  hasta?: string
  limite?: number
} = {}) {
  const limite = filtros.limite || 100
  const condiciones = []

  if (filtros.clienteId) {
    condiciones.push(eq(facturas.clienteId, filtros.clienteId))
  }

  if (filtros.estado) {
    condiciones.push(eq(facturas.estado, filtros.estado))
  }

  if (filtros.desde) {
    condiciones.push(gte(facturas.fecha, filtros.desde))
  }

  if (filtros.hasta) {
    condiciones.push(lte(facturas.fecha, filtros.hasta))
  }

  return await db.query.facturas.findMany({
    where: condiciones.length > 0 ? and(...condiciones) : undefined,
    with: {
      usuario: {
        columns: {
          id: true,
          nombre: true,
          email: true,
          rol: true
        }
      },
      cliente: true,
      detalles: true
    },
    orderBy: [desc(facturas.id)],
    limit: limite
  })
}

export async function obtenerProximoNumeroFactura() {
  const [maxNum] = await db
    .select({ maximo: max(facturas.numero) })
    .from(facturas)

  const siguienteNumero = (maxNum?.maximo ?? 0) + 1
  const numeroFormateado = `0001-${String(siguienteNumero).padStart(8, '0')}`

  return {
    siguienteNumero,
    numeroFormateado
  }
}

export async function obtenerFacturaPorId(id: number) {
  const factura = await db.query.facturas.findFirst({
    where: eq(facturas.id, id),
    with: {
      usuario: {
        columns: {
          id: true,
          nombre: true,
          email: true,
          rol: true
        }
      },
      cliente: true,
      detalles: {
        with: {
          producto: true
        }
      }
    }
  })

  if (!factura) {
    throw new ApiError(404, 'FACTURA_NO_ENCONTRADA', 'Factura no encontrada')
  }

  return factura
}
