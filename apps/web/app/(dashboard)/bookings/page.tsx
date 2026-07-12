"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  AlertCircle,
  ArrowDownUp,
  ArrowRight,
  BadgeIndianRupee,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Clock3,
  Download,
  FileSpreadsheet,
  IndianRupee,
  Loader2,
  Mail,
  MapPin,
  Percent,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  UserRound,
  UsersRound,
  XCircle,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { ProtectedPhone } from "@/components/security/protected-phone"
import { getAuthUser, type AuthUser } from "@/lib/auth/cookies"
import { cn } from "@/lib/utils"

type BookingStatus = "confirmed" | "pending" | "cancelled"
type StatusFilter = "all" | BookingStatus
type SortOption = "newest" | "oldest" | "value_high" | "value_low"

interface Profile {
  id: string | null
  full_name: string | null
  email?: string | null
}

interface BookingLead {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  city: string | null
  campaign_name: string | null
  status: string
  assigned_to: string | null
  assigned_to_profile?: Profile | null
}

interface BookingProperty {
  id: string
  name: string
  type: string
  location: string
  area: string | null
  price: string | number
  pricePerSqft?: string | number | null
  status: string
  developer?: string | null
  completionDate?: string | null
  bedrooms?: number | null
  bathrooms?: number | null
  sqft?: number | null
}

interface Booking {
  id: string
  lead_id: string
  property_id: string
  assigned_to: string | null
  amount: number
  commission: number
  status: BookingStatus
  booked_at: string
  created_at: string
  updated_at: string
  lead: BookingLead | null
  property: BookingProperty | null
  assigned_employee: Profile | null
}

type LeadOption = BookingLead

interface EmployeeOption {
  id: string
  full_name: string | null
  email: string | null
}

interface CreateForm {
  leadId: string
  propertyId: string
  assignedTo: string
  amount: string
  commissionPercent: string
  bookedAt: string
  status: "pending" | "confirmed"
}

const STATUS_META: Record<BookingStatus, {
  label: string
  description: string
  icon: typeof CheckCircle2
  className: string
  dotClassName: string
}> = {
  confirmed: {
    label: "Confirmed",
    description: "Deal secured",
    icon: CheckCircle2,
    className: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    dotClassName: "bg-emerald-500",
  },
  pending: {
    label: "Pending",
    description: "Needs action",
    icon: Clock3,
    className: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    dotClassName: "bg-amber-500",
  },
  cancelled: {
    label: "Cancelled",
    description: "Deal closed",
    icon: XCircle,
    className: "border-red-500/25 bg-red-500/10 text-red-700 dark:text-red-300",
    dotClassName: "bg-red-500",
  },
}

const EMPTY_FORM: CreateForm = {
  leadId: "",
  propertyId: "",
  assignedTo: "",
  amount: "",
  commissionPercent: "2.5",
  bookedAt: "",
  status: "pending",
}

const moneyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
})

function formatMoney(value: number) {
  if (!Number.isFinite(value)) return "₹0"
  if (Math.abs(value) >= 10_000_000) return `₹${(value / 10_000_000).toFixed(value % 10_000_000 === 0 ? 0 : 2)} Cr`
  if (Math.abs(value) >= 100_000) return `₹${(value / 100_000).toFixed(value % 100_000 === 0 ? 0 : 1)} L`
  return moneyFormatter.format(value)
}

function formatDate(value: string, withTime = false) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "—"
  return (withTime ? new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }) : new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })).format(date)
}

function initials(name?: string | null) {
  if (!name) return "?"
  return name.split(/\s+/).filter(Boolean).map(part => part[0]).join("").toUpperCase().slice(0, 2)
}

function bookingReference(id: string) {
  return `PKR-${id.replaceAll("-", "").slice(0, 8).toUpperCase()}`
}

async function readResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    const message = Array.isArray(data?.message) ? data.message.join(", ") : data?.message ?? data?.error
    throw new Error(message || `Request failed (${response.status})`)
  }
  return data as T
}

function StatusBadge({ status }: { status: BookingStatus }) {
  const meta = STATUS_META[status]
  const Icon = meta.icon
  return (
    <Badge variant="outline" className={cn("gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold", meta.className)}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </Badge>
  )
}

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string
  value: string
  hint: string
  icon: typeof IndianRupee
  tone: "gold" | "green" | "blue" | "slate"
}) {
  const tones = {
    gold: "bg-primary/10 text-primary border-primary/15",
    green: "bg-emerald-500/10 text-emerald-700 border-emerald-500/15 dark:text-emerald-300",
    blue: "bg-blue-500/10 text-blue-700 border-blue-500/15 dark:text-blue-300",
    slate: "bg-muted text-foreground border-border",
  }
  return (
    <Card className="gap-0 overflow-hidden border-border/60 py-0 shadow-sm">
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-2 truncate text-2xl font-semibold tracking-tight text-foreground">{value}</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
          </div>
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", tones[tone])}>
            <Icon className="h-4.5 w-4.5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function LoadingState() {
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map(item => <Skeleton key={item} className="h-32 rounded-xl" />)}
      </div>
      <Skeleton className="h-64 rounded-xl" />
      <Skeleton className="h-72 rounded-xl" />
    </div>
  )
}

function CreateBookingDialog({
  open,
  onOpenChange,
  leads,
  properties,
  employees,
  saving,
  onCreate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  leads: LeadOption[]
  properties: BookingProperty[]
  employees: EmployeeOption[]
  saving: boolean
  onCreate: (form: CreateForm) => Promise<void>
}) {
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM)
  const amount = Number(form.amount) || 0
  const percentage = Number(form.commissionPercent) || 0
  const commission = amount * percentage / 100

  useEffect(() => {
    if (!open) return
    setForm({ ...EMPTY_FORM, bookedAt: new Date().toISOString().slice(0, 10) })
  }, [open])

  function selectLead(leadId: string) {
    const lead = leads.find(item => item.id === leadId)
    setForm(current => ({
      ...current,
      leadId,
      assignedTo: lead?.assigned_to ?? current.assignedTo,
    }))
  }

  const isValid = Boolean(form.leadId && form.propertyId && amount > 0 && percentage >= 0 && form.bookedAt)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <div className="mx-auto mb-1 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary sm:mx-0">
            <BadgeIndianRupee className="h-5 w-5" />
          </div>
          <DialogTitle className="text-xl">Record a booking</DialogTitle>
          <DialogDescription>Connect the client, property, deal value, and responsible advisor in one record.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-5 py-2">
          <div className="grid gap-2">
            <Label>Client <span className="text-destructive">*</span></Label>
            <SearchableSelect
              value={form.leadId}
              onValueChange={selectLead}
              placeholder={leads.length ? "Select a client" : "No eligible leads found"}
              searchPlaceholder="Search by name, phone, or city..."
              emptyMessage="No matching client found."
              options={leads.map(lead => ({
                value: lead.id,
                searchText: `${lead.full_name ?? ""} ${lead.phone ?? ""} ${lead.city ?? ""}`,
                label: (
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-medium">{lead.full_name ?? "Unnamed lead"}</span>
                    {lead.city && <span className="truncate text-xs text-muted-foreground">· {lead.city}</span>}
                  </span>
                ),
              }))}
            />
          </div>

          <div className="grid gap-2">
            <Label>Property <span className="text-destructive">*</span></Label>
            <SearchableSelect
              value={form.propertyId}
              onValueChange={propertyId => setForm(current => ({ ...current, propertyId }))}
              placeholder={properties.length ? "Select a property" : "No bookable properties found"}
              searchPlaceholder="Search property, location, or developer..."
              emptyMessage="No matching property found."
              options={properties.map(property => ({
                value: property.id,
                searchText: `${property.name} ${property.location} ${property.area ?? ""} ${property.developer ?? ""}`,
                label: (
                  <span className="flex min-w-0 items-center justify-between gap-3">
                    <span className="truncate font-medium">{property.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{formatMoney(Number(property.price))}</span>
                  </span>
                ),
              }))}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="booking-value">Deal value <span className="text-destructive">*</span></Label>
              <div className="relative">
                <IndianRupee className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="booking-value"
                  type="number"
                  min="1"
                  step="10000"
                  value={form.amount}
                  onChange={event => setForm(current => ({ ...current, amount: event.target.value }))}
                  className="pl-9"
                  placeholder="e.g. 25000000"
                />
              </div>
              {amount > 0 && <p className="text-xs font-medium text-primary">{formatMoney(amount)}</p>}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="commission-rate">Commission rate</Label>
              <div className="relative">
                <Input
                  id="commission-rate"
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={form.commissionPercent}
                  onChange={event => setForm(current => ({ ...current, commissionPercent: event.target.value }))}
                  className="pr-9"
                />
                <Percent className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              </div>
              <p className="text-xs text-muted-foreground">Projected commission: <span className="font-medium text-foreground">{formatMoney(commission)}</span></p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2 sm:col-span-1">
              <Label htmlFor="booking-date">Booking date</Label>
              <Input
                id="booking-date"
                type="date"
                value={form.bookedAt}
                onChange={event => setForm(current => ({ ...current, bookedAt: event.target.value }))}
              />
            </div>
            <div className="grid gap-2 sm:col-span-1">
              <Label>Initial status</Label>
              <Select value={form.status} onValueChange={(status: "pending" | "confirmed") => setForm(current => ({ ...current, status }))}>
                <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending confirmation</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 sm:col-span-1">
              <Label>Advisor</Label>
              <SearchableSelect
                value={form.assignedTo}
                onValueChange={assignedTo => setForm(current => ({ ...current, assignedTo }))}
                placeholder="Unassigned"
                searchPlaceholder="Search advisor..."
                options={employees.map(employee => ({
                  value: employee.id,
                  searchText: `${employee.full_name ?? ""} ${employee.email ?? ""}`,
                  label: employee.full_name ?? employee.email ?? "Unnamed advisor",
                }))}
              />
            </div>
          </div>

          <div className="rounded-xl border border-primary/15 bg-primary/[0.04] p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Revenue snapshot</p>
                <p className="mt-1 text-lg font-semibold">{formatMoney(amount)}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
              <div className="text-right">
                <p className="text-xs font-medium text-muted-foreground">Projected commission</p>
                <p className="mt-1 text-lg font-semibold text-primary">{formatMoney(commission)}</p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <Button onClick={() => onCreate(form)} disabled={!isValid || saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {saving ? "Saving booking..." : "Create booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function BookingDetailDialog({
  booking,
  isAdmin,
  updating,
  onClose,
  onStatusChange,
}: {
  booking: Booking | null
  isAdmin: boolean
  updating: boolean
  onClose: () => void
  onStatusChange: (status: BookingStatus) => Promise<void>
}) {
  if (!booking) return null
  const lead = booking.lead
  const property = booking.property
  const percentage = booking.amount > 0 ? booking.commission / booking.amount * 100 : 0

  return (
    <Dialog open={Boolean(booking)} onOpenChange={open => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto p-0 sm:max-w-3xl">
        <div className="border-b bg-[linear-gradient(135deg,var(--color-card),color-mix(in_oklab,var(--color-primary)_8%,var(--color-card)))] p-6 sm:p-7">
          <DialogHeader>
            <div className="flex flex-col gap-4 pr-8 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
                  <Building2 className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary">{bookingReference(booking.id)}</p>
                  <DialogTitle className="truncate text-xl sm:text-2xl">{property?.name ?? "Property booking"}</DialogTitle>
                  <DialogDescription className="mt-1 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" />
                    {[property?.location, property?.area].filter(Boolean).join(", ") || "Location unavailable"}
                  </DialogDescription>
                </div>
              </div>
              <StatusBadge status={booking.status} />
            </div>
          </DialogHeader>
        </div>

        <div className="space-y-6 p-6 sm:p-7">
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Deal value</p>
              <p className="mt-1.5 text-xl font-semibold">{formatMoney(booking.amount)}</p>
            </div>
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Commission ({percentage.toFixed(1)}%)</p>
              <p className="mt-1.5 text-xl font-semibold text-primary">{formatMoney(booking.commission)}</p>
            </div>
            <div className="rounded-xl border bg-muted/30 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Booked on</p>
              <p className="mt-1.5 text-base font-semibold">{formatDate(booking.booked_at)}</p>
            </div>
          </div>

          <div>
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Booking progress</p>
              <p className="text-xs text-muted-foreground">Updated {formatDate(booking.updated_at, true)}</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(["pending", "confirmed", "cancelled"] as BookingStatus[]).map(status => {
                const meta = STATUS_META[status]
                const active = booking.status === status
                return (
                  <div key={status} className={cn("rounded-xl border p-3 transition-colors", active ? meta.className : "bg-muted/20 text-muted-foreground")}>
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full", active ? meta.dotClassName : "bg-border")} />
                      <span className="text-xs font-semibold">{meta.label}</span>
                    </div>
                    <p className="mt-1 hidden text-[10px] opacity-80 sm:block">{meta.description}</p>
                  </div>
                )
              })}
            </div>
          </div>

          <Separator />

          <div className="grid gap-6 sm:grid-cols-2">
            <section>
              <div className="mb-4 flex items-center gap-2">
                <UserRound className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Client</h3>
              </div>
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11">
                  <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials(lead?.full_name)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{lead?.full_name ?? "Unnamed client"}</p>
                  <p className="truncate text-xs text-muted-foreground">{lead?.campaign_name ?? lead?.city ?? "CRM lead"}</p>
                </div>
              </div>
              <div className="mt-4 space-y-2.5 text-sm">
                {lead?.phone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" />
                    <ProtectedPhone value={lead.phone}>{lead.phone}</ProtectedPhone>
                  </div>
                )}
                {lead?.email && <div className="flex items-center gap-2 text-muted-foreground"><Mail className="h-3.5 w-3.5" /><span className="truncate">{lead.email}</span></div>}
                {lead?.city && <div className="flex items-center gap-2 text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{lead.city}</div>}
              </div>
              {lead && (
                <Button asChild variant="link" className="mt-3 h-auto p-0 text-xs">
                  <Link href={`/leads/${lead.id}`}>Open client record <ChevronRight className="h-3.5 w-3.5" /></Link>
                </Button>
              )}
            </section>

            <section>
              <div className="mb-4 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Property & ownership</h3>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-start justify-between gap-4">
                  <span className="text-muted-foreground">Property</span>
                  <span className="text-right font-medium">{property?.name ?? "—"}</span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-muted-foreground">Type</span>
                  <span className="text-right font-medium capitalize">{property?.type ?? "—"}</span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-muted-foreground">Listed price</span>
                  <span className="text-right font-medium">{property ? formatMoney(Number(property.price)) : "—"}</span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span className="text-muted-foreground">Advisor</span>
                  <span className="text-right font-medium">{booking.assigned_employee?.full_name ?? "Unassigned"}</span>
                </div>
              </div>
            </section>
          </div>

          {isAdmin && (
            <div className="rounded-xl border bg-muted/20 p-4">
              <div className="mb-3">
                <p className="text-sm font-semibold">Update booking status</p>
                <p className="mt-0.5 text-xs text-muted-foreground">Every status change is saved to the client’s CRM activity timeline.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant={booking.status === "pending" ? "secondary" : "outline"} disabled={updating || booking.status === "pending"} onClick={() => onStatusChange("pending")}>
                  <Clock3 className="h-3.5 w-3.5" />Pending
                </Button>
                <Button size="sm" variant={booking.status === "confirmed" ? "secondary" : "default"} disabled={updating || booking.status === "confirmed"} onClick={() => onStatusChange("confirmed")}>
                  {updating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}Confirm
                </Button>
                <Button size="sm" variant="outline" className="border-destructive/30 text-destructive hover:bg-destructive/10" disabled={updating || booking.status === "cancelled"} onClick={() => onStatusChange("cancelled")}>
                  <XCircle className="h-3.5 w-3.5" />Cancel booking
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function BookingsPage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [leads, setLeads] = useState<LeadOption[]>([])
  const [properties, setProperties] = useState<BookingProperty[]>([])
  const [employees, setEmployees] = useState<EmployeeOption[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")
  const [ownerFilter, setOwnerFilter] = useState("all")
  const [sort, setSort] = useState<SortOption>("newest")
  const [createOpen, setCreateOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [updating, setUpdating] = useState(false)
  const isAdmin = user?.role === "super_admin"

  const loadBookings = useCallback(async (quiet = false) => {
    if (quiet) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/bookings", { cache: "no-store" })
      const data = await readResponse<{ bookings?: Booking[] } | Booking[]>(response)
      setBookings(Array.isArray(data) ? data : data.bookings ?? [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load bookings")
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  const loadFormOptions = useCallback(async () => {
    try {
      const [leadResponse, propertyResponse, employeeResponse] = await Promise.all([
        fetch("/api/leads/meta", { cache: "no-store" }),
        fetch("/api/properties", { cache: "no-store" }),
        fetch("/api/employees", { cache: "no-store" }),
      ])
      const [leadData, propertyData, employeeData] = await Promise.all([
        readResponse<{ leads?: LeadOption[] }>(leadResponse),
        readResponse<BookingProperty[] | { properties?: BookingProperty[] }>(propertyResponse),
        readResponse<{ employees?: EmployeeOption[] }>(employeeResponse),
      ])
      setLeads((leadData.leads ?? []).filter(lead => lead.id && lead.status !== "rejected"))
      const propertyRows = Array.isArray(propertyData) ? propertyData : propertyData.properties ?? []
      setProperties(propertyRows.filter(property => property.status !== "sold"))
      setEmployees(employeeData.employees ?? [])
    } catch (optionError) {
      setError(optionError instanceof Error ? optionError.message : "Could not load booking form options")
    }
  }, [])

  useEffect(() => {
    const authUser = getAuthUser()
    setUser(authUser)
    void loadBookings()
    if (authUser?.role === "super_admin") void loadFormOptions()
  }, [loadBookings, loadFormOptions])

  useEffect(() => {
    if (!notice) return
    const timer = window.setTimeout(() => setNotice(null), 4000)
    return () => window.clearTimeout(timer)
  }, [notice])

  const counts = useMemo(() => ({
    all: bookings.length,
    confirmed: bookings.filter(booking => booking.status === "confirmed").length,
    pending: bookings.filter(booking => booking.status === "pending").length,
    cancelled: bookings.filter(booking => booking.status === "cancelled").length,
  }), [bookings])

  const metrics = useMemo(() => {
    const confirmed = bookings.filter(booking => booking.status === "confirmed")
    const pending = bookings.filter(booking => booking.status === "pending")
    const closed = confirmed.length + bookings.filter(booking => booking.status === "cancelled").length
    return {
      confirmedValue: confirmed.reduce((sum, booking) => sum + booking.amount, 0),
      pipelineValue: pending.reduce((sum, booking) => sum + booking.amount, 0),
      commission: confirmed.reduce((sum, booking) => sum + booking.commission, 0),
      confirmationRate: closed ? confirmed.length / closed * 100 : 0,
    }
  }, [bookings])

  const monthlySeries = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1)
      const value = bookings
        .filter(booking => {
          const booked = new Date(booking.booked_at)
          return booking.status === "confirmed" && booked.getFullYear() === date.getFullYear() && booked.getMonth() === date.getMonth()
        })
        .reduce((sum, booking) => sum + booking.amount, 0)
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: date.toLocaleDateString("en-IN", { month: "short" }),
        value,
      }
    })
  }, [bookings])

  const maxMonthlyValue = Math.max(...monthlySeries.map(item => item.value), 1)

  const ownerOptions = useMemo(() => {
    const map = new Map<string, string>()
    bookings.forEach(booking => {
      if (booking.assigned_employee?.id) map.set(booking.assigned_employee.id, booking.assigned_employee.full_name ?? "Unnamed advisor")
    })
    employees.forEach(employee => map.set(employee.id, employee.full_name ?? employee.email ?? "Unnamed advisor"))
    return Array.from(map.entries()).map(([value, label]) => ({ value, label, searchText: label }))
  }, [bookings, employees])

  const filteredBookings = useMemo(() => {
    const query = search.trim().toLowerCase()
    const rows = bookings.filter(booking => {
      if (statusFilter !== "all" && booking.status !== statusFilter) return false
      if (ownerFilter !== "all" && booking.assigned_to !== ownerFilter) return false
      if (!query) return true
      const haystack = [
        bookingReference(booking.id),
        booking.lead?.full_name,
        booking.lead?.phone,
        booking.lead?.email,
        booking.property?.name,
        booking.property?.location,
        booking.assigned_employee?.full_name,
      ].filter(Boolean).join(" ").toLowerCase()
      return haystack.includes(query)
    })
    return rows.sort((a, b) => {
      if (sort === "oldest") return new Date(a.booked_at).getTime() - new Date(b.booked_at).getTime()
      if (sort === "value_high") return b.amount - a.amount
      if (sort === "value_low") return a.amount - b.amount
      return new Date(b.booked_at).getTime() - new Date(a.booked_at).getTime()
    })
  }, [bookings, ownerFilter, search, sort, statusFilter])

  async function createBooking(form: CreateForm) {
    setCreating(true)
    setError(null)
    try {
      const amount = Number(form.amount)
      const commission = amount * (Number(form.commissionPercent) || 0) / 100
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead_id: form.leadId,
          property_id: form.propertyId,
          amount,
          commission,
          ...(form.assignedTo ? { assigned_to: form.assignedTo } : {}),
          status: form.status,
          booked_at: new Date(`${form.bookedAt}T12:00:00+05:30`).toISOString(),
        }),
      })
      const data = await readResponse<{ booking: Booking }>(response)
      setBookings(current => [data.booking, ...current])
      setCreateOpen(false)
      setNotice(`${bookingReference(data.booking.id)} was created successfully.`)
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Could not create booking")
    } finally {
      setCreating(false)
    }
  }

  async function updateStatus(status: BookingStatus) {
    if (!selectedBooking) return
    setUpdating(true)
    setError(null)
    try {
      const response = await fetch(`/api/bookings/${selectedBooking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      })
      const data = await readResponse<{ booking: Booking }>(response)
      setBookings(current => current.map(booking => booking.id === data.booking.id ? data.booking : booking))
      setSelectedBooking(data.booking)
      setNotice(`${bookingReference(data.booking.id)} is now ${STATUS_META[status].label.toLowerCase()}.`)
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not update booking")
    } finally {
      setUpdating(false)
    }
  }

  function exportBookings() {
    if (!isAdmin || filteredBookings.length === 0) return
    const headers = ["Booking ID", "Client", "Property", "Advisor", "Booked At", "Status", "Deal Value", "Commission"]
    const rows = filteredBookings.map(booking => [
      bookingReference(booking.id),
      booking.lead?.full_name ?? "",
      booking.property?.name ?? "",
      booking.assigned_employee?.full_name ?? "",
      booking.booked_at,
      booking.status,
      booking.amount,
      booking.commission,
    ])
    const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`
    const csv = [headers, ...rows].map(row => row.map(escape).join(",")).join("\n")
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = `pikorua-bookings-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6 pb-8">
      <header className="relative overflow-hidden rounded-2xl border border-primary/15 bg-card px-5 py-6 shadow-sm sm:px-7 sm:py-7">
        <div className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
              <Sparkles className="h-3.5 w-3.5" />Revenue operations
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Bookings</h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              Manage every property booking from initial commitment to confirmation, with clear ownership and live revenue visibility.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => void loadBookings(true)} disabled={refreshing}>
              <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
              Refresh
            </Button>
            {isAdmin && (
              <Button variant="outline" onClick={exportBookings} disabled={!filteredBookings.length}>
                <Download className="h-4 w-4" />Export
              </Button>
            )}
            {isAdmin && (
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4" />New booking
              </Button>
            )}
          </div>
        </div>
      </header>

      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">
          <CheckCircle2 className="h-4 w-4 shrink-0" />{notice}
        </div>
      )}
      {error && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span className="flex items-start gap-2"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</span>
          <button type="button" className="shrink-0 text-xs font-semibold hover:underline" onClick={() => setError(null)}>Dismiss</button>
        </div>
      )}

      {loading ? <LoadingState /> : (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <MetricCard label="Confirmed value" value={formatMoney(metrics.confirmedValue)} hint={`${counts.confirmed} secured ${counts.confirmed === 1 ? "booking" : "bookings"}`} icon={BadgeIndianRupee} tone="gold" />
            <MetricCard label="Pending pipeline" value={formatMoney(metrics.pipelineValue)} hint={`${counts.pending} awaiting confirmation`} icon={Clock3} tone="blue" />
            <MetricCard label="Confirmed commission" value={formatMoney(metrics.commission)} hint="Projected earnings on secured deals" icon={Percent} tone="green" />
            <MetricCard label="Confirmation rate" value={`${metrics.confirmationRate.toFixed(0)}%`} hint="Confirmed out of closed outcomes" icon={TrendingUp} tone="slate" />
          </section>

          <section className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
            <Card className="border-border/60 shadow-sm">
              <CardContent className="p-5 sm:p-6">
                <div className="mb-6 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-semibold">Confirmed booking value</h2>
                    <p className="mt-1 text-xs text-muted-foreground">Last six months</p>
                  </div>
                  <div className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{formatMoney(metrics.confirmedValue)}</div>
                </div>
                <div className="flex h-40 items-end gap-2 sm:gap-4">
                  {monthlySeries.map(item => {
                    const height = item.value ? Math.max(item.value / maxMonthlyValue * 100, 8) : 3
                    return (
                      <div key={item.key} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                        <div className="group relative flex h-full w-full items-end justify-center">
                          <div className="absolute bottom-[calc(var(--bar-height)+6px)] z-10 hidden whitespace-nowrap rounded-md border bg-popover px-2 py-1 text-[10px] font-medium shadow-sm group-hover:block" style={{ "--bar-height": `${height}%` } as React.CSSProperties}>
                            {formatMoney(item.value)}
                          </div>
                          <div className="w-full max-w-12 rounded-t-md bg-gradient-to-t from-primary to-primary/55 transition-all duration-500" style={{ height: `${height}%`, opacity: item.value ? 1 : 0.25 }} />
                        </div>
                        <span className="text-[10px] font-medium text-muted-foreground">{item.label}</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/60 shadow-sm">
              <CardContent className="p-5 sm:p-6">
                <div className="mb-5">
                  <h2 className="text-sm font-semibold">Booking health</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Current deal distribution</p>
                </div>
                <div className="space-y-4">
                  {(["confirmed", "pending", "cancelled"] as BookingStatus[]).map(status => {
                    const meta = STATUS_META[status]
                    const count = counts[status]
                    const percentage = counts.all ? count / counts.all * 100 : 0
                    return (
                      <div key={status}>
                        <div className="mb-2 flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2 font-medium"><span className={cn("h-2 w-2 rounded-full", meta.dotClassName)} />{meta.label}</span>
                          <span className="text-muted-foreground">{count} · {percentage.toFixed(0)}%</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                          <div className={cn("h-full rounded-full", meta.dotClassName)} style={{ width: `${percentage}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-6 rounded-xl border border-amber-500/15 bg-amber-500/[0.07] p-3.5">
                  <div className="flex items-start gap-3">
                    <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                    <div>
                      <p className="text-xs font-semibold">{counts.pending ? `${counts.pending} ${counts.pending === 1 ? "deal needs" : "deals need"} attention` : "Pipeline is clear"}</p>
                      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{counts.pending ? `${formatMoney(metrics.pipelineValue)} is still awaiting confirmation.` : "There are no pending bookings right now."}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <section>
            <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h2 className="text-base font-semibold">Booking register</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">{filteredBookings.length} of {bookings.length} bookings shown</p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <div className="relative min-w-0 sm:w-64">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search client, property, ID..." className="pl-9" />
                </div>
                {isAdmin && ownerOptions.length > 0 && (
                  <SearchableSelect
                    value={ownerFilter}
                    onValueChange={setOwnerFilter}
                    placeholder="All advisors"
                    searchPlaceholder="Search advisor..."
                    className="sm:w-44"
                    options={[{ value: "all", label: "All advisors" }, ...ownerOptions]}
                  />
                )}
                <Select value={sort} onValueChange={(value: SortOption) => setSort(value)}>
                  <SelectTrigger className="w-full sm:w-40"><ArrowDownUp className="h-3.5 w-3.5" /><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest first</SelectItem>
                    <SelectItem value="oldest">Oldest first</SelectItem>
                    <SelectItem value="value_high">Highest value</SelectItem>
                    <SelectItem value="value_low">Lowest value</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="mb-4 flex gap-1 overflow-x-auto rounded-xl border bg-muted/35 p-1">
              {(["all", "pending", "confirmed", "cancelled"] as StatusFilter[]).map(status => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={cn(
                    "flex min-w-max items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-colors",
                    statusFilter === status ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <span className="capitalize">{status}</span>
                  <span className={cn("rounded-full px-1.5 py-0.5 text-[10px]", statusFilter === status ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>{counts[status]}</span>
                </button>
              ))}
            </div>

            {filteredBookings.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><FileSpreadsheet className="h-6 w-6" /></div>
                  <h3 className="mt-4 text-sm font-semibold">{bookings.length ? "No bookings match these filters" : "No bookings recorded yet"}</h3>
                  <p className="mt-1 max-w-md text-xs leading-relaxed text-muted-foreground">
                    {bookings.length ? "Try clearing the search or changing the status and advisor filters." : isAdmin ? "Create the first booking to start the live revenue register." : "Bookings assigned to you will appear here."}
                  </p>
                  {isAdmin && !bookings.length && <Button className="mt-4" size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />Create first booking</Button>}
                </CardContent>
              </Card>
            ) : (
              <Card className="overflow-hidden border-border/60 shadow-sm">
                <div className="hidden overflow-x-auto md:block">
                  <table className="w-full text-left">
                    <thead className="border-b bg-muted/35 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-5 py-3">Booking</th>
                        <th className="px-5 py-3">Client</th>
                        <th className="px-5 py-3">Advisor</th>
                        <th className="px-5 py-3">Booked</th>
                        <th className="px-5 py-3 text-right">Deal value</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="w-10 px-3 py-3"><span className="sr-only">Details</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/70">
                      {filteredBookings.map(booking => (
                        <tr key={booking.id} className="group cursor-pointer transition-colors hover:bg-muted/30" onClick={() => setSelectedBooking(booking)}>
                          <td className="px-5 py-4">
                            <p className="max-w-52 truncate text-sm font-semibold">{booking.property?.name ?? "Property booking"}</p>
                            <p className="mt-0.5 text-[10px] font-medium tracking-wide text-primary">{bookingReference(booking.id)}</p>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary/10 text-[10px] font-semibold text-primary">{initials(booking.lead?.full_name)}</AvatarFallback></Avatar>
                              <div className="min-w-0"><p className="max-w-36 truncate text-xs font-medium">{booking.lead?.full_name ?? "Unnamed client"}</p><p className="max-w-36 truncate text-[10px] text-muted-foreground">{booking.lead?.city ?? booking.lead?.campaign_name ?? "—"}</p></div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-xs text-muted-foreground">{booking.assigned_employee?.full_name ?? "Unassigned"}</td>
                          <td className="px-5 py-4 text-xs text-muted-foreground">{formatDate(booking.booked_at)}</td>
                          <td className="px-5 py-4 text-right"><p className="text-sm font-semibold">{formatMoney(booking.amount)}</p><p className="text-[10px] text-muted-foreground">{formatMoney(booking.commission)} comm.</p></td>
                          <td className="px-5 py-4"><StatusBadge status={booking.status} /></td>
                          <td className="px-3 py-4"><ChevronRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="divide-y md:hidden">
                  {filteredBookings.map(booking => (
                    <button key={booking.id} type="button" onClick={() => setSelectedBooking(booking)} className="w-full p-4 text-left transition-colors hover:bg-muted/30">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0"><p className="truncate text-sm font-semibold">{booking.property?.name ?? "Property booking"}</p><p className="mt-0.5 text-[10px] font-medium tracking-wide text-primary">{bookingReference(booking.id)}</p></div>
                        <StatusBadge status={booking.status} />
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                        <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Client</p><p className="mt-1 truncate font-medium">{booking.lead?.full_name ?? "Unnamed client"}</p></div>
                        <div className="text-right"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Deal value</p><p className="mt-1 font-semibold">{formatMoney(booking.amount)}</p></div>
                        <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Advisor</p><p className="mt-1 truncate text-muted-foreground">{booking.assigned_employee?.full_name ?? "Unassigned"}</p></div>
                        <div className="text-right"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">Booked</p><p className="mt-1 text-muted-foreground">{formatDate(booking.booked_at)}</p></div>
                      </div>
                    </button>
                  ))}
                </div>
              </Card>
            )}
          </section>
        </>
      )}

      {isAdmin && (
        <CreateBookingDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          leads={leads}
          properties={properties}
          employees={employees}
          saving={creating}
          onCreate={createBooking}
        />
      )}
      <BookingDetailDialog
        booking={selectedBooking}
        isAdmin={isAdmin}
        updating={updating}
        onClose={() => setSelectedBooking(null)}
        onStatusChange={updateStatus}
      />
    </div>
  )
}
