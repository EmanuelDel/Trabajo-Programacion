import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core'

export const usuarios = sqliteTable('usuarios', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull(),
  acceso: text('acceso').notNull().unique(),
  contrasenaHash: text('contrasena_hash').notNull(),
  administrador: integer('administrador', { mode: 'boolean' }).notNull().default(false),
  activo: integer('activo', { mode: 'boolean' }).notNull().default(true),
  creadoEn: text('creado_en').notNull()
})

export const productos = sqliteTable('productos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  codigo: text('codigo').notNull().unique(),
  nombre: text('nombre').notNull(),
  precioVentaCentavos: integer('precio_venta_centavos').notNull(),
  stockActual: integer('stock_actual').notNull().default(0),
  activo: integer('activo', { mode: 'boolean' }).notNull().default(true),
  creadoEn: text('creado_en').notNull()
})

export const clientes = sqliteTable('clientes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  nombre: text('nombre').notNull(),
  documento: text('documento').notNull(),
  telefono: text('telefono'),
  correo: text('correo'),
  creadoEn: text('creado_en').notNull()
})

export const ventas = sqliteTable('ventas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  numero: integer('numero').notNull().unique(),
  fecha: text('fecha').notNull(),
  usuarioId: integer('usuario_id')
    .notNull()
    .references(() => usuarios.id),
  clienteId: integer('cliente_id').references(() => clientes.id),
  clienteNombre: text('cliente_nombre').notNull(),
  clienteDocumento: text('cliente_documento'),
  formaPago: text('forma_pago').notNull(), // CONTADO | TARJETA | CUENTA_CORRIENTE
  totalCentavos: integer('total_centavos').notNull()
})

export const detallesVenta = sqliteTable('detalles_venta', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ventaId: integer('venta_id')
    .notNull()
    .references(() => ventas.id, { onDelete: 'cascade' }),
  productoId: integer('producto_id')
    .notNull()
    .references(() => productos.id),
  descripcion: text('descripcion').notNull(),
  cantidad: integer('cantidad').notNull(),
  precioUnitarioCentavos: integer('precio_unitario_centavos').notNull(),
  subtotalCentavos: integer('subtotal_centavos').notNull()
})

export const movimientosStock = sqliteTable('movimientos_stock', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fecha: text('fecha').notNull(),
  productoId: integer('producto_id')
    .notNull()
    .references(() => productos.id),
  detalleVentaId: integer('detalle_venta_id').references(() => detallesVenta.id),
  tipo: text('tipo').notNull(), // ENTRADA | SALIDA
  cantidad: integer('cantidad').notNull(),
  motivo: text('motivo').notNull(),
  origen: text('origen').notNull(), // MANUAL | INICIAL | VENTA
  usuarioId: integer('usuario_id')
    .notNull()
    .references(() => usuarios.id)
})

export const pagos = sqliteTable('pagos', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  clienteId: integer('cliente_id')
    .notNull()
    .references(() => clientes.id),
  usuarioId: integer('usuario_id')
    .notNull()
    .references(() => usuarios.id),
  fecha: text('fecha').notNull(),
  importeCentavos: integer('importe_centavos').notNull(),
  observacion: text('observacion')
})

export type Usuario = typeof usuarios.$inferSelect
export type NuevoUsuario = typeof usuarios.$inferInsert

export type Producto = typeof productos.$inferSelect
export type NuevoProducto = typeof productos.$inferInsert

export type Cliente = typeof clientes.$inferSelect
export type NuevoCliente = typeof clientes.$inferInsert

export type Venta = typeof ventas.$inferSelect
export type NuevaVenta = typeof ventas.$inferInsert

export type DetalleVenta = typeof detallesVenta.$inferSelect
export type NuevoDetalleVenta = typeof detallesVenta.$inferInsert

export type MovimientoStock = typeof movimientosStock.$inferSelect
export type NuevoMovimientoStock = typeof movimientosStock.$inferInsert

export type Pago = typeof pagos.$inferSelect
export type NuevoPago = typeof pagos.$inferInsert

