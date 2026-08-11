"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search,
  LayoutDashboard,
  Users,
  MessageSquare,
  Building2,
  Sparkles,
  CalendarCheck,
  BarChart3,
  Bot,
  CreditCard,
  UserCog,
  Crown,
  FileText,
  Settings,
  ArrowRight,
  User,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getAuthUser } from "@/lib/auth/cookies"
import { useMetaLeads } from "@/hooks/use-meta-leads"

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface CommandItem {
  id: string
  title: string
  subtitle?: string
  icon: React.ElementType
  type: "page" | "lead" | "property" | "employee" | "action"
  href?: string
  action?: () => void
  adminOnly?: boolean
}

interface PaletteLead {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  city: string | null
  client_status?: string | null
}

const pages: CommandItem[] = [
  { id: "dashboard", title: "Dashboard", subtitle: "Overview & Analytics", icon: LayoutDashboard, type: "page", href: "/dashboard" },
  { id: "leads", title: "Lead Management", subtitle: "Manage all leads", icon: Users, type: "page", href: "/leads" },
  { id: "whatsapp", title: "WhatsApp Hub", subtitle: "Messages & Communication", icon: MessageSquare, type: "page", href: "/whatsapp" },
  { id: "properties", title: "Property Explorer", subtitle: "Browse properties", icon: Building2, type: "page", href: "/properties" },
  { id: "matching", title: "Smart Property Matching", subtitle: "AI-powered matching", icon: Sparkles, type: "page", href: "/smart-matching" },
  { id: "site-visits", title: "Site Visits", subtitle: "Schedule & manage visits", icon: CalendarCheck, type: "page", href: "/site-visits" },
  { id: "meta-ads", title: "Meta Ads Analytics", subtitle: "Campaign performance", icon: BarChart3, type: "page", href: "/meta-ads" },
  { id: "ai", title: "AI Control Center", subtitle: "Configure AI settings", icon: Bot, type: "page", href: "/ai-control" },
  { id: "bookings", title: "Bookings & Revenue", subtitle: "Track deals & revenue", icon: CreditCard, type: "page", href: "/bookings" },
  { id: "employees", title: "Employee Management", subtitle: "Team & performance", icon: UserCog, type: "page", href: "/employees", adminOnly: true },
  { id: "clients", title: "HNI Clients", subtitle: "High-value client profiles", icon: Crown, type: "page", href: "/hni-clients", adminOnly: true },
  { id: "scripts", title: "Calling Scripts", subtitle: "Sales scripts library", icon: FileText, type: "page", href: "/scripts" },
  { id: "settings", title: "Settings", subtitle: "System configuration", icon: Settings, type: "page", href: "/settings" },
]

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()
  const { data: liveLeads = [] } = useMetaLeads<PaletteLead>()
  const isSuperAdmin = getAuthUser()?.role === "super_admin"
  const [search, setSearch] = React.useState("")
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Build search results
  const results = React.useMemo(() => {
    const query = search.toLowerCase().trim()
    const visiblePages = pages.filter(page => !page.adminOnly || isSuperAdmin)
    if (!query) return visiblePages

    const items: CommandItem[] = []

    // Search pages
    visiblePages.forEach((page) => {
      if (
        page.title.toLowerCase().includes(query) ||
        page.subtitle?.toLowerCase().includes(query)
      ) {
        items.push(page)
      }
    })

    // Search leads
    liveLeads.forEach((lead) => {
      if (
        lead.full_name?.toLowerCase().includes(query) ||
        lead.email?.toLowerCase().includes(query) ||
        lead.phone?.includes(query) ||
        lead.city?.toLowerCase().includes(query)
      ) {
        items.push({
          id: `lead-${lead.id}`,
          title: lead.full_name ?? "Unnamed lead",
          subtitle: ["Lead", lead.client_status?.replaceAll("_", " "), lead.city].filter(Boolean).join(" · "),
          icon: User,
          type: "lead",
          href: `/leads/${lead.id}`
        })
      }
    })

    return items.slice(0, 10)
  }, [isSuperAdmin, liveLeads, search])

  // Keyboard navigation
  React.useEffect(() => {
    if (open) {
      setSelectedIndex(0)
      setSearch("")
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!open) {
        if ((e.metaKey || e.ctrlKey) && e.key === "k") {
          e.preventDefault()
          onOpenChange(true)
        }
        return
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          if (results.length > 0) setSelectedIndex((i) => (i + 1) % results.length)
          break
        case "ArrowUp":
          e.preventDefault()
          if (results.length > 0) setSelectedIndex((i) => (i - 1 + results.length) % results.length)
          break
        case "Enter":
          e.preventDefault()
          const selected = results[selectedIndex]
          if (selected?.href) {
            router.push(selected.href)
            onOpenChange(false)
          } else if (selected?.action) {
            selected.action()
            onOpenChange(false)
          }
          break
        case "Escape":
          e.preventDefault()
          onOpenChange(false)
          break
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [open, results, selectedIndex, router, onOpenChange])

  const handleSelect = (item: CommandItem) => {
    if (item.href) {
      router.push(item.href)
    } else if (item.action) {
      item.action()
    }
    onOpenChange(false)
  }

  const getTypeLabel = (type: CommandItem["type"]) => {
    switch (type) {
      case "page": return "Navigate"
      case "lead": return "Open Lead"
      case "property": return "View Property"
      case "employee": return "View Profile"
      case "action": return "Run Action"
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="workspace-search-title"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm"
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={cn(
              "fixed left-3 right-3 top-[12%] z-50 sm:left-1/2 sm:right-auto sm:top-[20%] sm:-translate-x-1/2",
              "w-auto sm:w-full sm:max-w-xl",
              "bg-card/95 backdrop-blur-2xl",
              "rounded-lg border border-border",
              "shadow-luxury-lg overflow-hidden"
            )}
          >
            <h2 id="workspace-search-title" className="sr-only">Workspace search</h2>
            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 border-b border-border">
              <Search className="w-5 h-5 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search pages and live leads..."
                aria-label="Search pages and live leads"
                className={cn(
                  "flex-1 h-14 bg-transparent",
                  "text-foreground placeholder:text-muted-foreground",
                  "outline-none text-base"
                )}
              />
              <kbd className="text-[10px] font-mono bg-muted/50 px-2 py-1 rounded border border-border/50 text-muted-foreground">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-80 overflow-y-auto scrollbar-luxury p-2">
              {results.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No results found</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {results.map((item, index) => {
                    const Icon = item.icon
                    const isSelected = index === selectedIndex

                    return (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item)}
                        onMouseEnter={() => setSelectedIndex(index)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-3 rounded-md",
                          "text-left transition-all duration-150",
                          isSelected
                            ? "bg-primary/10 border border-primary/20"
                            : "hover:bg-muted/50"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-md flex items-center justify-center",
                          isSelected
                            ? "bg-primary/20 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm font-medium truncate",
                            isSelected && "text-primary"
                          )}>
                            {item.title}
                          </p>
                          {item.subtitle && (
                            <p className="text-xs text-muted-foreground truncate">
                              {item.subtitle}
                            </p>
                          )}
                        </div>
                        <div className={cn(
                          "flex items-center gap-2 text-xs",
                          isSelected ? "text-primary" : "text-muted-foreground"
                        )}>
                          <span>{getTypeLabel(item.type)}</span>
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-border bg-muted/30 px-4 py-3">
              <div className="hidden items-center gap-4 text-xs text-muted-foreground sm:flex">
                <span className="flex items-center gap-1">
                  <kbd className="font-mono bg-muted/50 px-1.5 py-0.5 rounded border border-border/50">↑</kbd>
                  <kbd className="font-mono bg-muted/50 px-1.5 py-0.5 rounded border border-border/50">↓</kbd>
                  to navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="font-mono bg-muted/50 px-1.5 py-0.5 rounded border border-border/50">↵</kbd>
                  to select
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Search className="w-3 h-3 text-primary" />
                <span className="text-xs text-muted-foreground">Workspace search</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

