"use client"

import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  BarChart3, Users, Clock, UserPlus, RefreshCw, Phone, Mail,
  MapPin, Check, ChevronDown, Loader2, AlertCircle, UserCheck
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface MetaLead {
  id: string
  full_name: string | null
  phone: string | null
  email: string | null
  city: string | null
  campaign_name: string | null
  status: "unassigned" | "assigned"
  received_at: string
  assigned_at: string | null
  assigned_to_profile: { id: string; full_name: string; role: string } | null
}

interface Employee {
  id: string
  full_name: string
  phone: string | null
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return "Just now"
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function initials(name: string | null) {
  if (!name) return "?"
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2)
}

export default function MetaAdsPage() {
  const [leads, setLeads] = useState<MetaLead[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [assigningId, setAssigningId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("unassigned")

  const fetchLeads = useCallback(async (status?: string) => {
    setLoading(true)
    setError(null)
    try {
      const url = status ? `/api/leads/meta?status=${status}` : "/api/leads/meta"
      const res = await fetch(url)
      if (!res.ok) throw new Error("Failed to fetch leads")
      const json = await res.json()
      setLeads(json.leads ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    async function loadAll() {
      setLoading(true)
      try {
        const [leadsRes, empsRes] = await Promise.all([
          fetch("/api/leads/meta?status=unassigned"),
          fetch("/api/employees"),
        ])
        const [leadsJson, empsJson] = await Promise.all([leadsRes.json(), empsRes.json()])
        setLeads(leadsJson.leads ?? [])
        setEmployees(empsJson.employees ?? [])
      } catch {
        setError("Failed to load data")
      } finally {
        setLoading(false)
      }
    }
    loadAll()
  }, [])

  async function handleAssign(leadId: string, employeeId: string) {
    setAssigningId(leadId)
    try {
      const res = await fetch(`/api/leads/meta/${leadId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigned_to: employeeId }),
      })
      if (!res.ok) throw new Error("Assignment failed")
      // Remove from unassigned list
      setLeads(prev => prev.filter(l => l.id !== leadId))
    } catch (e) {
      alert(e instanceof Error ? e.message : "Assignment failed")
    } finally {
      setAssigningId(null)
    }
  }

  function handleTabChange(tab: string) {
    setActiveTab(tab)
    fetchLeads(tab === "all" ? undefined : tab)
  }

  const unassignedCount = activeTab === "unassigned" ? leads.length : "–"
  const assignedCount = activeTab === "assigned" ? leads.length : "–"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: "oklch(0.92 0.006 80)" }}>
            Meta Ads Leads
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "oklch(0.55 0.006 260)" }}>
            Incoming leads from Facebook & Instagram campaigns
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-2"
          onClick={() => handleTabChange(activeTab)}
          disabled={loading}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Leads", value: leads.length, icon: Users, color: "oklch(0.700 0.130 75)" },
          { label: "Unassigned", value: leads.filter(l => l.status === "unassigned").length, icon: Clock, color: "oklch(0.75 0.12 50)" },
          { label: "Assigned", value: leads.filter(l => l.status === "assigned").length, icon: UserCheck, color: "oklch(0.65 0.15 145)" },
          { label: "Executives", value: employees.length, icon: BarChart3, color: "oklch(0.65 0.15 250)" },
        ].map(({ label, value, icon: Icon, color }) => (
          <Card key={label} className="shadow-card">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium" style={{ color: "oklch(0.55 0.006 260)" }}>{label}</p>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <p className="text-2xl font-bold" style={{ color: "oklch(0.92 0.006 80)" }}>{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Leads table */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <UserPlus className="w-4 h-4" style={{ color: "oklch(0.700 0.130 75)" }} />
            Lead Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="mb-4">
              <TabsTrigger value="unassigned">Unassigned</TabsTrigger>
              <TabsTrigger value="assigned">Assigned</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>

            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-lg mb-4 text-sm"
                style={{ background: "oklch(0.35 0.12 20 / 0.12)", color: "oklch(0.75 0.12 20)", border: "1px solid oklch(0.35 0.12 20 / 0.25)" }}>
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <TabsContent value={activeTab} className="mt-0">
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: "oklch(0.700 0.130 75)" }} />
                </div>
              ) : leads.length === 0 ? (
                <div className="text-center py-16 space-y-2">
                  <Users className="w-8 h-8 mx-auto opacity-30" />
                  <p className="text-sm" style={{ color: "oklch(0.50 0.006 260)" }}>
                    No {activeTab !== "all" ? activeTab : ""} leads
                  </p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  <div className="space-y-2">
                    {leads.map((lead, i) => (
                      <motion.div
                        key={lead.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ delay: i * 0.03 }}
                        className="flex items-center gap-4 px-4 py-3 rounded-xl transition-colors"
                        style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}
                      >
                        {/* Avatar */}
                        <Avatar className="h-9 w-9 shrink-0">
                          <AvatarFallback className="text-xs gold-gradient" style={{ color: "oklch(0.10 0.010 260)" }}>
                            {initials(lead.full_name)}
                          </AvatarFallback>
                        </Avatar>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: "oklch(0.90 0.006 80)" }}>
                            {lead.full_name ?? "Unknown"}
                          </p>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                            {lead.phone && (
                              <span className="flex items-center gap-1 text-[11px]" style={{ color: "oklch(0.55 0.006 260)" }}>
                                <Phone className="w-3 h-3" />{lead.phone}
                              </span>
                            )}
                            {lead.email && (
                              <span className="flex items-center gap-1 text-[11px]" style={{ color: "oklch(0.55 0.006 260)" }}>
                                <Mail className="w-3 h-3" />{lead.email}
                              </span>
                            )}
                            {lead.city && (
                              <span className="flex items-center gap-1 text-[11px]" style={{ color: "oklch(0.55 0.006 260)" }}>
                                <MapPin className="w-3 h-3" />{lead.city}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Campaign */}
                        <div className="hidden sm:block shrink-0 max-w-[160px]">
                          {lead.campaign_name && (
                            <Badge variant="secondary" className="text-[10px] truncate max-w-full">
                              {lead.campaign_name}
                            </Badge>
                          )}
                          <p className="text-[11px] mt-1" style={{ color: "oklch(0.45 0.008 260)" }}>
                            {timeAgo(lead.received_at)}
                          </p>
                        </div>

                        {/* Assigned to / Assign button */}
                        {lead.status === "assigned" && lead.assigned_to_profile ? (
                          <div className="flex items-center gap-2 shrink-0">
                            <Avatar className="h-6 w-6">
                              <AvatarFallback className="text-[9px]" style={{ background: "oklch(0.65 0.15 145 / 0.2)", color: "oklch(0.65 0.15 145)" }}>
                                {initials(lead.assigned_to_profile.full_name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs hidden md:block" style={{ color: "oklch(0.65 0.15 145)" }}>
                              {lead.assigned_to_profile.full_name}
                            </span>
                            <Check className="w-3.5 h-3.5 shrink-0" style={{ color: "oklch(0.65 0.15 145)" }} />
                          </div>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="sm"
                                className="shrink-0 h-8 gap-1.5 gold-gradient text-[11px] font-semibold shadow-gold-sm"
                                style={{ color: "oklch(0.10 0.010 260)" }}
                                disabled={assigningId === lead.id}
                              >
                                {assigningId === lead.id
                                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  : <><UserPlus className="w-3.5 h-3.5" />Assign<ChevronDown className="w-3 h-3" /></>
                                }
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              {employees.length === 0 ? (
                                <DropdownMenuItem disabled>No executives found</DropdownMenuItem>
                              ) : (
                                employees.map(emp => (
                                  <DropdownMenuItem
                                    key={emp.id}
                                    onClick={() => handleAssign(lead.id, emp.id)}
                                    className="gap-2"
                                  >
                                    <Avatar className="h-5 w-5">
                                      <AvatarFallback className="text-[9px]">{initials(emp.full_name)}</AvatarFallback>
                                    </Avatar>
                                    {emp.full_name}
                                  </DropdownMenuItem>
                                ))
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </AnimatePresence>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
