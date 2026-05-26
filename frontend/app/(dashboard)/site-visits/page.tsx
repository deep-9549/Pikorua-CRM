"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  Calendar, Clock, MapPin, User, Building2, Phone, Plus, ChevronRight,
  CheckCircle2, XCircle, AlertCircle, Navigation, MessageSquare, Mail,
  Star, FileText, TrendingUp, Bed, Bath, Maximize, History, X
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import { siteVisits, leads, properties, employees } from "@/lib/data"

const statusConfig: Record<string, { color: string; icon: typeof Clock }> = {
  scheduled: { color: "bg-blue-500/10 text-blue-600 border-blue-500/20", icon: Clock },
  completed: { color: "bg-green-500/10 text-green-600 border-green-500/20", icon: CheckCircle2 },
  cancelled: { color: "bg-red-500/10 text-red-600 border-red-500/20", icon: XCircle },
  no_show: { color: "bg-amber-500/10 text-amber-600 border-amber-500/20", icon: AlertCircle },
}

function formatCurrency(amount: number) {
  if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)} Cr`
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(0)} L`
  return `₹${amount.toLocaleString('en-IN')}`
}

// Timeline data for the detail dialog
function getLeadTimeline(leadId: string, visitDate: Date) {
  return [
    { id: 1, type: "first_contact", label: "First Contact via Meta Ad", date: new Date(visitDate.getTime() - 12 * 86400000), icon: MessageSquare, color: "bg-blue-500/10 text-blue-600", detail: "Lead submitted interest form via Facebook campaign" },
    { id: 2, type: "call", label: "Initial Discovery Call", date: new Date(visitDate.getTime() - 10 * 86400000), icon: Phone, color: "bg-green-500/10 text-green-600", detail: "15 min call — discussed budget, preferences, timeline" },
    { id: 3, type: "whatsapp", label: "Brochure Shared on WhatsApp", date: new Date(visitDate.getTime() - 8 * 86400000), icon: MessageSquare, color: "bg-emerald-500/10 text-emerald-600", detail: "Sent property brochure and floor plans" },
    { id: 4, type: "email", label: "Detailed Proposal Emailed", date: new Date(visitDate.getTime() - 6 * 86400000), icon: Mail, color: "bg-purple-500/10 text-purple-600", detail: "Comprehensive investment analysis with ROI projections" },
    { id: 5, type: "follow_up", label: "Follow-up Call", date: new Date(visitDate.getTime() - 4 * 86400000), icon: Phone, color: "bg-amber-500/10 text-amber-600", detail: "Addressed pricing queries, client interested in site visit" },
    { id: 6, type: "visit_scheduled", label: "Site Visit Scheduled", date: new Date(visitDate.getTime() - 2 * 86400000), icon: Calendar, color: "bg-primary/10 text-primary", detail: "Confirmed date and time for property viewing" },
    { id: 7, type: "visit", label: "Site Visit", date: visitDate, icon: Building2, color: "bg-gold/10 text-gold", detail: "Property walkthrough with client" },
  ]
}

export default function SiteVisitsPage() {
  const [activeTab, setActiveTab] = useState("upcoming")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailVisit, setDetailVisit] = useState<typeof siteVisits[0] | null>(null)

  const upcomingVisits = siteVisits.filter(v => v.status === "scheduled")
  const completedVisits = siteVisits.filter(v => v.status === "completed")
  const cancelledVisits = siteVisits.filter(v => v.status === "cancelled" || v.status === "no_show")

  const getVisitsByTab = () => {
    switch (activeTab) {
      case "upcoming": return upcomingVisits
      case "completed": return completedVisits
      case "cancelled": return cancelledVisits
      default: return siteVisits
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-amber-500/20">
            <Calendar className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">Site Visits</h1>
            <p className="text-muted-foreground text-sm">Manage property visits and appointments</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-amber-600 hover:from-primary/90 hover:to-amber-600/90 border-0 shadow-gold-sm">
              <Plus className="h-4 w-4 mr-2" /> Schedule Visit
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Schedule New Site Visit</DialogTitle>
              <DialogDescription>Create a new property visit appointment</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2"><Label htmlFor="lead">Select Lead</Label>
                <Select><SelectTrigger><SelectValue placeholder="Choose a lead" /></SelectTrigger>
                  <SelectContent>{leads.map(lead => (<SelectItem key={lead.id} value={lead.id}>{lead.name} - {lead.phone}</SelectItem>))}</SelectContent>
                </Select></div>
              <div className="grid gap-2"><Label htmlFor="property">Select Property</Label>
                <Select><SelectTrigger><SelectValue placeholder="Choose a property" /></SelectTrigger>
                  <SelectContent>{properties.map(p => (<SelectItem key={p.id} value={p.id}>{p.name} - {p.location}</SelectItem>))}</SelectContent>
                </Select></div>
              <div className="grid gap-2"><Label htmlFor="employee">Assign Employee</Label>
                <Select><SelectTrigger><SelectValue placeholder="Choose an employee" /></SelectTrigger>
                  <SelectContent>{employees.map(emp => (<SelectItem key={emp.id} value={emp.id}>{emp.name} - {emp.role}</SelectItem>))}</SelectContent>
                </Select></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2"><Label>Date</Label><Input type="date" /></div>
                <div className="grid gap-2"><Label>Time</Label><Input type="time" /></div>
              </div>
              <div className="grid gap-2"><Label>Notes</Label><Input placeholder="Add any special instructions..." /></div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button className="bg-gradient-to-r from-primary to-amber-600 border-0" onClick={() => setDialogOpen(false)}>Schedule Visit</Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Today", value: 5, icon: Calendar, color: "text-blue-600" },
          { label: "This Week", value: 23, icon: Clock, color: "text-primary" },
          { label: "Completed", value: 156, icon: CheckCircle2, color: "text-green-600" },
          { label: "Conversion", value: "34%", icon: Building2, color: "text-amber-600" },
        ].map((stat) => (
          <Card key={stat.label} className="border-0 shadow-card bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-muted-foreground">{stat.label}</p><p className="text-2xl font-bold text-foreground">{stat.value}</p></div>
                <stat.icon className={`h-8 w-8 ${stat.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Tabs */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-muted/50 border border-border/50">
            <TabsTrigger value="upcoming" className="data-[state=active]:bg-background">Upcoming ({upcomingVisits.length})</TabsTrigger>
            <TabsTrigger value="completed" className="data-[state=active]:bg-background">Completed ({completedVisits.length})</TabsTrigger>
            <TabsTrigger value="cancelled" className="data-[state=active]:bg-background">Cancelled ({cancelledVisits.length})</TabsTrigger>
            <TabsTrigger value="all" className="data-[state=active]:bg-background">All ({siteVisits.length})</TabsTrigger>
          </TabsList>

          <div className="mt-6 space-y-4">
            {getVisitsByTab().map((visit, index) => {
              const lead = leads.find(l => l.id === visit.leadId)
              const property = properties.find(p => p.id === visit.propertyId)
              const employee = employees.find(e => e.id === visit.employeeId)
              const StatusIcon = statusConfig[visit.status]?.icon || Clock

              return (
                <motion.div key={visit.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}>
                  <Card className="border-0 shadow-card bg-card/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                    <CardContent className="p-4">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="p-3 rounded-xl bg-primary/10 shrink-0"><Calendar className="h-5 w-5 text-primary" /></div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-foreground">{property?.name || "Property Visit"}</h3>
                              <Badge className={statusConfig[visit.status]?.color}><StatusIcon className="h-3 w-3 mr-1" />{visit.status.charAt(0).toUpperCase() + visit.status.slice(1)}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" />{property?.location}</p>
                            <div className="flex flex-wrap items-center gap-4 mt-2">
                              <span className="text-sm text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" />{lead?.name}</span>
                              <span className="text-sm text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{lead?.phone}</span>
                              <span className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(visit.scheduledDate).toLocaleDateString()} at {new Date(visit.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary/10 text-primary text-xs">{employee?.name.split(" ").map(n => n[0]).join("")}</AvatarFallback></Avatar>
                            <span>{employee?.name}</span>
                          </div>
                          <div className="flex gap-2">
                            <Button size="icon" variant="outline" className="h-9 w-9"><Phone className="h-4 w-4" /></Button>
                            <Button size="icon" variant="outline" className="h-9 w-9"><MessageSquare className="h-4 w-4" /></Button>
                            <Button variant="outline" className="h-9" onClick={() => setDetailVisit(visit)}>Details<ChevronRight className="h-4 w-4 ml-1" /></Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </Tabs>
      </motion.div>

      {/* Detail Dialog */}
      <Dialog open={!!detailVisit} onOpenChange={() => setDetailVisit(null)}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-hidden p-0">
          {detailVisit && (() => {
            const lead = leads.find(l => l.id === detailVisit.leadId)
            const property = properties.find(p => p.id === detailVisit.propertyId)
            const employee = employees.find(e => e.id === detailVisit.employeeId)
            const timeline = getLeadTimeline(detailVisit.leadId, detailVisit.scheduledDate)
            const StatusIcon = statusConfig[detailVisit.status]?.icon || Clock

            return (
              <div className="flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b bg-gradient-to-r from-primary/5 via-amber-500/5 to-primary/5">
                  <DialogHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-3 rounded-xl gold-gradient shadow-gold-sm">
                          <Calendar className="h-6 w-6 text-[oklch(0.10_0.010_260)]" />
                        </div>
                        <div>
                          <DialogTitle className="text-xl">{property?.name}</DialogTitle>
                          <DialogDescription className="flex items-center gap-2 mt-1">
                            <MapPin className="w-3.5 h-3.5" /> {property?.location}, {property?.area}
                            <Badge className={statusConfig[detailVisit.status]?.color + " ml-2"}><StatusIcon className="h-3 w-3 mr-1" />{detailVisit.status}</Badge>
                          </DialogDescription>
                        </div>
                      </div>
                    </div>
                  </DialogHeader>
                </div>

                {/* Content */}
                <ScrollArea className="flex-1" style={{ maxHeight: "calc(90vh - 120px)" }}>
                  <div className="p-6 space-y-6">
                    {/* Quick Info Cards */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Scheduled</p>
                        <p className="font-semibold">{detailVisit.scheduledDate.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</p>
                        <p className="text-sm text-muted-foreground">{detailVisit.scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Property Value</p>
                        <p className="font-semibold text-primary">{property ? formatCurrency(property.price) : 'N/A'}</p>
                        <p className="text-sm text-muted-foreground">{property ? `₹${property.pricePerSqft.toLocaleString()}/sqft` : ''}</p>
                      </div>
                      <div className="p-4 rounded-xl bg-muted/30 border border-border/50">
                        <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">ROI</p>
                        <p className="font-semibold text-green-600">{property?.roi}%</p>
                        <p className="text-sm text-muted-foreground">Annual return</p>
                      </div>
                    </div>

                    {/* Property Details */}
                    {property && (
                      <Card className="border-border/50 shadow-card border-0">
                        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Building2 className="w-5 h-5 text-primary" />Property Details</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-4 gap-4">
                            <div className="flex items-center gap-2"><Bed className="w-4 h-4 text-muted-foreground" /><span className="text-sm">{property.bedrooms} Beds</span></div>
                            <div className="flex items-center gap-2"><Bath className="w-4 h-4 text-muted-foreground" /><span className="text-sm">{property.bathrooms} Baths</span></div>
                            <div className="flex items-center gap-2"><Maximize className="w-4 h-4 text-muted-foreground" /><span className="text-sm">{property.sqft.toLocaleString()} sqft</span></div>
                            <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-muted-foreground" /><span className="text-sm">{property.roi}% ROI</span></div>
                          </div>
                          <Separator />
                          <div className="grid grid-cols-2 gap-4">
                            <div><p className="text-xs text-muted-foreground mb-1">Developer</p><p className="font-medium text-sm">{property.developer}</p></div>
                            <div><p className="text-xs text-muted-foreground mb-1">Completion</p><p className="font-medium text-sm">{property.completionDate}</p></div>
                          </div>
                          <div><p className="text-xs text-muted-foreground mb-2">Amenities</p>
                            <div className="flex flex-wrap gap-2">{property.amenities.map((a, i) => (<Badge key={i} variant="outline" className="text-xs">{a}</Badge>))}</div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Client & Employee */}
                    <div className="grid grid-cols-2 gap-4">
                      {lead && (
                        <Card className="border-border/50 shadow-card border-0">
                          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><User className="w-5 h-5 text-primary" />Client Details</CardTitle></CardHeader>
                          <CardContent>
                            <div className="flex items-center gap-3 mb-4">
                              <Avatar className="h-12 w-12 border-2 border-primary/20"><AvatarFallback className="bg-primary/10 text-primary font-semibold">{lead.name.split(" ").map(n => n[0]).join("")}</AvatarFallback></Avatar>
                              <div><p className="font-semibold">{lead.name}</p><p className="text-sm text-muted-foreground">{lead.location}</p></div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Phone className="w-3.5 h-3.5" />{lead.phone}</div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="w-3.5 h-3.5" />{lead.email}</div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Building2 className="w-3.5 h-3.5" />{lead.propertyInterest.join(", ")}</div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                      {employee && (
                        <Card className="border-border/50 shadow-card border-0">
                          <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Star className="w-5 h-5 text-amber-500" />Assigned Employee</CardTitle></CardHeader>
                          <CardContent>
                            <div className="flex items-center gap-3 mb-4">
                              <Avatar className="h-12 w-12 border-2 border-amber-500/20"><AvatarFallback className="bg-amber-500/10 text-amber-600 font-semibold">{employee.name.split(" ").map(n => n[0]).join("")}</AvatarFallback></Avatar>
                              <div><p className="font-semibold">{employee.name}</p><p className="text-sm text-muted-foreground capitalize">{employee.role.replace(/_/g, ' ')}</p></div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Phone className="w-3.5 h-3.5" />{employee.phone}</div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="w-3.5 h-3.5" />{employee.email}</div>
                              <div className="flex items-center gap-2 text-sm"><span className="text-muted-foreground">Conversions:</span><span className="font-semibold text-green-600">{employee.leadsConverted}</span></div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    {/* Relationship Timeline */}
                    <Card className="border-border/50 shadow-card border-0">
                      <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><History className="w-5 h-5 text-primary" />Relationship Timeline</CardTitle></CardHeader>
                      <CardContent>
                        <div className="relative">
                          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
                          <div className="space-y-4">
                            {timeline.map((event, idx) => {
                              const Icon = event.icon
                              const isLast = idx === timeline.length - 1
                              return (
                                <div key={event.id} className="relative flex gap-4 pl-2">
                                  <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${event.color} ${isLast ? 'ring-2 ring-primary/30' : ''}`}>
                                    <Icon className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1 pb-2">
                                    <div className="flex items-center justify-between">
                                      <p className={`font-medium text-sm ${isLast ? 'text-primary' : ''}`}>{event.label}</p>
                                      <span className="text-xs text-muted-foreground">{event.date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-0.5">{event.detail}</p>
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Feedback if completed */}
                    {detailVisit.feedback && (
                      <Card className="border-green-500/20 bg-green-500/5 border shadow-card">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                            <div>
                              <p className="font-medium text-sm text-green-600 mb-1">Visit Feedback</p>
                              <p className="text-foreground text-sm">{detailVisit.feedback}</p>
                              {detailVisit.rating && (
                                <div className="flex items-center gap-1 mt-2">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star key={i} className={`w-4 h-4 ${i < detailVisit.rating! ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground/30'}`} />
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                </ScrollArea>

                {/* Footer */}
                <div className="p-4 border-t bg-muted/30 flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2"><Phone className="w-4 h-4" />Call Client</Button>
                    <Button variant="outline" size="sm" className="gap-2"><MessageSquare className="w-4 h-4" />WhatsApp</Button>
                  </div>
                  <Button className="gap-2 bg-gradient-to-r from-primary to-amber-600 border-0 shadow-gold-sm"><Navigation className="w-4 h-4" />Get Directions</Button>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}


