'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Package, 
  Users, 
  ShieldCheck, 
  Store,
  ChevronRight,
  X
} from 'lucide-react'

interface SidebarProps {
  abierto?: boolean
  setAbierto?: (abierto: boolean) => void
}

export function Sidebar({ abierto = false, setAbierto }: SidebarProps) {
  const pathname = usePathname()
  const { usuario } = useAuth()

  const links = [
    { href: '/', exact: true, label: 'Panel de Control', icon: LayoutDashboard, badge: null },
    { href: '/ventas', label: 'Punto de Venta', icon: ShoppingBag, badge: 'Caja' },
    { href: '/productos', label: 'Catálogo & Stock', icon: Package, badge: null },
    { href: '/clientes', label: 'Clientes & Deudas', icon: Users, badge: null },
    ...(usuario?.rol === 'admin'
      ? [{ href: '/usuarios', label: 'Gestión de Accesos', icon: ShieldCheck, badge: 'Admin' }]
      : [])
  ]

  const cerrar = () => {
    if (setAbierto) setAbierto(false)
  }

  return (
    <>
      {/* Overlay oscuro para pantallas móviles */}
      {abierto && (
        <div 
          onClick={cerrar}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity duration-200"
          aria-hidden="true"
        />
      )}

      {/* Sidebar fijo en desktop / Drawer deslizante en mobile */}
      <aside className={`
        fixed md:sticky top-0 bottom-0 left-0 w-64 h-screen bg-[#0f241b] text-slate-100 flex flex-col justify-between shrink-0 overflow-y-auto z-50 md:z-30 border-r border-[#1a382b] select-none transition-transform duration-300 ease-in-out
        ${abierto ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
      `}>
        <div>
          {/* Brand / Logo + Botón cerrar en mobile */}
          <div className="px-6 py-5 border-b border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/[0.08] border border-white/10 text-emerald-400 flex items-center justify-center shadow-xs">
                <Store className="w-4 h-4 text-emerald-400" strokeWidth={2} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm tracking-tight text-white font-sans">
                    Mostrador
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-white/[0.08] text-emerald-400/90 border border-white/[0.06]">
                    COMERCIAL
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-normal truncate mt-0.5">
                  Gestión & Ventas
                </p>
              </div>
            </div>

            {/* Botón cerrar sólo visible en móviles */}
            <button
              type="button"
              onClick={cerrar}
              className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              title="Cerrar menú"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Section */}
          <div className="p-4 space-y-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#638774] px-3 mb-2">
                Módulos Principales
              </p>
              <nav className="space-y-1">
                {links.map((link) => {
                  const activo = link.exact
                    ? pathname === link.href
                    : pathname.startsWith(link.href)
                  const Icon = link.icon

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={cerrar}
                      className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                        activo
                          ? 'bg-[#1b3f2f] text-white shadow-xs border border-[#2b5c46]'
                          : 'text-[#96b8a6] hover:bg-[#142e22] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon 
                          className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                            activo ? 'text-[#c6e980]' : 'text-[#638774] group-hover:text-[#96b8a6]'
                          }`} 
                          strokeWidth={2}
                        />
                        <span className="tracking-tight">{link.label}</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {link.badge && (
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                            activo ? 'bg-[#c6e980]/20 text-[#c6e980]' : 'bg-[#1b3f2f] text-[#7da38f]'
                          }`}>
                            {link.badge}
                          </span>
                        )}
                        {activo && <ChevronRight className="w-3.5 h-3.5 text-[#c6e980]" />}
                      </div>
                    </Link>
                  )
                })}
              </nav>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="p-4 border-t border-[#1b3d2e] bg-[#0c1d16]/50">
          <div className="flex items-center justify-between text-[11px] text-[#638774]">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Sucursal Central #01
            </span>
            <span className="font-mono text-[10px] text-[#486354]">v2.4</span>
          </div>
        </div>
      </aside>
    </>
  )
}
