import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import path from 'path'
import { fileURLToPath } from 'url'
import * as schema from './schema.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rutaDb = path.join(__dirname, '../../data/ventas.sqlite')

const sqlite = new Database(rutaDb)
sqlite.pragma('foreign_keys = ON')
sqlite.pragma('journal_mode = WAL')

// Inicializar tablas si no existen
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    acceso TEXT NOT NULL UNIQUE,
    contrasena_hash TEXT NOT NULL,
    administrador INTEGER NOT NULL DEFAULT 0,
    activo INTEGER NOT NULL DEFAULT 1,
    creado_en TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS productos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT NOT NULL UNIQUE,
    nombre TEXT NOT NULL,
    precio_venta_centavos INTEGER NOT NULL,
    stock_actual INTEGER NOT NULL DEFAULT 0,
    activo INTEGER NOT NULL DEFAULT 1,
    creado_en TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS clientes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    documento TEXT NOT NULL,
    telefono TEXT,
    correo TEXT,
    creado_en TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS ventas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero INTEGER NOT NULL UNIQUE,
    fecha TEXT NOT NULL,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    cliente_id INTEGER REFERENCES clientes(id),
    cliente_nombre TEXT NOT NULL,
    cliente_documento TEXT,
    forma_pago TEXT NOT NULL,
    total_centavos INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS detalles_venta (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    venta_id INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    producto_id INTEGER NOT NULL REFERENCES productos(id),
    descripcion TEXT NOT NULL,
    cantidad INTEGER NOT NULL,
    precio_unitario_centavos INTEGER NOT NULL,
    subtotal_centavos INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS movimientos_stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT NOT NULL,
    producto_id INTEGER NOT NULL REFERENCES productos(id),
    detalle_venta_id INTEGER REFERENCES detalles_venta(id),
    tipo TEXT NOT NULL,
    cantidad INTEGER NOT NULL,
    motivo TEXT NOT NULL,
    origen TEXT NOT NULL,
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id)
  );

  CREATE TABLE IF NOT EXISTS pagos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cliente_id INTEGER NOT NULL REFERENCES clientes(id),
    usuario_id INTEGER NOT NULL REFERENCES usuarios(id),
    fecha TEXT NOT NULL,
    importe_centavos INTEGER NOT NULL,
    observacion TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_productos_codigo ON productos(codigo);
  CREATE INDEX IF NOT EXISTS idx_clientes_documento ON clientes(documento);
  CREATE INDEX IF NOT EXISTS idx_ventas_numero ON ventas(numero);
  CREATE INDEX IF NOT EXISTS idx_ventas_cliente ON ventas(cliente_id);
  CREATE INDEX IF NOT EXISTS idx_movimientos_producto ON movimientos_stock(producto_id);
  CREATE INDEX IF NOT EXISTS idx_pagos_cliente ON pagos(cliente_id);
`)

export const db = drizzle(sqlite, { schema })
export { sqlite }

