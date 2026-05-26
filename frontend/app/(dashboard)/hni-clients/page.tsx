"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { 
  Crown, Search, Filter, Phone, Mail, MapPin, Building2,
  Calendar, DollarSign, Star, Heart, MessageSquare, ChevronRight,
  TrendingUp, Target, Award, Gem, History, User, FileText, Clock,
  CheckCircle2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { hniClients } from "@/lib/data"

const tierConfig = {
  platinum: { color: "text-slate-300", bgColor: "bg-gradient-to-r from-slate-400 to-slate-600", icon: Gem },
  gold: { color: "text-amber-500", bgColor: "bg-gradient-to-r from-amber-400 to-amber-600", icon: Crown },
  silver: { color: "text-slate-400", bgColor: "bg-gradient-to-r from-slate-300 to-slate-500", icon: Star },
}

function getClientTimeline(client: typeof hniClients[0]) {
  return [
    { id: 1, label: `Relationship Initiated`, date: `${client.since}`, icon: User, color: "bg-blue-500/10 text-blue-600", detail: `First contact and onboarding as ${client.tier} tier client` },
    { id: 2, label: "First Property Acquired", date: `${client.since}`, icon: Building2, color: "bg-green-500/10 text-green-600", detail: "Purchased first property through Pikorua Realty" },
    { id: 3, label: "Portfolio Expansion", date: `${parseInt(client.since) + 1}`, icon: TrendingUp, color: "bg-primary/10 text-primary", detail: `Expanded portfolio to ${Math.ceil(client.propertiesOwned / 2)} properties` },
    { id: 4, label: "Tier Upgrade", date: `${parseInt(client.since) + 1}`, icon: Award, color: "bg-amber-500/10 text-amber-600", detail: `Upgraded to ${client.tier} tier based on portfolio value` },
    { id: 5, label: "Latest Interaction", date: "2024", icon: MessageSquare, color: "bg-emerald-500/10 text-emerald-600", detail: "Discussed new investment opportunities" },
    { id: 6, label: `Current Portfolio: ${client.propertiesOwned} Properties`, date: "Present", icon: Crown, color: "bg-gold/10 text-gold", detail: `Active HNI client with total portfolio value` },
  ]
}

export default function HNIClientsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [detailClient, setDetailClient] = useState<typeof hniClients[0] | null>(null)

  const filteredClients = hniClients.filter(client =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const formatValue = (value: number) => {
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(1)} Cr`
    if (value >= 100000) return `₹${(value / 100000).toFixed(0)} L`
    return `₹${value.toLocaleString()}`
  }

  const totalPortfolioValue = hniClients.reduce((acc, c) => acc + c.portfolioValue, 0)
  const platinumClients = hniClients.filter(c => c.tier === "platinum").length
  const goldClients = hniClients.filter(c => c.tier === "gold").length

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-amber-500/20 to-yellow-500/20">
            <Crown className="h-6 w-6 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">HNI Clients</h1>
            <p className="text-muted-foreground">High Net Worth Individual profiles and preferences</p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total HNI Clients", value: hniClients.length, icon: Crown, color: "text-amber-500" },
          { label: "Platinum Tier", value: platinumClients, icon: Gem, color: "text-slate-300" },
          { label: "Gold Tier", value: goldClients, icon: Star, color: "text-amber-400" },
          { label: "Portfolio Value", value: formatValue(totalPortfolioValue), icon: DollarSign, color: "text-green-600" },
        ].map((stat) => (
          <Card key={stat.label} className="border-border/50 bg-card/50 backdrop-blur-sm shadow-card border-0">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-muted-foreground">{stat.label}</p><p className="text-2xl font-bold text-foreground">{stat.value}</p></div>
                <stat.icon className={`h-8 w-8 ${stat.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      {/* Search */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm shadow-card border-0">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search HNI clients..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
              </div>
              <Button variant="outline"><Filter className="h-4 w-4 mr-2" />Filters</Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Client Cards */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredClients.map((client, index) => {
          const TierIcon = tierConfig[client.tier]?.icon || Star
          return (
            <motion.div key={client.id} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.4 + index * 0.05 }}>
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 overflow-hidden shadow-card border-0">
                <div className={`h-1.5 ${tierConfig[client.tier]?.bgColor}`} />
                <CardContent className="p-5">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16 border-2 border-amber-500/30">
                      <AvatarFallback className="bg-gradient-to-br from-amber-500/20 to-yellow-500/20 text-amber-600 text-lg font-semibold">
                        {client.name.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div><h3 className="text-lg font-semibold text-foreground">{client.name}</h3><p className="text-sm text-muted-foreground">{client.occupation}</p></div>
                        <Badge className={`${tierConfig[client.tier]?.bgColor} text-white border-0`}><TierIcon className="h-3 w-3 mr-1" />{client.tier.charAt(0).toUpperCase() + client.tier.slice(1)}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Phone className="h-4 w-4" />{client.phone}</div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="h-4 w-4" />{client.email}</div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />{client.location}</div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Portfolio Value</span><span className="font-semibold text-green-600">{formatValue(client.portfolioValue)}</span></div>
                          <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Properties Owned</span><span className="font-medium">{client.propertiesOwned}</span></div>
                          <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Relationship Since</span><span className="font-medium">{client.since}</span></div>
                        </div>
                      </div>
                      <div className="mt-4 pt-4 border-t border-border/50">
                        <p className="text-sm text-muted-foreground mb-2">Preferences</p>
                        <div className="flex flex-wrap gap-2">{client.preferences.map((pref, i) => (<Badge key={i} variant="secondary" className="bg-muted/50">{pref}</Badge>))}</div>
                      </div>
                      <div className="flex items-center gap-2 mt-4">
                        <Button variant="outline" size="sm" className="flex-1"><Phone className="h-4 w-4 mr-2" />Call</Button>
                        <Button variant="outline" size="sm" className="flex-1"><MessageSquare className="h-4 w-4 mr-2" />Message</Button>
                        <Button size="sm" className="flex-1 bg-gradient-to-r from-primary to-amber-600 border-0" onClick={() => setDetailClient(client)}>
                          View Profile<ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </motion.div>

      {/* HNI Client Detail Dialog */}
      <Dialog open={!!detailClient} onOpenChange={() => setDetailClient(null)}>
        <DialogContent className="sm:max-w-[850px] max-h-[90vh] overflow-hidden p-0">
          {detailClient && (() => {
            const TierIcon = tierConfig[detailClient.tier]?.icon || Star
            const timeline = getClientTimeline(detailClient)
            return (
              <div className="flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b bg-gradient-to-r from-amber-500/5 via-yellow-500/5 to-amber-500/5">
                  <DialogHeader>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-16 w-16 border-3 border-amber-500/30">
                        <AvatarFallback className="bg-gradient-to-br from-amber-500/20 to-yellow-500/20 text-amber-600 text-xl font-bold">
                          {detailClient.name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <DialogTitle className="text-xl flex items-center gap-2">
                          {detailClient.name}
                          <Badge className={`${tierConfig[detailClient.tier]?.bgColor} text-white border-0 ml-2`}><TierIcon className="h-3 w-3 mr-1" />{detailClient.tier.charAt(0).toUpperCase() + detailClient.tier.slice(1)}</Badge>
                        </DialogTitle>
                        <DialogDescription className="flex items-center gap-3 mt-1">
                          <span>{detailClient.occupation}</span>
                          <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{detailClient.location}</span>
                        </DialogDescription>
                      </div>
                    </div>
                  </DialogHeader>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto scrollbar-luxury p-6 space-y-6">
                  {/* Quick Stats */}
                  <div className="grid grid-cols-4 gap-4">
                    <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/20 text-center">
                      <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Portfolio</p>
                      <p className="text-xl font-bold text-green-600">{formatValue(detailClient.portfolioValue)}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-center">
                      <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Properties</p>
                      <p className="text-xl font-bold text-primary">{detailClient.propertiesOwned}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-center">
                      <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Since</p>
                      <p className="text-xl font-bold text-blue-600">{detailClient.since}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-center">
                      <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-medium">Avg. Value</p>
                      <p className="text-xl font-bold text-amber-600">{formatValue(detailClient.portfolioValue / detailClient.propertiesOwned)}</p>
                    </div>
                  </div>

                  {/* Contact & Preferences */}
                  <div className="grid grid-cols-2 gap-4">
                    <Card className="border-border/50 shadow-card border-0">
                      <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><User className="w-5 h-5 text-primary" />Contact Information</CardTitle></CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center gap-2 text-sm"><Phone className="w-4 h-4 text-muted-foreground" />{detailClient.phone}</div>
                        <div className="flex items-center gap-2 text-sm"><Mail className="w-4 h-4 text-muted-foreground" />{detailClient.email}</div>
                        <div className="flex items-center gap-2 text-sm"><MapPin className="w-4 h-4 text-muted-foreground" />{detailClient.location}</div>
                        <div className="flex items-center gap-2 text-sm"><Building2 className="w-4 h-4 text-muted-foreground" />{detailClient.occupation}</div>
                      </CardContent>
                    </Card>
                    <Card className="border-border/50 shadow-card border-0">
                      <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Heart className="w-5 h-5 text-rose-500" />Preferences</CardTitle></CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {detailClient.preferences.map((pref, i) => (
                            <Badge key={i} variant="outline" className="bg-primary/5 border-primary/20 text-sm">{pref}</Badge>
                          ))}
                        </div>
                        <Separator className="my-4" />
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Investment Style</span>
                          <Badge className="bg-green-500/10 text-green-600 border-0">Active Investor</Badge>
                        </div>
                      </CardContent>
                    </Card>
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
                                    <span className="text-xs text-muted-foreground">{event.date}</span>
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
                </div>

                <div className="p-4 border-t bg-muted/30 flex items-center justify-between">
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2"><Phone className="w-4 h-4" />Call</Button>
                    <Button variant="outline" size="sm" className="gap-2"><MessageSquare className="w-4 h-4" />WhatsApp</Button>
                  </div>
                  <Button className="gap-2 bg-gradient-to-r from-primary to-amber-600 border-0 shadow-gold-sm"><FileText className="w-4 h-4" />Generate Report</Button>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}

