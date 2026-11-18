import 'dotenv/config'
import path from 'path'
import { fileURLToPath } from 'url'
import { migrate } from 'drizzle-orm/libsql/migrator'
import { db } from './index'
import { baseVacia, cargarDatosDePrueba } from './datos-prueba'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

async function main() {
  console.log('[Deploy] Iniciando comprobación de entorno y base de datos...')

  // En Vercel no ejecutar si no es producción
  if (process.env.VERCEL && process.env.VERCEL_ENV !== 'production') {
    console.log('[Deploy] Entorno Vercel Preview detectado: se omite migración.')
    return
  }

  // Comprobar variables en producción
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL
    if (!url || url.startsWith('file:')) {
      console.error('❌ Error de build: Falta la base de datos de producción (TURSO_DATABASE_URL / DATABASE_URL).')
      process.exit(1)
    }

    const secret = process.env.SESSION_SECRET
    if (!secret || secret.length < 32 || secret.includes('cambiar-por-un-secreto')) {
      console.error(
        '❌ Error de build: Falta SESSION_SECRET (o es el valor de ejemplo, debe tener al menos 32 caracteres).'
      )
      process.exit(1)
    }
  }

  // Aplicar migraciones sobre carpeta drizzle
  const migrationsFolder = path.join(__dirname, '../../drizzle')
  console.log(`[Deploy] Aplicando migraciones desde ${migrationsFolder}...`)
  await migrate(db, { migrationsFolder })
  console.log('[Deploy] Migraciones aplicadas con éxito.')

  // Si la base está vacía, cargar datos de prueba
  if (await baseVacia()) {
    console.log('[Deploy] Base de datos vacía. Sembrando datos iniciales...')
    await cargarDatosDePrueba()
  } else {
    console.log('[Deploy] La base ya contiene datos. No se requiere seed.')
  }

  console.log('[Deploy] Deploy y verificación finalizados exitosamente.')
}

main().catch((err) => {
  console.error('[Deploy] Error fatal en deploy:', err)
  process.exit(1)
})
