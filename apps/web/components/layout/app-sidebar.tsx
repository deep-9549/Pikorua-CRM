"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard, Users, MessageSquare, Building2, Sparkles,
  CalendarCheck, BarChart3, Bot, CreditCard, UserCog, Crown,
  FileText, Settings, ChevronLeft, Trash2,
  PieChart, FileSpreadsheet, LogOut, Activity
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import { getAuthUser } from "@/lib/auth/cookies"

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  badge?: number
  adminOnly?: boolean
  comingSoon?: boolean
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
      { title: "Trash", href: "/trash", icon: Trash2 },
      { title: "AI Voice", href: "/ai-voice", icon: Bot, adminOnly: true },
      { title: "WhatsApp Hub", href: "/whatsapp", icon: MessageSquare, comingSoon: true },
      { title: "Properties", href: "/properties", icon: Building2 },
      { title: "Smart Matching", href: "/smart-matching", icon: Sparkles, comingSoon: true },
      { title: "Site Visits", href: "/site-visits", icon: CalendarCheck },
    ]
  },
  {
    title: "Analytics",
    items: [
      { title: "Meta Ads", href: "/meta-ads", icon: BarChart3, adminOnly: true },
      { title: "AI Analytics", href: "/ai-analytics", icon: Sparkles, adminOnly: true },
      { title: "Employee Performance Analysis", href: "/employee-performance-analysis", icon: Activity, adminOnly: true },
      { title: "Reports", href: "/reports", icon: PieChart, adminOnly: true, comingSoon: true },
      { title: "Bookings", href: "/bookings", icon: CreditCard, comingSoon: true },
    ]
  },
  {
    title: "Team",
    adminOnly: true,
    items: [
      { title: "Employees", href: "/employees", icon: UserCog },
      { title: "HNI Clients", href: "/hni-clients", icon: Crown, comingSoon: true },
    ]
  },
  {
    title: "Tools",
    items: [
      { title: "AI Control", href: "/ai-control", icon: Bot, adminOnly: true, comingSoon: true },
      { title: "Scripts", href: "/scripts", icon: FileText },
      { title: "Documents", href: "/documents", icon: FileSpreadsheet, comingSoon: true },
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

interface AppSidebarProps {
  collapsed: boolean
  mobileOpen?: boolean
  onCollapsedChange: (collapsed: boolean) => void
  onMobileOpenChange?: (open: boolean) => void
}

export function AppSidebar({
  collapsed,
  mobileOpen = false,
  onCollapsedChange,
  onMobileOpenChange,
}: AppSidebarProps) {
  const [profile, setProfile] = React.useState<UserProfile | null>(null)
  const pathname = usePathname()
  const router = useRouter()

  React.useEffect(() => {
    const user = getAuthUser()
    if (user) setProfile({ full_name: user.name ?? "", role: user.role as UserProfile["role"] })
  }, [])

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push("/login")
    router.refresh()
  }

  const isSuperAdmin = profile?.role === "super_admin"
  const displayName = profile?.full_name ?? "Loading..."
  const displayRole = profile?.role === "super_admin" ? "Super Admin" : profile?.role === "sales_executive" ? "Sales Executive" : ""
  const avatarInitials = profile?.full_name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) ?? "…"

  const isMobileOpen = mobileOpen && !collapsed
  const sidebarWidth = collapsed ? 68 : 256

  React.useEffect(() => {
    onMobileOpenChange?.(false)
  }, [pathname, onMobileOpenChange])

  return (
    <TooltipProvider delayDuration={0}>
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            key="sidebar-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-30 bg-black/35 backdrop-blur-sm md:hidden"
            onClick={() => onMobileOpenChange?.(false)}
          />
        )}
      </AnimatePresence>
      <motion.aside
        initial={false}
        animate={{ width: sidebarWidth }}
        transition={{ duration: 0.28, ease: "easeOut" }}
        className={cn(
          "fixed left-0 top-0 z-40 h-screen flex flex-col overflow-hidden transition-transform duration-[280ms] ease-[cubic-bezier(0.4,0,0.2,1)]",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
        style={{ background: "var(--color-sidebar)" }}
      >
        {/* Top border accent */}
        <div className="h-px w-full shrink-0" style={{
          background: "linear-gradient(90deg, transparent 0%, rgb(194 65 12 / 0.65) 50%, transparent 100%)"
        }} />

        {/* Logo */}
        <div
          className={cn(
            "flex h-[60px] shrink-0 items-center",
            collapsed ? "justify-center px-2" : "justify-between px-4"
          )}
          style={{ borderBottom: "1px solid var(--color-sidebar-border)" }}>
          <AnimatePresence mode="wait">
            {!collapsed ? (
              <motion.div key="logo-full"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-3 min-w-0 flex-1">
                <Link href="/dashboard" className="flex min-w-0 items-center gap-3 rounded-lg transition-opacity hover:opacity-90">
                  <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center">
                    <img src="/pikorua-icon-mark-square.png" alt="Pikorua" className="w-8 h-8 object-contain" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[13px] font-semibold tracking-wide truncate"
                      style={{ color: "var(--color-sidebar-foreground)" }}>
                      PIKORUA
                    </span>
                    <span className="text-[9px] tracking-[0.18em] uppercase truncate"
                      style={{ color: "#fdba74" }}>
                      Realty CRM
                    </span>
                  </div>
                </Link>
              </motion.div>
            ) : (
              <motion.button key="logo-collapsed"
                type="button"
                onClick={() => {
                  router.push("/dashboard")
                  onCollapsedChange(false)
                }}
                aria-label="Open dashboard"
                title="Open dashboard"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-150 hover:scale-105">
                <img src="/pikorua-icon-mark-square.png" alt="Pikorua" className="w-8 h-8 object-contain" />
              </motion.button>
            )}
          </AnimatePresence>
          {!collapsed && (
            <button
              type="button"
              onClick={() => onCollapsedChange(true)}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className="ml-3 h-8 w-8 shrink-0 rounded-lg flex items-center justify-center transition-all duration-150 hover:shadow-gold-sm"
              style={{
                background: "rgb(254 249 242 / 0.10)",
                border: "1px solid rgb(254 249 242 / 0.18)",
                color: "rgb(254 249 242 / 0.76)"
              }}>
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto scrollbar-sidebar py-2 px-2">
          {navGroups.filter(g => !g.adminOnly || isSuperAdmin).map((group, gi) => (
            <div key={group.title} className={cn(gi > 0 && "mt-5")}>
              <AnimatePresence>
                {!collapsed && (
                  <motion.p key={group.title}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="px-2 mb-1.5 text-[9.5px] font-semibold tracking-[0.15em] uppercase select-none"
                    style={{ color: "rgb(254 249 242 / 0.52)" }}>
                    {group.title}
                  </motion.p>
                )}
              </AnimatePresence>

              <ul className="space-y-0.5">
                {group.items.filter(item => !item.adminOnly || isSuperAdmin).map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                  const Icon = item.icon

                  // ── Coming Soon: non-clickable, dimmed, "Soon" pill ──
                  if (item.comingSoon) {
                    const lockedEl = (
                      <div className="flex items-center gap-3 rounded-lg px-2.5 py-2 relative cursor-not-allowed opacity-40 select-none">
                        <Icon className="w-[17px] h-[17px] shrink-0 text-sidebar-foreground/60" />
                        <AnimatePresence>
                          {!collapsed && (
                            <motion.span
                              initial={{ opacity: 0, x: -4 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -4 }}
                              transition={{ duration: 0.15 }}
                              className="text-[13px] font-medium flex-1 truncate text-sidebar-foreground/75">
                              {item.title}
                            </motion.span>
                          )}
                        </AnimatePresence>
                        {!collapsed && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                            style={{ background: "oklch(0.700 0.130 75 / 0.18)", color: "oklch(0.700 0.130 75)" }}>
                            SOON
                          </span>
                        )}
                      </div>
                    )

                    return (
                      <li key={item.href}>
                        {collapsed
                          ? (<Tooltip>
                              <TooltipTrigger asChild>{lockedEl}</TooltipTrigger>
                              <TooltipContent side="right" className="glass-dark text-sidebar-foreground border-0 text-xs">
                                {item.title} — Coming Soon
                              </TooltipContent>
                            </Tooltip>)
                          : lockedEl}
                      </li>
                    )
                  }

                  // ── Active nav item ──
                  const link = (
                    <Link href={item.href}
                      className={cn(
                        "group flex items-center gap-3 rounded-lg px-2.5 py-2 relative transition-all duration-150",
                        isActive
                          ? "gold-gradient shadow-gold-sm"
                          : "hover:bg-sidebar-accent"
                      )}>
                      <Icon className={cn("w-[17px] h-[17px] shrink-0 transition-colors",
                        isActive
                          ? "text-primary-foreground"
                          : "text-sidebar-foreground/60 group-hover:text-sidebar-foreground"
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
                                ? "text-primary-foreground"
                                : "text-sidebar-foreground/75 group-hover:text-sidebar-foreground"
                            )}>
                            {item.title}
                          </motion.span>
                        )}
                      </AnimatePresence>

                      {item.badge && !collapsed && (
                        <span className={cn(
                          "text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0",
                          isActive
                            ? "bg-white/20 text-primary-foreground"
                            : "bg-primary/15 text-orange-200"
                        )}>
                          {item.badge}
                        </span>
                      )}
                      {item.badge && collapsed && (
                        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold gold-gradient text-primary-foreground">
                          {item.badge > 9 ? "9+" : item.badge}
                        </span>
                      )}
                    </Link>
                  )

                  return (
                    <li key={item.href}>
                      {collapsed
                        ? (<Tooltip><TooltipTrigger asChild>{link}</TooltipTrigger>
                            <TooltipContent side="right" className="glass-dark text-sidebar-foreground border-0 text-xs">
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
        <div className="shrink-0 p-2.5" style={{ borderTop: "1px solid var(--color-sidebar-border)" }}>
          <AnimatePresence mode="wait">
            {!collapsed ? (
              <motion.div key="user-full"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2.5 px-1">
                <div className="w-8 h-8 rounded-full gold-gradient flex items-center justify-center text-[11px] font-bold shrink-0"
                  style={{ color: "var(--color-primary-foreground)" }}>
                  {avatarInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-medium truncate" style={{ color: "var(--color-sidebar-foreground)" }}>
                    {displayName}
                  </p>
                  <p className="text-[10px] truncate" style={{ color: "#fdba74" }}>
                    {displayRole}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                  style={{ color: "rgb(254 249 242 / 0.58)" }}
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
                    style={{ color: "var(--color-primary-foreground)" }}
                    onClick={handleLogout}>
                    {avatarInitials}
                  </motion.div>
                </TooltipTrigger>
                <TooltipContent side="right" className="glass-dark text-sidebar-foreground border-0 text-xs">
                  {displayName} · {displayRole}
                </TooltipContent>
              </Tooltip>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>
    </TooltipProvider>
  )
}
