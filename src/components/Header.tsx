'use client'

import { useAuth } from '@/context/AuthContext'

export function Header() {
  const { usuario, cerrarSesion } = useAuth()

  const iniciales = usuario?.nombre
    ? usuario.nombre
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'US'

  const rolLabel = usuario?.rol === 'admin' ? 'Administradora' : 'Vendedora'

  return (
    <header className="h-16 border-b border-[#dfe4dc] bg-[#fafbf7] flex items-center justify-between px-8 text-sm text-[#6d7d72] sticky top-0 z-10">
      <div className="flex items-center gap-2 text-xs font-medium text-[#708175]">
        <span className="w-2 h-2 rounded-full bg-[#d8a448] inline-block animate-pulse"></span>
        <span>Sistema en línea</span>
      </div>

      <div className="flex items-center gap-4">
        {usuario ? (
          <div className="flex items-center gap-3 font-semibold text-[#334b3d]">
            <div className="w-8 h-8 rounded-full bg-[#dce8d7] text-[#20372d] grid place-items-center text-xs font-bold shadow-sm">
              {iniciales}
            </div>
            <span>{usuario.nombre}</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#eef4ea] text-[#4d7355] font-normal border border-[#d6e3d2]">
              {rolLabel}
            </span>
            <button
              onClick={() => cerrarSesion()}
              className="text-xs text-[#38654c] hover:text-[#1d3930] hover:underline font-bold ml-2 cursor-pointer transition-colors"
            >
              Cerrar sesión
            </button>
          </div>
        ) : (
          <span className="text-xs">Cargando usuario...</span>
        )}
      </div>
    </header>
  )
}
