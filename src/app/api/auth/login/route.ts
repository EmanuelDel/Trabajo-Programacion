import { NextRequest, NextResponse } from 'next/server'
import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { usuarios } from '@/db/schema'
import { verifyPassword, createSessionCookie } from '@/lib/auth'
import { handleApiError, jsonOk } from '@/lib/api-response'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email y contraseña son obligatorios', code: 'DATOS_INVALIDOS' },
        { status: 400 }
      )
    }

    const [usuario] = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.email, String(email).trim().toLowerCase()))
      .limit(1)

    if (!usuario) {
      return NextResponse.json(
        { error: 'Credenciales inválidas', code: 'CREDENCIALES_INVALIDAS' },
        { status: 401 }
      )
    }

    if (!usuario.activo) {
      return NextResponse.json(
        { error: 'Usuario deshabilitado', code: 'USUARIO_INACTIVO' },
        { status: 403 }
      )
    }

    const passValido = verifyPassword(String(password), usuario.passwordHash)
    if (!passValido) {
      return NextResponse.json(
        { error: 'Credenciales inválidas', code: 'CREDENCIALES_INVALIDAS' },
        { status: 401 }
      )
    }

    const token = await createSessionCookie({
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol
    })

    const response = NextResponse.json({
      ok: true,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol
      }
    })

    response.cookies.set('session_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 horas
    })

    return response
  } catch (err) {
    return handleApiError(err)
  }
}
