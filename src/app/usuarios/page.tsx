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
    if (password.length < 6) {
      setErrorModal('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setGuardando(true)
    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre, email, password, rol })
      })

      if (res.ok) {
        setModalNuevo(false)
        setNombre('')
        setEmail('')
        setPassword('')
        cargarUsuarios()
      } else {
        const err = await res.json()
        setErrorModal(err.error || 'Error al crear el usuario')
      }
    } finally {
      setGuardando(false)
    }
  }

  const toggleActivo = async (u: UsuarioItem) => {
    if (u.id === usuarioActual?.id) {
      alert('No podés desactivar tu propio usuario')
      return
    }

    const confirmar = confirm(
      `¿Seguro que deseás ${u.activo ? 'desactivar' : 'activar'} a ${u.nombre}?`
    )
    if (!confirmar) return

    try {
      const res = await fetch(`/api/usuarios/${u.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ activo: !u.activo })
      })

      if (res.ok) {
        cargarUsuarios()
      } else {
        const err = await res.json()
        alert(err.error || 'Error al modificar usuario')
      }
    } catch {
      alert('Error de conexión')
    }
  }

  return (
    <AppLayout>
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-7">
        <div>
          <div className="text-[10px] uppercase tracking-widest font-bold text-[#73877a] mb-1">
            Configuración / Accesos
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#20372d] font-normal tracking-tight">
            Usuarios del sistema
          </h1>
          <p className="text-[#758278] text-sm mt-1">
            Administrá las personas que pueden ingresar y operar el mostrador.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalNuevo(true)}
          className="px-4 py-2.5 rounded-lg bg-[#254d3c] hover:bg-[#34634d] text-white text-sm font-bold shadow transition-colors cursor-pointer"
        >
          + Nuevo usuario
        </button>
      </div>

      {/* Listado estilo Cards */}
      <div className="space-y-3">
        {usuarios.map((u) => {
          const esAdmin = u.rol === 'admin'
          const iniciales = u.nombre
            .split(' ')
            .map((n) => n[0])
            .slice(0, 2)
            .join('')
            .toUpperCase()

          return (
            <div
              key={u.id}
              className={`bg-white border border-[#e2e8df] border-l-4 ${
                !u.activo
                  ? 'border-l-[#9aa69d] opacity-75'
                  : esAdmin
                  ? 'border-l-[#8a6bc0]'
                  : 'border-l-[#4198a1]'
              } rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm hover:shadow transition-shadow`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-12 h-12 rounded-xl grid place-items-center font-bold text-sm ${
                    !u.activo
                      ? 'bg-[#edf0eb] text-[#89968d]'
                      : esAdmin
                      ? 'bg-[#eee7ff] text-[#7053a3]'
                      : 'bg-[#e1f2f1] text-[#347d82]'
                  }`}
                >
                  {iniciales}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-[#2e4839] text-base">
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
                  <p className="text-xs text-[#4e6657] mt-1 font-mono">
                    {u.email}
                  </p>
                  <p className="text-[11px] text-[#89968d] mt-1">
                    Registrado: {formatearFecha(u.creadoEn)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
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

      {/* MODAL: NUEVO USUARIO */}
      {modalNuevo && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <form
            onSubmit={handleCrearUsuario}
            className="bg-white max-w-md w-full rounded-2xl p-6 shadow-2xl border border-[#dfe4dc] space-y-4"
          >
            <div className="border-b border-[#edf0eb] pb-3">
              <h3 className="font-serif text-2xl font-bold text-[#20372d]">Nuevo usuario</h3>
              <p className="text-xs text-[#829087]">Creá un acceso para operar el comercio.</p>
            </div>

            {errorModal && (
              <div className="p-3 bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-xs rounded-lg font-medium">
                {errorModal}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-[#52675b] mb-1">
                  Nombre y apellido *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Lucía Pérez"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full h-9 px-3 bg-[#fbfcf9] border border-[#dbe3da] rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#52675b] mb-1">
                  Correo electrónico *
                </label>
                <input
                  type="email"
                  required
                  placeholder="lucia@comercio.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-9 px-3 bg-[#fbfcf9] border border-[#dbe3da] rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#52675b] mb-1">
                  Contraseña inicial *
                </label>
                <input
                  type="password"
                  required
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-9 px-3 bg-[#fbfcf9] border border-[#dbe3da] rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#52675b] mb-1">
                  Rol / Perfil
                </label>
                <select
                  value={rol}
                  onChange={(e) => setRol(e.target.value as any)}
                  className="w-full h-9 px-3 bg-[#fbfcf9] border border-[#dbe3da] rounded-lg text-sm"
                >
                  <option value="vendedor">Vendedor / Operador (mostrador)</option>
                  <option value="admin">Administrador (acceso total)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#edf0eb]">
              <button
                type="button"
                onClick={() => setModalNuevo(false)}
                className="px-4 py-2 border border-[#d4ded4] bg-white text-[#355445] text-xs font-bold rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={guardando}
                className="px-4 py-2 bg-[#254d3c] hover:bg-[#34634d] text-white text-xs font-bold rounded-lg cursor-pointer disabled:opacity-50"
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
