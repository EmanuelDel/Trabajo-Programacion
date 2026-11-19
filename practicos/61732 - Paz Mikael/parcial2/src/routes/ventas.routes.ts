import { Router } from 'express'
import { eq, desc, sql } from 'drizzle-orm'
import { db, sqlite } from '../db/index.js'
import { ventas, detallesVenta, productos, clientes, movimientosStock } from '../db/schema.js'
import { AppError } from '../middlewares/error.middleware.js'
import { requerirSesion } from '../middlewares/auth.middleware.js'

export const ventasRouter = Router()
ventasRouter.use(requerirSesion)

// Listar ventas
ventasRouter.get('/', (req, res, next) => {
  try {
    const lista = db
      .select({
        id: ventas.id,
        numero: ventas.numero,
        clienteId: ventas.clienteId,
        fecha: ventas.fecha,
        clienteNombre: ventas.clienteNombre,
        formaPago: ventas.formaPago,
        totalCentavos: ventas.totalCentavos
      })
      .from(ventas)
      .orderBy(desc(ventas.fecha), desc(ventas.numero))
      .all()

    return res.status(200).json({ datos: lista })
  } catch (err) {
    next(err)
  }
})

// Consultar comprobante
ventasRouter.get('/:id', (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) throw new AppError(400, 'PARAMETRO_INVALIDO', 'El identificador debe ser numérico.')

    const venta = db.select().from(ventas).where(eq(ventas.id, id)).get()
    if (!venta) {
      throw new AppError(404, 'VENTA_NO_ENCONTRADA', 'La venta solicitada no existe.')
    }

    const items = db
      .select({
        productoId: detallesVenta.productoId,
        descripcion: detallesVenta.descripcion,
        cantidad: detallesVenta.cantidad,
        precioUnitarioCentavos: detallesVenta.precioUnitarioCentavos,
        subtotalCentavos: detallesVenta.subtotalCentavos
      })
      .from(detallesVenta)
      .where(eq(detallesVenta.ventaId, id))
      .all()

    return res.status(200).json({
      id: venta.id,
      numero: venta.numero,
      fecha: venta.fecha,
      usuarioId: venta.usuarioId,
      clienteId: venta.clienteId,
      clienteNombre: venta.clienteNombre,
      clienteDocumento: venta.clienteDocumento,
      formaPago: venta.formaPago,
      productos: items,
      totalCentavos: venta.totalCentavos
    })
  } catch (err) {
    next(err)
  }
})

// Registrar venta
ventasRouter.post('/', (req, res, next) => {
  try {
    const { clienteId = null, formaPago, productos: productosEntrada } = req.body || {}

    const formasValidas = ['CONTADO', 'TARJETA', 'CUENTA_CORRIENTE']
    if (!formaPago || !formasValidas.includes(formaPago)) {
      throw new AppError(422, 'FORMA_PAGO_INVALIDA', 'La forma de pago debe ser CONTADO, TARJETA o CUENTA_CORRIENTE.')
    }

    if (!Array.isArray(productosEntrada) || productosEntrada.length === 0) {
      throw new AppError(422, 'DATOS_INVALIDOS', 'Debe incluir al menos un producto en la venta.')
    }

    if (formaPago === 'CUENTA_CORRIENTE' && (clienteId === null || clienteId === undefined)) {
      throw new AppError(422, 'CLIENTE_REQUERIDO', 'La venta en cuenta corriente requiere un cliente registrado.')
    }

    // Consolidar cantidades si un producto viene repetido
    const mapaProductos = new Map<number, number>()
    for (const item of productosEntrada) {
      const prodId = parseInt(item?.productoId, 10)
      const cant = Number(item?.cantidad)
      if (isNaN(prodId) || !Number.isInteger(cant) || cant <= 0) {
        throw new AppError(422, 'DATOS_INVALIDOS', 'Los productos deben contener productoId y cantidad entera positiva.')
      }
      mapaProductos.set(prodId, (mapaProductos.get(prodId) || 0) + cant)
    }

    const fecha = new Date().toISOString()
    const usuarioId = req.usuario!.id

    const ejecutarTransaccion = sqlite.transaction(() => {
      // 1. Obtener y validar cliente
      let clienteNombre = 'Consumidor final'
      let clienteDocumento: string | null = null
      let clienteIdFinal: number | null = null

      if (clienteId !== null && clienteId !== undefined) {
        const cId = parseInt(clienteId, 10)
        const clienteExistente = db.select().from(clientes).where(eq(clientes.id, cId)).get()
        if (!clienteExistente) {
          throw new AppError(404, 'CLIENTE_NO_ENCONTRADO', 'El cliente indicado no existe.')
        }
        clienteIdFinal = clienteExistente.id
        clienteNombre = clienteExistente.nombre
        clienteDocumento = clienteExistente.documento
      }

      // 2. Validar productos, estado activo y disponibilidad de stock
      let totalCalculadoCentavos = 0
      const detallesParaGuardar: Array<{
        productoId: number
        descripcion: string
        cantidad: number
        precioUnitarioCentavos: number
        subtotalCentavos: number
      }> = []

      for (const [prodId, cantidad] of mapaProductos.entries()) {
        const prod = db.select().from(productos).where(eq(productos.id, prodId)).get()
        if (!prod) {
          throw new AppError(404, 'PRODUCTO_NO_ENCONTRADO', `El producto con ID ${prodId} no existe.`)
        }

        if (!prod.activo) {
          throw new AppError(
            409,
            'PRODUCTO_INACTIVO',
            `El producto "${prod.nombre}" se encuentra inactivo y no puede agregarse a nuevas ventas.`
          )
        }

        if (prod.stockActual < cantidad) {
          throw new AppError(
            409,
            'STOCK_INSUFICIENTE',
            `No hay stock suficiente para "${prod.nombre}".`,
            { productoId: prodId, disponible: prod.stockActual, solicitado: cantidad }
          )
        }

        const subtotal = prod.precioVentaCentavos * cantidad
        totalCalculadoCentavos += subtotal

        detallesParaGuardar.push({
          productoId: prod.id,
          descripcion: prod.nombre,
          cantidad,
          precioUnitarioCentavos: prod.precioVentaCentavos,
          subtotalCentavos: subtotal
        })
      }

      // 3. Asignación atómica de número de comprobante único
      const maxNumRes = db.select({ maxNum: sql<number>`coalesce(max(${ventas.numero}), 0)` }).from(ventas).get()
      const proximoNumero = (maxNumRes?.maxNum || 0) + 1

      // 4. Guardar venta
      const ventaCreada = db
        .insert(ventas)
        .values({
          numero: proximoNumero,
          fecha,
          usuarioId,
          clienteId: clienteIdFinal,
          clienteNombre,
          clienteDocumento,
          formaPago,
          totalCentavos: totalCalculadoCentavos
        })
        .returning()
        .get()

      // 5. Guardar detalles, descontar stock y generar movimientos de salida
      for (const item of detallesParaGuardar) {
        const detalleCreado = db
          .insert(detallesVenta)
          .values({
            ventaId: ventaCreada.id,
            productoId: item.productoId,
            descripcion: item.descripcion,
            cantidad: item.cantidad,
            precioUnitarioCentavos: item.precioUnitarioCentavos,
            subtotalCentavos: item.subtotalCentavos
          })
          .returning()
          .get()

        // Descontar stock
        db.update(productos)
          .set({ stockActual: sql`${productos.stockActual} - ${item.cantidad}` })
          .where(eq(productos.id, item.productoId))
          .run()

        // Movimiento de salida
        db.insert(movimientosStock)
          .values({
            fecha,
            productoId: item.productoId,
            detalleVentaId: detalleCreado.id,
            tipo: 'SALIDA',
            cantidad: item.cantidad,
            motivo: `Venta #${proximoNumero}`,
            origen: 'VENTA',
            usuarioId
          })
          .run()
      }

      return {
        id: ventaCreada.id,
        numero: ventaCreada.numero,
        fecha: ventaCreada.fecha,
        usuarioId: ventaCreada.usuarioId,
        clienteId: ventaCreada.clienteId,
        clienteNombre: ventaCreada.clienteNombre,
        clienteDocumento: ventaCreada.clienteDocumento,
        formaPago: ventaCreada.formaPago,
        productos: detallesParaGuardar,
        totalCentavos: ventaCreada.totalCentavos
      }
    })

    const comprobante = ejecutarTransaccion()
    res.setHeader('Location', `/api/ventas/${comprobante.id}`)
    return res.status(201).json(comprobante)
  } catch (err) {
    next(err)
  }
})

