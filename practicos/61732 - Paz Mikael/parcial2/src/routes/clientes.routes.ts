import { Router } from 'express'
import { eq, sql, and, desc } from 'drizzle-orm'
import { db, sqlite } from '../db/index.js'
import { clientes, ventas, pagos } from '../db/schema.js'
import { AppError } from '../middlewares/error.middleware.js'
import { requerirSesion } from '../middlewares/auth.middleware.js'

export const clientesRouter = Router()
clientesRouter.use(requerirSesion)

// Función auxiliar para calcular el saldo de un cliente
export function calcularSaldoCliente(clienteId: number): number {
  const sumaVentas = db
    .select({ total: sql<number>`coalesce(sum(${ventas.totalCentavos}), 0)` })
    .from(ventas)
    .where(and(eq(ventas.clienteId, clienteId), eq(ventas.formaPago, 'CUENTA_CORRIENTE')))
    .get()

  const sumaPagos = db
    .select({ total: sql<number>`coalesce(sum(${pagos.importeCentavos}), 0)` })
    .from(pagos)
    .where(eq(pagos.clienteId, clienteId))
    .get()

  const totalVentas = sumaVentas?.total || 0
  const totalPagos = sumaPagos?.total || 0
  return Math.max(0, totalVentas - totalPagos)
}

// Listar clientes
clientesRouter.get('/', (req, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : ''

    let query = db.select().from(clientes)
    if (q) {
      query = query.where(
        sql`(LOWER(${clientes.nombre}) LIKE ${'%' + q + '%'} OR LOWER(${clientes.documento}) LIKE ${'%' + q + '%'})`
      ) as any
    }

    const lista = query.orderBy(clientes.nombre, clientes.id).all()

    // Adjuntar saldo calculado para cada cliente
    const conSaldo = lista.map((c) => ({
      id: c.id,
      nombre: c.nombre,
      documento: c.documento,
      telefono: c.telefono,
      correo: c.correo,
      saldoCentavos: calcularSaldoCliente(c.id)
    }))

    return res.status(200).json({ datos: conSaldo })
  } catch (err) {
    next(err)
  }
})

// Obtener un cliente
clientesRouter.get('/:id', (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) throw new AppError(400, 'PARAMETRO_INVALIDO', 'El identificador debe ser numérico.')

    const cliente = db.select().from(clientes).where(eq(clientes.id, id)).get()
    if (!cliente) {
      throw new AppError(404, 'CLIENTE_NO_ENCONTRADO', 'El cliente solicitado no existe.')
    }

    const saldoCentavos = calcularSaldoCliente(id)
    return res.status(200).json({
      id: cliente.id,
      nombre: cliente.nombre,
      documento: cliente.documento,
      telefono: cliente.telefono,
      correo: cliente.correo,
      saldoCentavos
    })
  } catch (err) {
    next(err)
  }
})

// Crear cliente
clientesRouter.post('/', (req, res, next) => {
  try {
    const { nombre, documento, telefono, correo } = req.body || {}

    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      throw new AppError(422, 'DATOS_INVALIDOS', 'El nombre del cliente es obligatorio.')
    }
    if (!documento || typeof documento !== 'string' || !documento.trim()) {
      throw new AppError(422, 'DATOS_INVALIDOS', 'El documento o CUIT es obligatorio.')
    }

    const telLimpio = telefono && typeof telefono === 'string' && telefono.trim() ? telefono.trim() : null
    const mailLimpio = correo && typeof correo === 'string' && correo.trim() ? correo.trim() : null

    if (!telLimpio && !mailLimpio) {
      throw new AppError(422, 'DATOS_INVALIDOS', 'Debe registrar al menos un dato de contacto (teléfono o correo).')
    }

    const creadoEn = new Date().toISOString()
    const nuevo = db
      .insert(clientes)
      .values({
        nombre: nombre.trim(),
        documento: documento.trim(),
        telefono: telLimpio,
        correo: mailLimpio,
        creadoEn
      })
      .returning()
      .get()

    res.setHeader('Location', `/api/clientes/${nuevo.id}`)
    return res.status(201).json({
      id: nuevo.id,
      nombre: nuevo.nombre,
      documento: nuevo.documento,
      telefono: nuevo.telefono,
      correo: nuevo.correo,
      saldoCentavos: 0
    })
  } catch (err) {
    next(err)
  }
})

// Modificar cliente
clientesRouter.patch('/:id', (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) throw new AppError(400, 'PARAMETRO_INVALIDO', 'El identificador debe ser numérico.')

    const clienteActual = db.select().from(clientes).where(eq(clientes.id, id)).get()
    if (!clienteActual) {
      throw new AppError(404, 'CLIENTE_NO_ENCONTRADO', 'El cliente solicitado no existe.')
    }

    const { nombre, documento, telefono, correo } = req.body || {}
    const cambios: any = {}

    if (nombre !== undefined) {
      if (typeof nombre !== 'string' || !nombre.trim()) {
        throw new AppError(422, 'DATOS_INVALIDOS', 'El nombre no puede quedar vacío.')
      }
      cambios.nombre = nombre.trim()
    }

    if (documento !== undefined) {
      if (typeof documento !== 'string' || !documento.trim()) {
        throw new AppError(422, 'DATOS_INVALIDOS', 'El documento no puede quedar vacío.')
      }
      cambios.documento = documento.trim()
    }

    if (telefono !== undefined) {
      cambios.telefono = typeof telefono === 'string' && telefono.trim() ? telefono.trim() : null
    }

    if (correo !== undefined) {
      cambios.correo = typeof correo === 'string' && correo.trim() ? correo.trim() : null
    }

    // Comprobar que al menos quede un contacto
    const telFinal = cambios.telefono !== undefined ? cambios.telefono : clienteActual.telefono
    const mailFinal = cambios.correo !== undefined ? cambios.correo : clienteActual.correo
    if (!telFinal && !mailFinal) {
      throw new AppError(422, 'DATOS_INVALIDOS', 'El cliente debe conservar al menos un dato de contacto.')
    }

    let actualizado = clienteActual
    if (Object.keys(cambios).length > 0) {
      actualizado = db.update(clientes).set(cambios).where(eq(clientes.id, id)).returning().get()
    }

    const saldoCentavos = calcularSaldoCliente(id)
    return res.status(200).json({
      id: actualizado.id,
      nombre: actualizado.nombre,
      documento: actualizado.documento,
      telefono: actualizado.telefono,
      correo: actualizado.correo,
      saldoCentavos
    })
  } catch (err) {
    next(err)
  }
})

// Consultar cuenta corriente de un cliente
clientesRouter.get('/:id/cuenta-corriente', (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) throw new AppError(400, 'PARAMETRO_INVALIDO', 'El identificador debe ser numérico.')

    const cliente = db.select().from(clientes).where(eq(clientes.id, id)).get()
    if (!cliente) {
      throw new AppError(404, 'CLIENTE_NO_ENCONTRADO', 'El cliente solicitado no existe.')
    }

    const ventasCtaCte = db
      .select({
        tipo: sql<string>`'VENTA'`,
        fecha: ventas.fecha,
        ventaId: ventas.id,
        numeroComprobante: ventas.numero,
        importeCentavos: ventas.totalCentavos,
        observacion: sql<string | null>`null`
      })
      .from(ventas)
      .where(and(eq(ventas.clienteId, id), eq(ventas.formaPago, 'CUENTA_CORRIENTE')))
      .all()

    const pagosCliente = db
      .select({
        tipo: sql<string>`'PAGO'`,
        fecha: pagos.fecha,
        pagoId: pagos.id,
        numeroComprobante: sql<number | null>`null`,
        importeCentavos: pagos.importeCentavos,
        observacion: pagos.observacion
      })
      .from(pagos)
      .where(eq(pagos.clienteId, id))
      .all()

    const movimientos = [...ventasCtaCte, ...pagosCliente].sort((a, b) => {
      const cmpFecha = new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
      if (cmpFecha !== 0) return cmpFecha
      const idA = (a as any).ventaId || (a as any).pagoId || 0
      const idB = (b as any).ventaId || (b as any).pagoId || 0
      return idB - idA
    })

    const saldoCentavos = calcularSaldoCliente(id)

    return res.status(200).json({
      clienteId: id,
      saldoCentavos,
      movimientos
    })
  } catch (err) {
    next(err)
  }
})

// Registrar un pago en cuenta corriente
clientesRouter.post('/:id/pagos', (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) throw new AppError(400, 'PARAMETRO_INVALIDO', 'El identificador debe ser numérico.')

    const { fecha, importeCentavos, observacion } = req.body || {}

    if (!fecha || isNaN(Date.parse(fecha))) {
      throw new AppError(422, 'DATOS_INVALIDOS', 'Debe proporcionar una fecha y hora válida.')
    }

    if (new Date(fecha).getTime() > Date.now() + 5 * 60 * 1000) {
      throw new AppError(422, 'DATOS_INVALIDOS', 'La fecha del pago no puede ser futura.')
    }

    const importe = Number(importeCentavos)
    if (!Number.isInteger(importe) || importe <= 0) {
      throw new AppError(422, 'DATOS_INVALIDOS', 'El importe en centavos debe ser un número entero positivo.')
    }

    const usuarioId = req.usuario!.id

    const ejecutarTransaccion = sqlite.transaction(() => {
      const cliente = db.select().from(clientes).where(eq(clientes.id, id)).get()
      if (!cliente) {
        throw new AppError(404, 'CLIENTE_NO_ENCONTRADO', 'El cliente solicitado no existe.')
      }

      const saldoActual = calcularSaldoCliente(id)
      if (importe > saldoActual) {
        throw new AppError(
          409,
          'PAGO_EXCEDE_SALDO',
          `El importe del pago ($ ${(importe / 100).toFixed(2)}) supera el saldo adeudado ($ ${(saldoActual / 100).toFixed(2)}).`,
          { saldoCentavos: saldoActual, importeSolicitado: importe }
        )
      }

      const nuevoPago = db
        .insert(pagos)
        .values({
          clienteId: id,
          usuarioId,
          fecha: new Date(fecha).toISOString(),
          importeCentavos: importe,
          observacion: observacion && typeof observacion === 'string' && observacion.trim() ? observacion.trim() : null
        })
        .returning()
        .get()

      const nuevoSaldo = saldoActual - importe

      return {
        pago: {
          id: nuevoPago.id,
          clienteId: nuevoPago.clienteId,
          usuarioId: nuevoPago.usuarioId,
          fecha: nuevoPago.fecha,
          importeCentavos: nuevoPago.importeCentavos,
          observacion: nuevoPago.observacion
        },
        saldoCentavos: nuevoSaldo
      }
    })

    const resultado = ejecutarTransaccion()
    return res.status(201).json(resultado)
  } catch (err) {
    next(err)
  }
})

