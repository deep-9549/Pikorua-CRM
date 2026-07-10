"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import {
  DollarSign, Calendar, TrendingUp, Building2, User, Clock,
  CheckCircle2, XCircle, AlertCircle, Plus, Download, ChevronRight,
  IndianRupee, Percent, FileText, Phone, Mail, MapPin, Bed, Bath,
  Maximize, Star, History, MessageSquare
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SearchableSelect } from "@/components/ui/searchable-select"
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts"
import { bookings, leads, properties, employees } from "@/lib/data"
import { ProtectedPhone } from "@/components/security/protected-phone"

const revenueData: { month: string; revenue: number; bookings: number }[] = []

const statusConfig: Record<string, { color: string; icon: typeof CheckCircle2 }> = {
  confirmed: { color: "bg-green-500/10 text-green-600 border-green-500/20", icon: CheckCircle2 },
  pending: { color: "bg-primary/10 text-primary border-primary/20", icon: AlertCircle },
  cancelled: { color: "bg-red-500/10 text-red-600 border-red-500/20", icon: XCircle },
}

export default function BookingsPage() {
  const [activeTab, setActiveTab] = useState("all")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailBooking, setDetailBooking] = useState<typeof bookings[0] | null>(null)

  const formatPrice = (price: number) => {
    if (price >= 10000000) return `${(price / 10000000).toFixed(2)} Cr`
    if (price >= 100000) return `${(price / 100000).toFixed(0)} L`
    return price.toLocaleString()
  }

  const totalRevenue = bookings.reduce((acc, b) => b.status === "confirmed" ? acc + b.amount : acc, 0)
  const totalCommission = bookings.reduce((acc, b) => b.status === "confirmed" ? acc + b.commission : acc, 0)
  const confirmedBookings = bookings.filter(b => b.status === "confirmed").length
  const pendingBookings = bookings.filter(b => b.status === "pending").length

  const filteredBookings = activeTab === "all" ? bookings : bookings.filter(b => b.status === activeTab)

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20">
            <DollarSign className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight">Bookings & Revenue</h1>
            <p className="text-muted-foreground text-sm">Track bookings, payments, and commission</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline"><Download className="h-4 w-4 mr-2" />Export</Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 border-0">
                <Plus className="h-4 w-4 mr-2" />New Booking
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader><DialogTitle>Create New Booking</DialogTitle><DialogDescription>Record a new property booking</DialogDescription></DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2"><Label>Select Lead</Label><SearchableSelect placeholder="Choose a lead" searchPlaceholder="Search lead..." options={leads.map(lead => ({ value: lead.id, searchText: `${lead.name} ${lead.phone}`, label: <>{lead.name} - <ProtectedPhone value={lead.phone}>{lead.phone}</ProtectedPhone></> }))} /></div>
                <div className="grid gap-2"><Label>Select Property</Label><SearchableSelect placeholder="Choose a property" searchPlaceholder="Search property..." options={properties.map(p => ({ value: p.id, searchText: `${p.name} ${formatPrice(p.price)}`, label: `${p.name} - Rs ${formatPrice(p.price)}` }))} /></div>
                <div className="grid grid-cols-2 gap-4"><div className="grid gap-2"><Label>Booking Amount</Label><Input type="number" placeholder="Enter amount" /></div><div className="grid gap-2"><Label>Commission %</Label><Input type="number" placeholder="2.5" defaultValue="2.5" /></div></div>
                <div className="grid gap-2"><Label>Payment Mode</Label><SearchableSelect placeholder="Select payment mode" searchPlaceholder="Search payment mode..." options={[{ value: "bank", label: "Bank Transfer" }, { value: "cheque", label: "Cheque" }, { value: "cash", label: "Cash" }]} /></div>
              </div>
              <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button><Button className="bg-gradient-to-r from-green-600 to-emerald-600 border-0" onClick={() => setDialogOpen(false)}>Create Booking</Button></div>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Revenue", value: `Rs ${formatPrice(totalRevenue)}`, icon: IndianRupee, color: "text-green-600", change: "0%" },
          { label: "Commission Earned", value: `Rs ${formatPrice(totalCommission)}`, icon: Percent, color: "text-primary", change: "0%" },
          { label: "Confirmed Bookings", value: confirmedBookings, icon: CheckCircle2, color: "text-blue-600", change: "0%" },
          { label: "Pending", value: pendingBookings, icon: Clock, color: "text-primary", change: "0%" },
        ].map((stat) => (
          <Card key={stat.label} className="border-0 shadow-card bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2"><stat.icon className={`h-5 w-5 ${stat.color}`} /><Badge variant="secondary" className="bg-green-500/10 text-green-600 text-xs">{stat.change}</Badge></div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Revenue Chart */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="border-0 shadow-card bg-card/50 backdrop-blur-sm">
          <CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />Revenue Trend</CardTitle></CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData}>
                  <defs><linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/><stop offset="95%" stopColor="#22c55e" stopOpacity={0}/></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickFormatter={(v) => `Ã¢â€šÂ¹${(v / 10000000).toFixed(1)}Cr`} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} formatter={(value: number) => [`Ã¢â€šÂ¹${formatPrice(value)}`, "Revenue"]} />
                  <Area type="monotone" dataKey="revenue" stroke="#22c55e" fill="url(#colorRevenue)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Bookings List */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-4">
            <TabsList className="bg-muted/50 border border-border/50">
              <TabsTrigger value="all" className="data-[state=active]:bg-background">All</TabsTrigger>
              <TabsTrigger value="confirmed" className="data-[state=active]:bg-background">Confirmed</TabsTrigger>
              <TabsTrigger value="pending" className="data-[state=active]:bg-background">Pending</TabsTrigger>
              <TabsTrigger value="cancelled" className="data-[state=active]:bg-background">Cancelled</TabsTrigger>
            </TabsList>
          </div>
          <div className="space-y-4">
            {filteredBookings.map((booking, index) => {
              const lead = leads.find(l => l.id === booking.leadId)
              const property = properties.find(p => p.id === booking.propertyId)
              const StatusIcon = statusConfig[booking.status]?.icon || AlertCircle
              return (
                <motion.div key={booking.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}>
                  <Card className="border-0 shadow-card bg-card/50 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                    <CardContent className="p-4">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 shrink-0"><FileText className="h-5 w-5 text-green-600" /></div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2"><h3 className="font-semibold text-foreground">{property?.name}</h3><Badge className={statusConfig[booking.status]?.color}><StatusIcon className="h-3 w-3 mr-1" />{booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}</Badge></div>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1"><User className="h-3 w-3" />{lead?.name}</span>
                              <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{booking.date}</span>
                              <span className="flex items-center gap-1"><Building2 className="h-3 w-3" />{property?.location}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right"><p className="text-lg font-bold text-foreground">Ã¢â€šÂ¹{formatPrice(booking.amount)}</p><p className="text-sm text-green-600">Commission: Ã¢â€šÂ¹{formatPrice(booking.commission)}</p></div>
                          <Button variant="outline" size="sm" onClick={() => setDetailBooking(booking)}>Details<ChevronRight className="h-4 w-4 ml-1" /></Button>
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

      {/* Booking Detail Dialog */}
      <Dialog open={!!detailBooking} onOpenChange={() => setDetailBooking(null)}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-hidden p-0">
          {detailBooking && (() => {
            const lead = leads.find(l => l.id === detailBooking.leadId)
            const property = properties.find(p => p.id === detailBooking.propertyId)
            const StatusIcon = statusConfig[detailBooking.status]?.icon || AlertCircle
            const commissionPct = ((detailBooking.commission / detailBooking.amount) * 100).toFixed(1)
            return (
              <div className="flex flex-col max-h-[90vh]">
                <div className="p-6 border-b bg-gradient-to-r from-green-500/5 via-emerald-500/5 to-green-500/5">
                  <DialogHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg"><FileText className="h-6 w-6 text-white" /></div>
                      <div>
                        <DialogTitle className="text-xl">{property?.name}</DialogTitle>
                        <DialogDescription className="flex items-center gap-2 mt-1"><MapPin className="w-3.5 h-3.5" />{property?.location}{property?.area ? `, ${property.area}` : ''}<Badge className={statusConfig[detailBooking.status]?.color + " ml-2"}><StatusIcon className="h-3 w-3 mr-1" />{detailBooking.status}</Badge></DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>
                </div>
                <ScrollArea className="flex-1" style={{ maxHeight: "calc(90vh - 120px)" }}>
                  <div className="p-6 space-y-6">
                    {/* Financial Summary */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20 text-center"><p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Booking Amount</p><p className="text-2xl font-bold text-green-600">Ã¢â€šÂ¹{formatPrice(detailBooking.amount)}</p></div>
                      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-center"><p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Commission ({commissionPct}%)</p><p className="text-2xl font-bold text-primary">Ã¢â€šÂ¹{formatPrice(detailBooking.commission)}</p></div>
                      <div className="p-4 rounded-xl bg-muted/30 border border-border/50 text-center"><p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Booking Date</p><p className="text-2xl font-bold">{new Date(detailBooking.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
                    </div>

                    {/* Property Details */}
                    {property && (
                      <Card className="border-border/50 shadow-card border-0">
                        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Building2 className="w-5 h-5 text-primary" />Property Details</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div><p className="text-xs text-muted-foreground mb-1">Type</p><p className="font-medium capitalize">{property.type}</p></div>
                            <div><p className="text-xs text-muted-foreground mb-1">Price per sqft</p><p className="font-medium">Ã¢â€šÂ¹{property.pricePerSqft.toLocaleString()}</p></div>
                            <div><p className="text-xs text-muted-foreground mb-1">Developer</p><p className="font-medium">{property.developer}</p></div>
                            <div><p className="text-xs text-muted-foreground mb-1">Completion</p><p className="font-medium">{property.completionDate}</p></div>
                          </div>
                          <Separator />
                          <div className="grid grid-cols-4 gap-4">
                            <div className="flex items-center gap-2"><Bed className="w-4 h-4 text-muted-foreground" /><span className="text-sm">{property.bedrooms} Beds</span></div>
                            <div className="flex items-center gap-2"><Bath className="w-4 h-4 text-muted-foreground" /><span className="text-sm">{property.bathrooms} Baths</span></div>
                            <div className="flex items-center gap-2"><Maximize className="w-4 h-4 text-muted-foreground" /><span className="text-sm">{property.sqft.toLocaleString()} sqft</span></div>
                            <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-muted-foreground" /><span className="text-sm">{property.roi}% ROI</span></div>
                          </div>
                          <div><p className="text-xs text-muted-foreground mb-2">Amenities</p><div className="flex flex-wrap gap-2">{property.amenities.map((a, i) => (<Badge key={i} variant="outline" className="text-xs">{a}</Badge>))}</div></div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Client Details */}
                    {lead && (
                      <Card className="border-border/50 shadow-card border-0">
                        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><User className="w-5 h-5 text-primary" />Client Details</CardTitle></CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-3 mb-4">
                            <Avatar className="h-12 w-12 border-2 border-primary/20"><AvatarFallback className="bg-primary/10 text-primary font-semibold">{lead.name.split(" ").map(n => n[0]).join("")}</AvatarFallback></Avatar>
                            <div><p className="font-semibold">{lead.name}</p><p className="text-sm text-muted-foreground">{lead.location}</p></div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <ProtectedPhone value={lead.phone} className="flex items-center gap-2 text-sm text-muted-foreground"><Phone className="w-3.5 h-3.5" />{lead.phone}</ProtectedPhone>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="w-3.5 h-3.5" />{lead.email}</div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground"><Building2 className="w-3.5 h-3.5" />{lead.propertyInterest.join(", ")}</div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="w-3.5 h-3.5" />{lead.location}</div>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Payment Timeline */}
                    <Card className="border-border/50 shadow-card border-0">
                      <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><History className="w-5 h-5 text-primary" />Payment Timeline</CardTitle></CardHeader>
                      <CardContent>
                        <div className="relative">
                          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />
                          <div className="space-y-4">
                            {[
                              { label: "Booking Initiated", date: detailBooking.date, icon: FileText, color: "bg-blue-500/10 text-blue-600", detail: "Client expressed intent to book" },
                              { label: "Token Amount Received", date: detailBooking.date, icon: IndianRupee, color: "bg-green-500/10 text-green-600", detail: `Ã¢â€šÂ¹${formatPrice(detailBooking.amount * 0.1)} token received` },
                              { label: "Agreement Signed", date: detailBooking.date, icon: FileText, color: "bg-purple-500/10 text-purple-600", detail: "Sale agreement executed" },
                              { label: detailBooking.status === "confirmed" ? "Booking Confirmed" : detailBooking.status === "pending" ? "Awaiting Confirmation" : "Booking Cancelled", date: detailBooking.date, icon: detailBooking.status === "confirmed" ? CheckCircle2 : detailBooking.status === "pending" ? Clock : XCircle, color: detailBooking.status === "confirmed" ? "bg-green-500/10 text-green-600" : detailBooking.status === "pending" ? "bg-primary/10 text-primary" : "bg-red-500/10 text-red-600", detail: detailBooking.status === "confirmed" ? "Full payment completed" : detailBooking.status === "pending" ? "Awaiting remaining payment" : "Booking was cancelled" },
                            ].map((event, idx) => {
                              const Icon = event.icon
                              return (
                                <div key={idx} className="relative flex gap-4 pl-2">
                                  <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${event.color}`}><Icon className="w-4 h-4" /></div>
                                  <div className="flex-1 pb-2"><div className="flex items-center justify-between"><p className="font-medium text-sm">{event.label}</p><span className="text-xs text-muted-foreground">{event.date}</span></div><p className="text-xs text-muted-foreground mt-0.5">{event.detail}</p></div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </ScrollArea>
                <div className="p-4 border-t bg-muted/30 flex items-center justify-between">
                  <Button variant="outline" size="sm" className="gap-2"><Phone className="w-4 h-4" />Call Client</Button>
                  <Button className="gap-2 bg-gradient-to-r from-green-600 to-emerald-600 border-0"><FileText className="w-4 h-4" />Download Invoice</Button>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}

