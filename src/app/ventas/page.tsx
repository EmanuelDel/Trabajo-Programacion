'use client'

import React, { useState, useEffect } from 'react'
import { AppLayout } from '@/components/AppLayout'
import { formatearCentavos, formatearFecha, pesosACentavos } from '@/lib/format'

interface Producto {
  id: number
  codigo: string
  descripcion: string
  precioVentaCentavos: number
  existencia: number
  stockMinimo: number
  activo: boolean
}

interface Cliente {
  id: number
  nombre: string
  documento: string
  telefono?: string
  email?: string
  habilitadoCuentaCorriente: boolean
  limiteCreditoCentavos: number | null
  saldoCentavos: number
}

interface ItemVenta {
  productoId: number
  codigo: string
  descripcion: string
  precioUnitarioCentavos: number
  cantidad: number
  existenciaDisponible: number
}

interface FacturaResumen {
  id: number
  numero: number
  fecha: string
  clienteNombre: string
  clienteDocumento?: string
  formaPago: string
  totalCentavos: number
  estado: string
  vendedorNombre?: string
  detalles?: Array<{
    id: number
    descripcion: string
    cantidad: number
    precioUnitarioCentavos: number
    subtotalCentavos: number
  }>
}

export default function VentasPage() {
  const [vista, setVista] = useState<'nueva' | 'historial'>('nueva')

  // Datos del catálogo y clientes
  const [productos, setProductos] = useState<Producto[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [ventasHistorial, setVentasHistorial] = useState<FacturaResumen[]>([])
  const [cargando, setCargando] = useState(true)

  // Estado de la venta en curso
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState<number | null>(null)
  const [items, setItems] = useState<ItemVenta[]>([])
  const [productoABorrar, setProductoABorrar] = useState<string>('')
  const [formaPago, setFormaPago] = useState<'contado' | 'tarjeta' | 'cuenta_corriente'>('contado')

  // Datos específicos de pago
  const [montoEntregadoPesos, setMontoEntregadoPesos] = useState<string>('')
  const [tarjetaTipo, setTarjetaTipo] = useState<'debito' | 'credito'>('debito')
  const [tarjetaMarca, setTarjetaMarca] = useState<'visa' | 'mastercard' | 'amex' | 'otra'>('visa')
  const [tarjetaUltimos4, setTarjetaUltimos4] = useState<string>('1234')

  // Feedback y modales
  const [mensajeError, setMensajeError] = useState<string>('')
  const [confirmando, setConfirmando] = useState(false)
  const [comprobanteEmitido, setComprobanteEmitido] = useState<any | null>(null)
  const [comprobanteDetalle, setComprobanteDetalle] = useState<any | null>(null)

  // Modal nuevo cliente rápido
  const [modalNuevoCliente, setModalNuevoCliente] = useState(false)
  const [nuevoClienteNombre, setNuevoClienteNombre] = useState('')
  const [nuevoClienteDoc, setNuevoClienteDoc] = useState('')
  const [nuevoClienteTel, setNuevoClienteTel] = useState('')
  const [nuevoClienteEmail, setNuevoClienteEmail] = useState('')
  const [guardandoCliente, setGuardandoCliente] = useState(false)

  // Cargar datos iniciales
  const cargarDatos = async () => {
    setCargando(true)
    try {
      const [resProd, resCli, resVentas] = await Promise.all([
        fetch('/api/productos'),
        fetch('/api/clientes'),
        fetch('/api/ventas')
      ])

      if (resProd.ok) setProductos(await resProd.json())
      if (resCli.ok) {
        const dataCli = await resCli.json()
        setClientes(dataCli.datos || dataCli)
      }
      if (resVentas.ok) {
        const dataVentas = await resVentas.json()
        setVentasHistorial(dataVentas.datos || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  const clienteActual = clientes.find((c) => c.id === clienteSeleccionadoId) || null

  // Cálculos de venta
  const totalCentavos = items.reduce(
    (acc, item) => acc + item.precioUnitarioCentavos * item.cantidad,
    0
  )
  const cantidadArticulos = items.reduce((acc, item) => acc + item.cantidad, 0)

  const montoEntregadoCentavos = montoEntregadoPesos ? pesosACentavos(montoEntregadoPesos) : totalCentavos
  const vueltoCentavos = Math.max(0, montoEntregadoCentavos - totalCentavos)

  // Agregar producto al borrador
  const agregarProducto = () => {
    if (!productoABorrar) return
    const prodId = parseInt(productoABorrar, 10)
    const prod = productos.find((p) => p.id === prodId)
    if (!prod) return

    if (prod.existencia <= 0) {
      setMensajeError(`"${prod.descripcion}" no tiene existencias disponibles`)
      return
    }

    setMensajeError('')

    const existenteIndex = items.findIndex((i) => i.productoId === prod.id)
    if (existenteIndex >= 0) {
      const itemExistente = items[existenteIndex]
      if (itemExistente.cantidad + 1 > prod.existencia) {
        setMensajeError(`Supera el stock disponible (${prod.existencia} unidades)`)
        return
      }
      const copia = [...items]
      copia[existenteIndex].cantidad += 1
      setItems(copia)
    } else {
      setItems([
        ...items,
        {
          productoId: prod.id,
          codigo: prod.codigo,
          descripcion: prod.descripcion,
          precioUnitarioCentavos: prod.precioVentaCentavos,
          cantidad: 1,
          existenciaDisponible: prod.existencia
        }
      ])
    }
  }

  const modificarCantidad = (productoId: number, delta: number) => {
    const item = items.find((i) => i.productoId === productoId)
    if (!item) return
    const nuevaCantidad = item.cantidad + delta
    if (nuevaCantidad <= 0) {
      quitarItem(productoId)
      return
    }
    if (nuevaCantidad > item.existenciaDisponible) {
      setMensajeError(`Solo hay ${item.existenciaDisponible} unidades disponibles`)
      return
    }
    setMensajeError('')
    setItems(
      items.map((i) =>
        i.productoId === productoId ? { ...i, cantidad: nuevaCantidad } : i
      )
    )
  }

  const quitarItem = (productoId: number) => {
    setItems(items.filter((i) => i.productoId !== productoId))
  }

  // Confirmar venta
  const confirmarVenta = async () => {
    setMensajeError('')
    if (items.length === 0) {
      setMensajeError('Agregá al menos un producto a la venta')
      return
    }

    if (formaPago === 'contado' && montoEntregadoCentavos < totalCentavos) {
      setMensajeError('El monto entregado no puede ser menor al total')
      return
    }

    if (formaPago === 'cuenta_corriente') {
      if (!clienteActual) {
        setMensajeError('Debes seleccionar un cliente registrado para cuenta corriente')
        return
      }
      if (!clienteActual.habilitadoCuentaCorriente) {
        setMensajeError(`El cliente ${clienteActual.nombre} no tiene habilitada la cuenta corriente`)
        return
      }
      if (clienteActual.limiteCreditoCentavos !== null) {
        const nuevoSaldo = clienteActual.saldoCentavos + totalCentavos
        if (nuevoSaldo > clienteActual.limiteCreditoCentavos) {
          setMensajeError(
            `Supera el límite de crédito permitido (${formatearCentavos(clienteActual.limiteCreditoCentavos)})`
          )
          return
        }
      }
    }

    if (formaPago === 'tarjeta' && (!tarjetaUltimos4 || tarjetaUltimos4.length !== 4)) {
      setMensajeError('Ingresá los últimos 4 dígitos de la tarjeta')
      return
    }

    setConfirmando(true)

    try {
      const res = await fetch('/api/ventas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: clienteActual?.id || null,
          formaPago,
          productos: items.map((i) => ({
            productoId: i.productoId,
            cantidad: i.cantidad
          })),
          pagoMontoCentavos: formaPago === 'contado' ? montoEntregadoCentavos : undefined,
          tarjetaTipo: formaPago === 'tarjeta' ? tarjetaTipo : undefined,
          tarjetaMarca: formaPago === 'tarjeta' ? tarjetaMarca : undefined,
          tarjetaUltimos4: formaPago === 'tarjeta' ? tarjetaUltimos4 : undefined
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setMensajeError(data.error || 'Error al confirmar la venta')
        setConfirmando(false)
        return
      }

      // Venta exitosa
      setComprobanteEmitido(data)
      setItems([])
      setClienteSeleccionadoId(null)
      setMontoEntregadoPesos('')
      cargarDatos()
    } catch {
      setMensajeError('Error de conexión al emitir la factura')
    } finally {
      setConfirmando(false)
    }
  }

  // Guardar nuevo cliente desde modal rápido
  const guardarNuevoCliente = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardandoCliente(true)
    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nuevoClienteNombre,
          documento: nuevoClienteDoc,
          telefono: nuevoClienteTel || undefined,
          email: nuevoClienteEmail || undefined,
          habilitadoCuentaCorriente: true
        })
      })

      if (res.ok) {
        const nuevo = await res.json()
        await cargarDatos()
        setClienteSeleccionadoId(nuevo.id)
        setModalNuevoCliente(false)
        setNuevoClienteNombre('')
        setNuevoClienteDoc('')
        setNuevoClienteTel('')
        setNuevoClienteEmail('')
      } else {
        const err = await res.json()
        alert(err.error || 'Error al crear cliente')
      }
    } finally {
      setGuardandoCliente(false)
    }
  }

  return (
    <AppLayout>
      {/* Encabezado y Selector de Vista */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7">
        <div>
          <div className="text-[10px] uppercase tracking-widest font-bold text-[#73877a] mb-1">
            Ventas / Mostrador
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#20372d] font-normal tracking-tight">
            {vista === 'nueva' ? 'Crear una venta' : 'Ventas registradas'}
          </h1>
          <p className="text-[#758278] text-sm mt-1">
            {vista === 'nueva'
              ? 'Prepará el comprobante y registrá la operación en el mostrador.'
              : 'Consultá los comprobantes emitidos y descargá las ventas.'}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setVista('nueva')}
            className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
              vista === 'nueva'
                ? 'bg-[#254d3c] text-white shadow'
                : 'bg-white text-[#355445] border border-[#d4ded4] hover:bg-[#fafbf7]'
            }`}
          >
            + Nueva venta
          </button>
          <button
            onClick={() => setVista('historial')}
            className={`px-4 py-2.5 rounded-lg text-sm font-bold transition-colors cursor-pointer ${
              vista === 'historial'
                ? 'bg-[#254d3c] text-white shadow'
                : 'bg-white text-[#355445] border border-[#d4ded4] hover:bg-[#fafbf7]'
            }`}
          >
            Ver ventas registradas ({ventasHistorial.length})
          </button>
        </div>
      </div>

      {vista === 'nueva' ? (
        /* Vista de Nueva Venta (Mostrador) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Columna Izquierda: Cliente y Productos */}
          <div className="lg:col-span-8 space-y-6">
            {/* Panel Cliente */}
            <div className="bg-white border border-[#e1e7df] rounded-xl overflow-hidden shadow-sm">
              <div className="p-5 border-b border-[#edf0eb] flex justify-between items-center bg-[#fafbf8]">
                <div>
                  <h2 className="text-sm font-bold text-[#20372d]">Cliente</h2>
                  <p className="text-xs text-[#829087]">Elegí a quién corresponde la venta.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalNuevoCliente(true)}
                  className="text-xs text-[#38654c] hover:underline font-bold cursor-pointer"
                >
                  + Nuevo cliente
                </button>
              </div>

              <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#52675b] mb-1">
                    Comprador
                  </label>
                  <select
                    value={clienteSeleccionadoId ?? ''}
                    onChange={(e) => {
                      const val = e.target.value
                      setClienteSeleccionadoId(val ? parseInt(val, 10) : null)
                      if (!val && formaPago === 'cuenta_corriente') {
                        setFormaPago('contado')
                      }
                    }}
                    className="w-full h-10 px-3 bg-[#fbfcf9] border border-[#dbe3da] rounded-lg text-sm text-[#293b31] focus:outline-none focus:ring-2 focus:ring-[#d8a448]"
                  >
                    <option value="">Consumidor final</option>
                    {clientes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} (DNI/CUIT: {c.documento})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#52675b] mb-1">
                    Documento / Cuenta Corriente
                  </label>
                  <div className="h-10 px-3 bg-[#f3f5f0] border border-[#dbe3da] rounded-lg text-sm text-[#4e6657] flex items-center justify-between">
                    <span>{clienteActual ? clienteActual.documento : '— Sin identificación'}</span>
                    {clienteActual && (
                      <span className="text-xs font-bold text-[#b85243]">
                        Saldo: {formatearCentavos(clienteActual.saldoCentavos)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Panel Productos y Carrito */}
            <div className="bg-white border border-[#e1e7df] rounded-xl overflow-hidden shadow-sm">
              <div className="p-5 border-b border-[#edf0eb] flex justify-between items-center bg-[#fafbf8]">
                <div>
                  <h2 className="text-sm font-bold text-[#20372d]">Productos</h2>
                  <p className="text-xs text-[#829087]">Agregá los artículos de la venta.</p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-md bg-[#eff1ec] text-[#66776b] font-bold">
                  {items.length} productos ({cantidadArticulos} u.)
                </span>
              </div>

              {/* Selector para agregar */}
              <div className="p-5 border-b border-[#edf0eb]">
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-bold text-[#52675b] mb-1">
                      Seleccionar producto del catálogo
                    </label>
                    <select
                      value={productoABorrar}
                      onChange={(e) => setProductoABorrar(e.target.value)}
                      className="w-full h-10 px-3 bg-[#fbfcf9] border border-[#dbe3da] rounded-lg text-sm text-[#293b31] focus:outline-none focus:ring-2 focus:ring-[#d8a448]"
                    >
                      <option value="">Buscar o seleccionar artículo...</option>
                      {productos
                        .filter((p) => p.activo)
                        .map((p) => (
                          <option key={p.id} value={p.id} disabled={p.existencia <= 0}>
                            {p.codigo} · {p.descripcion} · {formatearCentavos(p.precioVentaCentavos)} (Stock: {p.existencia})
                          </option>
                        ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={agregarProducto}
                    className="w-full sm:w-auto h-10 px-5 bg-[#254d3c] hover:bg-[#34634d] text-white font-bold rounded-lg text-sm cursor-pointer transition-colors shadow-sm"
                  >
                    + Agregar
                  </button>
                </div>
              </div>

              {/* Tabla de Renglones */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-[#fafbf8] text-[10px] uppercase tracking-wider text-[#8a988d] border-b border-[#edf0eb]">
                      <th className="py-3 px-5">Producto</th>
                      <th className="py-3 px-3 text-center">Cantidad</th>
                      <th className="py-3 px-4 text-right">Precio</th>
                      <th className="py-3 px-4 text-right">Subtotal</th>
                      <th className="py-3 px-4 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#edf0eb]">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-[#89968b] text-sm">
                          El comprobante está vacío. Agregá productos arriba.
                        </td>
                      </tr>
                    ) : (
                      items.map((item) => (
                        <tr key={item.productoId} className="hover:bg-[#fafbf8]">
                          <td className="py-3 px-5">
                            <div className="font-semibold text-[#2c4436]">
                              {item.descripcion}
                            </div>
                            <div className="text-xs text-[#89968d]">
                              Código: {item.codigo} · Disp: {item.existenciaDisponible}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="inline-flex items-center border border-[#dbe3da] rounded-lg overflow-hidden bg-white">
                              <button
                                type="button"
                                onClick={() => modificarCantidad(item.productoId, -1)}
                                className="w-8 h-8 flex items-center justify-center text-[#2c4436] hover:bg-[#edf0eb] font-bold"
                              >
                                −
                              </button>
                              <span className="w-10 text-center font-bold text-sm">
                                {item.cantidad}
                              </span>
                              <button
                                type="button"
                                onClick={() => modificarCantidad(item.productoId, 1)}
                                className="w-8 h-8 flex items-center justify-center text-[#2c4436] hover:bg-[#edf0eb] font-bold"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-[#52675b]">
                            {formatearCentavos(item.precioUnitarioCentavos)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-[#20372d]">
                            {formatearCentavos(item.precioUnitarioCentavos * item.cantidad)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => quitarItem(item.productoId)}
                              className="text-xs text-[#b85645] hover:underline font-bold"
                            >
                              Quitar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Totales y Cobro */}
          <div className="lg:col-span-4">
            <div className="bg-white border border-[#e1e7df] rounded-xl p-5 shadow-sm space-y-5 sticky top-24">
              <div className="border-b border-[#edf0eb] pb-4">
                <h2 className="text-base font-bold text-[#20372d]">Resumen de venta</h2>
                <p className="text-xs text-[#829087]">Comprobante comercial interno</p>
              </div>

              {/* Totales */}
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-[#697b6d]">
                  <span>Total unidades:</span>
                  <span className="font-semibold">{cantidadArticulos} u.</span>
                </div>
                <div className="flex justify-between text-[#697b6d]">
                  <span>Subtotal:</span>
                  <span className="font-mono">{formatearCentavos(totalCentavos)}</span>
                </div>
                <div className="flex justify-between items-baseline pt-3 border-t border-[#edf0eb] text-[#253d30] font-bold text-xl">
                  <span>Total a pagar:</span>
                  <span className="font-serif text-2xl text-[#20372d]">
                    {formatearCentavos(totalCentavos)}
                  </span>
                </div>
              </div>

              {/* Formas de Pago */}
              <div className="pt-2 border-t border-[#edf0eb]">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#52675b] mb-3">
                  Forma de pago
                </h3>
                <div className="space-y-2 text-sm">
                  <label className="flex items-center gap-3 p-3 border border-[#e2e8df] rounded-lg cursor-pointer hover:bg-[#fafbf8]">
                    <input
                      type="radio"
                      name="pago"
                      checked={formaPago === 'contado'}
                      onChange={() => setFormaPago('contado')}
                      className="accent-[#254d3c]"
                    />
                    <span className="font-medium text-[#354d3d]">Contado / Efectivo</span>
                  </label>

                  {formaPago === 'contado' && (
                    <div className="p-3 bg-[#fafbf8] border border-[#e2e8df] rounded-lg space-y-2 text-xs">
                      <div>
                        <label className="block text-[#52675b] font-bold mb-1">
                          Monto entregado ($)
                        </label>
                        <input
                          type="number"
                          step="1"
                          placeholder={(totalCentavos / 100).toString()}
                          value={montoEntregadoPesos}
                          onChange={(e) => setMontoEntregadoPesos(e.target.value)}
                          className="w-full h-9 px-2.5 bg-white border border-[#dbe3da] rounded text-sm"
                        />
                      </div>
                      <div className="flex justify-between text-sm font-bold pt-1 text-[#254d3c]">
                        <span>Vuelto:</span>
                        <span className="font-mono">{formatearCentavos(vueltoCentavos)}</span>
                      </div>
                    </div>
                  )}

                  <label className="flex items-center gap-3 p-3 border border-[#e2e8df] rounded-lg cursor-pointer hover:bg-[#fafbf8]">
                    <input
                      type="radio"
                      name="pago"
                      checked={formaPago === 'tarjeta'}
                      onChange={() => setFormaPago('tarjeta')}
                      className="accent-[#254d3c]"
                    />
                    <span className="font-medium text-[#354d3d]">Tarjeta (débito / crédito)</span>
                  </label>

                  {formaPago === 'tarjeta' && (
                    <div className="p-3 bg-[#fafbf8] border border-[#e2e8df] rounded-lg space-y-2 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[#52675b] font-bold mb-1">Tipo</label>
                          <select
                            value={tarjetaTipo}
                            onChange={(e) => setTarjetaTipo(e.target.value as any)}
                            className="w-full h-8 px-2 bg-white border border-[#dbe3da] rounded"
                          >
                            <option value="debito">Débito</option>
                            <option value="credito">Crédito</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[#52675b] font-bold mb-1">Marca</label>
                          <select
                            value={tarjetaMarca}
                            onChange={(e) => setTarjetaMarca(e.target.value as any)}
                            className="w-full h-8 px-2 bg-white border border-[#dbe3da] rounded"
                          >
                            <option value="visa">Visa</option>
                            <option value="mastercard">Mastercard</option>
                            <option value="amex">Amex</option>
                            <option value="otra">Otra</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[#52675b] font-bold mb-1">Últimos 4 dígitos</label>
                        <input
                          type="text"
                          maxLength={4}
                          value={tarjetaUltimos4}
                          onChange={(e) => setTarjetaUltimos4(e.target.value.replace(/\D/g, ''))}
                          placeholder="1234"
                          className="w-full h-8 px-2 bg-white border border-[#dbe3da] rounded text-center tracking-widest font-mono"
                        />
                      </div>
                    </div>
                  )}

                  <label
                    className={`flex items-center gap-3 p-3 border rounded-lg ${
                      clienteActual && clienteActual.habilitadoCuentaCorriente
                        ? 'border-[#e2e8df] cursor-pointer hover:bg-[#fafbf8]'
                        : 'border-[#edf0eb] opacity-60 cursor-not-allowed bg-[#fafbf8]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="pago"
                      disabled={!clienteActual || !clienteActual.habilitadoCuentaCorriente}
                      checked={formaPago === 'cuenta_corriente'}
                      onChange={() => setFormaPago('cuenta_corriente')}
                      className="accent-[#254d3c]"
                    />
                    <div className="flex-1">
                      <span className="font-medium text-[#354d3d] block">Cuenta corriente</span>
                      {!clienteActual ? (
                        <small className="text-[10px] text-[#89968b]">
                          Elegí un cliente registrado arriba
                        </small>
                      ) : !clienteActual.habilitadoCuentaCorriente ? (
                        <small className="text-[10px] text-[#b85243]">
                          Cliente no habilitado para cuenta corriente
                        </small>
                      ) : (
                        <small className="text-[10px] text-[#4d7355]">
                          Límite: {clienteActual.limiteCreditoCentavos !== null ? formatearCentavos(clienteActual.limiteCreditoCentavos) : 'Sin límite'}
                        </small>
                      )}
                    </div>
                  </label>
                </div>
              </div>

              {mensajeError && (
                <div className="p-3 bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-xs rounded-lg font-medium">
                  {mensajeError}
                </div>
              )}

              <button
                type="button"
                disabled={confirmando || items.length === 0}
                onClick={confirmarVenta}
                className="w-full h-12 bg-[#254d3c] hover:bg-[#34634d] disabled:opacity-50 text-white font-bold rounded-lg transition-colors cursor-pointer text-sm shadow"
              >
                {confirmando ? 'Procesando venta...' : 'Confirmar venta →'}
              </button>

              <p className="text-[11px] text-[#89968b] text-center leading-relaxed">
                Al confirmar se descuentan automáticamente las existencias y se actualiza la cuenta corriente.
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Vista de Historial de Ventas */
        <div className="space-y-6">
          {/* Tarjetas de Estadísticas rápidas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-[#e1e7df] rounded-xl p-5 shadow-sm">
              <p className="text-xs text-[#7b8b7e] font-medium mb-1">Total operaciones</p>
              <strong className="font-serif text-3xl text-[#294535] font-normal">
                {ventasHistorial.length}
              </strong>
              <small className="block text-xs text-[#8b998e] mt-1">Registradas en el sistema</small>
            </div>
            <div className="bg-white border border-[#e1e7df] rounded-xl p-5 shadow-sm">
              <p className="text-xs text-[#7b8b7e] font-medium mb-1">Total facturado</p>
              <strong className="font-serif text-3xl text-[#294535] font-normal">
                {formatearCentavos(
                  ventasHistorial
                    .filter((v) => v.estado === 'EMITIDA')
                    .reduce((acc, v) => acc + v.totalCentavos, 0)
                )}
              </strong>
              <small className="block text-xs text-[#8b998e] mt-1">Facturas emitidas</small>
            </div>
            <div className="bg-white border border-[#e1e7df] rounded-xl p-5 shadow-sm">
              <p className="text-xs text-[#7b8b7e] font-medium mb-1">Última operación</p>
              <strong className="font-serif text-3xl text-[#294535] font-normal">
                #{String(ventasHistorial[0]?.numero || 0).padStart(5, '0')}
              </strong>
              <small className="block text-xs text-[#8b998e] mt-1">
                {formatearFecha(ventasHistorial[0]?.fecha)}
              </small>
            </div>
          </div>

          {/* Listado de comprobantes estilo Card */}
          <div className="space-y-3">
            {ventasHistorial.map((venta) => {
              const esCC = venta.formaPago.toLowerCase().includes('cuenta')
              const esContado = venta.formaPago.toLowerCase().includes('contado')
              const iconBg = esCC
                ? 'bg-[#ffe7dc] text-[#b45332]'
                : esContado
                ? 'bg-[#def4e7] text-[#387e56]'
                : 'bg-[#eee7ff] text-[#7053a3]'

              return (
                <div
                  key={venta.id}
                  className="bg-white border border-[#e2e8df] border-l-4 border-l-[#4d9c76] rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:shadow transition-shadow"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl grid place-items-center font-bold text-sm ${iconBg}`}>
                      #{venta.numero}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-[#2e4839] text-base">
                          Venta #{String(venta.numero).padStart(5, '0')}
                        </h3>
                        <span
                          className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            venta.estado === 'ANULADA'
                              ? 'bg-[#fee2e2] text-[#991b1b]'
                              : esCC
                              ? 'bg-[#fff2d9] text-[#96661d]'
                              : 'bg-[#eaf4e5] text-[#4f7849]'
                          }`}
                        >
                          {venta.estado === 'ANULADA'
                            ? 'ANULADA'
                            : venta.formaPago.replace('_', ' ').toUpperCase()}
                        </span>
                      </div>
                      <p className="text-xs text-[#4e6657] mt-1">
                        {venta.clienteNombre}
                        {venta.clienteDocumento && (
                          <span className="text-[#87948b]"> · Doc: {venta.clienteDocumento}</span>
                        )}
                      </p>
                      <div className="text-[11px] text-[#89968d] mt-1">
                        {formatearFecha(venta.fecha)}
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
                    <span className="font-serif text-xl sm:text-2xl font-bold text-[#284735]">
                      {formatearCentavos(venta.totalCentavos)}
                    </span>
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await fetch(`/api/ventas/${venta.id}`)
                        if (res.ok) {
                          setComprobanteDetalle(await res.json())
                        }
                      }}
                      className="px-3 py-1.5 rounded-lg border border-[#d4ded4] bg-white text-[#355445] text-xs font-bold hover:bg-[#fafbf7] transition-colors cursor-pointer"
                    >
                      Ver comprobante
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* MODAL: COMPROBANTE EMITIDO CON ÉXITO */}
      {comprobanteEmitido && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white max-w-lg w-full rounded-2xl p-6 shadow-2xl border border-[#dfe4dc] space-y-5">
            <div className="text-center border-b border-[#edf0eb] pb-4">
              <div className="w-12 h-12 bg-[#def4e7] text-[#387e56] rounded-full mx-auto grid place-items-center text-xl font-bold mb-2">
                ✓
              </div>
              <h3 className="font-serif text-2xl font-bold text-[#20372d]">
                ¡Venta #{String(comprobanteEmitido.numero).padStart(5, '0')} confirmada!
              </h3>
              <p className="text-xs text-[#687e6e] mt-1">
                Comprobante comercial emitido y stock descargado.
              </p>
            </div>

            <div className="bg-[#fafbf8] border border-[#edf0eb] rounded-xl p-4 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-[#89968d]">Cliente:</span>
                <span className="font-bold text-[#20372d]">{comprobanteEmitido.clienteNombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#89968d]">Forma de pago:</span>
                <span className="font-bold uppercase text-[#20372d]">{comprobanteEmitido.formaPago}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-[#edf0eb] text-sm">
                <span className="font-bold text-[#20372d]">Total:</span>
                <span className="font-mono font-bold text-[#254d3c] text-base">
                  {formatearCentavos(comprobanteEmitido.totalCentavos)}
                </span>
              </div>
              {comprobanteEmitido.vueltoCentavos !== undefined && comprobanteEmitido.vueltoCentavos > 0 && (
                <div className="flex justify-between text-xs font-bold text-[#254d3c]">
                  <span>Vuelto:</span>
                  <span>{formatearCentavos(comprobanteEmitido.vueltoCentavos)}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 h-11 bg-white border border-[#d4ded4] hover:bg-[#fafbf7] text-[#355445] font-bold rounded-lg text-sm transition-colors cursor-pointer"
              >
                🖨 Imprimir
              </button>
              <button
                type="button"
                onClick={() => setComprobanteEmitido(null)}
                className="flex-1 h-11 bg-[#254d3c] hover:bg-[#34634d] text-white font-bold rounded-lg text-sm transition-colors cursor-pointer"
              >
                Cerrar y continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VER DETALLE DE COMPROBANTE HISTÓRICO */}
      {comprobanteDetalle && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white max-w-xl w-full rounded-2xl p-6 shadow-2xl border border-[#dfe4dc] space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-[#edf0eb] pb-3">
              <div>
                <span className="text-xs uppercase tracking-widest text-[#73877a] font-bold">
                  Comprobante interno
                </span>
                <h2 className="font-serif text-2xl font-bold text-[#20372d]">
                  Venta #{String(comprobanteDetalle.numero).padStart(5, '0')}
                </h2>
                <p className="text-xs text-[#89968d]">{formatearFecha(comprobanteDetalle.fecha)}</p>
              </div>
              <button
                type="button"
                onClick={() => setComprobanteDetalle(null)}
                className="w-8 h-8 rounded-full bg-[#edf0eb] text-[#355445] hover:bg-[#dfe4dc] font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-[#fafbf8] p-3 rounded-xl border border-[#edf0eb]">
              <div>
                <span className="text-[#89968d] block">Cliente</span>
                <strong className="text-[#20372d] font-semibold">{comprobanteDetalle.clienteNombre}</strong>
              </div>
              <div>
                <span className="text-[#89968d] block">Forma de pago</span>
                <strong className="text-[#20372d] font-semibold uppercase">{comprobanteDetalle.formaPago}</strong>
              </div>
            </div>

            <div className="border border-[#edf0eb] rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#fafbf8] text-[#8a988d] uppercase tracking-wider border-b border-[#edf0eb]">
                  <tr>
                    <th className="py-2.5 px-3">Artículo</th>
                    <th className="py-2.5 px-2 text-center">Cant</th>
                    <th className="py-2.5 px-3 text-right">Precio</th>
                    <th className="py-2.5 px-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#edf0eb]">
                  {comprobanteDetalle.productos?.map((p: any, idx: number) => (
                    <tr key={idx}>
                      <td className="py-2 px-3 font-medium text-[#2c4436]">{p.descripcion}</td>
                      <td className="py-2 px-2 text-center font-bold">{p.cantidad}</td>
                      <td className="py-2 px-3 text-right font-mono">{formatearCentavos(p.precioUnitarioCentavos)}</td>
                      <td className="py-2 px-3 text-right font-mono font-bold text-[#20372d]">
                        {formatearCentavos(p.subtotalCentavos)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-2 text-lg font-bold text-[#20372d]">
              <span>Total comprobante:</span>
              <span className="font-serif text-2xl font-bold text-[#254d3c]">
                {formatearCentavos(comprobanteDetalle.totalCentavos)}
              </span>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#edf0eb]">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-white border border-[#d4ded4] hover:bg-[#fafbf7] text-[#355445] text-xs font-bold rounded-lg cursor-pointer"
              >
                🖨 Imprimir
              </button>
              <button
                type="button"
                onClick={() => setComprobanteDetalle(null)}
                className="px-4 py-2 bg-[#254d3c] hover:bg-[#34634d] text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ALTA RÁPIDA DE CLIENTE (RF-V2) */}
      {modalNuevoCliente && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form
            onSubmit={guardarNuevoCliente}
            className="bg-white max-w-md w-full rounded-2xl p-6 shadow-2xl border border-[#dfe4dc] space-y-4"
          >
            <div className="border-b border-[#edf0eb] pb-3">
              <h3 className="font-serif text-xl font-bold text-[#20372d]">Nuevo cliente rápido</h3>
              <p className="text-xs text-[#829087]">
                Registralo ahora sin perder los productos de la venta en curso.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#52675b] mb-1">
                  Nombre y apellido o Razón Social *
                </label>
                <input
                  type="text"
                  required
                  value={nuevoClienteNombre}
                  onChange={(e) => setNuevoClienteNombre(e.target.value)}
                  placeholder="Ej. María González"
                  className="w-full h-9 px-3 bg-[#fbfcf9] border border-[#dbe3da] rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#52675b] mb-1">
                  DNI o CUIT *
                </label>
                <input
                  type="text"
                  required
                  value={nuevoClienteDoc}
                  onChange={(e) => setNuevoClienteDoc(e.target.value)}
                  placeholder="Ej. 28.456.123"
                  className="w-full h-9 px-3 bg-[#fbfcf9] border border-[#dbe3da] rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#52675b] mb-1">
                  Teléfono (opcional)
                </label>
                <input
                  type="tel"
                  value={nuevoClienteTel}
                  onChange={(e) => setNuevoClienteTel(e.target.value)}
                  placeholder="Ej. 381 555-0123"
                  className="w-full h-9 px-3 bg-[#fbfcf9] border border-[#dbe3da] rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#52675b] mb-1">
                  Correo electrónico (opcional)
                </label>
                <input
                  type="email"
                  value={nuevoClienteEmail}
                  onChange={(e) => setNuevoClienteEmail(e.target.value)}
                  placeholder="nombre@ejemplo.com"
                  className="w-full h-9 px-3 bg-[#fbfcf9] border border-[#dbe3da] rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#edf0eb]">
              <button
                type="button"
                onClick={() => setModalNuevoCliente(false)}
                className="px-4 py-2 border border-[#d4ded4] bg-white text-[#355445] text-xs font-bold rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardandoCliente}
                className="px-4 py-2 bg-[#254d3c] hover:bg-[#34634d] text-white text-xs font-bold rounded-lg cursor-pointer disabled:opacity-50"
              >
                {guardandoCliente ? 'Guardando...' : 'Guardar y seleccionar'}
              </button>
            </div>
          </form>
        </div>
      )}
    </AppLayout>
  )
}
