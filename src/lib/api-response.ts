import { NextResponse } from 'next/server'
import { ApiError } from '../services/api-error'
import { esErrorDeConcurrencia } from '../db'

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status })
}

export function handleApiError(err: unknown) {
  console.error('[API Error]', err)

  if (err instanceof ApiError) {
    return NextResponse.json(
      {
        error: err.message,
        code: err.code,
        details: err.details
      },
      { status: err.status }
    )
  }

  if (esErrorDeConcurrencia(err)) {
    return NextResponse.json(
      {
        error: 'El sistema está procesando otra operación simultánea. Por favor, reintentá en un instante.',
        code: 'CONCURRENCY_CONFLICT'
      },
      { status: 409 }
    )
  }

  const message = err instanceof Error ? err.message : 'Error interno del servidor'
  return NextResponse.json(
    {
      error: message,
      code: 'INTERNAL_ERROR'
    },
    { status: 500 }
  )
}
