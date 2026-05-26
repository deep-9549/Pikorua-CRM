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

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      {/* Offset matches sidebar default width of 256px */}
      <div
        className="transition-all duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{ marginLeft: 256, minHeight: "100vh" }}
      >
        <TopNav onCommandPaletteOpen={() => setCommandPaletteOpen(true)} />
        <main className="p-6 page-enter">
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

