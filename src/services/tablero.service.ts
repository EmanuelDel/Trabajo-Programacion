import { and, desc, eq, gte, lte, sql } from 'drizzle-orm'
import { db } from '../db'
import { facturas, detallesFactura, productos, clientes, pagos } from '../db/schema'
import { listarClientes } from './clientes.service'

export async function obtenerMetricasTablero() {
  const hoyStr = new Date().toISOString().slice(0, 10)
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
    .select({ total: facturas.totalCentavos })
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

  // 3. Saldo total por cobrar en cuenta corriente
  const todosClientes = await listarClientes({ soloActivos: true })
  const saldoPorCobrarCentavos = todosClientes
    .filter((c) => c.saldoCentavos > 0)
    .reduce((acc, c) => acc + c.saldoCentavos, 0)

  // 4. Productos con existencia menor o igual a stock mínimo
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

  // 5. Ventas por día (últimos 14 días)
  const fechaHace14Dias = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const facturasRecientes = await db
    .select({
      fecha: facturas.fecha,
      total: facturas.totalCentavos
    })
    .from(facturas)
    .where(
      and(
        eq(facturas.estado, 'EMITIDA'),
        gte(facturas.fecha, fechaHace14Dias)
      )
    )

  // Agrupar por día YYYY-MM-DD
  const ventasPorDiaMap = new Map<string, { totalCentavos: number; cantidad: number }>()

  // Inicializar los últimos 14 días con 0
  for (let i = 13; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().slice(0, 10)
    ventasPorDiaMap.set(key, { totalCentavos: 0, cantidad: 0 })
  }

  for (const f of facturasRecientes) {
    const dia = f.fecha.slice(0, 10)
    const actual = ventasPorDiaMap.get(dia) || { totalCentavos: 0, cantidad: 0 }
    ventasPorDiaMap.set(dia, {
      totalCentavos: actual.totalCentavos + f.total,
      cantidad: actual.cantidad + 1
    })
  }

  const ventasPorDia = Array.from(ventasPorDiaMap.entries()).map(([dia, data]) => ({
    dia,
    totalCentavos: data.totalCentavos,
    cantidad: data.cantidad
  }))

  // 6. Top 5 productos más vendidos (últimos 30 días)
  const hace30Dias = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const detallesVendidos = await db
    .select({
      productoId: detallesFactura.productoId,
      descripcion: detallesFactura.descripcion,
      cantidad: detallesFactura.cantidad,
      subtotal: detallesFactura.subtotalCentavos,
      estadoFactura: facturas.estado,
      fechaFactura: facturas.fecha
    })
    .from(detallesFactura)
    .innerJoin(facturas, eq(detallesFactura.facturaId, facturas.id))
    .where(
      and(
        eq(facturas.estado, 'EMITIDA'),
        gte(facturas.fecha, hace30Dias)
      )
    )

  const topMap = new Map<
    number,
    { productoId: number; descripcion: string; cantidad: number; totalCentavos: number }
  >()

  for (const item of detallesVendidos) {
    const actual = topMap.get(item.productoId) || {
      productoId: item.productoId,
      descripcion: item.descripcion,
      cantidad: 0,
      totalCentavos: 0
    }
    topMap.set(item.productoId, {
      ...actual,
      cantidad: actual.cantidad + item.cantidad,
      totalCentavos: actual.totalCentavos + item.subtotal
    })
  }

  const topProductos = Array.from(topMap.values())
    .sort((a, b) => b.cantidad - a.cantidad)
    .slice(0, 5)

  return {
    kpis: {
      ventasHoyCentavos,
      cantidadVentasHoy,
      ventasMesCentavos,
      cantidadVentasMes,
      ticketPromedioCentavos,
      saldoPorCobrarCentavos,
      productosBajoStockCount
    },
    ventasPorDia,
    topProductos
  }
}
