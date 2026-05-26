"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Users,
  UserPlus,
  Search,
  Filter,
  MoreVertical,
  Phone,
  Mail,
  Calendar,
  Target,
  TrendingUp,
  Award,
  Star,
  ChevronRight,
  Edit,
  Trash2,
  Clock,
  MessageSquare,
  FileText,
  CheckCircle2,
  XCircle,
  ArrowUp,
  ArrowDown,
  Activity,
  BarChart3,
  X
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { employeesUI as employees, employeeActivities, employeeGoals, EmployeeActivity, EmployeeGoal } from "@/lib/data"

const performanceRanks = [
  { rank: "Gold", color: "text-amber-500", bgColor: "bg-amber-500/10" },
  { rank: "Silver", color: "text-slate-400", bgColor: "bg-slate-400/10" },
  { rank: "Bronze", color: "text-orange-600", bgColor: "bg-orange-600/10" },
]

function formatTimeAgo(date: Date): string {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function getActivityIcon(type: EmployeeActivity["type"]) {
  switch (type) {
    case "call": return Phone
    case "meeting": return Users
    case "site_visit": return Calendar
    case "email": return Mail
    case "whatsapp": return MessageSquare
    case "note": return FileText
    case "lead_update": return Edit
    default: return Activity
  }
}

function getActivityColor(type: EmployeeActivity["type"]) {
  switch (type) {
    case "call": return "bg-success/10 text-success"
    case "meeting": return "bg-primary/10 text-primary"
    case "site_visit": return "bg-amber-500/10 text-amber-600"
    case "email": return "bg-blue-500/10 text-blue-600"
    case "whatsapp": return "bg-green-500/10 text-green-600"
    case "note": return "bg-purple-500/10 text-purple-600"
    case "lead_update": return "bg-info/10 text-info"
    default: return "bg-muted text-muted-foreground"
  }
}

function EmployeeDetailModal({ 
  employee, 
  onClose 
}: { 
  employee: typeof employees[0] | null
  onClose: () => void 
}) {
  if (!employee) return null

  const activities = employeeActivities.filter(a => a.employeeId === employee.id)
  const goals = employeeGoals.filter(g => g.employeeId === employee.id)

  // Calculate stats
  const totalCalls = activities.filter(a => a.type === 'call').length
  const totalMeetings = activities.filter(a => a.type === 'meeting').length
  const totalSiteVisits = activities.filter(a => a.type === 'site_visit').length
  const positiveOutcomes = activities.filter(a => a.outcome === 'positive').length
  const totalWithOutcome = activities.filter(a => a.outcome).length
  const successRate = totalWithOutcome > 0 ? Math.round((positiveOutcomes / totalWithOutcome) * 100) : 0

  // Calculate total time spent
  const totalMinutes = activities.reduce((acc, a) => acc + (a.duration || 0), 0)
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60

  return (
    <Dialog open={!!employee} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden p-0">
        <div className="flex flex-col h-full max-h-[90vh]">
          {/* Header */}
          <div className="p-6 border-b border-border bg-gradient-to-r from-primary/5 to-amber-500/5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border-4 border-primary/20">
                  <AvatarImage src={employee.avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-bold">
                    {employee.name.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-2xl font-bold">{employee.name}</h2>
                  <p className="text-muted-foreground">{employee.role}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <Badge className={employee.status === "active" 
                      ? "bg-green-500/10 text-green-600 border-green-500/20"
                      : "bg-slate-500/10 text-slate-600 border-slate-500/20"
                    }>
                      {employee.status === "active" ? "Online" : "Offline"}
                    </Badge>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {employee.email}
                    </span>
                    <span className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {employee.phone}
                    </span>
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Stats Overview */}
          <div className="p-6 border-b border-border">
            <div className="grid grid-cols-5 gap-4">
              <div className="p-4 rounded-xl bg-muted/30 text-center">
                <Phone className="w-5 h-5 mx-auto mb-2 text-success" />
                <p className="text-2xl font-bold">{totalCalls}</p>
                <p className="text-xs text-muted-foreground">Calls Today</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/30 text-center">
                <Users className="w-5 h-5 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{totalMeetings}</p>
                <p className="text-xs text-muted-foreground">Meetings</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/30 text-center">
                <Calendar className="w-5 h-5 mx-auto mb-2 text-amber-500" />
                <p className="text-2xl font-bold">{totalSiteVisits}</p>
                <p className="text-xs text-muted-foreground">Site Visits</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/30 text-center">
                <Clock className="w-5 h-5 mx-auto mb-2 text-blue-500" />
                <p className="text-2xl font-bold">{hours}h {mins}m</p>
                <p className="text-xs text-muted-foreground">Active Time</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/30 text-center">
                <TrendingUp className="w-5 h-5 mx-auto mb-2 text-success" />
                <p className="text-2xl font-bold text-success">{successRate}%</p>
                <p className="text-xs text-muted-foreground">Success Rate</p>
              </div>
            </div>
          </div>

          {/* Tabs Content */}
          <Tabs defaultValue="activity" className="flex-1 flex flex-col min-h-0">
            <TabsList className="shrink-0 mx-6 mt-4 grid w-auto grid-cols-3 bg-muted/50">
              <TabsTrigger value="activity" className="gap-2">
                <Activity className="w-4 h-4" />
                Activity Timeline
              </TabsTrigger>
              <TabsTrigger value="goals" className="gap-2">
                <Target className="w-4 h-4" />
                Goals & Targets
              </TabsTrigger>
              <TabsTrigger value="performance" className="gap-2">
                <BarChart3 className="w-4 h-4" />
                Performance
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-luxury px-6 pb-6">
              <TabsContent value="activity" className="mt-4 space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Today&apos;s Activity</h3>
                  <Badge variant="outline">{activities.length} activities</Badge>
                </div>
                
                {activities.length > 0 ? (
                  <div className="space-y-3">
                    {activities.map((activity, index) => {
                      const Icon = getActivityIcon(activity.type)
                      return (
                        <motion.div
                          key={activity.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${getActivityColor(activity.type)}`}>
                            <Icon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-medium">{activity.description}</p>
                              <span className="text-xs text-muted-foreground">
                                {formatTimeAgo(activity.timestamp)}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              {activity.leadName && (
                                <span className="text-sm text-muted-foreground">
                                  Lead: <span className="text-foreground">{activity.leadName}</span>
                                </span>
                              )}
                              {activity.duration && (
                                <span className="text-sm text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {activity.duration} mins
                                </span>
                              )}
                              {activity.outcome && (
                                <Badge className={
                                  activity.outcome === "positive" 
                                    ? "bg-success/10 text-success border-0"
                                    : activity.outcome === "negative"
                                    ? "bg-destructive/10 text-destructive border-0"
                                    : "bg-muted text-muted-foreground border-0"
                                }>
                                  {activity.outcome === "positive" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                  {activity.outcome === "negative" && <XCircle className="w-3 h-3 mr-1" />}
                                  {activity.outcome.charAt(0).toUpperCase() + activity.outcome.slice(1)}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Activity className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Activity Yet</h3>
                    <p className="text-muted-foreground">
                      This employee has no recorded activity for today
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="goals" className="mt-4 space-y-6">
                {/* Daily Goals */}
                <div>
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    Daily Goals
                  </h3>
                  <div className="space-y-4">
                    {goals.filter(g => g.period === 'daily').map((goal) => {
                      const progress = Math.min((goal.current / goal.target) * 100, 100)
                      const isAchieved = goal.current >= goal.target
                      return (
                        <div key={goal.id} className="p-4 rounded-xl bg-muted/30">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{goal.title}</span>
                              {isAchieved && (
                                <Badge className="bg-success/10 text-success border-0">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Achieved
                                </Badge>
                              )}
                            </div>
                            <span className="text-sm">
                              <span className={isAchieved ? "text-success font-bold" : "font-bold"}>
                                {goal.current}
                              </span>
                              <span className="text-muted-foreground"> / {goal.target} {goal.unit}</span>
                            </span>
                          </div>
                          <Progress 
                            value={progress} 
                            className={`h-2 ${isAchieved ? '[&>div]:bg-success' : ''}`}
                          />
                          {!isAchieved && (
                            <p className="text-xs text-muted-foreground mt-2">
                              {goal.target - goal.current} more {goal.unit} to achieve target
                            </p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Weekly Goals */}
                <div>
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-500" />
                    Weekly Goals
                  </h3>
                  <div className="space-y-4">
                    {goals.filter(g => g.period === 'weekly').map((goal) => {
                      const progress = Math.min((goal.current / goal.target) * 100, 100)
                      const isAchieved = goal.current >= goal.target
                      return (
                        <div key={goal.id} className="p-4 rounded-xl bg-muted/30">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{goal.title}</span>
                              {isAchieved && (
                                <Badge className="bg-success/10 text-success border-0">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Achieved
                                </Badge>
                              )}
                            </div>
                            <span className="text-sm">
                              <span className={isAchieved ? "text-success font-bold" : "font-bold"}>
                                {goal.current}
                              </span>
                              <span className="text-muted-foreground"> / {goal.target} {goal.unit}</span>
                            </span>
                          </div>
                          <Progress 
                            value={progress} 
                            className={`h-2 ${isAchieved ? '[&>div]:bg-success' : ''}`}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Monthly Goals */}
                <div>
                  <h3 className="font-semibold mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-blue-500" />
                    Monthly Goals
                  </h3>
                  <div className="space-y-4">
                    {goals.filter(g => g.period === 'monthly').map((goal) => {
                      const progress = Math.min((goal.current / goal.target) * 100, 100)
                      const isAchieved = goal.current >= goal.target
                      return (
                        <div key={goal.id} className="p-4 rounded-xl bg-muted/30">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{goal.title}</span>
                              {isAchieved && (
                                <Badge className="bg-success/10 text-success border-0">
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Achieved
                                </Badge>
                              )}
                            </div>
                            <span className="text-sm">
                              <span className={isAchieved ? "text-success font-bold" : "font-bold"}>
                                {goal.unit === '₹' ? `₹${(goal.current / 10000000).toFixed(1)} Cr` : goal.current}
                              </span>
                              <span className="text-muted-foreground">
                                {' / '}
                                {goal.unit === '₹' ? `₹${(goal.target / 10000000).toFixed(0)} Cr` : `${goal.target} ${goal.unit}`}
                              </span>
                            </span>
                          </div>
                          <Progress 
                            value={progress} 
                            className={`h-2 ${isAchieved ? '[&>div]:bg-success' : ''}`}
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>

                {goals.filter(g => g.employeeId === employee.id).length === 0 && (
                  <div className="text-center py-12">
                    <Target className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Goals Set</h3>
                    <p className="text-muted-foreground">
                      Set targets to track this employee&apos;s progress
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="performance" className="mt-4 space-y-6">
                {/* Performance Overview */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-6 rounded-xl bg-gradient-to-br from-primary/10 to-amber-500/10 border border-primary/20">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-muted-foreground">Performance Score</span>
                      <Badge className="bg-primary/10 text-primary border-0">
                        {employee.performance >= 80 ? 'Excellent' : employee.performance >= 60 ? 'Good' : 'Needs Improvement'}
                      </Badge>
                    </div>
                    <div className="text-4xl font-bold mb-2">{employee.performance}%</div>
                    <Progress value={employee.performance} className="h-2" />
                  </div>
                  <div className="p-6 rounded-xl bg-muted/30">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm text-muted-foreground">Total Conversions</span>
                      <div className="flex items-center gap-1 text-success">
                        <ArrowUp className="w-4 h-4" />
                        <span className="text-sm">+15%</span>
                      </div>
                    </div>
                    <div className="text-4xl font-bold">{employee.conversions}</div>
                    <p className="text-sm text-muted-foreground mt-1">This month</p>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div>
                  <h3 className="font-semibold mb-4">Key Metrics</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center">
                          <Phone className="w-5 h-5 text-success" />
                        </div>
                        <div>
                          <p className="font-medium">Call Conversion Rate</p>
                          <p className="text-sm text-muted-foreground">Calls that led to meetings</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-success">32%</p>
                        <div className="flex items-center gap-1 text-success text-sm">
                          <ArrowUp className="w-3 h-3" />
                          +5%
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Calendar className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">Site Visit Success</p>
                          <p className="text-sm text-muted-foreground">Visits that led to deals</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-primary">45%</p>
                        <div className="flex items-center gap-1 text-success text-sm">
                          <ArrowUp className="w-3 h-3" />
                          +8%
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                          <Clock className="w-5 h-5 text-amber-500" />
                        </div>
                        <div>
                          <p className="font-medium">Average Response Time</p>
                          <p className="text-sm text-muted-foreground">Time to first contact</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-amber-500">12 min</p>
                        <div className="flex items-center gap-1 text-success text-sm">
                          <ArrowDown className="w-3 h-3" />
                          -3 min
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function EmployeesPage() {
  const [searchQuery, setSearchQuery] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<typeof employees[0] | null>(null)

  const filteredEmployees = employees.filter(emp =>
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.role.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalConversions = employees.reduce((acc, emp) => acc + emp.conversions, 0)
  const avgPerformance = Math.round(employees.reduce((acc, emp) => acc + emp.performance, 0) / employees.length)

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-amber-500/20">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Employee Management</h1>
            <p className="text-muted-foreground">Manage team members and track performance</p>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-to-r from-primary to-amber-600 hover:from-primary/90 hover:to-amber-600/90">
              <UserPlus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New Employee</DialogTitle>
              <DialogDescription>
                Create a new team member profile
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>First Name</Label>
                  <Input placeholder="John" />
                </div>
                <div className="grid gap-2">
                  <Label>Last Name</Label>
                  <Input placeholder="Doe" />
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input type="email" placeholder="john@company.com" />
              </div>
              <div className="grid gap-2">
                <Label>Phone</Label>
                <Input type="tel" placeholder="+91 98765 43210" />
              </div>
              <div className="grid gap-2">
                <Label>Role</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sales">Sales Executive</SelectItem>
                    <SelectItem value="senior-sales">Senior Sales Executive</SelectItem>
                    <SelectItem value="manager">Sales Manager</SelectItem>
                    <SelectItem value="team-lead">Team Lead</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Department</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential">Residential Sales</SelectItem>
                    <SelectItem value="commercial">Commercial Sales</SelectItem>
                    <SelectItem value="luxury">Luxury Properties</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                className="bg-gradient-to-r from-primary to-amber-600"
                onClick={() => setDialogOpen(false)}
              >
                Add Employee
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          { label: "Total Employees", value: employees.length, icon: Users, color: "text-primary" },
          { label: "Active Today", value: employees.filter(e => e.status === "active").length, icon: Target, color: "text-green-600" },
          { label: "Total Conversions", value: totalConversions, icon: TrendingUp, color: "text-blue-600" },
          { label: "Avg Performance", value: `${avgPerformance}%`, icon: Award, color: "text-amber-600" },
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

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees by name or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button variant="outline">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Employee Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {filteredEmployees.map((employee, index) => {
          const rankInfo = performanceRanks[index % 3]
          
          return (
            <motion.div
              key={employee.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.4 + index * 0.05 }}
            >
              <Card 
                className="border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 overflow-hidden cursor-pointer"
                onClick={() => setSelectedEmployee(employee)}
              >
                <div className="h-2 bg-gradient-to-r from-primary to-amber-500" />
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12 border-2 border-primary/20">
                        <AvatarImage src={employee.avatar} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {employee.name.split(" ").map(n => n[0]).join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold text-foreground">{employee.name}</h3>
                        <p className="text-sm text-muted-foreground">{employee.role}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => {
                          e.stopPropagation()
                          setSelectedEmployee(employee)
                        }}>
                          <Activity className="h-4 w-4 mr-2" />
                          View Activity
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                          <Edit className="h-4 w-4 mr-2" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={(e) => e.stopPropagation()}>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      {employee.phone}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {employee.email}
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Performance</span>
                      <span className="font-medium">{employee.performance}%</span>
                    </div>
                    <Progress value={employee.performance} className="h-2" />
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-border/50">
                    <div className="flex items-center gap-2">
                      <Badge className={`${rankInfo.bgColor} ${rankInfo.color} border-0`}>
                        <Star className="h-3 w-3 mr-1 fill-current" />
                        {rankInfo.rank}
                      </Badge>
                      <Badge variant="secondary" className="bg-muted/50">
                        {employee.conversions} conversions
                      </Badge>
                    </div>
                    <Badge className={
                      employee.status === "active"
                        ? "bg-green-500/10 text-green-600 border-green-500/20"
                        : "bg-slate-500/10 text-slate-600 border-slate-500/20"
                    }>
                      {employee.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </motion.div>

      {/* Employee Detail Modal */}
      <EmployeeDetailModal 
        employee={selectedEmployee} 
        onClose={() => setSelectedEmployee(null)} 
      />
    </div>
  )
}

