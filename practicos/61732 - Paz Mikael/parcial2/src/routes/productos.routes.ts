import { Router } from 'express'
import { eq, sql, and } from 'drizzle-orm'
import { db, sqlite } from '../db/index.js'
import { productos, movimientosStock } from '../db/schema.js'
import { AppError } from '../middlewares/error.middleware.js'
import { requerirSesion } from '../middlewares/auth.middleware.js'

export const productosRouter = Router()
productosRouter.use(requerirSesion)

// Listar productos
productosRouter.get('/', (req, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : ''
    const activoParam = req.query.activo

    let query = db.select().from(productos)
    const condiciones: any[] = []

    if (q) {
      condiciones.push(
        sql`(LOWER(${productos.codigo}) LIKE ${'%' + q + '%'} OR LOWER(${productos.nombre}) LIKE ${'%' + q + '%'})`
      )
    }

    if (activoParam !== undefined) {
      const activoBool = activoParam === 'true' || activoParam === '1'
      condiciones.push(eq(productos.activo, activoBool))
    }

    if (condiciones.length > 0) {
      query = query.where(and(...condiciones)) as any
    }

    const lista = query.orderBy(productos.nombre, productos.id).all()
    return res.status(200).json({ datos: lista })
  } catch (err) {
    next(err)
  }
})

// Obtener un producto
productosRouter.get('/:id', (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) throw new AppError(400, 'PARAMETRO_INVALIDO', 'El identificador debe ser numérico.')

    const producto = db.select().from(productos).where(eq(productos.id, id)).get()
    if (!producto) {
      throw new AppError(404, 'PRODUCTO_NO_ENCONTRADO', 'El producto solicitado no existe.')
    }

    return res.status(200).json(producto)
  } catch (err) {
    next(err)
  }
})

// Crear producto
productosRouter.post('/', (req, res, next) => {
  try {
    const { codigo, nombre, precioVentaCentavos, stockInicial = 0, activo = true } = req.body || {}

    if (!codigo || typeof codigo !== 'string' || !codigo.trim()) {
      throw new AppError(422, 'DATOS_INVALIDOS', 'El código de producto es obligatorio.')
    }
    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      throw new AppError(422, 'DATOS_INVALIDOS', 'El nombre del producto es obligatorio.')
    }

    const precio = Number(precioVentaCentavos)
    if (!Number.isInteger(precio) || precio <= 0) {
      throw new AppError(422, 'DATOS_INVALIDOS', 'El precio de venta en centavos debe ser un número entero positivo.')
    }

    const stock = Number(stockInicial)
    if (!Number.isInteger(stock) || stock < 0) {
      throw new AppError(422, 'DATOS_INVALIDOS', 'El stock inicial debe ser un número entero mayor o igual a cero.')
    }

    const codigoNormalizado = codigo.trim().toUpperCase()
    const existente = db
      .select()
      .from(productos)
      .where(sql`UPPER(${productos.codigo}) = ${codigoNormalizado}`)
      .get()

    if (existente) {
      throw new AppError(409, 'CODIGO_DUPLICADO', 'Ya existe un producto con ese código.')
    }

    const fecha = new Date().toISOString()
    const usuarioId = req.usuario!.id

    // Crear producto y registrar movimiento inicial atómicamente
    const ejecutarTransaccion = sqlite.transaction(() => {
      const prodCreado = db
        .insert(productos)
        .values({
          codigo: codigoNormalizado,
          nombre: nombre.trim(),
          precioVentaCentavos: precio,
          stockActual: stock,
          activo: Boolean(activo),
          creadoEn: fecha
        })
        .returning()
        .get()

      if (stock > 0) {
        db.insert(movimientosStock)
          .values({
            fecha,
            productoId: prodCreado.id,
            detalleVentaId: null,
            tipo: 'ENTRADA',
            cantidad: stock,
            motivo: 'Stock inicial',
            origen: 'INICIAL',
            usuarioId
          })
          .run()
      }

      return prodCreado
    })

    const productoCreado = ejecutarTransaccion()
    res.setHeader('Location', `/api/productos/${productoCreado.id}`)
    return res.status(201).json(productoCreado)
  } catch (err) {
    next(err)
  }
})

// Modificar producto
productosRouter.patch('/:id', (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) throw new AppError(400, 'PARAMETRO_INVALIDO', 'El identificador debe ser numérico.')

    const productoActual = db.select().from(productos).where(eq(productos.id, id)).get()
    if (!productoActual) {
      throw new AppError(404, 'PRODUCTO_NO_ENCONTRADO', 'El producto solicitado no existe.')
    }

    if (req.body?.stockInicial !== undefined) {
      throw new AppError(422, 'CAMPO_NO_EDITABLE', 'El stock inicial solo se admite en la creación. Use movimientos para ajustar existencias.')
    }

    const { codigo, nombre, precioVentaCentavos, activo } = req.body || {}
    const cambios: any = {}

    if (codigo !== undefined) {
      if (typeof codigo !== 'string' || !codigo.trim()) {
        throw new AppError(422, 'DATOS_INVALIDOS', 'El código no puede quedar vacío.')
      }
      const codigoNormalizado = codigo.trim().toUpperCase()
      const duplicado = db
        .select()
        .from(productos)
        .where(and(sql`UPPER(${productos.codigo}) = ${codigoNormalizado}`, sql`${productos.id} != ${id}`))
        .get()

      if (duplicado) {
        throw new AppError(409, 'CODIGO_DUPLICADO', 'Ya existe otro producto con ese código.')
      }
      cambios.codigo = codigoNormalizado
    }

    if (nombre !== undefined) {
      if (typeof nombre !== 'string' || !nombre.trim()) {
        throw new AppError(422, 'DATOS_INVALIDOS', 'El nombre no puede quedar vacío.')
      }
      cambios.nombre = nombre.trim()
    }

    if (precioVentaCentavos !== undefined) {
      const precio = Number(precioVentaCentavos)
      if (!Number.isInteger(precio) || precio <= 0) {
        throw new AppError(422, 'DATOS_INVALIDOS', 'El precio de venta en centavos debe ser un número entero positivo.')
      }
      cambios.precioVentaCentavos = precio
    }

    if (activo !== undefined) {
      cambios.activo = Boolean(activo)
    }

    if (Object.keys(cambios).length === 0) {
      return res.status(200).json(productoActual)
    }

    const actualizado = db
      .update(productos)
      .set(cambios)
      .where(eq(productos.id, id))
      .returning()
      .get()

    return res.status(200).json(actualizado)
  } catch (err) {
    next(err)
  }
})

