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
  Home
} from "lucide-react"
import { cn } from "@/lib/utils"
import { leads, properties, employees } from "@/lib/data"

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
}

const pages: CommandItem[] = [
  { id: "dashboard", title: "Dashboard", subtitle: "Overview & Analytics", icon: LayoutDashboard, type: "page", href: "/dashboard" },
  { id: "leads", title: "Lead Management", subtitle: "Manage all leads", icon: Users, type: "page", href: "/leads" },
  { id: "whatsapp", title: "WhatsApp Hub", subtitle: "Messages & Communication", icon: MessageSquare, type: "page", href: "/whatsapp" },
  { id: "properties", title: "Property Explorer", subtitle: "Browse properties", icon: Building2, type: "page", href: "/properties" },
  { id: "matching", title: "Smart Property Matching", subtitle: "AI-powered matching", icon: Sparkles, type: "page", href: "/smart-matching" },
  { id: "site-visits", title: "Site Visits", subtitle: "Schedule & manage visits", icon: CalendarCheck, type: "page", href: "/site-visits" },
  { id: "meta-ads", title: "Meta Ads Analytics", subtitle: "Campaign performance", icon: BarChart3, type: "page", href: "/meta-ads" },
  { id: "ai-analytics", title: "AI Analytics", subtitle: "Deep CRM comparisons", icon: Sparkles, type: "page", href: "/ai-analytics" },
  { id: "ai", title: "AI Control Center", subtitle: "Configure AI settings", icon: Bot, type: "page", href: "/ai-control" },
  { id: "bookings", title: "Bookings & Revenue", subtitle: "Track deals & revenue", icon: CreditCard, type: "page", href: "/bookings" },
  { id: "employees", title: "Employee Management", subtitle: "Team & performance", icon: UserCog, type: "page", href: "/employees" },
  { id: "clients", title: "HNI Clients", subtitle: "High-value client profiles", icon: Crown, type: "page", href: "/hni-clients" },
  { id: "scripts", title: "Calling Scripts", subtitle: "Sales scripts library", icon: FileText, type: "page", href: "/scripts" },
  { id: "settings", title: "Settings", subtitle: "System configuration", icon: Settings, type: "page", href: "/settings" },
]

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()
  const [search, setSearch] = React.useState("")
  const [selectedIndex, setSelectedIndex] = React.useState(0)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Build search results
  const results = React.useMemo(() => {
    const query = search.toLowerCase().trim()
    if (!query) return pages

    const items: CommandItem[] = []

    // Search pages
    pages.forEach((page) => {
      if (
        page.title.toLowerCase().includes(query) ||
        page.subtitle?.toLowerCase().includes(query)
      ) {
        items.push(page)
      }
    })

    // Search leads
    leads.forEach((lead) => {
      if (
        lead.name.toLowerCase().includes(query) ||
        lead.email.toLowerCase().includes(query) ||
        lead.phone.includes(query)
      ) {
        items.push({
          id: `lead-${lead.id}`,
          title: lead.name,
          subtitle: `Lead - ${lead.status} - ${lead.location}`,
          icon: User,
          type: "lead",
          href: `/leads/${lead.id}`
        })
      }
    })

    // Search properties
    properties.forEach((property) => {
      if (
        property.name.toLowerCase().includes(query) ||
        property.location.toLowerCase().includes(query)
      ) {
        items.push({
          id: `property-${property.id}`,
          title: property.name,
          subtitle: `Property - ${property.type} - ${property.location}`,
          icon: Home,
          type: "property",
          href: `/properties/${property.id}`
        })
      }
    })

    // Search employees
    employees.forEach((employee) => {
      if (
        employee.name.toLowerCase().includes(query) ||
        employee.email.toLowerCase().includes(query)
      ) {
        items.push({
          id: `employee-${employee.id}`,
          title: employee.name,
          subtitle: `Employee - ${employee.role.replace("_", " ")}`,
          icon: UserCog,
          type: "employee",
          href: `/employees/${employee.id}`
        })
      }
    })

    return items.slice(0, 10)
  }, [search])

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
          setSelectedIndex((i) => (i + 1) % results.length)
          break
        case "ArrowUp":
          e.preventDefault()
          setSelectedIndex((i) => (i - 1 + results.length) % results.length)
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
              "fixed left-1/2 top-[20%] z-50 -translate-x-1/2",
              "w-full max-w-xl",
              "bg-card/95 backdrop-blur-2xl",
              "rounded-2xl border border-border",
              "shadow-luxury-lg overflow-hidden"
            )}
          >
            {/* Search Input */}
            <div className="flex items-center gap-3 px-4 border-b border-border">
              <Search className="w-5 h-5 text-muted-foreground" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search pages, leads, properties..."
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
                          "w-full flex items-center gap-3 px-3 py-3 rounded-xl",
                          "text-left transition-all duration-150",
                          isSelected
                            ? "bg-primary/10 border border-primary/20"
                            : "hover:bg-muted/50"
                        )}
                      >
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
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
            <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/30">
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
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
                <Sparkles className="w-3 h-3 text-primary" />
                <span className="text-xs text-muted-foreground">AI-powered search</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

