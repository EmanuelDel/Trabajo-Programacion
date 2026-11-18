import 'dotenv/config'
import { cargarDatosDePrueba } from './datos-prueba'

cargarDatosDePrueba()
  .then(() => {
    console.log('[Seed] Proceso finalizado.')
    process.exit(0)
  })
  .catch((err) => {
    console.error('[Seed] Error:', err)
    process.exit(1)
  })
