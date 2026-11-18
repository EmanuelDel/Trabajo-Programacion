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
  console.log('[Seed] Cargando datos iniciales y de prueba...')

  const ahora = new Date()
  const haceDias = (dias: number) => {
    const d = new Date(ahora.getTime() - dias * 24 * 60 * 60 * 1000)
    return d.toISOString()
  }

  // 1. Usuarios (RF-U3: primer administrador y vendedores)
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

  // 2. Categorías (RF-P7)
  const catsData = [
    { nombre: 'Cafetería y Té' },
    { nombre: 'Almacén y Galletitas' },
    { nombre: 'Bebidas e Infusiones' },
    { nombre: 'Golosinas y Chocolates' }
  ]
  const cats = await db.insert(categorias).values(catsData).returning()
  const catMap = Object.fromEntries(cats.map((c) => [c.nombre, c.id]))

  // 3. Productos (RF-P1, RF-P2)
  const prodsData = [
    {
      codigo: 'CAF-001',
      descripcion: 'Café tostado molido 250 g',
      categoriaId: catMap['Cafetería y Té'],
      precioVentaCentavos: 650000, // $6.500,00
      existencia: 45,
      stockMinimo: 10
    },
    {
      codigo: 'TE-002',
      descripcion: 'Té en hebras surtido 100 g',
      categoriaId: catMap['Cafetería y Té'],
      precioVentaCentavos: 420000, // $4.200,00
      existencia: 30,
      stockMinimo: 5
    },
    {
      codigo: 'YER-003',
      descripcion: 'Yerba mate premium 500 g',
      categoriaId: catMap['Bebidas e Infusiones'],
      precioVentaCentavos: 380000, // $3.800,00
      existencia: 50,
      stockMinimo: 15
    },
    {
      codigo: 'GAL-004',
      descripcion: 'Galletitas artesanales de avena 200 g',
      categoriaId: catMap['Almacén y Galletitas'],
      precioVentaCentavos: 290000, // $2.900,00
      existencia: 2, // Bajo stock mínimo para alerta
      stockMinimo: 8
    },
    {
      codigo: 'CHO-005',
      descripcion: 'Chocolate semiamargo con almendras 100 g',
      categoriaId: catMap['Golosinas y Chocolates'],
      precioVentaCentavos: 350000, // $3.500,00
      existencia: 3, // Bajo stock mínimo
      stockMinimo: 10
    },
    {
      codigo: 'ALF-006',
      descripcion: 'Alfajor clásico de dulce de leche',
      categoriaId: catMap['Golosinas y Chocolates'],
      precioVentaCentavos: 180000, // $1.800,00
      existencia: 60,
      stockMinimo: 15
    }
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

    // Movimiento inicial de stock (RF-P4)
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

  // 4. Clientes (RF-C1, RF-C2)
  const clientesData = [
    {
      tipoDocumento: 'DNI' as const,
      documento: '28456123',
      nombre: 'María González',
      domicilio: 'San Martín 450, San Miguel de Tucumán',
      telefono: '3815550123',
      email: 'maria@ejemplo.com',
      habilitadoCuentaCorriente: true,
      limiteCreditoCentavos: 20000000, // $200.000 de límite
      activo: true,
      creadoEn: haceDias(50)
    },
    {
      tipoDocumento: 'DNI' as const,
      documento: '30123456',
      nombre: 'Juan Carlos Rodríguez',
      domicilio: '25 de Mayo 780',
      telefono: '3814449988',
      email: 'juancarlos@ejemplo.com',
      habilitadoCuentaCorriente: true,
      limiteCreditoCentavos: 15000000, // $150.000 de límite
      activo: true,
      creadoEn: haceDias(40)
    },
    {
      tipoDocumento: 'CUIT' as const,
      documento: '30712345678',
      nombre: 'Distribuidora del Norte S.R.L.',
      domicilio: 'Av. Aconquija 1200, Yerba Buena',
      telefono: '3814223344',
      email: 'contacto@distribuidoranorte.com',
      habilitadoCuentaCorriente: true,
      limiteCreditoCentavos: 50000000, // $500.000 de límite
      activo: true,
      creadoEn: haceDias(40)
    },
    {
      tipoDocumento: 'DNI' as const,
      documento: '38999888',
      nombre: 'Lucas Benítez (Sin Cta Cte)',
      domicilio: 'Lavalle 320',
      telefono: '3816667788',
      email: 'lucas@ejemplo.com',
      habilitadoCuentaCorriente: false, // NO habilitado para cta cte
      limiteCreditoCentavos: null,
      activo: true,
      creadoEn: haceDias(20)
    }
  ]

  const clientesList = await db.insert(clientes).values(clientesData).returning()

  // 5. Facturas históricas para tener métricas y gráficos (RF-V8, RF-T)
  let proximoNumeroFactura = 1
  let proximoNumeroRecibo = 1

  // Generamos ventas en los últimos 30 días
  for (let d = 28; d >= 0; d--) {
    const cantVentasDelDia = d === 0 ? 3 : Math.floor(Math.random() * 3) + 1
    for (let v = 0; v < cantVentasDelDia; v++) {
      const fecha = haceDias(d)
      const esConsumidorFinal = Math.random() > 0.4
      const clienteElegido = esConsumidorFinal ? null : clientesList[Math.floor(Math.random() * 3)] // cliente con cta cte

      let formaPago: 'contado' | 'tarjeta' | 'cuenta_corriente' = 'contado'
      if (!clienteElegido) {
        formaPago = Math.random() > 0.5 ? 'contado' : 'tarjeta'
      } else {
        const r = Math.random()
        formaPago = r < 0.33 ? 'contado' : r < 0.66 ? 'tarjeta' : 'cuenta_corriente'
      }

      // Elegir 1 o 2 productos
      const prod1 = prods[0]
      const cant1 = 1
      const total = prod1.precioVentaCentavos * cant1

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
          pagoMontoCentavos: formaPago === 'contado' ? total + 100000 : null,
          vueltoCentavos: formaPago === 'contado' ? 100000 : null,
          tarjetaTipo: formaPago === 'tarjeta' ? 'debito' : null,
          tarjetaMarca: formaPago === 'tarjeta' ? 'visa' : null,
          tarjetaUltimos4: formaPago === 'tarjeta' ? '4321' : null,
          estado: 'EMITIDA'
        })
        .returning()

      await db.insert(detallesFactura).values({
        facturaId: fac.id,
        productoId: prod1.id,
        descripcion: prod1.descripcion,
        cantidad: cant1,
        precioUnitarioCentavos: prod1.precioVentaCentavos,
        subtotalCentavos: total
      })
    }
  }

  // 6. Pagos a cuenta corriente de ejemplo (RF-C5)
  const cliente1 = clientesList[0]
  await db.insert(pagos).values({
    numeroRecibo: proximoNumeroRecibo++,
    fecha: haceDias(3),
    clienteId: cliente1.id,
    usuarioId: admin.id,
    importeCentavos: 1000000, // $10.000
    medio: 'efectivo',
    observacion: 'Pago parcial a cuenta'
  })

  console.log('[Seed] ¡Datos iniciales y de prueba cargados con éxito!')
  console.log('   Administrador: admin@comercio.com / admin123')
  console.log('   Vendedor:      vendedor@comercio.com / vendedor123')
}
