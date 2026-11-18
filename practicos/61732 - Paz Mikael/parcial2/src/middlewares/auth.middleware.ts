import type { Request, Response, NextFunction } from 'express'
import { obtenerUsuarioPorToken } from '../services/auth.service.js'
import { AppError } from './error.middleware.js'
import type { Usuario } from '../db/schema.js'

declare global {
  namespace Express {
    interface Request {
      usuario?: Usuario
    }
  }
}

export function cargarUsuario(req: Request, _res: Response, next: NextFunction) {
  const token = req.cookies?.sesion_token || req.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (token) {
    const usuario = obtenerUsuarioPorToken(token)
    if (usuario) {
      req.usuario = usuario
    }
  }
  next()
}

export function requerirSesion(req: Request, _res: Response, next: NextFunction) {
  if (!req.usuario) {
    return next(new AppError(401, 'NO_AUTORIZADO', 'Falta una sesión válida o las credenciales han expirado.'))
  }
  if (!req.usuario.activo) {
    return next(new AppError(401, 'USUARIO_INACTIVO', 'El usuario se encuentra inactivo.'))
  }
  next()
}

export function requerirAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.usuario) {
    return next(new AppError(401, 'NO_AUTORIZADO', 'Falta una sesión válida.'))
  }
  if (!req.usuario.administrador) {
    return next(new AppError(403, 'ACCESO_DENEGADO', 'Se requiere perfil de administrador para esta operación.'))
  }
  next()
}

