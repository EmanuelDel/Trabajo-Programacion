import { and, desc, eq, gte, lte, sql } from 'drizzle-orm'
import { db } from '../db'
import { facturas, detallesFactura, productos, clientes, pagos } from '../db/schema'
import { listarClientes } from './clientes.service'

/**
 * Servicio de métricas para el tablero de inicio (RF-T1, RF-T2, RF-T3)
 * Se ajusta a la especificación de la sección 11.7 del parcial.
 */
export async function obtenerMetricasTablero() {
  const ahora = new Date()
  const hoyStr = ahora.toISOString().slice(0, 10)
  const inicioMesStr = `${hoyStr.slice(0, 7)}-01`

  // 1. Facturas emitidas hoy
  const facturasHoy = await db
    .select({ total: facturas.totalCentavos })
    .from(facturas)
    .where(
      and(
        eq(facturas.estado, 'EMITIDA'),
        gte(facturas.fecha, `${hoyStr}T00:00:00.000Z`),
        lte(facturas.fecha, `${hoyStr}T23:59:59.999Z`)
      )
    )

  const ventasHoyCentavos = facturasHoy.reduce((acc, f) => acc + f.total, 0)
  const cantidadVentasHoy = facturasHoy.length

  // 2. Facturas emitidas este mes
  const facturasMes = await db
    .select({ total: facturas.totalCentavos, formaPago: facturas.formaPago })
    .from(facturas)
    .where(
      and(
        eq(facturas.estado, 'EMITIDA'),
        gte(facturas.fecha, `${inicioMesStr}T00:00:00.000Z`)
      )
    )

  const ventasMesCentavos = facturasMes.reduce((acc, f) => acc + f.total, 0)
  const cantidadVentasMes = facturasMes.length
  const ticketPromedioCentavos =
    cantidadVentasMes > 0 ? Math.round(ventasMesCentavos / cantidadVentasMes) : 0

  // 3. Ventas del mes por forma de pago (RF-T2)
  const porFormaDePagoMap = new Map<string, number>([
    ['contado', 0],
    ['tarjeta', 0],
    ['cuenta_corriente', 0]
  ])
  for (const f of facturasMes) {
    const actual = porFormaDePagoMap.get(f.formaPago) || 0
    porFormaDePagoMap.set(f.formaPago, actual + f.total)
  }
  const porFormaDePago = Array.from(porFormaDePagoMap.entries()).map(([forma, importe]) => ({
    forma,
    importe
  }))

  // 4. Saldo total adeudado en cuentas corrientes y clientes con saldo (RF-T1)
  const todosClientes = await listarClientes({ soloActivos: true })
  const clientesConDeuda = todosClientes.filter((c) => c.saldoCentavos > 0)
  const totalAdeudadoCentavos = clientesConDeuda.reduce((acc, c) => acc + c.saldoCentavos, 0)

  // 5. Productos con existencia menor o igual a stock mínimo (RF-T1)
  const prods = await db
    .select({
      id: productos.id,
      existencia: productos.existencia,
      stockMinimo: productos.stockMinimo
    })
    .from(productos)
    .where(eq(productos.activo, true))

  const productosBajoStock = prods.filter((p) => p.existencia <= p.stockMinimo)
  const productosBajoStockCount = productosBajoStock.length

  // 6. Ventas diarias de los últimos 30 días (RF-T2: 30 elementos sin huecos)
  const fechaHace30Dias = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000)
  fechaHace30Dias.setUTCHours(0, 0, 0, 0)
  const fechaHace30DiasISO = fechaHace30Dias.toISOString()

  const facturasRecientes = await db
    .select({
      fecha: facturas.fecha,
      total: facturas.totalCentavos
    })
    .from(facturas)
    .where(
      and(
        eq(facturas.estado, 'EMITIDA'),
        gte(facturas.fecha, fechaHace30DiasISO)
      )
    )

  // Inicializar exactamente los 30 días con 0
  const ventasDiariasMap = new Map<string, { importe: number; cantidad: number }>()
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().slice(0, 10)
    ventasDiariasMap.set(key, { importe: 0, cantidad: 0 })
  }

  for (const f of facturasRecientes) {
    const dia = f.fecha.slice(0, 10)
    if (ventasDiariasMap.has(dia)) {
      const actual = ventasDiariasMap.get(dia)!
      ventasDiariasMap.set(dia, {
        importe: actual.importe + f.total,
        cantidad: actual.cantidad + 1
      })
    }
  }

  const ventasDiarias = Array.from(ventasDiariasMap.entries()).map(([fecha, data]) => ({
    fecha,
    importe: data.importe,
    cantidad: data.cantidad
  }))

  // 7. Top 5 productos más vendidos del mes en curso (RF-T3: por unidades e importe)
  const detallesVendidos = await db
    .select({
      productoId: detallesFactura.productoId,
      descripcion: detallesFactura.descripcion,
      codigo: productos.codigo,
      cantidad: detallesFactura.cantidad,
      subtotal: detallesFactura.subtotalCentavos
    })
    .from(detallesFactura)
    .innerJoin(facturas, eq(detallesFactura.facturaId, facturas.id))
    .innerJoin(productos, eq(detallesFactura.productoId, productos.id))
    .where(
      and(
        eq(facturas.estado, 'EMITIDA'),
        gte(facturas.fecha, `${inicioMesStr}T00:00:00.000Z`)
      )
    )

  const topMap = new Map<
    number,
    { productoId: number; codigo: string; descripcion: string; unidades: number; importe: number }
  >()

  for (const item of detallesVendidos) {
    const actual = topMap.get(item.productoId) || {
      productoId: item.productoId,
      codigo: item.codigo,
      descripcion: item.descripcion,
      unidades: 0,
      importe: 0
    }
    topMap.set(item.productoId, {
      ...actual,
      unidades: actual.unidades + item.cantidad,
      importe: actual.importe + item.subtotal
    })
  }

  const masVendidos = Array.from(topMap.values())
    .sort((a, b) => b.unidades - a.unidades)
    .slice(0, 5)

  return {
    hoy: {
      cantidad: cantidadVentasHoy,
      importe: ventasHoyCentavos
    },
    mes: {
      cantidad: cantidadVentasMes,
      importe: ventasMesCentavos,
      ticketPromedio: ticketPromedioCentavos
    },
    cuentasCorrientes: {
      totalAdeudado: totalAdeudadoCentavos,
      clientesConSaldo: clientesConDeuda.length
    },
    bajoMinimo: {
      cantidad: productosBajoStockCount
    },
    ventasDiarias,
    porFormaDePago,
    masVendidos,
    // Compatibilidad adicional para componentes existentes:
    kpis: {
      ventasHoyCentavos,
      cantidadVentasHoy,
      ventasMesCentavos,
      cantidadVentasMes,
      ticketPromedioCentavos,
      saldoPorCobrarCentavos: totalAdeudadoCentavos,
      productosBajoStockCount
    },
    ventasPorDia: ventasDiarias.map((v) => ({
      dia: v.fecha,
      totalCentavos: v.importe,
      cantidad: v.cantidad
    })),
    topProductos: masVendidos.map((m) => ({
      productoId: m.productoId,
      codigo: m.codigo,
      descripcion: m.descripcion,
      cantidad: m.unidades,
      totalCentavos: m.importe
    }))
  }
}
