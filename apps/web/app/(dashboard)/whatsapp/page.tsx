"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Search, Phone, Video, MoreVertical, Send, Paperclip, Smile,
  Check, CheckCheck, Sparkles, Clock, Bot, TrendingUp, TrendingDown,
  Minus, AlertTriangle, Users, Calendar, Flame, Snowflake,
  ThermometerSun, FileText, ArrowLeft, Mic
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  leads, getEmployeeById, whatsappConversations,
  getWhatsAppConversationByLeadId
} from "@/lib/data"

/* ── Helpers ──────────────────────────────────────────── */
function sentimentMeta(s: "hot" | "warm" | "neutral" | "cold") {
  return {
    hot:     { label: "Hot",     icon: Flame,        bg: "bg-rose-500/10",   text: "text-rose-500",   bar: "85%" },
    warm:    { label: "Warm",    icon: ThermometerSun, bg: "bg-primary/10", text: "text-primary",  bar: "65%" },
    neutral: { label: "Neutral", icon: Minus,         bg: "bg-muted",        text: "text-muted-foreground", bar: "40%" },
    cold:    { label: "Cold",    icon: Snowflake,     bg: "bg-blue-500/10",  text: "text-blue-500",   bar: "15%" },
  }[s]
}

function trendMeta(t: string) {
  const m: Record<string, { icon: React.ElementType; color: string; label: string }> = {
    heating_up:   { icon: TrendingUp,    color: "text-emerald-500", label: "Heating Up" },
    cooling_down: { icon: TrendingDown,  color: "text-rose-500",    label: "Cooling Down" },
    critical:     { icon: AlertTriangle, color: "text-primary",   label: "Critical" },
    stable:       { icon: Minus,         color: "text-muted-foreground", label: "Stable" },
  }
  return m[t] ?? m.stable
}

/* ── Page ─────────────────────────────────────────────── */
export default function WhatsAppHubPage() {
  const [selectedLeadId, setSelectedLeadId] = React.useState<string | null>(null)
  const [message, setMessage] = React.useState("")
  const [actionFeedback, setActionFeedback] = React.useState<string | null>(null)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  const leadsWithConvos = leads.filter(l => whatsappConversations.some(c => c.leadId === l.id))
  const selectedLead = selectedLeadId ? leads.find(l => l.id === selectedLeadId) : null
  const selectedConvo = selectedLeadId ? getWhatsAppConversationByLeadId(selectedLeadId) : null

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [selectedLeadId])

  const handleQuickAction = (action: string) => {
    setActionFeedback(action)
    setTimeout(() => setActionFeedback(null), 2500)
  }

  const smartReplies = [
    "Sure, I can schedule a visit for Saturday",
    "Let me share the brochure right away",
    "Would afternoon work for you?",
    "I'll get back to you within the hour",
  ]

  return (
    <TooltipProvider>
      {/* Full-bleed, fixed height chat layout */}
      <div className="flex rounded-2xl overflow-hidden shadow-luxury-lg border border-border/60"
        style={{ height: "calc(100vh - 96px)", minHeight: 0 }}>

        {/* ── Column 1: Conversation List ──────────────────── */}
        <div className={cn(
          "flex flex-col shrink-0",
          selectedLeadId ? "hidden md:flex w-[320px]" : "w-full md:w-[320px]",
          "border-r border-border/60"
        )}
          style={{ background: "var(--color-card)" }}>

          {/* List Header */}
          <div className="flex items-center justify-between px-4 py-3.5 shrink-0"
            style={{ borderBottom: "1px solid var(--color-border)" }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl gold-gradient flex items-center justify-center shadow-gold-sm shrink-0">
                <span className="text-[11px] font-bold" style={{ color: "var(--color-primary-foreground)" }}>PR</span>
              </div>
              <div>
                <p className="text-[13px] font-semibold leading-tight">Pikorua Realty</p>
                <p className="text-[10px] text-muted-foreground">WhatsApp Business</p>
              </div>
            </div>
            <div className="flex gap-0.5">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Users className="w-4 h-4 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
          </div>

          {/* Search */}
          <div className="px-3 py-2.5 shrink-0" style={{ borderBottom: "1px solid var(--color-border)" }}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Search conversations..."
                className="pl-9 h-8 text-[13px] bg-muted/50 border-0 focus-visible:ring-0"
              />
            </div>
          </div>

          {/* Filter pills */}
          <div className="px-3 py-2 flex gap-1.5 shrink-0">
            <button className="px-3 py-1 rounded-full text-[11px] font-semibold transition-all gold-gradient text-primary-foreground">
              All
            </button>
            <button className="px-3 py-1 rounded-full text-[11px] font-medium border border-border text-muted-foreground hover:bg-muted transition-all">
              Unread
            </button>
            <button className="px-3 py-1 rounded-full text-[11px] font-medium border border-border text-muted-foreground hover:bg-muted transition-all flex items-center gap-1">
              <Flame className="w-3 h-3 text-rose-500" /> Hot
            </button>
          </div>

          {/* Chat list */}
          <div className="flex-1 overflow-y-auto scrollbar-luxury">
            {leadsWithConvos.map(lead => {
              const convo = getWhatsAppConversationByLeadId(lead.id)
              const last = convo?.messages[convo.messages.length - 1]
              const isActive = selectedLeadId === lead.id
              const sm = convo ? sentimentMeta(convo.aiSentiment.current) : null

              return (
                <button key={lead.id} onClick={() => setSelectedLeadId(lead.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-3 text-left transition-colors",
                    "border-b border-border/40",
                    isActive ? "bg-primary/6" : "hover:bg-muted/50"
                  )}>
                  <div className="relative shrink-0">
                    <Avatar className="h-11 w-11" style={{ border: "1.5px solid var(--color-border)" }}>
                      <AvatarImage src={lead.avatar} />
                      <AvatarFallback className="text-[12px] font-semibold bg-primary/8 text-primary">
                        {lead.name.split(" ").map(n => n[0]).join("")}
                      </AvatarFallback>
                    </Avatar>
                    {lead.whatsappStatus === "active" && (
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500"
                        style={{ border: "2px solid var(--color-card)" }} />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[13px] font-medium truncate">{lead.name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-1">
                        {last?.timestamp.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground min-w-0">
                        {last?.sender === "employee" && <CheckCheck className="w-3.5 h-3.5 text-primary shrink-0" />}
                        <span className="truncate">{last?.content.slice(0, 30)}...</span>
                      </div>
                      {sm && (
                        <span className={cn("text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0 ml-1", sm.bg, sm.text)}>
                          {sm.label}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* ── Column 2: Chat Window ─────────────────────────── */}
        {selectedLead && selectedConvo ? (
          <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">

            {/* Chat Header */}
            <div className="flex items-center justify-between px-4 h-[60px] shrink-0"
              style={{
                background: "var(--color-card)",
                borderBottom: "1px solid var(--color-border)"
              }}>
              <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" className="h-8 w-8 md:hidden" onClick={() => setSelectedLeadId(null)}>
                  <ArrowLeft className="w-4 h-4" />
                </Button>
                <Avatar className="h-9 w-9" style={{ border: "1.5px solid var(--color-border)" }}>
                  <AvatarImage src={selectedLead.avatar} />
                  <AvatarFallback className="text-[11px] font-semibold bg-primary/8 text-primary">
                    {selectedLead.name.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-[14px] font-semibold leading-tight">{selectedLead.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {selectedLead.whatsappStatus === "active" ? "online now" : "last seen recently"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* AI Sentiment Pill */}
                {(() => {
                  const sm = sentimentMeta(selectedConvo.aiSentiment.current)
                  const tm = trendMeta(selectedConvo.aiSentiment.trend)
                  const SIcon = sm.icon
                  const TIcon = tm.icon
                  return (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className={cn(
                          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full cursor-help",
                          sm.bg
                        )}>
                          <SIcon className={cn("w-3.5 h-3.5", sm.text)} />
                          <span className={cn("text-[11px] font-semibold", sm.text)}>{sm.label}</span>
                          <TIcon className={cn("w-3 h-3", tm.color)} />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="max-w-[260px] p-3 shadow-luxury-lg">
                        <p className="font-semibold text-[13px] mb-1">AI Sentiment · {selectedConvo.aiSentiment.confidence}% confident</p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                          {selectedConvo.aiSentiment.reasoning}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )
                })()}

                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Video className="w-4 h-4 text-muted-foreground" />
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="shadow-luxury-lg w-44">
                    <DropdownMenuItem className="text-[13px]">Contact info</DropdownMenuItem>
                    <DropdownMenuItem className="text-[13px]">View lead profile</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-[13px]">Employee history</DropdownMenuItem>
                    <DropdownMenuItem className="text-[13px]">AI Summary</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-[13px]">Schedule follow-up</DropdownMenuItem>
                    <DropdownMenuItem className="text-[13px]">Send brochure</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            {/* Messages area */}
            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-luxury px-[6%] py-5 space-y-1"
              style={{
                background: "var(--color-muted)",
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c8b89a' fill-opacity='0.12'%3E%3Cpath d='M20 18v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-18V0h-2v2h-4v2h4v4h2V4h4V2h-4zM0 18v-4H-2v4h-4v2h4v4h2v-4h4v-2H0zM0 0v2h2V0H0z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
              }}>

              {/* Date pill */}
              <div className="flex justify-center mb-4">
                <span className="text-[11px] font-medium px-3 py-1 rounded-full shadow-sm"
                  style={{ background: "var(--color-card)", color: "var(--color-muted-foreground)" }}>
                  Conversation history
                </span>
              </div>

              <AnimatePresence mode="popLayout">
                {selectedConvo.messages.map((msg, idx) => {
                  const emp = msg.employeeId ? getEmployeeById(msg.employeeId) : null
                  const prevMsg = idx > 0 ? selectedConvo.messages[idx - 1] : null
                  const showJoin = msg.sender === "employee" && emp &&
                    prevMsg?.employeeId !== msg.employeeId

                  const isOut = msg.sender === "employee"

                  return (
                    <React.Fragment key={msg.id}>
                      {showJoin && emp && (
                        <div className="flex justify-center my-2">
                          <span className="text-[11px] px-3 py-1 rounded-full font-medium shadow-sm"
                            style={{ background: "rgb(194 65 12 / 0.12)", color: "var(--color-primary)" }}>
                            {emp.name} is handling this conversation
                          </span>
                        </div>
                      )}
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.18 }}
                        className={cn("flex mb-0.5", isOut ? "justify-end" : "justify-start")}
                      >
                        <div className={cn(
                          "max-w-[72%] md:max-w-[58%] rounded-2xl px-3.5 py-2.5 shadow-sm relative",
                          isOut
                            ? "rounded-tr-sm"
                            : "rounded-tl-sm"
                        )}
                          style={{
                            background: isOut
                              ? "rgb(21 128 61 / 0.10)"  /* light sage green */
                              : "var(--color-card)",
                          }}>
                          {/* Employee name */}
                          {isOut && emp && (
                            <p className="text-[11px] font-semibold mb-0.5"
                              style={{ color: "var(--color-primary)" }}>
                              {emp.name}
                            </p>
                          )}

                          {/* Content */}
                          {msg.type === "document" ? (
                            <div className="flex items-center gap-2.5 rounded-xl p-2.5 mb-1"
                              style={{ background: "var(--color-muted)" }}>
                              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                <FileText className="w-4.5 h-4.5 text-primary" style={{ width: 18, height: 18 }} />
                              </div>
                              <div>
                                <p className="text-[13px] font-medium">{msg.content}</p>
                                <p className="text-[10px] text-muted-foreground">PDF · Tap to open</p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-[13.5px] leading-[20px] whitespace-pre-wrap break-words text-foreground">
                              {msg.content}
                            </p>
                          )}

                          {/* Timestamp + status */}
                          <div className={cn("flex items-center justify-end gap-1 mt-1",
                            isOut ? "text-success" : "text-muted-foreground")}>
                            <span className="text-[10px]">
                              {msg.timestamp.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                            </span>
                            {isOut && (
                              msg.status === "read"
                                ? <CheckCheck className="w-3.5 h-3.5 text-primary" />
                                : msg.status === "delivered"
                                  ? <CheckCheck className="w-3.5 h-3.5" />
                                  : <Check className="w-3.5 h-3.5" />
                            )}
                          </div>

                          {/* AI tag */}
                          {msg.aiAnalysis && msg.sender === "lead" && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className={cn(
                                  "absolute -bottom-2.5 right-2 flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold cursor-help",
                                  msg.aiAnalysis.urgency === "high"
                                    ? "bg-destructive text-destructive-foreground"
                                    : "bg-muted-foreground/20 text-muted-foreground"
                                )}>
                                  <Bot className="w-2 h-2" />
                                  {msg.aiAnalysis.intent.replace("_", " ")}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[200px] text-[12px] p-2.5">
                                <p className="font-semibold mb-1">AI Insight</p>
                                <p className="text-muted-foreground">
                                  {msg.aiAnalysis.suggestedAction || `Intent: ${msg.aiAnalysis.intent}`}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          )}
                        </div>
                      </motion.div>
                    </React.Fragment>
                  )
                })}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Smart Replies */}
            <div className="px-4 py-2 shrink-0"
              style={{
                background: "var(--color-card)",
                borderTop: "1px solid var(--color-border)"
              }}>
              <div className="flex items-center gap-2 overflow-x-auto scrollbar-luxury pb-0.5">
                <div className="flex items-center gap-1 px-2.5 py-1 rounded-full shrink-0"
                  style={{ background: "rgb(194 65 12 / 0.08)", color: "var(--color-primary)" }}>
                  <Sparkles className="w-3 h-3" />
                  <span className="text-[10px] font-semibold">AI</span>
                </div>
                {smartReplies.map((r, i) => (
                  <button key={i}
                    onClick={() => setMessage(r)}
                    className="px-3 py-1 rounded-full text-[11px] text-muted-foreground border border-border hover:bg-muted hover:text-foreground transition-all whitespace-nowrap shrink-0">
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div className="flex items-center gap-2 px-4 py-3 shrink-0"
              style={{
                background: "var(--color-card)",
                borderTop: "1px solid rgb(222 217 211 / 0.5)"
              }}>
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                <Smile className="w-5 h-5 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0">
                <Paperclip className="w-5 h-5 text-muted-foreground" />
              </Button>
              <Input
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Type a message..."
                className="flex-1 h-10 text-[13px] bg-muted/50 border-0 focus-visible:ring-0 rounded-xl"
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); setMessage("") } }}
              />
              <Button size="icon"
                className={cn("h-9 w-9 rounded-xl shrink-0 transition-all border-0",
                  message ? "gold-gradient shadow-gold-sm text-primary-foreground" : "bg-muted text-muted-foreground"
                )}>
                {message ? <Send className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
            </div>
          </div>

        ) : (
          /* Empty state */
          <div className="flex-1 hidden md:flex flex-col items-center justify-center"
            style={{ background: "var(--color-muted)" }}>
            <div className="text-center max-w-xs">
              <div className="w-16 h-16 rounded-2xl gold-gradient mx-auto mb-5 flex items-center justify-center shadow-gold">
                <Bot className="w-8 h-8 text-primary-foreground" />
              </div>
              <h2 className="text-[22px] font-bold tracking-tight mb-2">WhatsApp Hub</h2>
              <p className="text-[13px] text-muted-foreground leading-relaxed mb-6">
                AI-powered conversations with your leads. Select a chat to view the full history and sentiment analysis.
              </p>
              <div className="flex items-center justify-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span className="text-[11px] text-muted-foreground">End-to-end encrypted</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Column 3: AI Insights Panel ─────────────────── */}
        {selectedLead && selectedConvo && (
          <div className="hidden xl:flex w-[280px] shrink-0 flex-col"
            style={{
              background: "var(--color-background)",
              borderLeft: "1px solid var(--color-border)"
            }}>
            {/* Header */}
            <div className="px-4 py-3.5 shrink-0 flex items-center gap-2.5"
              style={{ borderBottom: "1px solid var(--color-border)" }}>
              <div className="w-7 h-7 rounded-lg gold-gradient flex items-center justify-center">
                <Bot className="w-3.5 h-3.5 text-primary-foreground" />
              </div>
              <p className="text-[13px] font-semibold">AI Insights</p>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">

                {/* Sentiment gauge */}
                {(() => {
                  const sm = sentimentMeta(selectedConvo.aiSentiment.current)
                  return (
                    <div className="rounded-xl p-3.5"
                      style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                        Lead Temperature
                      </p>
                      <div className="relative h-2 rounded-full mb-2.5 overflow-hidden"
                        style={{ background: "linear-gradient(90deg, var(--color-muted-foreground) 0%, var(--color-warning) 40%, var(--color-destructive) 100%)" }}>
                        <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-card border-2 border-primary shadow-gold-sm transition-all duration-500"
                          style={{ left: sm.bar }} />
                      </div>
                      <div className="flex justify-between text-[9px] font-medium text-muted-foreground">
                        <span>Cold</span><span>Neutral</span><span>Warm</span><span>Hot</span>
                      </div>
                      <div className="flex items-center gap-2 mt-3 pt-3" style={{ borderTop: "1px solid var(--color-border)" }}>
                        <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", sm.bg, sm.text)}>
                          {sm.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{selectedConvo.aiSentiment.confidence}% confidence</span>
                      </div>
                    </div>
                  )
                })()}

                {/* Trend */}
                {(() => {
                  const tm = trendMeta(selectedConvo.aiSentiment.trend)
                  const TIcon = tm.icon
                  return (
                    <div className="rounded-xl p-3.5"
                      style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
                      <div className="flex items-center gap-2 mb-2">
                        <TIcon className={cn("w-4 h-4", tm.color)} />
                        <span className="text-[12px] font-semibold">{tm.label}</span>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {selectedConvo.aiSentiment.reasoning}
                      </p>
                    </div>
                  )
                })()}

                {/* Who talked */}
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Users className="w-3 h-3" /> Employee History
                  </p>
                  <div className="space-y-1.5">
                    {selectedConvo.employeeHistory.map(h => {
                      const emp = getEmployeeById(h.employeeId)
                      return (
                        <div key={h.employeeId} className="flex items-center gap-2.5 p-2.5 rounded-xl"
                          style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
                          <Avatar className="h-7 w-7 shrink-0">
                            <AvatarImage src={emp?.avatar} />
                            <AvatarFallback className="text-[9px] font-bold bg-primary/8 text-primary">
                              {h.employeeName.split(" ").map(n => n[0]).join("")}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-[12px] font-medium truncate">{h.employeeName}</p>
                            <p className="text-[10px] text-muted-foreground">{h.messageCount} messages</p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: "Engagement", value: selectedConvo.stats.engagementScore, suffix: "" },
                    { label: "Response", value: selectedConvo.stats.responseRate, suffix: "%" },
                    { label: "Messages", value: selectedConvo.stats.totalMessages, suffix: "" },
                    { label: "Avg. Reply", value: `${selectedConvo.stats.avgResponseTime}m`, suffix: "" },
                  ].map(({ label, value, suffix }) => (
                    <div key={label} className="p-2.5 rounded-xl text-center"
                      style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}>
                      <p className="text-[17px] font-bold gold-text leading-tight">{value}{suffix}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Quick Actions */}
                <div className="space-y-1.5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Quick Actions</p>
                  {[
                    { icon: Calendar, label: "Schedule Visit", action: "Site visit scheduled for this weekend" },
                    { icon: FileText, label: "Send Brochure", action: "Property brochure sent via WhatsApp" },
                    { icon: Clock, label: "Set Reminder", action: "Follow-up reminder set for tomorrow 10 AM" },
                  ].map(({ icon: Icon, label, action }) => (
                    <button key={label}
                      onClick={() => handleQuickAction(action)}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[12px] font-medium border border-border text-foreground hover:bg-primary/5 hover:border-primary/30 active:scale-[0.98] transition-all">
                      <Icon className="w-3.5 h-3.5 text-primary shrink-0" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Quick Action Feedback Toast */}
      <AnimatePresence>
        {actionFeedback && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-luxury-lg"
            style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}
          >
            <div className="w-6 h-6 rounded-full gold-gradient flex items-center justify-center shrink-0">
              <Check className="w-3 h-3 text-primary-foreground" />
            </div>
            <span className="text-[13px] font-medium">{actionFeedback}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </TooltipProvider>
  )
}


