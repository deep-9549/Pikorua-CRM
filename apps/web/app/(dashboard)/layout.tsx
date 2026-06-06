"use client"

import * as React from "react"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { CommandPalette } from "@/components/layout/command-palette"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [commandPaletteOpen, setCommandPaletteOpen] = React.useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false)
  const sidebarOffset = sidebarCollapsed ? 68 : 256

  return (
    <div
      className="min-h-screen bg-background"
      style={{ "--sidebar-offset": `${sidebarOffset}px` } as React.CSSProperties}
    >
      <AppSidebar
        collapsed={sidebarCollapsed}
        mobileOpen={mobileSidebarOpen}
        onCollapsedChange={setSidebarCollapsed}
        onMobileOpenChange={setMobileSidebarOpen}
      />
      <div
        className="min-h-screen transition-all duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)] md:ml-[var(--sidebar-offset)]"
      >
        <TopNav
          onCommandPaletteOpen={() => setCommandPaletteOpen(true)}
          onMenuClick={() => {
            setSidebarCollapsed(false)
            setMobileSidebarOpen(true)
          }}
        />
        <main className="p-4 sm:p-5 lg:p-6 page-enter overflow-x-hidden">
          {children}
        </main>
      </div>
      <CommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
      />
    </div>
  )
}

