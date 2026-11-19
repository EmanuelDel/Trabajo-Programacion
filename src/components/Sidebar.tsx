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
  ChevronRight
} from 'lucide-react'

export function Sidebar() {
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

  return (
    <aside className="w-64 h-screen sticky top-0 bg-[#0f241b] text-slate-100 flex flex-col justify-between shrink-0 overflow-y-auto z-30 border-r border-[#1a382b] select-none">
      <div>
        {/* Brand / Logo */}
        <div className="px-6 py-5 border-b border-white/[0.06] flex items-center gap-3">
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
  )
}
