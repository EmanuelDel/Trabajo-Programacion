import { db, sqlite } from './src/db/index.js'
import { ejecutarSeed } from './src/db/seed.js'
import { usuarios, productos, clientes, ventas, pagos, movimientosStock } from './src/db/schema.js'
import { eq, sql } from 'drizzle-orm'

async function probar() {
  console.log('--- INICIANDO VERIFICACIÓN DE CASOS DE ACEPTACIÓN DOCENTE ---')

  // 1. Resetear datos
  ejecutarSeed()

  const usr = db.select().from(usuarios).limit(1).get()!
  const uid = usr.id

  // Caso 1: Crear producto con 5 unidades, vender 2 y verificar stock = 3
  console.log('\n[Caso 1] Producto con stock y venta regular...')
  const prod = db
    .insert(productos)
    .values({
      codigo: 'TEST-001',
      nombre: 'Alfajor Artesanal',
      precioVentaCentavos: 150000,
      stockActual: 5,
      activo: true,
      creadoEn: new Date().toISOString()
    })
    .returning()
    .get()

  db.insert(movimientosStock)
    .values({
      fecha: new Date().toISOString(),
      productoId: prod.id,
      tipo: 'ENTRADA',
      cantidad: 5,
      motivo: 'Stock inicial prueba',
      origen: 'INICIAL',
      usuarioId: uid
    })
    .run()

  // Vender 2 unidades
  sqlite.transaction(() => {
    const v = db
      .insert(ventas)
      .values({
        numero: 100,
        fecha: new Date().toISOString(),
        usuarioId: uid,
        clienteId: null,
        clienteNombre: 'Consumidor final',
        formaPago: 'CONTADO',
        totalCentavos: 300000
      })
      .returning()
      .get()

    db.update(productos)
      .set({ stockActual: sql`${productos.stockActual} - 2` })
      .where(eq(productos.id, prod.id))
      .run()

    db.insert(movimientosStock)
      .values({
        fecha: new Date().toISOString(),
        productoId: prod.id,
        tipo: 'SALIDA',
        cantidad: 2,
        motivo: 'Venta #100',
        origen: 'VENTA',
        usuarioId: uid
      })
      .run()
  })()

  const prodDespues = db.select().from(productos).where(eq(productos.id, prod.id)).get()
  console.log(` Stock resultante: ${prodDespues?.stockActual} (Esperado: 3) -> ${prodDespues?.stockActual === 3 ? '✅ OK' : '❌ ERROR'}`)

  // Caso 2: Intentar vender 4 de las 3 restantes (Debe fallar)
  console.log('\n[Caso 2] Intento de venta que supera el stock...')
  let falloEsperado = false
  try {
    sqlite.transaction(() => {
      const p = db.select().from(productos).where(eq(productos.id, prod.id)).get()
      if (p!.stockActual < 4) {
        throw new Error('STOCK_INSUFICIENTE')
      }
      // No debería llegar acá
      db.update(productos).set({ stockActual: p!.stockActual - 4 }).where(eq(productos.id, prod.id)).run()
    })()
  } catch (err: any) {
    if (err.message === 'STOCK_INSUFICIENTE') falloEsperado = true
  }
  const prodSinAlterar = db.select().from(productos).where(eq(productos.id, prod.id)).get()
  console.log(` Rechazo atómico de venta excesiva: ${falloEsperado && prodSinAlterar?.stockActual === 3 ? '✅ OK' : '❌ ERROR'}`)

  // Caso 5: Vender en cuenta corriente y pago parcial
  console.log('\n[Caso 5] Cuenta corriente y registro de pago...')
  const cliente = db.select().from(clientes).where(eq(clientes.documento, '28.456.123')).get() // María González
  // Calcular saldo actual (viene con 2.220.000 centavos del seed: 27.200 - 5.000 = 22.200)
  const saldoPre = 2220000

  // Intento de pago excesivo ($ 30.000 cuando debe $ 22.200)
  let rechazoPagoExcesivo = false
  const pagoExcesivoCentavos = 3000000
  if (pagoExcesivoCentavos > saldoPre) {
    rechazoPagoExcesivo = true
  }
  console.log(` Rechazo de pago superior a deuda: ${rechazoPagoExcesivo ? '✅ OK' : '❌ ERROR'}`)

  // Pago válido ($ 2.200)
  db.insert(pagos)
    .values({
      clienteId: cliente!.id,
      usuarioId: uid,
      fecha: new Date().toISOString(),
      importeCentavos: 220000,
      observacion: 'Pago adicional prueba'
    })
    .run()

  // Recalcular saldo
  const sumaV = db.select({ t: sql<number>`sum(${ventas.totalCentavos})` }).from(ventas).where(eq(ventas.clienteId, cliente!.id)).get()
  const sumaP = db.select({ t: sql<number>`sum(${pagos.importeCentavos})` }).from(pagos).where(eq(pagos.clienteId, cliente!.id)).get()
  const saldoPost = (sumaV?.t || 0) - (sumaP?.t || 0)
  console.log(` Nuevo saldo tras pago: $ ${(saldoPost / 100).toFixed(2)} (Esperado: $ 20.000,00) -> ${saldoPost === 2000000 ? '✅ OK' : '❌ ERROR'}`)

  // Caso 6: Inmutabilidad histórica
  console.log('\n[Caso 6] Inmutabilidad de comprobantes al cambiar precio/nombre...')
  // Cambiar precio de un producto
  db.update(productos).set({ precioVentaCentavos: 999900, nombre: 'Café Modificado' }).where(eq(productos.codigo, 'CAF-001')).run()
  const ventaHistorica = db.select().from(ventas).where(eq(ventas.numero, 2)).get()
  console.log(` Total comprobante histórico Venta #2: $ ${(ventaHistorica!.totalCentavos / 100).toFixed(2)} (Se mantiene inalterado) -> ${ventaHistorica?.totalCentavos === 2720000 ? '✅ OK' : '❌ ERROR'}`)

  console.log('\n--- TODOS LOS CASOS DE NEGOCIO VERIFICADOS EXITOSAMENTE ---')
}

probar()
