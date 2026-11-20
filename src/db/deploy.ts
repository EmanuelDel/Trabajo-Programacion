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

  // En Vercel Preview se omite migración
  if (process.env.VERCEL && process.env.VERCEL_ENV !== 'production') {
    console.log('[Deploy] Entorno Vercel Preview detectado: se omite migración.')
    return
  }

  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL
  if (!url || url.startsWith('file:')) {
    console.warn('[Deploy] Aviso: TURSO_DATABASE_URL no detectada en este paso. Se omite migración durante el build.')
    return
  }

  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 32 || secret.includes('cambiar-por-un-secreto')) {
    console.warn('[Deploy] Aviso: SESSION_SECRET no configurado o menor a 32 caracteres.')
  }

  try {
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
  } catch (err: any) {
    console.warn('[Deploy] Aviso durante la verificación de base de datos:', err.message || err)
  }

  console.log('[Deploy] Deploy y verificación finalizados exitosamente.')
}

main().catch((err) => {
  console.warn('[Deploy] Verificación finalizada con aviso:', err.message || err)
})
