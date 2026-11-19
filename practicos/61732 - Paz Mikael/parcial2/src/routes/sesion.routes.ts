import { Router } from 'express'
import { eq, sql } from 'drizzle-orm'
import { db } from '../db/index.js'
import { usuarios } from '../db/schema.js'
import { verificarClave, crearSesion, invalidarSesion } from '../services/auth.service.js'
import { AppError } from '../middlewares/error.middleware.js'

export const sesionRouter = Router()

// Iniciar sesión
sesionRouter.post('/', (req, res, next) => {
  try {
    const { acceso, contrasena } = req.body || {}
    if (!acceso || typeof acceso !== 'string' || !contrasena || typeof contrasena !== 'string') {
      throw new AppError(422, 'DATOS_INVALIDOS', 'Debe ingresar el acceso y la contraseña.')
    }

    const accesoLimpio = acceso.trim().toLowerCase()
    const usuario = db
      .select()
      .from(usuarios)
      .where(sql`LOWER(${usuarios.acceso}) = ${accesoLimpio}`)
      .get()

    if (!usuario) {
      throw new AppError(401, 'CREDENCIALES_INVALIDAS', 'Credenciales inválidas.')
    }

    if (!usuario.activo) {
      throw new AppError(401, 'USUARIO_INACTIVO', 'El usuario se encuentra inactivo.')
    }

    const claveValida = verificarClave(contrasena, usuario.contrasenaHash)
    if (!claveValida) {
      throw new AppError(401, 'CREDENCIALES_INVALIDAS', 'Credenciales inválidas.')
    }

    const token = crearSesion(usuario.id)
    res.cookie('sesion_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000
    })

    return res.status(200).json({
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        acceso: usuario.acceso,
        administrador: usuario.administrador,
        activo: usuario.activo
      }
    })
  } catch (err) {
    next(err)
  }
})

// Consultar sesión actual
sesionRouter.get('/', (req, res, next) => {
  if (!req.usuario) {
    return next(new AppError(401, 'NO_AUTORIZADO', 'Falta una sesión válida o ha expirado.'))
  }
  return res.status(200).json({
    usuario: {
      id: req.usuario.id,
      nombre: req.usuario.nombre,
      acceso: req.usuario.acceso,
      administrador: req.usuario.administrador,
      activo: req.usuario.activo
    }
  })
})

// Cerrar sesión
sesionRouter.delete('/', (req, res) => {
  const token = req.cookies?.sesion_token || req.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (token) {
    invalidarSesion(token)
  }
  res.clearCookie('sesion_token')
  return res.status(204).send()
})

