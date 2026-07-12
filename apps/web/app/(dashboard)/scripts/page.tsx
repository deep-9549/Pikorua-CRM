"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  FileText,
  Search,
  Copy,
  Check,
  ChevronRight,
  Phone,
  MessageSquare,
  Building2,
  DollarSign,
  Calendar,
  Star,
  Sparkles,
  BookOpen
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { callingScripts } from "@/lib/data"

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "Cold Call": Phone,
  "Follow Up": Calendar,
  "Site Visit": Building2,
  "Negotiation": DollarSign,
  "Objection Handling": MessageSquare,
  "Closing": Star,
}

type CallingScript = (typeof callingScripts)[number]

export default function CallingScriptsPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [selectedScript, setSelectedScript] = useState<CallingScript | null>(() => callingScripts[0] ?? null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const categories = ["all", ...Array.from(new Set(callingScripts.map(s => s.category)))]

  const filteredScripts = callingScripts.filter(script => {
    const matchesSearch = script.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          script.content.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "all" || script.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleCopy = (script: CallingScript) => {
    navigator.clipboard.writeText(script.content)
    setCopiedId(script.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-orange-600/20">
            <FileText className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Calling Scripts</h1>
            <p className="text-muted-foreground">Pre-written scripts for different sales scenarios</p>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          { label: "Total Scripts", value: callingScripts.length, icon: FileText, color: "text-primary" },
          { label: "Categories", value: categories.length - 1, icon: BookOpen, color: "text-blue-600" },
          { label: "Primary Use", value: "First Call", icon: Phone, color: "text-green-600" },
          { label: "Status", value: "Live", icon: Star, color: "text-primary" },
        ].map((stat) => (
          <Card key={stat.label} className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
                <stat.icon className={`h-8 w-8 ${stat.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scripts List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-1 space-y-4"
        >
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search scripts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-wrap gap-2 mb-4">
                {categories.map((category) => (
                  <Badge
                    key={category}
                    variant={selectedCategory === category ? "default" : "secondary"}
                    className={`cursor-pointer transition-all ${
                      selectedCategory === category 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted/50 hover:bg-muted"
                    }`}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category === "all" ? "All" : category}
                  </Badge>
                ))}
              </div>

              <ScrollArea className="h-[55dvh] pr-2 sm:h-[500px] sm:pr-4">
                <div className="space-y-3">
                  {filteredScripts.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border/70 p-4 text-sm text-muted-foreground">
                      No scripts match this search.
                    </div>
                  ) : filteredScripts.map((script, index) => {
                    const CategoryIcon = categoryIcons[script.category] || FileText
                    const isSelected = selectedScript?.id === script.id

                    return (
                      <motion.div
                        key={script.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.03 }}
                      >
                        <Card 
                          className={`cursor-pointer transition-all duration-200 ${
                            isSelected 
                              ? "border-primary bg-primary/5 shadow-md" 
                              : "border-border/50 hover:border-primary/30 hover:bg-muted/30"
                          }`}
                          onClick={() => setSelectedScript(script)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start gap-3">
                              <div className={`p-2 rounded-lg shrink-0 ${
                                isSelected ? "bg-primary/20" : "bg-muted"
                              }`}>
                                <CategoryIcon className={`h-4 w-4 ${
                                  isSelected ? "text-primary" : "text-muted-foreground"
                                }`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-medium text-foreground text-sm truncate">
                                  {script.title}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {script.category}
                                </p>
                              </div>
                              <ChevronRight className={`h-4 w-4 shrink-0 transition-transform ${
                                isSelected ? "text-primary rotate-90" : "text-muted-foreground"
                              }`} />
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </motion.div>

        {/* Script Preview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <AnimatePresence mode="wait">
            {selectedScript ? (
              <motion.div
                key={selectedScript.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm h-full">
                  <CardHeader className="border-b border-border/50">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          {(() => {
                            const Icon = categoryIcons[selectedScript.category] || FileText
                            return <Icon className="h-5 w-5 text-primary" />
                          })()}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{selectedScript.title}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-0.5">
                            {selectedScript.category} - {selectedScript.language}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopy(selectedScript)}
                      >
                        {copiedId === selectedScript.id ? (
                          <>
                            <Check className="h-4 w-4 mr-2 text-green-600" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 mr-2" />
                            Copy Script
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="prose prose-sm max-w-none">
                      <div className="bg-muted/30 rounded-lg p-4 border border-border/50">
                        <pre className="whitespace-pre-wrap text-sm text-foreground font-sans leading-relaxed">
                          {selectedScript.content}
                        </pre>
                      </div>
                    </div>

                    {selectedScript.tips && selectedScript.tips.length > 0 && (
                      <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                        <h4 className="font-medium text-foreground flex items-center gap-2 mb-3">
                          <Sparkles className="h-4 w-4 text-primary" />
                          Pro Tips
                        </h4>
                        <ul className="space-y-2">
                          {selectedScript.tips.map((tip, index) => (
                            <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                              <span className="text-primary mt-1">-</span>
                              {tip}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm h-full">
                  <CardContent className="flex min-h-[50dvh] flex-col items-center justify-center sm:h-[600px]">
                    <div className="p-4 rounded-full bg-muted/50 mb-4">
                      <FileText className="h-12 w-12 text-muted-foreground/50" />
                    </div>
                    <p className="text-muted-foreground text-center">
                      Select a script from the list to preview
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
