import { eq } from 'drizzle-orm'
import { db } from '../db'
import { usuarios, Usuario } from '../db/schema'
import { hashPassword } from '../lib/auth'
import { ApiError } from './api-error'

export async function listarUsuarios(): Promise<Omit<Usuario, 'passwordHash'>[]> {
  const lista = await db
    .select({
      id: usuarios.id,
      nombre: usuarios.nombre,
      email: usuarios.email,
      rol: usuarios.rol,
      activo: usuarios.activo,
      creadoEn: usuarios.creadoEn
    })
    .from(usuarios)
    .orderBy(usuarios.nombre)

  return lista
}

export async function obtenerUsuarioPorId(id: number): Promise<Omit<Usuario, 'passwordHash'>> {
  const [u] = await db
    .select({
      id: usuarios.id,
      nombre: usuarios.nombre,
      email: usuarios.email,
      rol: usuarios.rol,
      activo: usuarios.activo,
      creadoEn: usuarios.creadoEn
    })
    .from(usuarios)
    .where(eq(usuarios.id, id))
    .limit(1)

  if (!u) {
    throw new ApiError(404, 'USUARIO_NO_ENCONTRADO', 'Usuario no encontrado')
  }

  return u
}

export async function crearUsuario(datos: {
  nombre: string
  email: string
  password: string
  rol: 'admin' | 'vendedor'
}): Promise<Omit<Usuario, 'passwordHash'>> {
  const nombreLimpio = datos.nombre.trim()
  const emailLimpio = datos.email.trim().toLowerCase()

  if (!nombreLimpio || !emailLimpio || !datos.password) {
    throw new ApiError(400, 'DATOS_INVALIDOS', 'Nombre, email y contraseña son obligatorios')
  }

  if (datos.password.length < 6) {
    throw new ApiError(400, 'PASSWORD_CORTO', 'La contraseña debe tener al menos 6 caracteres')
  }

  const existentes = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.email, emailLimpio))
    .limit(1)

  if (existentes.length > 0) {
    throw new ApiError(400, 'EMAIL_DUPLICADO', 'Ya existe un usuario con ese email')
  }

  const passwordHash = await hashPassword(datos.password)

  const [nuevo] = await db
    .insert(usuarios)
    .values({
      nombre: nombreLimpio,
      email: emailLimpio,
      passwordHash,
      rol: datos.rol,
      activo: true,
      creadoEn: new Date().toISOString()
    })
    .returning({
      id: usuarios.id,
      nombre: usuarios.nombre,
      email: usuarios.email,
      rol: usuarios.rol,
      activo: usuarios.activo,
      creadoEn: usuarios.creadoEn
    })

  return nuevo
}

export async function actualizarUsuario(
  id: number,
  datos: {
    nombre?: string
    email?: string
    rol?: 'admin' | 'vendedor'
    activo?: boolean
  }
): Promise<Omit<Usuario, 'passwordHash'>> {
  await obtenerUsuarioPorId(id)

  const actualizacion: Partial<typeof usuarios.$inferInsert> = {}

  if (datos.nombre !== undefined) {
    const n = datos.nombre.trim()
    if (!n) throw new ApiError(400, 'DATOS_INVALIDOS', 'El nombre no puede estar vacío')
    actualizacion.nombre = n
  }

  if (datos.email !== undefined) {
    const e = datos.email.trim().toLowerCase()
    if (!e) throw new ApiError(400, 'DATOS_INVALIDOS', 'El email no puede estar vacío')

    const duplicado = await db
      .select()
      .from(usuarios)
      .where(eq(usuarios.email, e))
      .limit(1)

    if (duplicado.length > 0 && duplicado[0].id !== id) {
      throw new ApiError(400, 'EMAIL_DUPLICADO', 'Ese email ya está registrado')
    }
    actualizacion.email = e
  }

  if (datos.rol !== undefined) actualizacion.rol = datos.rol
  if (datos.activo !== undefined) actualizacion.activo = datos.activo

  const [actualizado] = await db
    .update(usuarios)
    .set(actualizacion)
    .where(eq(usuarios.id, id))
    .returning({
      id: usuarios.id,
      nombre: usuarios.nombre,
      email: usuarios.email,
      rol: usuarios.rol,
      activo: usuarios.activo,
      creadoEn: usuarios.creadoEn
    })

  return actualizado
}

export async function cambiarPassword(id: number, nuevaPassword: string): Promise<void> {
  if (!nuevaPassword || nuevaPassword.length < 6) {
    throw new ApiError(400, 'PASSWORD_CORTO', 'La nueva contraseña debe tener al menos 6 caracteres')
  }

  await obtenerUsuarioPorId(id)
  const passwordHash = await hashPassword(nuevaPassword)

  await db
    .update(usuarios)
    .set({ passwordHash })
    .where(eq(usuarios.id, id))
}
