import { Router } from 'express'
import { eq, desc } from 'drizzle-orm'
import { db, sqlite } from '../db/index.js'
import { productos, movimientosStock, detallesVenta } from '../db/schema.js'
import { AppError } from '../middlewares/error.middleware.js'
import { requerirSesion } from '../middlewares/auth.middleware.js'

export const movimientosRouter = Router()
movimientosRouter.use(requerirSesion)

// Consultar movimientos
movimientosRouter.get('/', (req, res, next) => {
  try {
    const productoIdParam = req.query.productoId ? parseInt(req.query.productoId as string, 10) : undefined

    let query = db
      .select({
        id: movimientosStock.id,
        fecha: movimientosStock.fecha,
        productoId: movimientosStock.productoId,
        productoNombre: productos.nombre,
        detalleVentaId: movimientosStock.detalleVentaId,
        tipo: movimientosStock.tipo,
        cantidad: movimientosStock.cantidad,
        motivo: movimientosStock.motivo,
        origen: movimientosStock.origen,
        ventaId: detallesVenta.ventaId,
        usuarioId: movimientosStock.usuarioId
      })
      .from(movimientosStock)
      .innerJoin(productos, eq(movimientosStock.productoId, productos.id))
      .leftJoin(detallesVenta, eq(movimientosStock.detalleVentaId, detallesVenta.id))

    if (productoIdParam && !isNaN(productoIdParam)) {
      query = query.where(eq(movimientosStock.productoId, productoIdParam)) as any
    }

    const lista = query.orderBy(desc(movimientosStock.fecha), desc(movimientosStock.id)).all()
    return res.status(200).json({ datos: lista })
  } catch (err) {
    next(err)
  }
})

// Registrar una entrada o salida manual
movimientosRouter.post('/', (req, res, next) => {
  try {
    const { productoId, tipo, cantidad, motivo } = req.body || {}

    const prodId = parseInt(productoId, 10)
    if (isNaN(prodId)) {
      throw new AppError(422, 'DATOS_INVALIDOS', 'El productoId es obligatorio y debe ser numérico.')
    }

    if (tipo !== 'ENTRADA' && tipo !== 'SALIDA') {
      throw new AppError(422, 'DATOS_INVALIDOS', 'El tipo de movimiento debe ser ENTRADA o SALIDA.')
    }

    const cant = Number(cantidad)
    if (!Number.isInteger(cant) || cant <= 0) {
      throw new AppError(422, 'DATOS_INVALIDOS', 'La cantidad debe ser un número entero positivo.')
    }

    if (!motivo || typeof motivo !== 'string' || !motivo.trim()) {
      throw new AppError(422, 'DATOS_INVALIDOS', 'El motivo del movimiento es obligatorio.')
    }

    const fecha = new Date().toISOString()
    const usuarioId = req.usuario!.id

    const ejecutarTransaccion = sqlite.transaction(() => {
      const producto = db.select().from(productos).where(eq(productos.id, prodId)).get()
      if (!producto) {
        throw new AppError(404, 'PRODUCTO_NO_ENCONTRADO', 'El producto indicado no existe.')
      }

      let nuevoStock = producto.stockActual
      if (tipo === 'ENTRADA') {
        nuevoStock += cant
      } else {
        if (producto.stockActual < cant) {
          throw new AppError(
            409,
            'STOCK_INSUFICIENTE',
            `No hay stock suficiente para realizar la salida. Disponible: ${producto.stockActual}, Solicitado: ${cant}.`,
            { productoId: prodId, disponible: producto.stockActual, solicitado: cant }
          )
        }
        nuevoStock -= cant
      }

      // Actualizar producto
      db.update(productos)
        .set({ stockActual: nuevoStock })
        .where(eq(productos.id, prodId))
        .run()

      // Registrar movimiento
      const mov = db
        .insert(movimientosStock)
        .values({
          fecha,
          productoId: prodId,
          detalleVentaId: null,
          tipo,
          cantidad: cant,
          motivo: motivo.trim(),
          origen: 'MANUAL',
          usuarioId
        })
        .returning()
        .get()

      return {
        movimiento: {
          id: mov.id,
          productoId: mov.productoId,
          productoNombre: producto.nombre,
          detalleVentaId: null,
          tipo: mov.tipo,
          cantidad: mov.cantidad,
          motivo: mov.motivo,
          origen: mov.origen,
          ventaId: null,
          usuarioId: mov.usuarioId,
          fecha: mov.fecha
        },
        stockActual: nuevoStock
      }
    })

    const resultado = ejecutarTransaccion()
    return res.status(201).json(resultado)
  } catch (err) {
    next(err)
  }
})

