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
  const sidebarOffset = sidebarCollapsed ? 68 : 256

  React.useEffect(() => {
    if (!pathname.startsWith("/leads")) clearLeadSectionState()
  }, [pathname])

  return (
    <AppPreferencesProvider className="min-h-screen bg-background text-foreground">
      <QueryProvider>
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
            className="min-h-screen min-w-0 transition-all duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)] md:ml-[var(--sidebar-offset)]"
          >
            <TopNav
              onCommandPaletteOpen={() => setCommandPaletteOpen(true)}
              onMenuClick={() => {
                setSidebarCollapsed(false)
                setMobileSidebarOpen(true)
              }}
            />
            <main className="page-enter min-w-0 overflow-x-clip px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:p-5 lg:p-6">
              <div className="mx-auto min-w-0 max-w-[1600px]">
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
