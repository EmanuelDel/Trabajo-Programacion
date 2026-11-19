'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'

export function Sidebar() {
  const pathname = usePathname()
  const { usuario } = useAuth()

  const links = [
    { href: '/ventas', label: 'Ventas', icon: '▤' },
    { href: '/productos', label: 'Productos y stock', icon: '▦' },
    { href: '/clientes', label: 'Clientes', icon: '♙' },
    ...(usuario?.rol === 'admin'
      ? [{ href: '/usuarios', label: 'Usuarios', icon: '⚙' }]
      : [])
  ]

  return (
    <aside className="w-60 min-h-screen bg-[#1d3930] text-[#e8f1e9] p-6 flex flex-col gap-8 shrink-0">
      {/* Brand */}
      <div className="flex items-center gap-3 font-extrabold text-xl tracking-tight">
        <div className="w-9 h-9 rounded-xl bg-[#d4ed91] text-[#1d3930] grid place-items-center font-black text-lg shadow-sm">
          M
        </div>
        <div>
          <span className="leading-none block font-serif tracking-normal text-2xl font-bold">mostrador</span>
          <small className="block text-[10px] tracking-widest uppercase text-[#adc5b5] font-sans mt-0.5 font-semibold">
            Gestión comercial
          </small>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1">
        <p className="text-[10px] uppercase tracking-widest font-bold text-[#99b3a2] mb-3 px-2">
          Espacio de trabajo
        </p>
        <nav className="flex flex-col gap-1">
          {links.map((link) => {
            const activo = pathname.startsWith(link.href)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  activo
                    ? 'bg-[#36584b] text-white shadow-sm'
                    : 'text-[#c6d7ca] hover:bg-[#25463b] hover:text-white'
                }`}
              >
                <span className="text-base w-6 text-center">{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            )
          })}
        </nav>
      </div>

      {/* Bottom note */}
      <div className="border-t border-[#486255] pt-4 text-xs text-[#b5c9ba] leading-relaxed">
        Un lugar para organizar<br />tu comercio, todos los días.
      </div>
    </aside>
  )
}
