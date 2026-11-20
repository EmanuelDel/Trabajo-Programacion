'use client'

import React, { useState, useEffect } from 'react'
import { AppLayout } from '@/components/AppLayout'
import { formatearCentavos, formatearFecha, pesosACentavos } from '@/lib/format'
import { useAuth } from '@/context/AuthContext'

interface Categoria {
  id: number
  nombre: string
}

interface Producto {
  id: number
  codigo: string
  descripcion: string
  categoriaId: number
  categoria?: { id: number; nombre: string }
  precioVentaCentavos: number
  existencia: number
  stockMinimo: number
  activo: boolean
}

interface Movimiento {
  id: number
  fecha: string
  productoId: number
  producto?: { codigo: string; descripcion: string }
  tipo: 'INGRESO' | 'EGRESO'
  cantidad: number
  existenciaResultante: number
  motivo: string
  origen: string
}

export default function ProductosPage() {
  const { usuario } = useAuth()
  const esAdmin = usuario?.rol === 'admin'

  const [vista, setVista] = useState<'catalogo' | 'movimientos'>('catalogo')
  const [productos, setProductos] = useState<Producto[]>([])
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [movimientos, setMovimientos] = useState<Movimiento[]>([])
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(true)

  // Modales
  const [modalProducto, setModalProducto] = useState(false)
  const [modalMovimiento, setModalMovimiento] = useState(false)

  // Formulario Nuevo Producto
  const [prodCodigo, setProdCodigo] = useState('')
  const [prodDescripcion, setProdDescripcion] = useState('')
  const [prodCategoriaId, setProdCategoriaId] = useState<number>(1)
  const [prodPrecioPesos, setProdPrecioPesos] = useState('')
  const [prodStockInicial, setProdStockInicial] = useState('0')
  const [prodStockMinimo, setProdStockMinimo] = useState('5')
  const [guardandoProd, setGuardandoProd] = useState(false)

  // Formulario Ajuste de Stock
  const [movProductoId, setMovProductoId] = useState<number>(0)
  const [movTipo, setMovTipo] = useState<'INGRESO' | 'EGRESO'>('INGRESO')
  const [movCantidad, setMovCantidad] = useState('1')
  const [movMotivo, setMovMotivo] = useState('')
  const [guardandoMov, setGuardandoMov] = useState(false)

  const cargarDatos = async () => {
    setCargando(true)
    try {
      const [resProd, resCat, resMov] = await Promise.all([
        fetch('/api/productos?todos=true'),
        fetch('/api/categorias'),
        fetch('/api/movimientos-stock')
      ])

      if (resProd.ok) setProductos(await resProd.json())
      if (resCat.ok) setCategorias(await resCat.json())
      if (resMov.ok) setMovimientos(await resMov.json())
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [])

  // Guardar nuevo producto
  const handleGuardarProducto = async (e: React.FormEvent) => {
    e.preventDefault()
    setGuardandoProd(true)
    try {
      const res = await fetch('/api/productos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: prodCodigo,
          descripcion: prodDescripcion,
          categoriaId: prodCategoriaId || 1,
          precioVentaCentavos: pesosACentavos(prodPrecioPesos),
          existenciaInicial: parseInt(prodStockInicial, 10) || 0,
          stockMinimo: parseInt(prodStockMinimo, 10) || 0
        })
      })

      if (res.ok) {
        setModalProducto(false)
        setProdCodigo('')
        setProdDescripcion('')
        setProdPrecioPesos('')
        setProdStockInicial('0')
        setProdStockMinimo('5')
        cargarDatos()
      } else {
        const err = await res.json()
        alert(err.error || 'Error al guardar el producto')
      }
    } finally {
      setGuardandoProd(false)
    }
  }

  // Guardar movimiento de stock manual
  const handleGuardarMovimiento = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!movProductoId) {
      alert('Seleccioná un producto')
      return
    }
    setGuardandoMov(true)
    try {
      const res = await fetch('/api/movimientos-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productoId: movProductoId,
          tipo: movTipo,
          cantidad: parseInt(movCantidad, 10),
          motivo: movMotivo
        })
      })

      if (res.ok) {
        setModalMovimiento(false)
        setMovCantidad('1')
        setMovMotivo('')
        cargarDatos()
      } else {
        const err = await res.json()
        alert(err.error || 'Error al registrar el movimiento')
      }
    } finally {
      setGuardandoMov(false)
    }
  }

  // Filtrado de catálogo
  const productosFiltrados = productos.filter((p) => {
    const q = busqueda.toLowerCase().trim()
    if (!q) return true
    return (
      p.codigo.toLowerCase().includes(q) ||
      p.descripcion.toLowerCase().includes(q)
    )
  })

  const productosActivosCount = productos.filter((p) => p.activo).length
  const stockBajoCount = productos.filter((p) => p.activo && p.existencia <= p.stockMinimo).length

  return (
    <AppLayout>
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7">
        <div>
          <div className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-1">
            Catálogo / Existencias
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-slate-900 font-normal tracking-tight">
            Productos y stock
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Administrá tu catálogo y seguí las existencias en depósito.
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {esAdmin && (
            <>
              <button
                type="button"
                onClick={() => setModalProducto(true)}
                className="px-4 py-2.5 rounded-lg bg-[#d97736] hover:bg-[#c86928] text-white text-sm font-bold shadow transition-colors cursor-pointer"
              >
                + Nuevo producto
              </button>
              <button
                type="button"
                onClick={() => setModalMovimiento(true)}
                className="px-4 py-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-bold transition-colors cursor-pointer"
              >
                Registrar movimiento
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => setVista(vista === 'catalogo' ? 'movimientos' : 'catalogo')}
            className="px-4 py-2.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-bold transition-colors cursor-pointer"
          >
            {vista === 'catalogo' ? 'Ver movimientos de stock →' : '← Volver a productos'}
          </button>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs text-slate-500 font-medium mb-1">Productos activos</p>
          <strong className="font-serif text-3xl text-slate-900 font-normal">
            {productosActivosCount}
          </strong>
          <small className="block text-xs text-slate-400 mt-1">En el catálogo de venta</small>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs text-slate-500 font-medium mb-1">Con stock bajo</p>
          <strong className={`font-serif text-3xl font-normal ${stockBajoCount > 0 ? 'text-[#b85243]' : 'text-slate-900'}`}>
            {stockBajoCount}
          </strong>
          <small className="block text-xs text-slate-400 mt-1">Existencias $\le$ stock mínimo</small>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs text-slate-500 font-medium mb-1">Movimientos registrados</p>
          <strong className="font-serif text-3xl text-slate-900 font-normal">
            {movimientos.length}
          </strong>
          <small className="block text-xs text-slate-400 mt-1">Entradas y salidas históricas</small>
        </div>
      </div>

      {vista === 'catalogo' ? (
        <>
          {/* Barra de búsqueda */}
          <div className="mb-6">
            <input
              type="text"
              placeholder="Buscar por código o descripción..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full sm:max-w-md h-11 px-4 bg-white border border-slate-200 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#d97736] shadow-sm"
            />
          </div>

          {/* Listado de tarjetas de producto */}
          <div className="space-y-3">
            {productosFiltrados.map((prod) => {
              const bajoStock = prod.existencia <= prod.stockMinimo
              const porcentaje = Math.min(100, Math.round((prod.existencia / Math.max(1, prod.stockMinimo * 3)) * 100))

              return (
                <div
                  key={prod.id}
                  className={`bg-white border border-slate-200 border-l-4 ${
                    !prod.activo
                      ? 'border-l-[#9aa69d] opacity-75'
                      : bajoStock
                      ? 'border-l-[#dfaa36]'
                      : 'border-l-[#e29a3c]'
                  } rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:shadow transition-shadow`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#fff1c9] text-[#946f13] grid place-items-center text-lg font-bold">
                      📦
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-900 text-base">
                          {prod.descripcion}
                        </h3>
                        {!prod.activo ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#edf0eb] text-slate-400">
                            Inactivo
                          </span>
                        ) : bajoStock ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#fff2d9] text-[#96661d]">
                            Stock bajo (mín: {prod.stockMinimo})
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#eaf4e5] text-[#4f7849]">
                            Activo
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 mt-1">
                        Código: <b className="font-mono">{prod.codigo}</b>
                      </p>
                      <div className="text-xs text-slate-500 mt-1">
                        Precio de venta: <b className="font-mono text-sm text-slate-900">{formatearCentavos(prod.precioVentaCentavos)}</b>
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2">
                    <div className="text-right">
                      <strong className="font-serif text-2xl text-slate-900 block leading-none">
                        {prod.existencia}
                      </strong>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                        unidades
                      </span>
                    </div>

                    <div className="stock-bar-track">
                      <div
                        className={`stock-bar-fill ${bajoStock ? 'low' : 'normal'} w-pct-${Math.min(100, Math.max(0, Math.round(porcentaje / 10) * 10))}`}
                      ></div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      ) : (
        /* Vista de Movimientos de Stock (Kardex) */
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-slate-100 bg-slate-50/70">
            <h2 className="text-base font-bold text-slate-900">Movimientos de inventario</h2>
            <p className="text-xs text-slate-400">Historial inmutable de entradas y salidas.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/70 text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Producto</th>
                  <th className="py-3 px-3 text-center">Tipo</th>
                  <th className="py-3 px-3 text-right">Cantidad</th>
                  <th className="py-3 px-3 text-right">Existencia Resultante</th>
                  <th className="py-3 px-4">Motivo u Origen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movimientos.map((m) => {
                  const esIngreso = m.tipo === 'INGRESO'
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/70">
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {formatearFecha(m.fecha)}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        {m.producto ? m.producto.descripcion : `Producto #${m.productoId}`}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            esIngreso ? 'bg-[#def4e7] text-[#387e56]' : 'bg-[#fee2e2] text-[#991b1b]'
                          }`}
                        >
                          {m.tipo}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold">
                        <span className={esIngreso ? 'text-[#387e56]' : 'text-[#b85645]'}>
                          {esIngreso ? `+${m.cantidad}` : `-${m.cantidad}`}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-semibold text-slate-900">
                        {m.existenciaResultante} u.
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {m.motivo} <span className="text-[10px] text-slate-400">({m.origen})</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: NUEVO PRODUCTO */}
      {modalProducto && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleGuardarProducto}
            className="bg-white max-w-lg w-full rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-serif text-2xl font-bold text-slate-900">Nuevo producto</h3>
              <p className="text-xs text-slate-400">Agregá un artículo al catálogo para venderlo.</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Código *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. CAF-002"
                  value={prodCodigo}
                  onChange={(e) => setProdCodigo(e.target.value.toUpperCase())}
                  className="w-full h-9 px-3 bg-slate-50/50 border border-slate-200 rounded-lg text-sm uppercase font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Categoría</label>
                <select
                  value={prodCategoriaId}
                  onChange={(e) => setProdCategoriaId(parseInt(e.target.value, 10))}
                  className="w-full h-9 px-2 bg-slate-50/50 border border-slate-200 rounded-lg text-sm"
                >
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1">Descripción *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Café en granos colombianos 500 g"
                  value={prodDescripcion}
                  onChange={(e) => setProdDescripcion(e.target.value)}
                  className="w-full h-9 px-3 bg-slate-50/50 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Precio de venta ($) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="6500"
                  value={prodPrecioPesos}
                  onChange={(e) => setProdPrecioPesos(e.target.value)}
                  className="w-full h-9 px-3 bg-slate-50/50 border border-slate-200 rounded-lg text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Stock inicial (u.)</label>
                <input
                  type="number"
                  min="0"
                  value={prodStockInicial}
                  onChange={(e) => setProdStockInicial(e.target.value)}
                  className="w-full h-9 px-3 bg-slate-50/50 border border-slate-200 rounded-lg text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Stock mínimo de alerta</label>
                <input
                  type="number"
                  min="0"
                  value={prodStockMinimo}
                  onChange={(e) => setProdStockMinimo(e.target.value)}
                  className="w-full h-9 px-3 bg-slate-50/50 border border-slate-200 rounded-lg text-sm font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalProducto(false)}
                className="px-4 py-2 border border-slate-200 bg-white text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardandoProd}
                className="px-4 py-2 bg-[#d97736] hover:bg-[#c86928] text-white text-xs font-bold rounded-lg cursor-pointer disabled:opacity-50"
              >
                {guardandoProd ? 'Guardando...' : 'Guardar producto'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: REGISTRAR MOVIMIENTO MANUAL DE STOCK */}
      {modalMovimiento && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleGuardarMovimiento}
            className="bg-white max-w-lg w-full rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-serif text-2xl font-bold text-slate-900">Registrar movimiento de stock</h3>
              <p className="text-xs text-slate-400">Ingreso de mercadería o egreso por rotura/ajuste.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Producto *</label>
                <select
                  required
                  value={movProductoId}
                  onChange={(e) => setMovProductoId(parseInt(e.target.value, 10))}
                  className="w-full h-9 px-3 bg-slate-50/50 border border-slate-200 rounded-lg text-sm"
                >
                  <option value={0}>Seleccioná un producto...</option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.codigo} · {p.descripcion} (Stock actual: {p.existencia})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Tipo de movimiento</label>
                  <select
                    value={movTipo}
                    onChange={(e) => setMovTipo(e.target.value as any)}
                    className="w-full h-9 px-3 bg-slate-50/50 border border-slate-200 rounded-lg text-sm"
                  >
                    <option value="INGRESO">Entrada / Ingreso (+)</option>
                    <option value="EGRESO">Salida / Egreso (−)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Cantidad *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={movCantidad}
                    onChange={(e) => setMovCantidad(e.target.value)}
                    className="w-full h-9 px-3 bg-slate-50/50 border border-slate-200 rounded-lg text-sm font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Motivo o justificación *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Reposición de proveedor, rotura o ajuste de inventario"
                  value={movMotivo}
                  onChange={(e) => setMovMotivo(e.target.value)}
                  className="w-full h-9 px-3 bg-slate-50/50 border border-slate-200 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalMovimiento(false)}
                className="px-4 py-2 border border-slate-200 bg-white text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardandoMov}
                className="px-4 py-2 bg-[#d97736] hover:bg-[#c86928] text-white text-xs font-bold rounded-lg cursor-pointer disabled:opacity-50"
              >
                {guardandoMov ? 'Registrando...' : 'Registrar movimiento'}
              </button>
            </div>
          </form>
        </div>
      )}
    </AppLayout>
  )
}
