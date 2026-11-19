import { db } from './index.js'
import {
  usuarios,
  categorias,
  productos,
  clientes,
  facturas,
  detallesFactura,
  movimientosStock,
  pagos
} from './schema.js'
import { hashPassword } from '../lib/auth.js'
import { sql } from 'drizzle-orm'

export async function baseVacia(): Promise<boolean> {
  try {
    const res = await db.select({ count: sql<number>`count(*)` }).from(usuarios)
    return (res[0]?.count ?? 0) === 0
  } catch {
    return true
  }
}

export async function cargarDatosDePrueba(): Promise<void> {
  console.log('[Seed] Cargando datos iniciales y de prueba reglamentarios (Sec. 8)...')

  const ahora = new Date()
  const haceDias = (dias: number) => {
    const d = new Date(ahora.getTime() - dias * 24 * 60 * 60 * 1000)
    return d.toISOString()
  }

  // 1. Usuarios (RF-U3: 2 usuarios requeridos por rol + 1 inactivo para prueba)
  const adminPassword = hashPassword('admin123')
  const vendedorPassword = hashPassword('vendedor123')

  const [admin] = await db
    .insert(usuarios)
    .values({
      nombre: 'Ana Martínez (Administradora)',
      email: 'admin@comercio.com',
      passwordHash: adminPassword,
      rol: 'admin',
      activo: true,
      creadoEn: haceDias(60)
    })
    .returning()

  const [vendedor] = await db
    .insert(usuarios)
    .values({
      nombre: 'Lucía Pérez (Vendedora)',
      email: 'vendedor@comercio.com',
      passwordHash: vendedorPassword,
      rol: 'vendedor',
      activo: true,
      creadoEn: haceDias(60)
    })
    .returning()

  await db
    .insert(usuarios)
    .values({
      nombre: 'Carlos Gómez (Inactivo)',
      email: 'carlos@comercio.com',
      passwordHash: vendedorPassword,
      rol: 'vendedor',
      activo: false,
      creadoEn: haceDias(60)
    })

  // 2. Categorías (Mínimo 5 categorías según Sec. 8)
  const catsData = [
    { nombre: 'Cafetería y Té' },
    { nombre: 'Almacén y Galletitas' },
    { nombre: 'Bebidas e Infusiones' },
    { nombre: 'Golosinas y Chocolates' },
    { nombre: 'Lácteos y Derivados' },
    { nombre: 'Snacks y Aperitivos' }
  ]
  const cats = await db.insert(categorias).values(catsData).returning()
  const catMap = Object.fromEntries(cats.map((c) => [c.nombre, c.id]))

  // 3. Productos (Mínimo 30 productos según Sec. 8)
  const prodsData = [
    // Cafetería y Té
    { codigo: 'CAF-001', descripcion: 'Café tostado molido 250 g', categoriaId: catMap['Cafetería y Té'], precioVentaCentavos: 650000, existencia: 45, stockMinimo: 10 },
    { codigo: 'CAF-002', descripcion: 'Café en grano selección 500 g', categoriaId: catMap['Cafetería y Té'], precioVentaCentavos: 1250000, existencia: 30, stockMinimo: 8 },
    { codigo: 'CAF-003', descripcion: 'Café torrado intenso 1 kg', categoriaId: catMap['Cafetería y Té'], precioVentaCentavos: 1890000, existencia: 20, stockMinimo: 5 },
    { codigo: 'TE-001', descripcion: 'Té negro en saquitos x 50', categoriaId: catMap['Cafetería y Té'], precioVentaCentavos: 280000, existencia: 40, stockMinimo: 10 },
    { codigo: 'TE-002', descripcion: 'Té verde con jazmín en hebras 100 g', categoriaId: catMap['Cafetería y Té'], precioVentaCentavos: 420000, existencia: 25, stockMinimo: 6 },
    { codigo: 'TE-003', descripcion: 'Té frutos rojos selección 80 g', categoriaId: catMap['Cafetería y Té'], precioVentaCentavos: 390000, existencia: 18, stockMinimo: 5 },

    // Almacén y Galletitas
    { codigo: 'GAL-001', descripcion: 'Galletitas artesanales de avena 200 g', categoriaId: catMap['Almacén y Galletitas'], precioVentaCentavos: 290000, existencia: 3, stockMinimo: 10 }, // Bajo stock
    { codigo: 'GAL-002', descripcion: 'Galletitas de miel y sésamo 250 g', categoriaId: catMap['Almacén y Galletitas'], precioVentaCentavos: 310000, existencia: 35, stockMinimo: 10 },
    { codigo: 'GAL-003', descripcion: 'Bizcochos de grasa campestres 300 g', categoriaId: catMap['Almacén y Galletitas'], precioVentaCentavos: 220000, existencia: 50, stockMinimo: 15 },
    { codigo: 'GAL-004', descripcion: 'Tostadas clásicas de mesa 180 g', categoriaId: catMap['Almacén y Galletitas'], precioVentaCentavos: 195000, existencia: 45, stockMinimo: 12 },
    { codigo: 'ALM-001', descripcion: 'Azúcar blanca refinada 1 kg', categoriaId: catMap['Almacén y Galletitas'], precioVentaCentavos: 140000, existencia: 80, stockMinimo: 20 },
    { codigo: 'ALM-002', descripcion: 'Endulzante stevia líquida 200 ml', categoriaId: catMap['Almacén y Galletitas'], precioVentaCentavos: 360000, existencia: 22, stockMinimo: 6 },

    // Bebidas e Infusiones
    { codigo: 'YER-001', descripcion: 'Yerba mate tradicional con palo 1 kg', categoriaId: catMap['Bebidas e Infusiones'], precioVentaCentavos: 480000, existencia: 60, stockMinimo: 15 },
    { codigo: 'YER-002', descripcion: 'Yerba mate suave especial 500 g', categoriaId: catMap['Bebidas e Infusiones'], precioVentaCentavos: 290000, existencia: 40, stockMinimo: 10 },
    { codigo: 'YER-003', descripcion: 'Yerba mate con hierbas serranas 500 g', categoriaId: catMap['Bebidas e Infusiones'], precioVentaCentavos: 330000, existencia: 2, stockMinimo: 8 }, // Bajo stock
    { codigo: 'BEB-001', descripcion: 'Agua mineral sin gas 1.5 L', categoriaId: catMap['Bebidas e Infusiones'], precioVentaCentavos: 120000, existencia: 90, stockMinimo: 24 },
    { codigo: 'BEB-002', descripcion: 'Agua saborizada manzana 1.5 L', categoriaId: catMap['Bebidas e Infusiones'], precioVentaCentavos: 170000, existencia: 50, stockMinimo: 12 },
    { codigo: 'BEB-003', descripcion: 'Jugo natural de naranja exprimido 1 L', categoriaId: catMap['Bebidas e Infusiones'], precioVentaCentavos: 280000, existencia: 15, stockMinimo: 6 },

    // Golosinas y Chocolates
    { codigo: 'ALF-001', descripcion: 'Alfajor clásico de dulce de leche', categoriaId: catMap['Golosinas y Chocolates'], precioVentaCentavos: 180000, existencia: 120, stockMinimo: 25 },
    { codigo: 'ALF-002', descripcion: 'Alfajor chocolate negro 70% cacao', categoriaId: catMap['Golosinas y Chocolates'], precioVentaCentavos: 220000, existencia: 85, stockMinimo: 20 },
    { codigo: 'ALF-003', descripcion: 'Alfajor blanco merengado del norte', categoriaId: catMap['Golosinas y Chocolates'], precioVentaCentavos: 200000, existencia: 70, stockMinimo: 15 },
    { codigo: 'CHO-001', descripcion: 'Chocolate con leche y maní 80 g', categoriaId: catMap['Golosinas y Chocolates'], precioVentaCentavos: 240000, existencia: 60, stockMinimo: 15 },
    { codigo: 'CHO-002', descripcion: 'Chocolate semiamargo con almendras 100 g', categoriaId: catMap['Golosinas y Chocolates'], precioVentaCentavos: 350000, existencia: 4, stockMinimo: 10 }, // Bajo stock
    { codigo: 'GOL-001', descripcion: 'Caramelos masticables surtidos 150 g', categoriaId: catMap['Golosinas y Chocolates'], precioVentaCentavos: 160000, existencia: 45, stockMinimo: 10 },

    // Lácteos y Derivados
    { codigo: 'LAC-001', descripcion: 'Leche entera ultrapasteurizada 1 L', categoriaId: catMap['Lácteos y Derivados'], precioVentaCentavos: 175000, existencia: 55, stockMinimo: 18 },
    { codigo: 'LAC-002', descripcion: 'Leche descremada fortificada 1 L', categoriaId: catMap['Lácteos y Derivados'], precioVentaCentavos: 185000, existencia: 40, stockMinimo: 15 },
    { codigo: 'LAC-003', descripcion: 'Dulce de leche colonial pote 400 g', categoriaId: catMap['Lácteos y Derivados'], precioVentaCentavos: 260000, existencia: 30, stockMinimo: 8 },
    { codigo: 'LAC-004', descripcion: 'Queso crema untable clásico 290 g', categoriaId: catMap['Lácteos y Derivados'], precioVentaCentavos: 310000, existencia: 20, stockMinimo: 6 },

    // Snacks y Aperitivos
    { codigo: 'SNK-001', descripcion: 'Papas fritas corte americano 130 g', categoriaId: catMap['Snacks y Aperitivos'], precioVentaCentavos: 270000, existencia: 38, stockMinimo: 12 },
    { codigo: 'SNK-002', descripcion: 'Maní tostado sin sal 150 g', categoriaId: catMap['Snacks y Aperitivos'], precioVentaCentavos: 160000, existencia: 50, stockMinimo: 10 },
    { codigo: 'SNK-003', descripcion: 'Mix frutos secos energéticos 120 g', categoriaId: catMap['Snacks y Aperitivos'], precioVentaCentavos: 440000, existencia: 25, stockMinimo: 8 },
    { codigo: 'SNK-004', descripcion: 'Nachos crocantes de maíz 150 g', categoriaId: catMap['Snacks y Aperitivos'], precioVentaCentavos: 250000, existencia: 30, stockMinimo: 10 }
  ]

  const prods = []
  for (const p of prodsData) {
    const [ins] = await db
      .insert(productos)
      .values({
        ...p,
        activo: true,
        creadoEn: haceDias(60)
      })
      .returning()
    prods.push(ins)

    // Movimiento inicial de inventario (RF-P4)
    await db.insert(movimientosStock).values({
      fecha: haceDias(60),
      productoId: ins.id,
      tipo: 'INGRESO',
      cantidad: ins.existencia,
      existenciaResultante: ins.existencia,
      motivo: 'Stock inicial',
      origen: 'INICIAL',
      usuarioId: admin.id
    })
  }

  // 4. Clientes (Mínimo 10 clientes según Sec. 8)
  const clientesData = [
    { tipoDocumento: 'DNI' as const, documento: '28456123', nombre: 'María González', domicilio: 'San Martín 450, San Miguel de Tucumán', telefono: '3815550123', email: 'maria.gonzalez@ejemplo.com', habilitadoCuentaCorriente: true, limiteCreditoCentavos: 25000000, activo: true, creadoEn: haceDias(55) },
    { tipoDocumento: 'DNI' as const, documento: '30123456', nombre: 'Juan Carlos Rodríguez', domicilio: '25 de Mayo 780', telefono: '3814449988', email: 'juancarlos@ejemplo.com', habilitadoCuentaCorriente: true, limiteCreditoCentavos: 15000000, activo: true, creadoEn: haceDias(50) },
    { tipoDocumento: 'CUIT' as const, documento: '30712345678', nombre: 'Distribuidora del Norte S.R.L.', domicilio: 'Av. Aconquija 1200, Yerba Buena', telefono: '3814223344', email: 'contacto@distribuidoranorte.com', habilitadoCuentaCorriente: true, limiteCreditoCentavos: 60000000, activo: true, creadoEn: haceDias(45) },
    { tipoDocumento: 'DNI' as const, documento: '32987654', nombre: 'Florencia Suárez', domicilio: 'Crisóstomo Álvarez 310', telefono: '3814881122', email: 'flor.suarez@ejemplo.com', habilitadoCuentaCorriente: true, limiteCreditoCentavos: 18000000, activo: true, creadoEn: haceDias(40) },
    { tipoDocumento: 'DNI' as const, documento: '27654321', nombre: 'Roberto Gómez', domicilio: 'Laprida 650', telefono: '3814995544', email: 'roberto.gomez@ejemplo.com', habilitadoCuentaCorriente: true, limiteCreditoCentavos: 12000000, activo: true, creadoEn: haceDias(35) },
    { tipoDocumento: 'CUIT' as const, documento: '30708998871', nombre: 'Café & Delicias Bar', domicilio: 'Muñecas 180', telefono: '3814332211', email: 'compras@cafedelicias.com', habilitadoCuentaCorriente: true, limiteCreditoCentavos: 45000000, activo: true, creadoEn: haceDias(30) },
    { tipoDocumento: 'DNI' as const, documento: '35444333', nombre: 'Carla Fernández', domicilio: 'Congreso 420', telefono: '3816112233', email: 'carla.f@ejemplo.com', habilitadoCuentaCorriente: true, limiteCreditoCentavos: 10000000, activo: true, creadoEn: haceDias(28) },
    { tipoDocumento: 'DNI' as const, documento: '33222111', nombre: 'Esteban Morales', domicilio: 'Buenos Aires 590', telefono: '3816778899', email: 'esteban.m@ejemplo.com', habilitadoCuentaCorriente: true, limiteCreditoCentavos: 14000000, activo: true, creadoEn: haceDias(25) },
    { tipoDocumento: 'DNI' as const, documento: '29888777', nombre: 'Patricia Luna', domicilio: 'Balcarce 740', telefono: '3815334455', email: 'patricia.luna@ejemplo.com', habilitadoCuentaCorriente: true, limiteCreditoCentavos: 20000000, activo: true, creadoEn: haceDias(20) },
    { tipoDocumento: 'DNI' as const, documento: '38999888', nombre: 'Lucas Benítez (Sin Cta Cte)', domicilio: 'Lavalle 320', telefono: '3816667788', email: 'lucas@ejemplo.com', habilitadoCuentaCorriente: false, limiteCreditoCentavos: null, activo: true, creadoEn: haceDias(15) }
  ]

  const clientesList = await db.insert(clientes).values(clientesData).returning()

  // 5. Facturas históricas (Al menos 50 facturas en los últimos 30 días según Sec. 8)
  let proximoNumeroFactura = 1
  let proximoNumeroRecibo = 1

  for (let d = 29; d >= 0; d--) {
    // Entre 1 y 3 facturas diarias para totalizar más de 55 facturas
    const cantVentasDelDia = d === 0 ? 3 : (d % 3 === 0 ? 3 : 2)
    for (let v = 0; v < cantVentasDelDia; v++) {
      const fecha = haceDias(d)
      const esConsumidorFinal = Math.random() > 0.45
      const clienteElegido = esConsumidorFinal ? null : clientesList[Math.floor(Math.random() * (clientesList.length - 1))]

      let formaPago: 'contado' | 'tarjeta' | 'cuenta_corriente' = 'contado'
      if (!clienteElegido) {
        formaPago = Math.random() > 0.5 ? 'contado' : 'tarjeta'
      } else {
        const r = Math.random()
        formaPago = r < 0.35 ? 'contado' : r < 0.7 ? 'tarjeta' : 'cuenta_corriente'
      }

      // Elegir 1 o 2 productos aleatorios
      const prod1 = prods[Math.floor(Math.random() * prods.length)]
      const cant1 = Math.floor(Math.random() * 2) + 1
      const subtotal1 = prod1.precioVentaCentavos * cant1

      let total = subtotal1
      const renglones = [
        { producto: prod1, cantidad: cant1, precio: prod1.precioVentaCentavos, subtotal: subtotal1 }
      ]

      if (Math.random() > 0.5) {
        const prod2 = prods[(Math.floor(Math.random() * prods.length) + 1) % prods.length]
        const cant2 = 1
        const subtotal2 = prod2.precioVentaCentavos * cant2
        total += subtotal2
        renglones.push({
          producto: prod2,
          cantidad: cant2,
          precio: prod2.precioVentaCentavos,
          subtotal: subtotal2
        })
      }

      const [fac] = await db
        .insert(facturas)
        .values({
          numero: proximoNumeroFactura++,
          fecha,
          usuarioId: vendedor.id,
          clienteId: clienteElegido?.id ?? null,
          clienteNombre: clienteElegido ? clienteElegido.nombre : 'Consumidor final',
          clienteDocumento: clienteElegido ? clienteElegido.documento : null,
          formaPago,
          totalCentavos: total,
          pagoMontoCentavos: formaPago === 'contado' ? total + 50000 : null,
          vueltoCentavos: formaPago === 'contado' ? 50000 : null,
          tarjetaTipo: formaPago === 'tarjeta' ? 'debito' : null,
          tarjetaMarca: formaPago === 'tarjeta' ? 'visa' : null,
          tarjetaUltimos4: formaPago === 'tarjeta' ? '4321' : null,
          estado: 'EMITIDA'
        })
        .returning()

      for (const r of renglones) {
        await db.insert(detallesFactura).values({
          facturaId: fac.id,
          productoId: r.producto.id,
          descripcion: r.producto.descripcion,
          cantidad: r.cantidad,
          precioUnitarioCentavos: r.precio,
          subtotalCentavos: r.subtotal
        })
      }
    }
  }

  // 6. Pagos a cuenta corriente de ejemplo (RF-C5)
  const cliente1 = clientesList[0]
  await db.insert(pagos).values({
    numeroRecibo: proximoNumeroRecibo++,
    fecha: haceDias(3),
    clienteId: cliente1.id,
    usuarioId: admin.id,
    importeCentavos: 500000, // $5.000,00
    medio: 'efectivo',
    observacion: 'Pago a cuenta de factura'
  })

  const cliente2 = clientesList[1]
  await db.insert(pagos).values({
    numeroRecibo: proximoNumeroRecibo++,
    fecha: haceDias(1),
    clienteId: cliente2.id,
    usuarioId: vendedor.id,
    importeCentavos: 800000, // $8.000,00
    medio: 'transferencia',
    observacion: 'Transferencia bancaria Banco Macro'
  })

  console.log('[Seed] ¡Datos iniciales y de prueba cargados con éxito!')
  console.log('   Total de categorías: 6')
  console.log(`   Total de productos:   ${prods.length} (Cumple mínimo 30)`)
  console.log(`   Total de clientes:    ${clientesList.length} (Cumple mínimo 10)`)
  console.log(`   Total de facturas:    ${proximoNumeroFactura - 1} (Cumple mínimo 50)`)
  console.log('   Administrador: admin@comercio.com / admin123')
  console.log('   Vendedor:      vendedor@comercio.com / vendedor123')
}
