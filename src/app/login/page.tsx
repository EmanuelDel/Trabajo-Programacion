'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

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
    <div className="min-h-screen bg-[#1d3930] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl p-8 shadow-2xl border border-[#dfe4dc]">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-[#d4ed91] text-[#1d3930] grid place-items-center font-black text-2xl shadow-md mb-3">
            M
          </div>
          <h1 className="font-serif text-3xl font-bold text-[#20372d] tracking-tight">
            mostrador
          </h1>
          <p className="text-xs uppercase tracking-widest text-[#73877a] font-semibold mt-1">
            Sistema de Gestión Comercial
          </p>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-[#fef2f2] border border-[#fecaca] text-[#b91c1c] text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#52675b] uppercase tracking-wider mb-1">
              Correo o usuario
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@comercio.com"
              required
              className="w-full h-11 px-3 bg-[#fbfcf9] border border-[#dbe3da] rounded-lg text-sm text-[#293b31] focus:outline-none focus:ring-2 focus:ring-[#d8a448]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#52675b] uppercase tracking-wider mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="w-full h-11 px-3 bg-[#fbfcf9] border border-[#dbe3da] rounded-lg text-sm text-[#293b31] focus:outline-none focus:ring-2 focus:ring-[#d8a448]"
            />
          </div>

          <button
            type="submit"
            disabled={cargando}
            className="w-full h-12 bg-[#254d3c] hover:bg-[#34634d] text-white font-bold rounded-lg transition-colors cursor-pointer disabled:opacity-50 mt-2 shadow"
          >
            {cargando ? 'Ingresando...' : 'Iniciar sesión →'}
          </button>
        </form>

        {/* Acceso rápido para la defensa / pruebas */}
        <div className="mt-8 pt-6 border-t border-[#edf0eb] text-center">
          <p className="text-xs text-[#89968b] font-medium mb-3">
            Accesos de prueba rápidos:
          </p>
          <div className="flex gap-2 justify-center">
            <button
              type="button"
              onClick={() => loginRapido('admin@comercio.com', 'admin123')}
              className="px-3 py-1.5 rounded-lg bg-[#eaf4e5] text-[#2e522b] text-xs font-semibold hover:bg-[#dcecd5] transition-colors border border-[#cde0c4]"
            >
              👑 Administradora
            </button>
            <button
              type="button"
              onClick={() => loginRapido('vendedor@comercio.com', 'vendedor123')}
              className="px-3 py-1.5 rounded-lg bg-[#e2f1ff] text-[#204e79] text-xs font-semibold hover:bg-[#d2e7fc] transition-colors border border-[#c3defb]"
            >
              💼 Vendedora
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
