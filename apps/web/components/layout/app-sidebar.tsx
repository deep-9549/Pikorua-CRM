"use client"

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard, Users, MessageSquare, Building2, Sparkles,
  CalendarCheck, BarChart3, Bot, CreditCard, UserCog, Crown,
  FileText, Settings, ChevronLeft, Trash2, X,
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
    title: "Work",
    items: [
      { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { title: "Leads", href: "/leads", icon: Users },
      { title: "Site Visits", href: "/site-visits", icon: CalendarCheck },
      { title: "Bookings", href: "/bookings", icon: CreditCard },
    ]
  },
  {
    title: "Inventory",
    items: [
      { title: "Properties", href: "/properties", icon: Building2 },
      { title: "Smart Matching", href: "/smart-matching", icon: Sparkles },
    ]
  },
  {
    title: "Growth & insights",
    items: [
      { title: "AI Voice", href: "/ai-voice", icon: Bot, adminOnly: true },
      { title: "WhatsApp Hub", href: "/whatsapp", icon: MessageSquare, comingSoon: true },
      { title: "Meta Ads", href: "/meta-ads", icon: BarChart3, adminOnly: true },
      { title: "Employee Performance Analysis", href: "/employee-performance-analysis", icon: Activity, adminOnly: true },
      { title: "Reports", href: "/reports", icon: PieChart, adminOnly: true },
    ]
  },
  {
    title: "People",
    items: [
      { title: "Employees", href: "/employees", icon: UserCog, adminOnly: true },
      { title: "HNI Clients", href: "/hni-clients", icon: Crown, adminOnly: true },
    ]
  },
  {
    title: "Workspace",
    items: [
      { title: "AI Control", href: "/ai-control", icon: Bot, adminOnly: true, comingSoon: true },
      { title: "Scripts", href: "/scripts", icon: FileText },
      { title: "Documents", href: "/documents", icon: FileSpreadsheet, comingSoon: true },
      { title: "Settings", href: "/settings", icon: Settings },
      { title: "Trash", href: "/trash", icon: Trash2 },
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
    const syncProfile = () => {
      const user = getAuthUser()
      if (user) setProfile({ full_name: user.name ?? "", role: user.role as UserProfile["role"] })
    }
    syncProfile()
    window.addEventListener("pikorua:user-updated", syncProfile)
    return () => window.removeEventListener("pikorua:user-updated", syncProfile)
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
  const sidebarWidth = collapsed ? 76 : 272

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
          "fixed left-0 top-0 z-40 flex h-[100dvh] max-w-[calc(100vw-2rem)] flex-col overflow-hidden bg-sidebar transition-transform duration-[var(--motion-standard)] ease-[var(--ease-product)]",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="h-0.5 w-full shrink-0 bg-sidebar-primary" />

        {/* Logo */}
        <div
          className={cn(
            "flex h-[67px] shrink-0 items-center border-b border-sidebar-border",
            collapsed ? "justify-center px-2" : "justify-between px-3.5"
          )}
        >
          <AnimatePresence mode="wait">
            {!collapsed ? (
              <motion.div key="logo-full"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-3 min-w-0 flex-1">
                <Link href="/dashboard" className="flex min-w-0 items-center gap-3 rounded-lg focus-visible:ring-2 focus-visible:ring-sidebar-ring">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/6 ring-1 ring-white/10">
                    <Image src="/pikorua-icon-mark-square.png" alt="Pikorua" width={32} height={32} className="h-8 w-8 object-contain" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="truncate text-[13px] font-semibold tracking-[0.08em] text-sidebar-foreground">
                      PIKORUA
                    </span>
                    <span className="truncate text-[10px] tracking-[0.08em] text-sidebar-foreground/55">
                      Realty operations
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
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/6 ring-1 ring-white/10 transition-colors hover:bg-white/10">
                <Image src="/pikorua-icon-mark-square.png" alt="Pikorua" width={32} height={32} className="h-8 w-8 object-contain" />
              </motion.button>
            )}
          </AnimatePresence>
          {!collapsed && (
            <button
              type="button"
              onClick={() => onMobileOpenChange?.(false)}
              aria-label="Close navigation"
              className="ml-3 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground md:hidden"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          {!collapsed && (
            <button
              type="button"
              onClick={() => onCollapsedChange(true)}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className="ml-3 hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sidebar-border text-sidebar-foreground/65 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground md:flex">
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav aria-label="Primary navigation" className="scrollbar-sidebar flex-1 overflow-y-auto px-2.5 py-3">
          {navGroups
            .filter(group => (!group.adminOnly || isSuperAdmin) && group.items.some(item => !item.adminOnly || isSuperAdmin))
            .map((group, gi) => (
            <div key={group.title} className={cn(gi > 0 && "mt-4")}>
              <AnimatePresence>
                {!collapsed && (
                  <motion.p key={group.title}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="mb-1.5 select-none px-2.5 text-[10px] font-semibold tracking-[0.12em] text-sidebar-foreground/45">
                    {group.title}
                  </motion.p>
                )}
              </AnimatePresence>

              <ul className="space-y-1">
                {group.items.filter(item => !item.adminOnly || isSuperAdmin).map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                  const Icon = item.icon

                  // ── Coming Soon: non-clickable, dimmed, "Soon" pill ──
                  if (item.comingSoon) {
                    const lockedEl = (
                      <div className="relative flex min-h-10 cursor-not-allowed select-none items-center gap-3 rounded-lg px-2.5 py-2 opacity-40">
                        <Icon className="h-[18px] w-[18px] shrink-0 text-sidebar-foreground/60" strokeWidth={1.8} />
                        <AnimatePresence>
                          {!collapsed && (
                            <motion.span
                              initial={{ opacity: 0, x: -4 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -4 }}
                              transition={{ duration: 0.15 }}
                              className="flex-1 truncate text-[13px] font-medium text-sidebar-foreground/75">
                              {item.title}
                            </motion.span>
                          )}
                        </AnimatePresence>
                        {!collapsed && (
                          <span className="shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-sidebar-foreground/55 ring-1 ring-sidebar-border">
                            Soon
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
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "group relative flex min-h-10 items-center gap-3 rounded-lg px-2.5 py-2 transition-colors duration-[var(--motion-fast)]",
                        isActive
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "hover:bg-sidebar-accent"
                      )}>
                      <Icon strokeWidth={1.8} className={cn("h-[18px] w-[18px] shrink-0 transition-colors",
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
                            className={cn("flex-1 truncate text-[13px] font-medium",
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
        <div className="shrink-0 border-t border-sidebar-border p-3">
          <AnimatePresence mode="wait">
            {!collapsed ? (
              <motion.div key="user-full"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-2.5 px-1">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-[11px] font-bold text-sidebar-primary-foreground">
                  {avatarInitials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-[12px] font-medium text-sidebar-foreground">
                    {displayName}
                  </p>
                  <p className="truncate text-[10px] text-sidebar-foreground/50">
                    {displayRole}
                  </p>
                </div>
                <Button variant="ghost" size="icon-sm" className="shrink-0 text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
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
                    className="mx-auto flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg bg-sidebar-primary text-[11px] font-bold text-sidebar-primary-foreground"
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
