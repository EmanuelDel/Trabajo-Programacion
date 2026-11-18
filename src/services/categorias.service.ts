import { eq } from 'drizzle-orm'
import { db } from '../db'
import { categorias, productos, Categoria } from '../db/schema'
import { ApiError } from './api-error'

export async function listarCategorias(): Promise<Categoria[]> {
  return await db.select().from(categorias).orderBy(categorias.nombre)
}

export async function crearCategoria(nombre: string): Promise<Categoria> {
  const nombreLimpio = nombre.trim()
  if (!nombreLimpio) {
    throw new ApiError(400, 'DATOS_INVALIDOS', 'El nombre de la categoría es requerido')
  }

  const existentes = await db
    .select()
    .from(categorias)
    .where(eq(categorias.nombre, nombreLimpio))
    .limit(1)

  if (existentes.length > 0) {
    throw new ApiError(400, 'CATEGORIA_DUPLICADA', 'Ya existe una categoría con ese nombre')
  }

  const [nueva] = await db
    .insert(categorias)
    .values({
      nombre: nombreLimpio,
      activo: true
    })
    .returning()

  return nueva
}

export async function actualizarCategoria(
  id: number,
  datos: { nombre?: string; activo?: boolean }
): Promise<Categoria> {
  const [existente] = await db.select().from(categorias).where(eq(categorias.id, id)).limit(1)
  if (!existente) {
    throw new ApiError(404, 'CATEGORIA_NO_ENCONTRADA', 'Categoría no encontrada')
  }

  const actualizacion: Partial<typeof categorias.$inferInsert> = {}

  if (datos.nombre !== undefined) {
    const nombreLimpio = datos.nombre.trim()
    if (!nombreLimpio) {
      throw new ApiError(400, 'DATOS_INVALIDOS', 'El nombre no puede estar vacío')
    }
    const duplicada = await db
      .select()
      .from(categorias)
      .where(eq(categorias.nombre, nombreLimpio))
      .limit(1)

    if (duplicada.length > 0 && duplicada[0].id !== id) {
      throw new ApiError(400, 'CATEGORIA_DUPLICADA', 'Ya existe una categoría con ese nombre')
    }
    actualizacion.nombre = nombreLimpio
  }

  if (datos.activo !== undefined) {
    actualizacion.activo = datos.activo
  }

  const [actualizada] = await db
    .update(categorias)
    .set(actualizacion)
    .where(eq(categorias.id, id))
    .returning()

  return actualizada
}

export async function eliminarCategoria(id: number): Promise<void> {
  const [existente] = await db.select().from(categorias).where(eq(categorias.id, id)).limit(1)
  if (!existente) {
    throw new ApiError(404, 'CATEGORIA_NO_ENCONTRADA', 'Categoría no encontrada')
  }

  // Verificar si hay productos que usen esta categoría (RF-P)
  const productosAsociados = await db
    .select({ id: productos.id })
    .from(productos)
    .where(eq(productos.categoriaId, id))
    .limit(1)

  if (productosAsociados.length > 0) {
    throw new ApiError(
      400,
      'CATEGORIA_EN_USO',
      'No se puede eliminar la categoría porque tiene productos asociados. Desactívela en su lugar.'
    )
  }

  await db.delete(categorias).where(eq(categorias.id, id))
}
