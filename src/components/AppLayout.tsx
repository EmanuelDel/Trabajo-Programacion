'use client'

import React, { useState } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarAbierto, setSidebarAbierto] = useState(false)

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f4f5f6] text-[#1e2429]">
      <Sidebar abierto={sidebarAbierto} setAbierto={setSidebarAbierto} />
      <div className="flex-1 flex flex-col min-w-0 w-full overflow-hidden">
        <Header onToggleSidebar={() => setSidebarAbierto(!sidebarAbierto)} />
        <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}
