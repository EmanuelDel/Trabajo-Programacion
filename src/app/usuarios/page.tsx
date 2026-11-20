'use client'

import React, { useState, useEffect } from 'react'
import { AppLayout } from '@/components/AppLayout'
import { formatearFecha } from '@/lib/format'
import { useAuth } from '@/context/AuthContext'

interface UsuarioItem {
  id: number
  nombre: string
  email: string
  rol: 'admin' | 'vendedor'
  activo: boolean
  creadoEn: string
}

export default function UsuariosPage() {
  const { usuario: usuarioActual } = useAuth()
  const [usuarios, setUsuarios] = useState<UsuarioItem[]>([])
  const [cargando, setCargando] = useState(true)

  // Modales
  const [modalNuevo, setModalNuevo] = useState(false)
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rol, setRol] = useState<'admin' | 'vendedor'>('vendedor')
  const [guardando, setGuardando] = useState(false)
  const [errorModal, setErrorModal] = useState('')

  // Restablecer contraseña
  const [modalReset, setModalReset] = useState<UsuarioItem | null>(null)
  const [passwordGenerada, setPasswordGenerada] = useState<string | null>(null)
  const [reseteando, setReseteando] = useState(false)

  const cargarUsuarios = async () => {
    setCargando(true)
    try {
      const res = await fetch('/api/usuarios')
      if (res.ok) {
        const data = await res.json()
        setUsuarios(data.datos || data)
      }
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarUsuarios()
  }, [])

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorModal('')
    setGuardando(true)

    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, email, password, rol })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'No se pudo crear el usuario')
      }

      setModalNuevo(false)
      setNombre('')
      setEmail('')
      setPassword('')
      setRol('vendedor')
      cargarUsuarios()
    } catch (err: any) {
      setErrorModal(err.message)
    } finally {
      setGuardando(false)
    }
  }

  const toggleActivo = async (u: UsuarioItem) => {
    if (!confirm(`¿Seguro que deseas ${u.activo ? 'desactivar' : 'habilitar'} el usuario ${u.nombre}?`)) {
      return
    }

    try {
      const res = await fetch(`/api/usuarios/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !u.activo })
      })

      if (res.ok) {
        cargarUsuarios()
      } else {
        const data = await res.json()
        alert(data.error || 'Error al cambiar estado')
      }
    } catch (err: any) {
      alert(err.message)
    }
  }

  const handleResetPassword = async (u: UsuarioItem) => {
    setModalReset(u)
    setPasswordGenerada(null)
  }

  const ejecutarReset = async () => {
    if (!modalReset) return
    setReseteando(true)
    try {
      const res = await fetch(`/api/usuarios/${modalReset.id}/reset-password`, {
        method: 'POST'
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'No se pudo restablecer la contraseña')
      }
      const data = await res.json()
      setPasswordGenerada(data.passwordTemporal)
    } catch (err: any) {
      alert(err.message)
      setModalReset(null)
    } finally {
      setReseteando(false)
    }
  }

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-serif text-3xl font-extrabold text-slate-900 tracking-tight">
            Usuarios y accesos
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Administrá los perfiles del sistema, credenciales y roles de trabajo.
          </p>
        </div>

        <button
          onClick={() => setModalNuevo(true)}
          className="bg-[#d97736] hover:bg-[#c86928] text-white font-bold px-4 py-2.5 rounded-xl shadow-sm flex items-center gap-2 text-sm transition-all cursor-pointer"
        >
          <span>+</span>
          <span>Nuevo usuario</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {cargando && (
          <div className="p-8 text-center text-slate-500 text-sm bg-white rounded-xl border border-slate-100">
            Cargando lista de usuarios...
          </div>
        )}

        {!cargando && usuarios.length === 0 && (
          <div className="p-8 text-center text-slate-500 text-sm bg-white rounded-xl border border-slate-100">
            No hay usuarios registrados.
          </div>
        )}

        {usuarios.map((u) => {
          const iniciales = u.nombre
            .split(' ')
            .map((n) => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase()

          const esAdmin = u.rol === 'admin'

          return (
            <div
              key={u.id}
              className={`bg-white border border-slate-200 border-l-4 ${
                !u.activo
                  ? 'border-l-[#d2dad4] opacity-75'
                  : esAdmin
                  ? 'border-l-[#8a6bc0]'
                  : 'border-l-[#4198a1]'
              } rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:shadow transition-shadow`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-xl grid place-items-center font-bold text-sm ${
                    !u.activo
                      ? 'bg-[#edf0eb] text-slate-400'
                      : esAdmin
                      ? 'bg-[#eee7ff] text-[#7053a3]'
                      : 'bg-[#e1f2f1] text-[#347d82]'
                  }`}
                >
                  {iniciales}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-slate-900 text-base">
                      {u.nombre}
                    </h3>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        u.activo
                          ? 'bg-[#eaf4e5] text-[#4f7849]'
                          : 'bg-[#fee2e2] text-[#991b1b]'
                      }`}
                    >
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        esAdmin
                          ? 'bg-[#eee7ff] text-[#7053a3]'
                          : 'bg-[#e1f2f1] text-[#347d82]'
                      }`}
                    >
                      {esAdmin ? 'Administrador' : 'Vendedor / Operador'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 font-mono">
                    {u.email}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Registrado: {formatearFecha(u.creadoEn)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleResetPassword(u)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Restablecer clave
                </button>

                {u.id !== usuarioActual?.id && (
                  <button
                    type="button"
                    onClick={() => toggleActivo(u)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors cursor-pointer ${
                      u.activo
                        ? 'border-[#fecaca] text-[#b91c1c] hover:bg-[#fef2f2]'
                        : 'border-[#bbf7d0] text-[#15803d] hover:bg-[#f0fdf4]'
                    }`}
                  >
                    {u.activo ? 'Desactivar acceso' : 'Habilitar acceso'}
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* MODAL: RESTABLECER CONTRASEÑA */}
      {modalReset && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white max-w-sm w-full rounded-2xl p-6 shadow-2xl border border-slate-200">
            <h3 className="font-serif text-xl font-bold text-slate-900 mb-1">
              Restablecer contraseña
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Usuario: <span className="font-bold">{modalReset.nombre}</span> ({modalReset.email})
            </p>

            {!passwordGenerada ? (
              <div>
                <p className="text-xs text-slate-600 mb-4">
                  Se generará una contraseña temporal aleatoria para este usuario que se mostrará en pantalla una sola vez.
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setModalReset(null)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg cursor-pointer hover:bg-slate-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={reseteando}
                    onClick={ejecutarReset}
                    className="px-4 py-2 bg-[#d97736] text-white text-xs font-bold rounded-lg cursor-pointer hover:bg-[#c86928] disabled:opacity-50"
                  >
                    {reseteando ? 'Generando...' : 'Generar clave'}
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-4 text-center">
                  <p className="text-xs text-emerald-800 font-semibold mb-1">Nueva clave temporal:</p>
                  <p className="text-lg font-mono font-black text-emerald-900 tracking-wider select-all">
                    {passwordGenerada}
                  </p>
                </div>
                <p className="text-[11px] text-slate-500 mb-4 text-center">
                  Copiá esta clave y hacésela llegar al usuario para que inicie sesión y luego la modifique.
                </p>
                <button
                  type="button"
                  onClick={() => setModalReset(null)}
                  className="w-full py-2 bg-[#2b333a] hover:bg-[#1f2429] text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  Entendido, cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: NUEVO USUARIO */}
      {modalNuevo && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleCrearUsuario}
            className="bg-white max-w-md w-full rounded-2xl p-6 shadow-2xl border border-slate-200 space-y-4"
          >
            <div className="border-b border-slate-100 pb-3">
              <h3 className="font-serif text-2xl font-bold text-slate-900">Nuevo usuario</h3>
              <p className="text-xs text-slate-400">Creá un acceso para operar el comercio.</p>
            </div>

            {errorModal && (
              <div className="p-3 bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-xs rounded-lg font-medium">
                {errorModal}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Nombre y apellido *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Lucía Pérez"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full h-9 px-3 bg-slate-50/50 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Correo electrónico *
                </label>
                <input
                  type="email"
                  required
                  placeholder="lucia@comercio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-9 px-3 bg-slate-50/50 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Contraseña inicial *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-9 px-3 bg-slate-50/50 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Rol / Perfil
                </label>
                <select
                  value={rol}
                  onChange={(e) => setRol(e.target.value as any)}
                  className="w-full h-9 px-3 bg-slate-50/50 border border-slate-200 rounded-lg text-sm"
                >
                  <option value="vendedor">Vendedor / Operador (mostrador)</option>
                  <option value="admin">Administrador (acceso total)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalNuevo(false)}
                className="px-4 py-2 border border-slate-200 bg-white text-slate-700 text-xs font-bold rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="px-4 py-2 bg-[#d97736] hover:bg-[#c86928] text-white text-xs font-bold rounded-lg cursor-pointer disabled:opacity-50"
              >
                {guardando ? 'Creando...' : 'Crear usuario'}
              </button>
            </div>
          </form>
        </div>
      )}
    </AppLayout>
  )
}
