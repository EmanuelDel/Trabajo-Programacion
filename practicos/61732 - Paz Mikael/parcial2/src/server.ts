import express from 'express'
import cookieParser from 'cookie-parser'
import path from 'path'
import { fileURLToPath } from 'url'

import { cargarUsuario } from './middlewares/auth.middleware.js'
import { errorHandler } from './middlewares/error.middleware.js'

import { sesionRouter } from './routes/sesion.routes.js'
import { usuariosRouter } from './routes/usuarios.routes.js'
import { productosRouter } from './routes/productos.routes.js'
import { movimientosRouter } from './routes/movimientos-stock.routes.js'
import { clientesRouter } from './routes/clientes.routes.js'
import { ventasRouter } from './routes/ventas.routes.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const publicDir = path.join(__dirname, '../public')

const app = express()
const PORT = process.env.PORT || 3000

// Middlewares globales
app.use(express.json())
app.use(cookieParser())
app.use(cargarUsuario)

// Rutas API
app.use('/api/sesion', sesionRouter)
app.use('/api/usuarios', usuariosRouter)
app.use('/api/productos', productosRouter)
app.use('/api/movimientos-stock', movimientosRouter)
app.use('/api/clientes', clientesRouter)
app.use('/api/ventas', ventasRouter)

// Servir frontend estático
app.use(express.static(publicDir))

// Fallback para SPA
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next()
  }
  res.sendFile(path.join(publicDir, 'index.html'))
})

// Manejador centralizado de errores
app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`[Servidor] Sistema de Ventas listo en http://localhost:${PORT}`)
})

