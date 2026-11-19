import { NextResponse } from 'next/server'
import { ApiError } from '../services/api-error'

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

  const message = err instanceof Error ? err.message : 'Error interno del servidor'
  return NextResponse.json(
    {
      error: message,
      code: 'INTERNAL_ERROR'
    },
    { status: 500 }
  )
}
