'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export interface UsuarioActual {
  id: number
  email: string
  nombre: string
  rol: 'admin' | 'vendedor'
}

interface AuthContextType {
  usuario: UsuarioActual | null
  cargando: boolean
  cerrarSesion: () => Promise<void>
  refrescar: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  usuario: null,
  cargando: true,
  cerrarSesion: async () => {},
  refrescar: async () => {}
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioActual | null>(null)
  const [cargando, setCargando] = useState(true)
  const router = useRouter()

  const obtenerUsuario = async () => {
    try {
      const res = await fetch('/api/auth/me')
      if (res.ok) {
        const data = await res.json()
        setUsuario(data.usuario || data)
      } else {
        setUsuario(null)
      }
    } catch {
      setUsuario(null)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    obtenerUsuario()
  }, [])

  const cerrarSesion = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } finally {
      setUsuario(null)
      router.push('/login')
      router.refresh()
    }
  }

  return (
    <AuthContext.Provider value={{ usuario, cargando, cerrarSesion, refrescar: obtenerUsuario }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
