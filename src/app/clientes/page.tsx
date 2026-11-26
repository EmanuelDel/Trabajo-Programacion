'use client'

import React, { useState, useEffect } from 'react'
import { AppLayout } from '@/components/AppLayout'
import { formatearCentavos, formatearFecha, pesosACentavos } from '@/lib/format'

interface Cliente {
  id: number
  tipoDocumento: string
  documento: string
  nombre: string
  domicilio?: string
  telefono?: string
  email?: string
  habilitadoCuentaCorriente: boolean
  limiteCreditoCentavos: number | null
  saldoCentavos: number
  activo: boolean
}

interface MovimientoCuenta {
  tipo: 'FACTURA' | 'PAGO'
  id: number
  comprobante: string
  fecha: string
  debeCentavos: number
  haberCentavos: number
  saldoAcumuladoCentavos?: number
  detalle?: string
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)

  // Cliente seleccionado para ver su cuenta corriente
  const [clienteCuenta, setClienteCuenta] = useState<Cliente | null>(null)
  const [movimientosCuenta, setMovimientosCuenta] = useState<MovimientoCuenta[]>([])
  const [cargandoCuenta, setCargandoCuenta] = useState(false)

  // Modales
  const [modalNuevoCliente, setModalNuevoCliente] = useState(false)
  const [modalPago, setModalPago] = useState(false)

  // Formulario Nuevo Cliente
  const [nombre, setNombre] = useState('')
  const [documento, setDocumento] = useState('')
  const [telefono, setTelefono] = useState('')
  const [email, setEmail] = useState('')
  const [domicilio, setDomicilio] = useState('')
  const [habilitadoCC, setHabilitadoCC] = useState(true)
  const [limiteCreditoPesos, setLimiteCreditoPesos] = useState('')
  const [guardandoCli, setGuardandoCli] = useState(false)

  // Formulario Registrar Pago
  const [pagoImportePesos, setPagoImportePesos] = useState('')
  const [pagoMedio, setPagoMedio] = useState<'efectivo' | 'transferencia' | 'tarjeta'>('efectivo')
  const [pagoObservacion, setPagoObservacion] = useState('')
  const [guardandoPago, setGuardandoPago] = useState(false)
  const [errorPago, setErrorPago] = useState('')

  const cargarClientes = async () => {
    setCargando(true)
    try {
      const res = await fetch('/api/clientes')
      if (res.ok) {
        const data = await res.json()
        setClientes(data.datos || data)
      }
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarClientes()
  }, [])

  // Abrir ficha de cuenta corriente
  const verCuenta = async (cli: Cliente) => {
    setClienteCuenta(cli)
    setCargandoCuenta(true)
    try {
      const res = await fetch(`/api/clientes/${cli.id}/cuenta-corriente`)
      if (res.ok) {
        const data = await res.json()
        setMovimientosCuenta(data.movimientos || [])
        // Actualizar saldo con el más reciente
        const saldoActual = data.saldoActualCentavos ?? data.saldoCentavos
        if (saldoActual !== undefined) {
          setClienteCuenta({ ...cli, saldoCentavos: saldoActual })
        }
      }
    } finally {
      setCargandoCuenta(false)
    }
  }

  // Guardar nuevo cliente
  const handleGuardarCliente = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardandoCli(true)
    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre,
          documento,
          telefono: telefono || undefined,
          email: email || undefined,
          domicilio: domicilio || undefined,
          habilitadoCuentaCorriente: habilitadoCC,
          limiteCreditoCentavos: limiteCreditoPesos ? pesosACentavos(limiteCreditoPesos) : null
        })
      })

      if (res.ok) {
        setModalNuevoCliente(false)
        setNombre('')
        setDocumento('')
        setTelefono('')
        setEmail('')
        setDomicilio('')
        setLimiteCreditoPesos('')
        cargarClientes()
      } else {
        const err = await res.json()
        alert(err.error || 'Error al guardar cliente')
      }
    } finally {
      setGuardandoCli(false)
    }
  }

  // Registrar cobro / pago
  const handleRegistrarPago = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clienteCuenta) return
    setErrorPago('')

    const centavos = pesosACentavos(pagoImportePesos)
    if (centavos <= 0) {
      setErrorPago('El importe debe ser mayor a cero')
      return
    }

    if (centavos > clienteCuenta.saldoCentavos) {
      setErrorPago(`El importe no puede superar la deuda actual (${formatearCentavos(clienteCuenta.saldoCentavos)})`)
      return
    }

    setGuardandoPago(true)
    try {
      const res = await fetch('/api/pagos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: clienteCuenta.id,
          importeCentavos: centavos,
          medio: pagoMedio,
          observacion: pagoObservacion || undefined
        })
      })

      if (res.ok) {
        setModalPago(false)
        setPagoImportePesos('')
        setPagoObservacion('')
        await verCuenta(clienteCuenta)
        cargarClientes()
      } else {
        const err = await res.json()
        setErrorPago(err.error || 'Error al registrar el pago')
      }
    } finally {
      setGuardandoPago(false)
    }
  }

  const clientesFiltrados = clientes.filter((c) => {
    const q = busqueda.toLowerCase().trim()
    if (!q) return true
    return (
      c.nombre.toLowerCase().includes(q) ||
      c.documento.toLowerCase().includes(q)
    )
  })

  const totalDeudaCentavos = clientes.reduce((acc, c) => acc + (c.saldoCentavos || 0), 0)
  const conDeudaCount = clientes.filter((c) => (c.saldoCentavos || 0) > 0).length

  return (
    <AppLayout>
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7">
        <div>
          <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">
            Personas / Cuentas corrientes
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-slate-900 font-normal tracking-tight">
            Clientes y Saldos
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Consultá sus datos, ventas a crédito y registrá pagos recibidos.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalNuevoCliente(true)}
          className="px-4 py-2.5 rounded-lg bg-[#d97736] hover:bg-[#c86928] text-white text-sm font-bold shadow transition-colors cursor-pointer"
        >
          + Nuevo cliente
        </button>
      </div>

      {/* Métricas rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs text-slate-500 font-medium mb-1">Clientes registrados</p>
          <strong className="font-serif text-3xl text-slate-900 font-normal">
            {clientes.length}
          </strong>
          <small className="block text-xs text-slate-400 mt-1">En el padrón de comercio</small>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs text-slate-500 font-medium mb-1">Total por cobrar</p>
          <strong className="font-serif text-3xl text-[#b85243] font-normal">
            {formatearCentavos(totalDeudaCentavos)}
          </strong>
          <small className="block text-xs text-slate-400 mt-1">Suma de saldos deudores</small>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs text-slate-500 font-medium mb-1">Clientes con saldo pendiente</p>
          <strong className="font-serif text-3xl text-slate-900 font-normal">
            {conDeudaCount}
          </strong>
          <small className="block text-xs text-slate-400 mt-1">Cuentas con deuda activa</small>
        </div>
      </div>

      {!clienteCuenta ? (
        /* Vista de Listado de Clientes */
        <>
          <div className="mb-6">
            <input
              type="text"
              placeholder="Buscar por nombre o documento..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full sm:max-w-md h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#d97736] shadow-sm"
            />
          </div>

          <div className="space-y-3">
            {clientesFiltrados.map((cli) => {
              const tieneDeuda = cli.saldoCentavos > 0
              const iniciales = cli.nombre
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()

              return (
                <div
                  key={cli.id}
                  className="cliente-card"
                >
                  <div className="flex items-center gap-4">
                    <div className="cliente-avatar-box">
                      {iniciales}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-900 text-base">
                          {cli.nombre}
                        </h3>
                        {tieneDeuda ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#fff2d9] text-[#96661d]">
                            Saldo pendiente
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#eaf4e5] text-[#4f7849]">
                            Cuenta al día
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        DNI/CUIT: <b className="font-mono">{cli.documento}</b>
                        {cli.telefono && <span className="text-slate-400"> · Tel: {cli.telefono}</span>}
                        {cli.email && <span className="text-slate-400"> · {cli.email}</span>}
                      </p>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-semibold">
                        Saldo adeudado
                      </span>
                      <strong className={`font-serif text-xl sm:text-2xl font-normal ${tieneDeuda ? 'text-[#b85243]' : 'text-[#378253]'}`}>
                        {formatearCentavos(cli.saldoCentavos)}
                      </strong>
                    </div>

                    <button
                      type="button"
                      onClick={() => verCuenta(cli)}
                      className="px-3.5 py-1.5 rounded-lg bg-[#d97736] hover:bg-[#c86928] text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      Ver cuenta corriente →
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        /* Vista de Ficha de Cuenta Corriente del Cliente */
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-slate-400 font-bold">
                Ficha de Cliente / Cuenta Corriente
              </div>
              <h2 className="font-serif text-2xl font-bold text-slate-900">{clienteCuenta.nombre}</h2>
              <p className="text-xs text-slate-400">
                Doc: {clienteCuenta.documento} · Tel: {clienteCuenta.telefono || 'Sin teléfono'} · Email: {clienteCuenta.email || 'Sin email'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setClienteCuenta(null)}
              className="px-4 py-2 border border-slate-200 bg-white text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 cursor-pointer"
            >
              ← Volver a clientes
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Movimientos de cuenta */}
            <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="p-5 border-b border-slate-100 bg-slate-50/70">
                <h3 className="text-sm font-bold text-slate-900">Movimientos de la cuenta</h3>
                <p className="text-xs text-slate-400">Ventas a crédito y pagos registrados.</p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                      <th className="py-3 px-4">Fecha</th>
                      <th className="py-3 px-4">Concepto</th>
                      <th className="py-3 px-3 text-center">Tipo</th>
                      <th className="py-3 px-4 text-right">Importe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {movimientosCuenta.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-400 text-sm">
                          No hay movimientos registrados en la cuenta de este cliente.
                        </td>
                      </tr>
                    ) : (
                      movimientosCuenta.map((m, idx) => {
                        const esFactura = m.tipo === 'FACTURA'
                        const importe = esFactura ? m.debeCentavos : m.haberCentavos
                        return (
                          <tr key={`${m.tipo}-${m.id}-${idx}`} className="hover:bg-slate-50/70">
                            <td className="py-3 px-4 font-mono text-slate-400">
                              {formatearFecha(m.fecha)}
                            </td>
                            <td className="py-3 px-4 font-semibold text-slate-900">
                              <div>{m.comprobante}</div>
                              {m.detalle && (
                                <div className="text-[11px] font-normal text-slate-500 mt-0.5">
                                  {m.detalle}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  esFactura ? 'bg-[#fff2d9] text-[#96661d]' : 'bg-[#def4e7] text-[#387e56]'
                                }`}
                              >
                                {esFactura ? 'Débito' : 'Crédito'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold">
                              <span className={esFactura ? 'text-[#b85645]' : 'text-[#378253]'}>
                                {esFactura ? `+ ${formatearCentavos(importe)}` : `− ${formatearCentavos(importe)}`}
                              </span>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Saldo y Acción de Pago */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-5">
              <div>
                <span className="text-xs uppercase tracking-wider text-slate-400 block font-bold">
                  Saldo adeudado
                </span>
                <strong className={`font-serif text-3xl sm:text-4xl font-normal block mt-1 ${clienteCuenta.saldoCentavos > 0 ? 'text-[#b85243]' : 'text-[#378253]'}`}>
                  {formatearCentavos(clienteCuenta.saldoCentavos)}
                </strong>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Suma de ventas a crédito menos pagos recibidos.
                </p>
              </div>

              <button
                type="button"
                disabled={clienteCuenta.saldoCentavos <= 0}
                onClick={() => setModalPago(true)}
                className="w-full h-12 bg-[#d97736] hover:bg-[#c86928] disabled:opacity-40 text-white font-bold rounded-lg transition-colors cursor-pointer text-sm shadow"
              >
                {clienteCuenta.saldoCentavos > 0 ? 'Registrar cobro / pago →' : 'Cuenta al día (Sin saldo)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR PAGO */}
      {modalPago && clienteCuenta && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleRegistrarPago}
            className="bg-white max-w-md w-full rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-serif text-xl font-bold text-slate-900">Registrar pago</h3>
              <p className="text-xs text-slate-400">
                Ingresá el cobro para {clienteCuenta.nombre}.
              </p>
            </div>

            <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-100 flex justify-between items-center text-xs">
              <span className="text-slate-400">Saldo adeudado máximo:</span>
              <strong className="text-sm font-serif text-[#b85243] font-bold">
                {formatearCentavos(clienteCuenta.saldoCentavos)}
              </strong>
            </div>

            {errorPago && (
              <div className="p-3 bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-xs rounded-lg font-medium">
                {errorPago}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Importe a pagar ($) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder={(clienteCuenta.saldoCentavos / 100).toString()}
                  value={pagoImportePesos}
                  onChange={(e) => setPagoImportePesos(e.target.value)}
                  className="w-full h-10 px-3 bg-slate-50/50 border border-slate-200 rounded-lg text-sm font-mono text-lg font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Medio de pago
                </label>
                <select
                  value={pagoMedio}
                  onChange={(e) => setPagoMedio(e.target.value as any)}
                  className="w-full h-9 px-3 bg-slate-50/50 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="efectivo">Efectivo</option>
                  <option value="transferencia">Transferencia bancaria</option>
                  <option value="tarjeta">Tarjeta</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Observación (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Pago parcial o transferencia comprobante #9872"
                  value={pagoObservacion}
                  onChange={(e) => setPagoObservacion(e.target.value)}
                  className="w-full h-9 px-3 bg-slate-50/50 border border-slate-200 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalPago(false)}
                className="px-4 py-2 border border-slate-200 bg-white text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardandoPago}
                className="px-4 py-2 bg-[#d97736] hover:bg-[#c86928] text-white text-xs font-bold rounded-lg cursor-pointer disabled:opacity-50"
              >
                {guardandoPago ? 'Registrando...' : 'Confirmar pago'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: ALTA DE CLIENTE */}
      {modalNuevoCliente && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleGuardarCliente}
            className="bg-white max-w-lg w-full rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-serif text-2xl font-bold text-slate-900">Nuevo cliente</h3>
              <p className="text-xs text-slate-400">Completá los datos para venderle a cuenta corriente.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Nombre y apellido o Razón Social *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Almacén Los Aromos"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full h-9 px-3 bg-slate-50/50 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  DNI o CUIT *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. 30-71234567-8"
                  value={documento}
                  onChange={(e) => setDocumento(e.target.value)}
                  className="w-full h-9 px-3 bg-slate-50/50 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  placeholder="Ej. 381 555-0123"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="w-full h-9 px-3 bg-slate-50/50 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  placeholder="contacto@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-9 px-3 bg-slate-50/50 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Límite de crédito ($)
                </label>
                <input
                  type="number"
                  placeholder="Sin límite"
                  value={limiteCreditoPesos}
                  onChange={(e) => setLimiteCreditoPesos(e.target.value)}
                  className="w-full h-9 px-3 bg-slate-50/50 border border-slate-200 rounded-lg text-sm font-mono"
                />
              </div>

              <div className="flex items-center pt-5">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={habilitadoCC}
                    onChange={(e) => setHabilitadoCC(e.target.checked)}
                    className="accent-[#d97736] w-4 h-4"
                  />
                  <span>Habilitar cuenta corriente</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalNuevoCliente(false)}
                className="px-4 py-2 border border-slate-200 bg-white text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardandoCli}
                className="px-4 py-2 bg-[#d97736] hover:bg-[#c86928] text-white text-xs font-bold rounded-lg cursor-pointer disabled:opacity-50"
              >
                {guardandoCli ? 'Guardando...' : 'Guardar cliente'}
              </button>
            </div>
          </form>
        </div>
      )}
    </AppLayout>
  )
}
