"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { 
  Bot,
  Brain,
  Sparkles,
  Zap,
  Settings,
  Play,
  Pause,
  RefreshCw,
  Activity,
  MessageSquare,
  Target,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Cpu,
  Workflow
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const aiModules = [
  {
    id: "lead-scoring",
    name: "Lead Scoring AI",
    description: "Automatically score and prioritize leads based on behavior",
    icon: Target,
    status: "active",
    accuracy: 0,
    processed: 0,
    color: "text-green-600",
    bgColor: "bg-green-500/10"
  },
  {
    id: "smart-replies",
    name: "Smart Reply Suggestions",
    description: "AI-powered WhatsApp response recommendations",
    icon: MessageSquare,
    status: "active",
    accuracy: 0,
    processed: 0,
    color: "text-blue-600",
    bgColor: "bg-blue-500/10"
  },
  {
    id: "property-matching",
    name: "Property Matching Engine",
    description: "Match clients with ideal properties using preferences",
    icon: Sparkles,
    status: "active",
    accuracy: 0,
    processed: 0,
    color: "text-purple-600",
    bgColor: "bg-purple-500/10"
  },
  {
    id: "follow-up",
    name: "Follow-up Automation",
    description: "Schedule and send automated follow-up messages",
    icon: Clock,
    status: "paused",
    accuracy: 0,
    processed: 0,
    color: "text-primary",
    bgColor: "bg-primary/10"
  },
  {
    id: "sentiment",
    name: "Sentiment Analysis",
    description: "Analyze client communication sentiment",
    icon: Brain,
    status: "active",
    accuracy: 0,
    processed: 0,
    color: "text-pink-600",
    bgColor: "bg-pink-500/10"
  },
  {
    id: "duplicate",
    name: "Duplicate Detection",
    description: "Identify duplicate leads and merge records",
    icon: Workflow,
    status: "active",
    accuracy: 0,
    processed: 0,
    color: "text-cyan-600",
    bgColor: "bg-cyan-500/10"
  },
]

const recentActions: { action: string; details: string; time: string; type: "success" | "info" | "warning" }[] = []

export default function AIControlPage() {
  const [modules, setModules] = useState(aiModules)
  const [confidenceThreshold, setConfidenceThreshold] = useState([75])

  const toggleModule = (id: string) => {
    setModules(prev => prev.map(m => 
      m.id === id 
        ? { ...m, status: m.status === "active" ? "paused" : "active" }
        : m
    ))
  }

  const activeModules = modules.filter(m => m.status === "active").length
  const totalProcessed = modules.reduce((acc, m) => acc + m.processed, 0)
  const avgAccuracy = Math.round(modules.reduce((acc, m) => acc + m.accuracy, 0) / modules.length)

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20">
            <Bot className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">AI Control Center</h1>
            <p className="text-muted-foreground">Manage AI modules and automation settings</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync All
          </Button>
          <Button className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700">
            <Settings className="h-4 w-4 mr-2" />
            Global Settings
          </Button>
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
          { label: "Active Modules", value: `${activeModules}/${modules.length}`, icon: Cpu, color: "text-green-600" },
          { label: "Total Processed", value: totalProcessed.toLocaleString(), icon: Activity, color: "text-blue-600" },
          { label: "Avg Accuracy", value: `${avgAccuracy}%`, icon: Target, color: "text-purple-600" },
          { label: "Time Saved", value: "0 hrs", icon: Clock, color: "text-primary" },
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
        {/* AI Modules */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2 space-y-4"
        >
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            AI Modules
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {modules.map((module, index) => (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 + index * 0.05 }}
              >
                <Card className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 transition-all duration-300">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className={`p-2 rounded-lg ${module.bgColor}`}>
                        <module.icon className={`h-5 w-5 ${module.color}`} />
                      </div>
                      <Switch
                        checked={module.status === "active"}
                        onCheckedChange={() => toggleModule(module.id)}
                      />
                    </div>
                    <h3 className="font-semibold text-foreground mb-1">{module.name}</h3>
                    <p className="text-sm text-muted-foreground mb-3">{module.description}</p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Accuracy</span>
                        <span className="font-medium">{module.accuracy}%</span>
                      </div>
                      <Progress value={module.accuracy} className="h-1.5" />
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/50">
                      <span className="text-xs text-muted-foreground">
                        {module.processed.toLocaleString()} processed
                      </span>
                      <Badge className={
                        module.status === "active"
                          ? "bg-green-500/10 text-green-600 border-green-500/20"
                          : "bg-primary/10 text-primary border-primary/20"
                      }>
                        {module.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings className="h-4 w-4 text-primary" />
                  Global Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm">Confidence Threshold</Label>
                    <span className="text-sm font-medium">{confidenceThreshold}%</span>
                  </div>
                  <Slider
                    value={confidenceThreshold}
                    onValueChange={setConfidenceThreshold}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm">Processing Mode</Label>
                  <Select defaultValue="realtime">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="realtime">Real-time</SelectItem>
                      <SelectItem value="batch">Batch Processing</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center justify-between py-2">
                  <Label className="text-sm">Auto-approve suggestions</Label>
                  <Switch />
                </div>
                <div className="flex items-center justify-between py-2">
                  <Label className="text-sm">Learning mode</Label>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="h-4 w-4 text-primary" />
                  Recent AI Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentActions.map((action, index) => (
                  <div 
                    key={index}
                    className="flex items-start gap-3 pb-3 border-b border-border/30 last:border-0 last:pb-0"
                  >
                    <div className={`p-1.5 rounded-full shrink-0 ${
                      action.type === "success" ? "bg-green-500/10" :
                      action.type === "warning" ? "bg-primary/10" :
                      "bg-blue-500/10"
                    }`}>
                      {action.type === "success" ? (
                        <CheckCircle2 className="h-3 w-3 text-green-600" />
                      ) : action.type === "warning" ? (
                        <AlertCircle className="h-3 w-3 text-primary" />
                      ) : (
                        <Sparkles className="h-3 w-3 text-blue-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{action.action}</p>
                      <p className="text-xs text-muted-foreground truncate">{action.details}</p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5">{action.time}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
