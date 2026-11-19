import type { Request, Response, NextFunction } from 'express'

export class AppError extends Error {
  status: number
  codigo: string
  detalles?: Record<string, any>

  constructor(status: number, codigo: string, mensaje: string, detalles?: Record<string, any>) {
    super(mensaje)
    this.status = status
    this.codigo = codigo
    this.detalles = detalles
  }
}

export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    const errorBody: any = {
      codigo: err.codigo,
      mensaje: err.message
    }
    if (err.detalles) {
      errorBody.detalles = err.detalles
    }
    return res.status(err.status).json({ error: errorBody })
  }

  // Errores de sintaxis JSON en el body
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: {
        codigo: 'SOLICITUD_INVALIDA',
        mensaje: 'El cuerpo de la solicitud no contiene un JSON válido.'
      }
    })
  }

  console.error('[Error no controlado]', err)
  return res.status(500).json({
    error: {
      codigo: 'ERROR_INTERNO',
      mensaje: 'Ocurrió un error inesperado en el servidor.'
    }
  })
}

