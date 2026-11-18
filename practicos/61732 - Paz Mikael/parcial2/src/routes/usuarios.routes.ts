import { Router } from 'express'
import { eq, sql, and } from 'drizzle-orm'
import { db } from '../db/index.js'
import { usuarios } from '../db/schema.js'
import { hashearClave, invalidarSesionesDeUsuario } from '../services/auth.service.js'
import { AppError } from '../middlewares/error.middleware.js'
import { requerirAdmin } from '../middlewares/auth.middleware.js'

export const usuariosRouter = Router()
usuariosRouter.use(requerirAdmin)

// Listar usuarios
usuariosRouter.get('/', (req, res, next) => {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : ''
    let query = db
      .select({
        id: usuarios.id,
        nombre: usuarios.nombre,
        acceso: usuarios.acceso,
        administrador: usuarios.administrador,
        activo: usuarios.activo
      })
      .from(usuarios)

    if (q) {
      query = query.where(
        sql`LOWER(${usuarios.nombre}) LIKE ${'%' + q + '%'} OR LOWER(${usuarios.acceso}) LIKE ${'%' + q + '%'}`
      ) as any
    }

    const lista = query.orderBy(usuarios.nombre, usuarios.id).all()
    return res.status(200).json({ datos: lista })
  } catch (err) {
    next(err)
  }
})

// Obtener un usuario
usuariosRouter.get('/:id', (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) throw new AppError(400, 'PARAMETRO_INVALIDO', 'El identificador debe ser numérico.')

    const usuario = db
      .select({
        id: usuarios.id,
        nombre: usuarios.nombre,
        acceso: usuarios.acceso,
        administrador: usuarios.administrador,
        activo: usuarios.activo
      })
      .from(usuarios)
      .where(eq(usuarios.id, id))
      .get()

    if (!usuario) {
      throw new AppError(404, 'USUARIO_NO_ENCONTRADO', 'El usuario solicitado no existe.')
    }

    return res.status(200).json(usuario)
  } catch (err) {
    next(err)
  }
})

// Crear un usuario
usuariosRouter.post('/', (req, res, next) => {
  try {
    const { nombre, acceso, contrasena, administrador = false, activo = true } = req.body || {}

    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) {
      throw new AppError(422, 'DATOS_INVALIDOS', 'El nombre es obligatorio.')
    }
    if (!acceso || typeof acceso !== 'string' || !acceso.trim()) {
      throw new AppError(422, 'DATOS_INVALIDOS', 'El acceso o correo es obligatorio.')
    }
    if (!contrasena || typeof contrasena !== 'string' || !contrasena.trim()) {
      throw new AppError(422, 'DATOS_INVALIDOS', 'La contraseña es obligatoria.')
    }

    const accesoNormalizado = acceso.trim().toLowerCase()
    const existente = db
      .select()
      .from(usuarios)
      .where(sql`LOWER(${usuarios.acceso}) = ${accesoNormalizado}`)
      .get()

    if (existente) {
      throw new AppError(409, 'ACCESO_DUPLICADO', 'Ya existe un usuario con ese nombre de acceso o correo.')
    }

    const contrasenaHash = hashearClave(contrasena.trim())
    const creadoEn = new Date().toISOString()

    const resultado = db
      .insert(usuarios)
      .values({
        nombre: nombre.trim(),
        acceso: acceso.trim(),
        contrasenaHash,
        administrador: Boolean(administrador),
        activo: Boolean(activo),
        creadoEn
      })
      .returning({
        id: usuarios.id,
        nombre: usuarios.nombre,
        acceso: usuarios.acceso,
        administrador: usuarios.administrador,
        activo: usuarios.activo
      })
      .get()

    res.setHeader('Location', `/api/usuarios/${resultado.id}`)
    return res.status(201).json(resultado)
  } catch (err) {
    next(err)
  }
})

// Modificar usuario
usuariosRouter.patch('/:id', (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (isNaN(id)) throw new AppError(400, 'PARAMETRO_INVALIDO', 'El identificador debe ser numérico.')

    const usuarioActual = db.select().from(usuarios).where(eq(usuarios.id, id)).get()
    if (!usuarioActual) {
      throw new AppError(404, 'USUARIO_NO_ENCONTRADO', 'El usuario solicitado no existe.')
    }

    const { nombre, acceso, administrador, activo } = req.body || {}
    const cambios: any = {}

    if (nombre !== undefined) {
      if (typeof nombre !== 'string' || !nombre.trim()) {
        throw new AppError(422, 'DATOS_INVALIDOS', 'El nombre no puede quedar vacío.')
      }
      cambios.nombre = nombre.trim()
    }

    if (acceso !== undefined) {
      if (typeof acceso !== 'string' || !acceso.trim()) {
        throw new AppError(422, 'DATOS_INVALIDOS', 'El acceso no puede quedar vacío.')
      }
      const accesoNormalizado = acceso.trim().toLowerCase()
      const duplicado = db
        .select()
        .from(usuarios)
        .where(and(sql`LOWER(${usuarios.acceso}) = ${accesoNormalizado}`, sql`${usuarios.id} != ${id}`))
        .get()

      if (duplicado) {
        throw new AppError(409, 'ACCESO_DUPLICADO', 'Ya existe otro usuario con ese nombre de acceso o correo.')
      }
      cambios.acceso = acceso.trim()
    }

    // Regla de seguridad: No desactivar ni quitar perfil al último administrador activo
    if (usuarioActual.administrador && (administrador === false || activo === false)) {
      const cantAdminsActivos = db
        .select({ count: sql<number>`count(*)` })
        .from(usuarios)
        .where(and(eq(usuarios.administrador, true), eq(usuarios.activo, true)))
        .get()

      if (cantAdminsActivos && cantAdminsActivos.count <= 1) {
        throw new AppError(409, 'ACCION_NO_PERMITIDA', 'No se puede desactivar ni quitar el rol al único administrador activo.')
      }
    }

    if (administrador !== undefined) {
      cambios.administrador = Boolean(administrador)
    }

    if (activo !== undefined) {
      cambios.activo = Boolean(activo)
      if (!cambios.activo) {
        invalidarSesionesDeUsuario(id)
      }
    }

    if (Object.keys(cambios).length === 0) {
      return res.status(200).json({
        id: usuarioActual.id,
        nombre: usuarioActual.nombre,
        acceso: usuarioActual.acceso,
        administrador: usuarioActual.administrador,
        activo: usuarioActual.activo
      })
    }

    const actualizado = db
      .update(usuarios)
      .set(cambios)
      .where(eq(usuarios.id, id))
      .returning({
        id: usuarios.id,
        nombre: usuarios.nombre,
        acceso: usuarios.acceso,
        administrador: usuarios.administrador,
        activo: usuarios.activo
      })
      .get()

    return res.status(200).json(actualizado)
  } catch (err) {
    next(err)
  }
})

