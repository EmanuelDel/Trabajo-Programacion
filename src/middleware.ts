import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const DEFAULT_SECRET = 'cambiar-por-un-secreto-seguro-de-al-menos-32-caracteres-en-produccion'
const SECRET_KEY = process.env.SESSION_SECRET || DEFAULT_SECRET
const key = new TextEncoder().encode(SECRET_KEY)

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Archivos estáticos y Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  const token = req.cookies.get('session_token')?.value
  let sesion: { id: number; rol: 'admin' | 'vendedor'; nombre: string; email: string } | null = null

  if (token) {
    try {
      const { payload } = await jwtVerify(token, key)
      sesion = payload as unknown as { id: number; rol: 'admin' | 'vendedor'; nombre: string; email: string }
    } catch {
      sesion = null
    }
  }

  // Rutas públicas
  const esLogin = pathname === '/login'

  // Si va a /login y ya está logueado, redirigir al mostrador /ventas
  if (esLogin && sesion) {
    return NextResponse.redirect(new URL('/ventas', req.url))
  }

  // Si no está logueado y va a cualquier página que no sea login ni API pública
  if (!sesion && !esLogin && !pathname.startsWith('/api/auth/login')) {
    if (pathname.startsWith('/api')) {
      return NextResponse.json({ error: 'No autenticado', code: 'NO_AUTENTICADO' }, { status: 401 })
    }
    const loginUrl = new URL('/login', req.url)
    return NextResponse.redirect(loginUrl)
  }

  // Restricción para usuarios: solo admin puede acceder a /usuarios
  if (pathname.startsWith('/usuarios') && sesion && sesion.rol !== 'admin') {
    return NextResponse.redirect(new URL('/ventas', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
}
