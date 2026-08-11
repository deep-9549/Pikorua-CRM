"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { CommandPalette } from "@/components/layout/command-palette"
import { PrivacyGuard } from "@/components/security/privacy-guard"
import { QueryProvider } from "@/components/providers/query-provider"
import { AppPreferencesProvider } from "@/components/providers/app-preferences-provider"
import { clearLeadSectionState } from "@/lib/lead-list-state"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [commandPaletteOpen, setCommandPaletteOpen] = React.useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = React.useState(false)
  const pathname = usePathname()
  const sidebarOffset = sidebarCollapsed ? 76 : 272

  React.useEffect(() => {
    if (!pathname.startsWith("/leads")) clearLeadSectionState()
  }, [pathname])

  return (
    <AppPreferencesProvider className="min-h-dvh bg-background text-foreground">
      <QueryProvider>
        <div
          className="min-h-dvh bg-background"
          style={{ "--sidebar-offset": `${sidebarOffset}px` } as React.CSSProperties}
        >
          <AppSidebar
            collapsed={sidebarCollapsed}
            mobileOpen={mobileSidebarOpen}
            onCollapsedChange={setSidebarCollapsed}
            onMobileOpenChange={setMobileSidebarOpen}
          />
          <div
            className="min-h-dvh min-w-0 transition-[margin] duration-[var(--motion-standard)] ease-[var(--ease-product)] md:ml-[var(--sidebar-offset)]"
          >
            <TopNav
              onCommandPaletteOpen={() => setCommandPaletteOpen(true)}
              onMenuClick={() => {
                setSidebarCollapsed(false)
                setMobileSidebarOpen(true)
              }}
            />
            <main id="main-content" tabIndex={-1} className="page-enter min-w-0 overflow-x-clip px-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 outline-none sm:px-5 sm:pb-6 lg:px-7 lg:pt-6">
              <div className="mx-auto min-w-0 max-w-[1520px]">
                {children}
              </div>
            </main>
          </div>
          <CommandPalette
            open={commandPaletteOpen}
            onOpenChange={setCommandPaletteOpen}
          />
          <PrivacyGuard />
        </div>
      </QueryProvider>
    </AppPreferencesProvider>
  )
}
