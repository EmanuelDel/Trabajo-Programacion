import { db, sqlite } from './index.js'
import { usuarios, productos, clientes, ventas, detallesVenta, movimientosStock, pagos } from './schema.js'
import { hashearClave } from '../services/auth.service.js'

export function ejecutarSeed() {
  console.log('[Seed] Inicializando base de datos con datos de prueba...')

  const transaccion = sqlite.transaction(() => {
    // 1. Limpiar datos existentes
    sqlite.exec(`
      DELETE FROM pagos;
      DELETE FROM movimientos_stock;
      DELETE FROM detalles_venta;
      DELETE FROM ventas;
      DELETE FROM clientes;
      DELETE FROM productos;
      DELETE FROM usuarios;
    `)

    const fechaBase = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const ahora = new Date().toISOString()

    // 2. Usuarios
    const admin = db
      .insert(usuarios)
      .values({
        nombre: 'Ana Martínez',
        acceso: 'ana@ejemplo.com',
        contrasenaHash: hashearClave('admin123'),
        administrador: true,
        activo: true,
        creadoEn: fechaBase
      })
      .returning()
      .get()

    const operador = db
      .insert(usuarios)
      .values({
        nombre: 'Lucía Pérez',
        acceso: 'lucia@ejemplo.com',
        contrasenaHash: hashearClave('operador123'),
        administrador: false,
        activo: true,
        creadoEn: fechaBase
      })
      .returning()
      .get()

    db.insert(usuarios)
      .values({
        nombre: 'Carlos Gómez',
        acceso: 'carlos@ejemplo.com',
        contrasenaHash: hashearClave('clave123'),
        administrador: false,
        activo: false,
        creadoEn: fechaBase
      })
      .run()

    // 3. Productos y stock inicial
    const prods = [
      { codigo: 'CAF-001', nombre: 'Café molido 250 g', precioVentaCentavos: 650000, stock: 24, activo: true },
      { codigo: 'TE-002', nombre: 'Té en hebras 100 g', precioVentaCentavos: 420000, stock: 15, activo: true },
      { codigo: 'YER-003', nombre: 'Yerba mate premium 500 g', precioVentaCentavos: 380000, stock: 30, activo: true },
      { codigo: 'GAL-004', nombre: 'Galletitas artesanales 200 g', precioVentaCentavos: 290000, stock: 8, activo: true },
      { codigo: 'CHO-005', nombre: 'Chocolate semiamargo 80 g', precioVentaCentavos: 310000, stock: 2, activo: true },
      { codigo: 'ALM-006', nombre: 'Alfajor de maicena x2', precioVentaCentavos: 180000, stock: 0, activo: false }
    ]

    const prodsInsertados: Record<string, any> = {}
    for (const p of prods) {
      const pCreado = db
        .insert(productos)
        .values({
          codigo: p.codigo,
          nombre: p.nombre,
          precioVentaCentavos: p.precioVentaCentavos,
          stockActual: p.stock,
          activo: p.activo,
          creadoEn: fechaBase
        })
        .returning()
        .get()

      prodsInsertados[p.codigo] = pCreado

      if (p.stock > 0) {
        db.insert(movimientosStock)
          .values({
            fecha: fechaBase,
            productoId: pCreado.id,
            detalleVentaId: null,
            tipo: 'ENTRADA',
            cantidad: p.stock,
            motivo: 'Stock inicial',
            origen: 'INICIAL',
            usuarioId: admin.id
          })
          .run()
      }
    }

    // 4. Clientes
    const cliente1 = db
      .insert(clientes)
      .values({
        nombre: 'María González',
        documento: '28.456.123',
        telefono: '381 555-0123',
        correo: 'maria@ejemplo.com',
        creadoEn: fechaBase
      })
      .returning()
      .get()

    const cliente2 = db
      .insert(clientes)
      .values({
        nombre: 'Juan Carlos Rodríguez',
        documento: '20.123.456',
        telefono: '381 444-9988',
        correo: 'juancarlos@ejemplo.com',
        creadoEn: fechaBase
      })
      .returning()
      .get()

    const cliente3 = db
      .insert(clientes)
      .values({
        nombre: 'Distribuidora Norte S.R.L.',
        documento: '30-71234567-8',
        telefono: '381 422-3344',
        correo: 'contacto@distribuidoranorte.com',
        creadoEn: fechaBase
      })
      .returning()
      .get()

    // 5. Ventas de ejemplo
    // Venta #1: Contado - Consumidor final
    const fechaVenta1 = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    const venta1 = db
      .insert(ventas)
      .values({
        numero: 1,
        fecha: fechaVenta1,
        usuarioId: operador.id,
        clienteId: null,
        clienteNombre: 'Consumidor final',
        clienteDocumento: null,
        formaPago: 'CONTADO',
        totalCentavos: 650000 + 420000
      })
      .returning()
      .get()

    const det1_1 = db
      .insert(detallesVenta)
      .values({
        ventaId: venta1.id,
        productoId: prodsInsertados['CAF-001'].id,
        descripcion: prodsInsertados['CAF-001'].nombre,
        cantidad: 1,
        precioUnitarioCentavos: 650000,
        subtotalCentavos: 650000
      })
      .returning()
      .get()

    const det1_2 = db
      .insert(detallesVenta)
      .values({
        ventaId: venta1.id,
        productoId: prodsInsertados['TE-002'].id,
        descripcion: prodsInsertados['TE-002'].nombre,
        cantidad: 1,
        precioUnitarioCentavos: 420000,
        subtotalCentavos: 420000
      })
      .returning()
      .get()

    db.insert(movimientosStock)
      .values({
        fecha: fechaVenta1,
        productoId: prodsInsertados['CAF-001'].id,
        detalleVentaId: det1_1.id,
        tipo: 'SALIDA',
        cantidad: 1,
        motivo: 'Venta #1',
        origen: 'VENTA',
        usuarioId: operador.id
      })
      .run()

    db.insert(movimientosStock)
      .values({
        fecha: fechaVenta1,
        productoId: prodsInsertados['TE-002'].id,
        detalleVentaId: det1_2.id,
        tipo: 'SALIDA',
        cantidad: 1,
        motivo: 'Venta #1',
        origen: 'VENTA',
        usuarioId: operador.id
      })
      .run()

    // Venta #2: Cuenta Corriente a María González por $ 27.200,00 (2.720.000 centavos)
    const fechaVenta2 = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    const venta2 = db
      .insert(ventas)
      .values({
        numero: 2,
        fecha: fechaVenta2,
        usuarioId: admin.id,
        clienteId: cliente1.id,
        clienteNombre: cliente1.nombre,
        clienteDocumento: cliente1.documento,
        formaPago: 'CUENTA_CORRIENTE',
        totalCentavos: 2720000
      })
      .returning()
      .get()

    const det2_1 = db
      .insert(detallesVenta)
      .values({
        ventaId: venta2.id,
        productoId: prodsInsertados['CAF-001'].id,
        descripcion: prodsInsertados['CAF-001'].nombre,
        cantidad: 4,
        precioUnitarioCentavos: 650000,
        subtotalCentavos: 2600000
      })
      .returning()
      .get()

    const det2_2 = db
      .insert(detallesVenta)
      .values({
        ventaId: venta2.id,
        productoId: prodsInsertados['CHO-005'].id,
        descripcion: prodsInsertados['CHO-005'].nombre,
        cantidad: 1,
        precioUnitarioCentavos: 120000,
        subtotalCentavos: 120000
      })
      .returning()
      .get()

    db.insert(movimientosStock)
      .values({
        fecha: fechaVenta2,
        productoId: prodsInsertados['CAF-001'].id,
        detalleVentaId: det2_1.id,
        tipo: 'SALIDA',
        cantidad: 4,
        motivo: 'Venta #2',
        origen: 'VENTA',
        usuarioId: admin.id
      })
      .run()

    db.insert(movimientosStock)
      .values({
        fecha: fechaVenta2,
        productoId: prodsInsertados['CHO-005'].id,
        detalleVentaId: det2_2.id,
        tipo: 'SALIDA',
        cantidad: 1,
        motivo: 'Venta #2',
        origen: 'VENTA',
        usuarioId: admin.id
      })
      .run()

    // 6. Pago parcial en cuenta corriente de María González por $ 5.000,00 (500.000 centavos)
    const fechaPago = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
    db.insert(pagos)
      .values({
        clienteId: cliente1.id,
        usuarioId: admin.id,
        fecha: fechaPago,
        importeCentavos: 500000,
        observacion: 'Pago parcial a cuenta'
      })
      .run()

    console.log('[Seed] ¡Datos cargados con éxito!')
    console.log('   Administrador: ana@ejemplo.com / admin123')
    console.log('   Operador:      lucia@ejemplo.com / operador123')
  })

  transaccion()
}

// Ejecutar si se llama directamente
if (process.argv[1]?.endsWith('seed.ts') || process.argv[1]?.endsWith('seed.js')) {
  ejecutarSeed()
}

