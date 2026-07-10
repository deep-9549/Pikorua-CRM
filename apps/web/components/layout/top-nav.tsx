"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search, Bell, Plus, ChevronRight, Sparkles, Calendar,
  MessageSquare, Phone, CheckCircle2, Clock, Users, Eye,
  Trash2, X, Filter, AlertCircle, ListTodo, UserPlus,
  PhoneCall, Building2, MapPin, IndianRupee, Send, FileText,
  ExternalLink, Flame, Star, TrendingUp, Zap, Menu
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { ReminderDialog } from "@/components/reminder-dialog"
import { ProtectedPhone } from "@/components/security/protected-phone"
import { employees } from "@/lib/data"
import { useMetaLeads } from "@/hooks/use-meta-leads"

const pageNames: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/leads": "Lead Management",
  "/ai-voice": "AI Voice",
  "/whatsapp": "WhatsApp Hub",
  "/properties": "Property Explorer",
  "/smart-matching": "Smart Property Matching",
  "/site-visits": "Site Visit Management",
  "/meta-ads": "Meta Ads Analytics",
  "/ai-analytics": "AI Analytics",
  "/ai-control": "AI Control Center",
  "/bookings": "Bookings & Revenue",
  "/employees": "Employee Management",
  "/hni-clients": "HNI Clients",
  "/scripts": "Calling Scripts",
  "/reports": "Reports & Analytics",
  "/pricing": "Pricing & Costing",
  "/documents": "PDF Documents",
  "/settings": "Settings"
}

interface NotificationAction {
  label: string
  icon: React.ElementType
  action: string
  variant?: "default" | "primary" | "success" | "warning"
}

interface Notification {
  id: string
  title: string
  message: string
  time: string
  type: "lead" | "message" | "call" | "system" | "booking" | "visit"
  read: boolean
  priority?: "high" | "normal"
  actionUrl?: string
  leadData?: {
    name: string
    phone: string
    email?: string
    propertyInterest?: string
    budget?: string
    location?: string
    aiScore?: number
    tags?: string[]
  }
  suggestedActions?: NotificationAction[]
}

const initialNotifications: Notification[] = []

interface FollowUpLead {
  id: string
  full_name: string | null
  phone: string | null
  city: string | null
  crm?: {
    follow_up_date?: string | null
    budget_range?: string | null
    configuration?: string[] | null
  } | null
}

function dateKey(value: string | Date | null | undefined) {
  if (!value) return ""
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function followUpTimestamp(value: string | null | undefined) {
  if (!value) return Number.NaN
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value
  return new Date(normalized).getTime()
}

function leadNames(leads: FollowUpLead[]) {
  return leads
    .slice(0, 3)
    .map(lead => lead.full_name || "Unnamed lead")
    .join(", ")
}

function buildFollowUpNotifications(leads: FollowUpLead[], now: number): Notification[] {
  const today = dateKey(new Date(now))
  const dueToday = leads.filter(lead =>
    dateKey(lead.crm?.follow_up_date) === today && followUpTimestamp(lead.crm?.follow_up_date) <= now
  )
  const overdue = leads.filter(lead => {
    const followUp = dateKey(lead.crm?.follow_up_date)
    return followUp && followUp < today
  })

  const notifications: Notification[] = []
  if (dueToday.length > 0) {
    const firstLead = dueToday[0]
    notifications.push({
      id: "followups-today",
      title: `${dueToday.length} follow-up${dueToday.length === 1 ? "" : "s"} due today`,
      message: leadNames(dueToday),
      time: firstLead.crm?.follow_up_date
        ? new Date(firstLead.crm.follow_up_date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
        : "Today",
      type: "call",
      read: false,
      priority: "high",
      actionUrl: "/leads",
      leadData: {
        name: firstLead.full_name || "Follow-up lead",
        phone: firstLead.phone || "",
        budget: firstLead.crm?.budget_range ?? undefined,
        location: firstLead.city ?? undefined,
        propertyInterest: firstLead.crm?.configuration?.join(", ") || undefined,
      },
      suggestedActions: [
        { label: "Open follow-ups", icon: PhoneCall, action: "open-followups", variant: "primary" },
      ],
    })
  }

  if (overdue.length > 0) {
    notifications.push({
      id: "followups-overdue",
      title: `${overdue.length} overdue follow-up${overdue.length === 1 ? "" : "s"}`,
      message: leadNames(overdue),
      time: "Needs attention",
      type: "call",
      read: false,
      priority: "high",
      actionUrl: "/leads",
      suggestedActions: [
        { label: "Review overdue calls", icon: PhoneCall, action: "open-followups", variant: "warning" },
      ],
    })
  }

  return notifications
}

function getTypeConfig(type: Notification["type"]) {
  const configs = {
    lead:    { icon: Sparkles,     bg: "bg-primary/10",    color: "text-primary" },
    message: { icon: MessageSquare, bg: "bg-emerald-500/10", color: "text-emerald-600" },
    call:    { icon: Phone,         bg: "bg-primary/10",  color: "text-primary" },
    booking: { icon: CheckCircle2,  bg: "bg-emerald-500/10", color: "text-emerald-600" },
    visit:   { icon: Calendar,      bg: "bg-primary/10",    color: "text-primary" },
    system:  { icon: AlertCircle,   bg: "bg-muted",         color: "text-muted-foreground" },
  }
  return configs[type]
}

function ActionButton({
  action, onClick
}: {
  action: NotificationAction
  onClick: (action: string) => void
}) {
  const Icon = action.icon
  const styles: Record<string, string> = {
    primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-gold-sm",
    success: "bg-success/10 text-success border border-success/20 hover:bg-success/20",
    warning: "bg-warning/10 text-warning-foreground border border-warning/20 hover:bg-warning/20",
    default: "bg-muted hover:bg-muted/80 text-foreground border border-border",
  }
  return (
    <button
      onClick={() => onClick(action.action)}
      className={cn(
        "flex items-center gap-2 w-full px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
        styles[action.variant || "default"]
      )}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {action.label}
    </button>
  )
}

export function TopNav({
  onCommandPaletteOpen,
  onMenuClick,
}: {
  onCommandPaletteOpen?: () => void
  onMenuClick?: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [notifications, setNotifications] = React.useState(initialNotifications)
  const [showPanel, setShowPanel] = React.useState(false)
  const [showReminders, setShowReminders] = React.useState(false)
  const [selected, setSelected] = React.useState<Notification | null>(null)
  const [typeFilter, setTypeFilter] = React.useState<string>("all")
  const [readFilter, setReadFilter] = React.useState<"all" | "unread">("all")
  const [assignedEmployee, setAssignedEmployee] = React.useState("")
  const [leadBreadcrumbName, setLeadBreadcrumbName] = React.useState<string | null>(null)
  const [followUpClock, setFollowUpClock] = React.useState(() => Date.now())

  const unreadCount = notifications.filter(n => !n.read).length
  const filtered = notifications.filter(n => {
    if (readFilter === "unread" && n.read) return false
    if (typeFilter !== "all" && n.type !== typeFilter) return false
    return true
  })
  const activeEmployees = employees.filter(e => e.status === "online" || e.status === "busy")
  const leadDetailId = React.useMemo(() => {
    const match = pathname.match(/^\/leads\/([^/]+)$/)
    return match?.[1] ?? null
  }, [pathname])

  React.useEffect(() => {
    if (!leadDetailId) {
      setLeadBreadcrumbName(null)
      return
    }

    let cancelled = false
    setLeadBreadcrumbName("Lead Details")

    async function loadLeadName() {
      try {
        const res = await fetch(`/api/leads/meta/${leadDetailId}`)
        const json = await res.json().catch(() => ({}))
        const name = typeof json.lead?.full_name === "string" ? json.lead.full_name.trim() : ""
        if (!cancelled) setLeadBreadcrumbName(name || "Lead Details")
      } catch {
        if (!cancelled) setLeadBreadcrumbName("Lead Details")
      }
    }

    loadLeadName()

    return () => {
      cancelled = true
    }
  }, [leadDetailId])

  // Follow-up notifications are derived from the shared, cached leads query —
  // the same one the leads page uses — so the nav no longer refetches every
  // navigation.
  const { data: metaLeads } = useMetaLeads<FollowUpLead>()

  React.useEffect(() => {
    const timer = window.setInterval(() => setFollowUpClock(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  React.useEffect(() => {
    if (!metaLeads) return
    const generated = buildFollowUpNotifications(metaLeads, followUpClock)

    setNotifications(previous => {
      const generatedIds = new Set(["followups-today", "followups-overdue"])
      const readById = new Map(previous.map(notification => [notification.id, notification.read]))
      const manualNotifications = previous.filter(notification => !generatedIds.has(notification.id))
      return [
        ...generated.map(notification => ({
          ...notification,
          read: readById.get(notification.id) ?? notification.read,
        })),
        ...manualNotifications,
      ]
    })
  }, [followUpClock, metaLeads])

  const breadcrumbs = React.useMemo(() => {
    return pathname.split("/").filter(Boolean).map((seg, i, arr) => {
      const path = "/" + arr.slice(0, i + 1).join("/")
      const fallbackName = pageNames[path] || seg.charAt(0).toUpperCase() + seg.slice(1)
      const name = leadDetailId && path === `/leads/${leadDetailId}` ? leadBreadcrumbName || "Lead Details" : fallbackName
      return { name, path }
    })
  }, [leadBreadcrumbName, leadDetailId, pathname])

  const markRead = (id: string) => setNotifications(p => p.map(n => n.id === id ? { ...n, read: true } : n))
  const markAllRead = () => setNotifications(p => p.map(n => ({ ...n, read: true })))
  const deleteOne = (id: string) => {
    setNotifications(p => p.filter(n => n.id !== id))
    if (selected?.id === id) setSelected(null)
  }
  const clearRead = () => setNotifications(p => p.filter(n => !n.read))

  const handleClick = (n: Notification) => {
    markRead(n.id)
    setSelected(n)
    setAssignedEmployee("")
  }

  const handleAction = (action: string) => {
    if (action === "open-followups") {
      router.push("/leads")
      closePanel()
      return
    }
    setSelected(null)
  }

  const closePanel = () => {
    setShowPanel(false)
    setSelected(null)
  }

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="sticky top-0 z-30 h-[60px] flex items-center justify-between gap-3 px-3 sm:px-4 lg:px-6"
        style={{
          background: "rgb(254 249 242 / 0.88)",
          backdropFilter: "blur(20px) saturate(180%)",
          borderBottom: "1px solid rgb(222 217 211 / 0.7)",
        }}
      >
        {/* Breadcrumbs */}
        <div className="flex min-w-0 flex-1 items-center gap-1.5">
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 md:hidden" onClick={onMenuClick}>
            <Menu className="h-4 w-4" />
          </Button>
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={crumb.path}>
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
              {i === breadcrumbs.length - 1 ? (
                <span className={cn(
                  "min-w-0 truncate text-sm font-semibold text-foreground",
                  i < breadcrumbs.length - 2 && "hidden sm:inline"
                )}>
                  {crumb.name}
                </span>
              ) : (
                <Link
                  href={crumb.path}
                  className={cn(
                    "min-w-0 truncate text-sm text-muted-foreground hover:text-foreground transition-colors",
                    i < breadcrumbs.length - 2 && "hidden sm:inline"
                  )}
                >
                  {crumb.name}
                </Link>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {/* Search */}
          <button
            onClick={onCommandPaletteOpen}
            className="hidden sm:flex items-center gap-2 h-8 w-64 px-3 rounded-lg text-sm transition-all duration-150"
            style={{
              background: "var(--color-muted)",
              border: "1px solid var(--color-border)",
              color: "var(--color-muted-foreground)",
            }}
          >
            <Search className="w-3.5 h-3.5 shrink-0" />
            <span className="min-w-0 flex-1 truncate whitespace-nowrap text-left text-[13px] leading-none">Search anything...</span>
            <kbd className="shrink-0 whitespace-nowrap text-[10px] font-mono px-1.5 py-0.5 rounded"
              style={{ background: "var(--color-card)", color: "var(--color-muted-foreground)", border: "1px solid var(--color-border)" }}>
              Ctrl + K
            </kbd>
          </button>

          {/* Reminders */}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowReminders(true)}>
            <ListTodo className="w-4 h-4" />
          </Button>

          {/* Quick Add */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" className="h-8 gap-1.5 px-3 text-[13px] font-medium gold-gradient text-primary-foreground shadow-gold-sm hover:shadow-gold border-0">
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Quick Add</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 shadow-luxury-lg">
              <DropdownMenuLabel className="text-[10px] text-muted-foreground tracking-widest uppercase">
                Create New
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {[
                { icon: Sparkles, label: "New Lead", color: "text-primary", onClick: () => router.push(`/leads?quickAdd=lead&t=${Date.now()}`) },
                { icon: Calendar, label: "Schedule Visit", color: "text-emerald-600", onClick: () => router.push(`/site-visits?quickAdd=visit&t=${Date.now()}`) },
                { icon: MessageSquare, label: "Send Message", color: "text-blue-600" },
                { icon: Clock, label: "Add Reminder", color: "text-primary", onClick: () => setShowReminders(true) },
              ].map(({ icon: Icon, label, color, onClick }) => (
                <DropdownMenuItem key={label} className="gap-2 cursor-pointer text-sm" onClick={onClick}>
                  <Icon className={cn("w-3.5 h-3.5", color)} />{label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Notifications */}
          <button
            onClick={() => setShowPanel(true)}
            className="relative h-8 w-8 flex items-center justify-center rounded-lg transition-colors hover:bg-muted"
          >
            <Bell className="w-4 h-4 text-muted-foreground" />
            <AnimatePresence>
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                  className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                  style={{ background: "var(--color-destructive)" }}
                >
                  {unreadCount}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.header>

      {/* â”€â”€ Notifications Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <AnimatePresence>
        {showPanel && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
              onClick={closePanel}
            />

            {/* Panel */}
            <motion.div
              key="panel"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
              className="fixed right-0 top-0 z-50 h-screen flex w-full max-w-full sm:w-auto"
              style={{ width: selected ? "min(840px, 100vw)" : "min(420px, 100vw)" }}
            >
              {/* Left: Notification List */}
              <div className={cn("h-full flex-col", selected ? "hidden sm:flex sm:w-[420px]" : "flex w-full sm:w-[420px]")}
                style={{ background: "var(--color-card)", borderLeft: "1px solid var(--color-border)" }}>

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 shrink-0"
                  style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg gold-gradient flex items-center justify-center">
                      <Bell className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div>
                      <h2 className="text-[15px] font-semibold leading-tight">Notifications</h2>
                      {unreadCount > 0 && (
                        <p className="text-[11px] text-muted-foreground">{unreadCount} unread</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button variant="ghost" size="sm" className="h-7 text-[11px] text-muted-foreground" onClick={markAllRead}>
                      <CheckCircle2 className="w-3 h-3 mr-1" />All read
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-[11px] text-muted-foreground" onClick={clearRead}>
                      <Trash2 className="w-3 h-3 mr-1" />Clear
                    </Button>
                    <button onClick={closePanel}
                      className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
                      <X className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>

                {/* Filter bar */}
                <div className="px-4 py-2.5 flex items-center gap-2 shrink-0"
                  style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <Tabs value={readFilter} onValueChange={v => setReadFilter(v as "all" | "unread")}>
                    <TabsList className="h-7 gap-0.5">
                      <TabsTrigger value="all" className="text-[11px] h-6 px-2.5">All</TabsTrigger>
                      <TabsTrigger value="unread" className="text-[11px] h-6 px-2.5">Unread</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 gap-1 text-[11px] ml-auto">
                        <Filter className="w-3 h-3" />
                        {typeFilter === "all" ? "All types" : typeFilter}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-36 shadow-luxury">
                      {["all", "lead", "message", "call", "booking", "visit", "system"].map(t => (
                        <DropdownMenuItem key={t} onClick={() => setTypeFilter(t)} className="text-xs capitalize">
                          {t === "all" ? "All Types" : t}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* List */}
                <ScrollArea className="flex-1">
                  <div className="py-2 px-2 space-y-0.5">
                    <AnimatePresence mode="popLayout">
                      {filtered.length > 0 ? filtered.map((n, idx) => {
                        const config = getTypeConfig(n.type)
                        const Icon = config.icon
                        const isSelected = selected?.id === n.id
                        return (
                          <motion.div
                            key={n.id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.97 }}
                            transition={{ delay: idx * 0.015 }}
                            onClick={() => handleClick(n)}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(n) } }}
                            role="button"
                            tabIndex={0}
                            className={cn(
                              "w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all duration-150 group",
                              isSelected
                                ? "bg-primary/8 border border-primary/20"
                                : !n.read
                                  ? "bg-primary/5 hover:bg-primary/8 border border-primary/10"
                                  : "hover:bg-muted/50 border border-transparent"
                            )}
                          >
                            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", config.bg)}>
                              <Icon className={cn("w-4 h-4", config.color)} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <p className={cn("text-[13px] truncate leading-snug",
                                  !n.read ? "font-semibold text-foreground" : "font-medium text-foreground/80")}>
                                  {n.title}
                                </p>
                                {n.priority === "high" && (
                                  <span className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-destructive/10 text-destructive">
                                    Urgent
                                  </span>
                                )}
                                {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                              </div>
                              <p className="text-[11px] text-muted-foreground line-clamp-1">{n.message}</p>
                              <div className="flex items-center justify-between mt-1">
                                <span className="text-[10px] text-muted-foreground/60">{n.time}</span>
                                {n.suggestedActions && (
                                  <span className="flex items-center gap-0.5 text-[9px] text-primary font-medium">
                                    <Zap className="w-2.5 h-2.5" />
                                    {n.suggestedActions.length} actions
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={e => { e.stopPropagation(); deleteOne(n.id) }}
                              className="opacity-0 group-hover:opacity-100 h-6 w-6 flex items-center justify-center rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all shrink-0">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </motion.div>
                        )
                      }) : (
                        <div className="text-center py-16">
                          <div className="w-12 h-12 rounded-xl bg-muted mx-auto flex items-center justify-center mb-3">
                            <Bell className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <p className="text-sm font-medium text-foreground/60">All caught up</p>
                          <p className="text-xs text-muted-foreground mt-1">No notifications to show</p>
                        </div>
                      )}
                    </AnimatePresence>
                  </div>
                </ScrollArea>
              </div>

              {/* Right: Action Panel */}
              <AnimatePresence>
                {selected && (
                  <motion.div
                    key="action-panel"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.22, ease: "easeOut" }}
                    className="h-full w-full flex flex-col sm:w-[420px]"
                    style={{
                      background: "var(--color-background)",
                      borderLeft: "1px solid var(--color-border)"
                    }}
                  >
                    {/* Action Panel Header */}
                    <div className="flex items-center justify-between px-5 py-4 shrink-0"
                      style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <div>
                        <h3 className="text-[15px] font-semibold">Quick Actions</h3>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Take action on this notification</p>
                      </div>
                      <button onClick={() => setSelected(null)}
                        className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
                        <X className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </div>

                    <ScrollArea className="flex-1">
                      <div className="p-5 space-y-5">

                        {/* Lead Card */}
                        {selected.leadData && (
                          <div className="rounded-xl p-4 space-y-3"
                            style={{
                              background: "linear-gradient(135deg, rgb(194 65 12 / 0.08) 0%, transparent 100%)",
                              border: "1px solid rgb(194 65 12 / 0.18)"
                            }}>
                            <div className="flex items-start gap-3">
                              <Avatar className="h-11 w-11 shrink-0" style={{ border: "2px solid rgb(194 65 12 / 0.28)" }}>
                                <AvatarFallback className="text-[13px] font-bold"
                                  style={{ background: "rgb(194 65 12 / 0.10)", color: "var(--color-primary)" }}>
                                  {selected.leadData.name.split(" ").map(n => n[0]).join("")}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <h4 className="text-[15px] font-bold leading-tight">{selected.leadData.name}</h4>
                                  {selected.leadData.tags?.includes("vip") && (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                      style={{ background: "rgb(217 119 6 / 0.14)", color: "var(--color-warning)" }}>
                                      VIP
                                    </span>
                                  )}
                                  {selected.leadData.tags?.includes("hot") && (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                      style={{ background: "rgb(185 28 28 / 0.10)", color: "var(--color-destructive)" }}>
                                      HOT
                                    </span>
                                  )}
                                </div>
                                <ProtectedPhone value={selected.leadData.phone} className="block text-[12px] text-muted-foreground" />
                              </div>
                              {selected.leadData.aiScore && (
                                <div className="flex flex-col items-center justify-center w-12 h-12 rounded-xl shrink-0"
                                  style={{ background: "rgb(194 65 12 / 0.10)", border: "1px solid rgb(194 65 12 / 0.20)" }}>
                                  <span className="text-[17px] font-bold leading-none gold-text">{selected.leadData.aiScore}</span>
                                  <span className="text-[8px] text-muted-foreground mt-0.5">AI Score</span>
                                </div>
                              )}
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              {[
                                { icon: Building2, label: selected.leadData.propertyInterest, color: "text-primary" },
                                { icon: IndianRupee, label: selected.leadData.budget, color: "text-emerald-600" },
                                { icon: MapPin, label: selected.leadData.location, color: "text-rose-500" },
                              ].filter(i => i.label).map(({ icon: Icon, label, color }) => (
                                <div key={label} className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
                                  <Icon className={cn("w-3.5 h-3.5 shrink-0", color)} />
                                  <span>{label}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Assign Employee */}
                        {selected.suggestedActions?.some(a => a.action === "assign") && (
                          <div className="space-y-2">
                            <p className="text-[13px] font-semibold">Assign to Employee</p>
                            <SearchableSelect
                              value={assignedEmployee}
                              onValueChange={setAssignedEmployee}
                              options={activeEmployees.map(emp => ({
                                value: emp.id,
                                searchText: `${emp.name} ${emp.role}`,
                                label: (
                                  <span className="flex min-w-0 items-center gap-2">
                                    <Avatar className="h-5 w-5">
                                      <AvatarImage src={emp.avatar} />
                                      <AvatarFallback className="text-[8px]">
                                        {emp.name.split(" ").map(n => n[0]).join("")}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="truncate text-[13px]">{emp.name}</span>
                                    <span className="truncate text-[10px] text-muted-foreground capitalize">{emp.role.replace('_', ' ')}</span>
                                  </span>
                                ),
                              }))}
                              placeholder="Select employee..."
                              searchPlaceholder="Search employee..."
                              triggerClassName="h-9 text-sm"
                              contentClassName="shadow-luxury-lg"
                            />
                          </div>
                        )}

                        {/* Suggested Actions */}
                        {selected.suggestedActions && selected.suggestedActions.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-[13px] font-semibold">Suggested Actions</p>
                            <div className="space-y-1.5">
                              {selected.suggestedActions.map((action, i) => (
                                <motion.div key={i}
                                  initial={{ opacity: 0, y: 4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ delay: i * 0.04 }}>
                                  <ActionButton action={action} onClick={handleAction} />
                                </motion.div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* View Lead link */}
                        {selected.actionUrl && (
                          <Link href={selected.actionUrl}
                            onClick={closePanel}
                            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-[13px] font-medium border border-border hover:bg-muted/50 transition-colors">
                            <ExternalLink className="w-4 h-4" />
                            Open Full Profile
                          </Link>
                        )}
                      </div>
                    </ScrollArea>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ReminderDialog open={showReminders} onOpenChange={setShowReminders} />
    </>
  )
}


