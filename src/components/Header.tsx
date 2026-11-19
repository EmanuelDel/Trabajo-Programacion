'use client'

import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { KeyRound, LogOut, CheckCircle2, ShieldAlert, Sparkles } from 'lucide-react'

export function Header() {
  const { usuario, cerrarSesion } = useAuth()
  const [modalPasswordAbierto, setModalPasswordAbierto] = useState(false)
  const [passwordActual, setPasswordActual] = useState('')
  const [passwordNueva, setPasswordNueva] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState(false)

  const iniciales = usuario?.nombre
    ? usuario.nombre
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'US'

  const rolLabel = usuario?.rol === 'admin' ? 'Administrador' : 'Vendedor'

  async function handleSubmitPassword(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setExito(false)
    setCargando(true)

    try {
      const res = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actual: passwordActual, nueva: passwordNueva })
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'No se pudo cambiar la contraseña')
      }

      setExito(true)
      setPasswordActual('')
      setPasswordNueva('')
      setTimeout(() => {
        setModalPasswordAbierto(false)
        setExito(false)
      }, 1500)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  return (
    <>
      <header className="h-16 border-b border-[#e2eae4] bg-white/80 backdrop-blur-md flex items-center justify-between px-8 text-sm sticky top-0 z-20 shadow-xs">
        {/* Status Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/80 text-[11px] font-semibold text-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Terminal operativa y sincronizada</span>
          </div>
        </div>

        {/* User controls */}
        <div className="flex items-center gap-5">
          {usuario ? (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3 pr-3 border-r border-slate-200">
                <div className="w-8 h-8 rounded-lg bg-[#eaf4ee] text-[#143224] border border-[#c4dcce] flex items-center justify-center text-xs font-black shadow-xs">
                  {iniciales}
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-slate-800 leading-tight flex items-center gap-1.5">
                    {usuario.nombre}
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      usuario.rol === 'admin' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {rolLabel}
                    </span>
                  </p>
                  <p className="text-[11px] font-mono text-slate-500 leading-tight">
                    {usuario.email}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setModalPasswordAbierto(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                  title="Cambiar contraseña personal"
                >
                  <KeyRound className="w-3.5 h-3.5 text-slate-500" />
                  <span>Seguridad</span>
                </button>

                <button
                  onClick={() => cerrarSesion()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 hover:text-rose-900 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all cursor-pointer"
                  title="Cerrar sesión del puesto"
                >
                  <LogOut className="w-3.5 h-3.5 text-rose-600" />
                  <span>Salir</span>
                </button>
              </div>
            </div>
          ) : (
            <span className="text-xs text-slate-400">Verificando sesión...</span>
          )}
        </div>
      </header>

      {/* Modal para cambiar contraseña */}
      {modalPasswordAbierto && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#0f241b] flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-slate-700" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 leading-tight">Cambiar mi contraseña</h3>
                <p className="text-xs text-slate-500">Mínimo 8 caracteres seguros</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            {exito && (
              <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>¡Contraseña modificada correctamente!</span>
              </div>
            )}

            <form onSubmit={handleSubmitPassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Contraseña actual
                </label>
                <input
                  type="password"
                  required
                  value={passwordActual}
                  onChange={(e) => setPasswordActual(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f241b] focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Nueva contraseña
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={passwordNueva}
                  onChange={(e) => setPasswordNueva(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0f241b] focus:border-transparent transition-all"
                  placeholder="Mínimo 8 caracteres"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  disabled={cargando}
                  onClick={() => setModalPasswordAbierto(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={cargando}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#0f241b] hover:bg-[#18392b] rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  {cargando ? 'Guardando...' : 'Actualizar clave'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
