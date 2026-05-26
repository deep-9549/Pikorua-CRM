"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard, Users, MessageSquare, Building2, Sparkles,
  CalendarCheck, BarChart3, Bot, CreditCard, UserCog, Crown,
  FileText, Settings, ChevronLeft, ChevronRight, Search,
  PieChart, FileSpreadsheet, LogOut, Gem
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import { createClient } from "@/lib/supabase/client"

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  badge?: number
  adminOnly?: boolean
}

interface NavGroup {
  title: string
  items: NavItem[]
  adminOnly?: boolean
}

const navGroups: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    ]
  },
  {
    title: "CRM",
    items: [
      { title: "Leads", href: "/leads", icon: Users },
      { title: "WhatsApp Hub", href: "/whatsapp", icon: MessageSquare, badge: 5 },
      { title: "Properties", href: "/properties", icon: Building2 },
      { title: "Smart Matching", href: "/smart-matching", icon: Sparkles },
      { title: "Site Visits", href: "/site-visits", icon: CalendarCheck },
    ]
  },
  {
    title: "Analytics",
    items: [
      { title: "Meta Ads", href: "/meta-ads", icon: BarChart3, adminOnly: true },
      { title: "Reports", href: "/reports", icon: PieChart, adminOnly: true },
      { title: "Bookings", href: "/bookings", icon: CreditCard },
    ]
  },
  {
    title: "Team",
    adminOnly: true,
    items: [
      { title: "Employees", href: "/employees", icon: UserCog },
      { title: "HNI Clients", href: "/hni-clients", icon: Crown },
    ]
  },
  {
    title: "Tools",
    items: [
      { title: "AI Control", href: "/ai-control", icon: Bot, adminOnly: true },
      { title: "Scripts", href: "/scripts", icon: FileText },
      { title: "Documents", href: "/documents", icon: FileSpreadsheet },
    ]
  },
  {
    title: "System",
    items: [
      { title: "Settings", href: "/settings", icon: Settings },
    ]
  }
]

interface UserProfile {
  full_name: string
  role: "super_admin" | "sales_executive"
}

export function AppSidebar() {
  const [collapsed, setCollapsed] = React.useState(false)
  const [profile, setProfile] = React.useState<UserProfile | null>(null)
  const pathname = usePathname()
  const router = useRouter()

  React.useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase
        .from("user_profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single()
      if (data) setProfile(data)
    })
  }, [])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  const isSuperAdmin = profile?.role === "super_admin"
  const displayName = profile?.full_name ?? "Loading..."
  const displayRole = profile?.role === "super_admin" ? "Super Admin" : profile?.role === "sales_executive" ? "Sales Executive" : ""
  const avatarInitials = profile?.full_name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) ?? "…"

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 68 : 256 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className="fixed left-0 top-0 z-40 h-screen flex flex-col overflow-hidden"
        style={{ background: "var(--color-sidebar)" }}
      >
        {/* Top border accent */}
        <div className="h-px w-full shrink-0" style={{
          background: "linear-gradient(90deg, transparent 0%, oklch(0.700 0.130 75 / 0.6) 50%, transparent 100%)"
        }} />

        {/* Logo */}
        <div className="flex h-[60px] shrink-0 items-center justify-between px-4"
          style={{ borderBottom: "1px solid oklch(0.220 0.015 260)" }}>
          <AnimatePresence mode="wait">
            {!collapsed ? (
              <motion.div key="logo-full"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center gold-gradient shadow-gold-sm">
                  <Gem className="w-4 h-4" style={{ color: "oklch(0.12 0.010 260)" }} />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[13px] font-semibold tracking-wide truncate"
                    style={{ color: "oklch(0.92 0.006 80)" }}>
                    PIKORUA
                  </span>
                  <span className="text-[9px] tracking-[0.18em] uppercase truncate"
                    style={{ color: "oklch(0.700 0.130 75)" }}>
                    Realty CRM
                  </span>
                </div>
              </motion.div>
            ) : (
              <motion.div key="logo-collapsed"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="w-8 h-8 rounded-lg mx-auto flex items-center justify-center gold-gradient shadow-gold-sm">
                <Gem className="w-4 h-4" style={{ color: "oklch(0.12 0.010 260)" }} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Search hint */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="px-3 pt-3 pb-1">
              <button className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors"
                style={{
                  background: "oklch(0.185 0.015 260)",
                  color: "oklch(0.55 0.006 260)",
                  border: "1px solid oklch(0.250 0.014 260)"
                }}>
                <Search className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[12px] flex-1">Search...</span>
                <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                  style={{ background: "oklch(0.14 0.014 260)", color: "oklch(0.55 0.006 260)" }}>
                  ⌘K
                </kbd>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto scrollbar-sidebar py-2 px-2">
          {navGroups.filter(g => !g.adminOnly || isSuperAdmin).map((group, gi) => (
            <div key={group.title} className={cn(gi > 0 && "mt-5")}>
              <AnimatePresence>
                {!collapsed && (
                  <motion.p key={group.title}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="px-2 mb-1.5 text-[9.5px] font-semibold tracking-[0.15em] uppercase select-none"
                    style={{ color: "oklch(0.42 0.012 260)" }}>
                    {group.title}
                  </motion.p>
                )}
              </AnimatePresence>

              <ul className="space-y-0.5">
                {group.items.filter(item => !item.adminOnly || isSuperAdmin).map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                  const Icon = item.icon

                  const link = (
                    <Link href={item.href}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-2.5 py-2 relative transition-all duration-150",
                        isActive
                          ? "gold-gradient shadow-gold-sm"
                          : "hover:bg-[oklch(0.185_0.015_260)]"
                      )}>
                      <Icon className={cn("w-[17px] h-[17px] shrink-0 transition-colors",
                        isActive
                          ? "text-[oklch(0.10_0.010_260)]"
                          : "text-[oklch(0.50_0.008_260)] group-hover:text-[oklch(0.80_0.006_80)]"
                      )} />

                      <AnimatePresence>
                        {!collapsed && (
                          <motion.span
                            initial={{ opacity: 0, x: -4 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -4 }}
                            transition={{ duration: 0.15 }}
                            className={cn("text-[13px] font-medium flex-1 truncate",
                              isActive
                                ? "text-[oklch(0.10_0.010_260)]"
                                : "text-[oklch(0.75_0.006_80)] group-hover:text-[oklch(0.92_0.006_80)]"
                            )}>
                            {item.title}
                          </motion.span>
                        )}
                      </AnimatePresence>

                      {item.badge && !collapsed && (
                        <span className={cn(
                          "text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0",
                          isActive
                            ? "bg-[oklch(0.10_0.010_260/0.2)] text-[oklch(0.10_0.010_260)]"
                            : "bg-[oklch(0.700_0.130_75/0.15)] text-[oklch(0.700_0.130_75)]"
                        )}>
                          {item.badge}
                        </span>
                      )}
                      {item.badge && collapsed && (
                        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold gold-gradient text-[oklch(0.10_0.010_260)]">
                          {item.badge > 9 ? "9+" : item.badge}
                        </span>
                      )}
                    </Link>
                  )

                  return (
                    <li key={item.href}>
                      {collapsed
                        ? (<Tooltip><TooltipTrigger asChild>{link}</TooltipTrigger>
                            <TooltipContent side="right" className="glass-dark text-[oklch(0.92_0.006_80)] border-0 text-xs">
                              {item.title}
                            </TooltipContent>
                          </Tooltip>)
                        : link}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* User row */}
        <div className="shrink-0 p-2.5" style={{ borderTop: "1px solid oklch(0.220 0.015 260)" }}>
          <AnimatePresence mode="wait">
            {!collapsed ? (
              <motion.div key="user-full"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2.5 px-1">
                <div className="w-8 h-8 rounded-full gold-gradient flex items-center justify-center text-[11px] font-bold shrink-0"
                  style={{ color: "oklch(0.10 0.010 260)" }}>
                  {avatarInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium truncate" style={{ color: "oklch(0.88 0.006 80)" }}>
                    {displayName}
                  </p>
                  <p className="text-[10px] truncate" style={{ color: "oklch(0.700 0.130 75)" }}>
                    {displayRole}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                  style={{ color: "oklch(0.42 0.012 260)" }}
                  onClick={handleLogout}
                  title="Sign out">
                  <LogOut className="w-3.5 h-3.5" />
                </Button>
              </motion.div>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <motion.div key="user-collapsed"
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="w-8 h-8 rounded-full gold-gradient flex items-center justify-center text-[11px] font-bold mx-auto cursor-pointer"
                    style={{ color: "oklch(0.10 0.010 260)" }}
                    onClick={handleLogout}>
                    {avatarInitials}
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent side="right" className="glass-dark text-[oklch(0.92_0.006_80)] border-0 text-xs">
                  {displayName} · {displayRole}
                </TooltipContent>
              </Tooltip>
            )}
          </AnimatePresence>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-[72px] z-50 h-6 w-6 rounded-full flex items-center justify-center transition-all duration-150 shadow-card hover:shadow-gold-sm"
          style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
          {collapsed
            ? <ChevronRight className="w-3 h-3 text-muted-foreground" />
            : <ChevronLeft className="w-3 h-3 text-muted-foreground" />}
        </button>
      </motion.aside>
    </TooltipProvider>
  )
}


