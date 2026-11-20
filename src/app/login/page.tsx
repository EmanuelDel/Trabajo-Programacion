'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { Store } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const router = useRouter()
  const { refrescar } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setCargando(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Credenciales inválidas')
        setCargando(false)
        return
      }

      await refrescar()
      router.push('/ventas')
      router.refresh()
    } catch {
      setError('Error al conectar con el servidor')
      setCargando(false)
    }
  }

  const loginRapido = (e: string, p: string) => {
    setEmail(e)
    setPassword(p)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1f2429] via-[#242b32] to-[#2c343d] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl p-8 sm:p-10 shadow-2xl border border-slate-700/20">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#e07d38] to-[#c76522] text-white flex items-center justify-center shadow-lg mb-4">
            <Store className="w-7 h-7 text-white" strokeWidth={2.2} />
          </div>
          <div className="flex items-center gap-2">
            <h1 className="font-sans text-2xl font-bold text-[#1e2429] tracking-tight">
              Mostrador
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-orange-50 text-[#d97736] border border-orange-200">
              PRO
            </span>
          </div>
          <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mt-1">
            Gestión Comercial & Facturación
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-xl bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-sm text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Correo o usuario
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@comercio.com"
              required
              className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#d97736] focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full h-11 px-3.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#d97736] focus:bg-white transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full h-12 bg-gradient-to-r from-[#d97736] to-[#c86928] hover:from-[#c86928] hover:to-[#b75d21] text-white font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50 mt-2 shadow-md flex items-center justify-center text-sm"
          >
            {cargando ? 'Ingresando...' : 'Iniciar sesión →'}
          </button>
        </form>

        {/* Acceso rápido para la defensa / pruebas */}
        <div className="mt-8 pt-6 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400 font-medium mb-3">
            Accesos de prueba rápidos:
          </p>
          <div className="flex gap-2 justify-center">
            <button
              type="button"
              onClick={() => loginRapido('admin@comercio.com', 'admin123')}
              className="px-3.5 py-1.5 rounded-xl bg-[#fef4ec] text-[#c86928] text-xs font-semibold hover:bg-[#fee7d6] transition-colors border border-[#fed7aa]"
            >
              👑 Administradora
            </button>
            <button
              type="button"
              onClick={() => loginRapido('vendedor@comercio.com', 'vendedor123')}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors border border-slate-200"
            >
              💼 Vendedora
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
