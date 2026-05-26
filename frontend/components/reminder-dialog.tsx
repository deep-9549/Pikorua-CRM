"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Bell,
  CheckCircle2,
  Clock,
  Plus,
  Calendar,
  Phone,
  Users,
  FileText,
  Star,
  Trash2,
  Edit,
  X,
  AlertCircle,
  ChevronRight
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { reminders as initialReminders, Reminder, leads } from "@/lib/data"

interface ReminderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function formatDueDate(date: Date): string {
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (diff < 0) {
    const absMins = Math.abs(minutes)
    const absHours = Math.abs(hours)
    if (absMins < 60) return `${absMins}m overdue`
    if (absHours < 24) return `${absHours}h overdue`
    return `${Math.abs(days)}d overdue`
  }
  
  if (minutes < 60) return `in ${minutes}m`
  if (hours < 24) return `in ${hours}h`
  if (days < 7) return `in ${days}d`
  return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
}

function getCategoryIcon(category: Reminder["category"]) {
  switch (category) {
    case "call": return Phone
    case "meeting": return Users
    case "follow_up": return ChevronRight
    case "task": return FileText
    case "personal": return Star
    default: return Bell
  }
}

function getCategoryColor(category: Reminder["category"]) {
  switch (category) {
    case "call": return "bg-success/10 text-success"
    case "meeting": return "bg-primary/10 text-primary"
    case "follow_up": return "bg-amber-500/10 text-amber-600"
    case "task": return "bg-blue-500/10 text-blue-600"
    case "personal": return "bg-purple-500/10 text-purple-600"
    default: return "bg-muted text-muted-foreground"
  }
}

function getPriorityColor(priority: Reminder["priority"]) {
  switch (priority) {
    case "high": return "bg-destructive/10 text-destructive border-destructive/20"
    case "medium": return "bg-warning/10 text-warning border-warning/20"
    case "low": return "bg-muted text-muted-foreground border-border"
    default: return "bg-muted text-muted-foreground"
  }
}

export function ReminderDialog({ open, onOpenChange }: ReminderDialogProps) {
  const [reminders, setReminders] = React.useState(initialReminders)
  const [showAddReminder, setShowAddReminder] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState("pending")
  const [newReminder, setNewReminder] = React.useState({
    title: '',
    description: '',
    category: 'task' as Reminder["category"],
    priority: 'medium' as Reminder["priority"],
    dueDate: '',
    dueTime: '',
    relatedLeadId: 'none'
  })

  const pendingReminders = reminders.filter(r => r.status === 'pending')
  const completedReminders = reminders.filter(r => r.status === 'completed')
  const overdueReminders = pendingReminders.filter(r => new Date(r.dueDate) < new Date())
  const upcomingReminders = pendingReminders.filter(r => new Date(r.dueDate) >= new Date())

  const handleAddReminder = () => {
    if (!newReminder.title || !newReminder.dueDate) return

    const dueDateTime = new Date(`${newReminder.dueDate}T${newReminder.dueTime || '09:00'}`)
    
    const reminder: Reminder = {
      id: `rem-${Date.now()}`,
      userId: 'emp-1',
      title: newReminder.title,
      description: newReminder.description || undefined,
      category: newReminder.category,
      priority: newReminder.priority,
      dueDate: dueDateTime,
      status: 'pending',
      relatedLeadId: newReminder.relatedLeadId === 'none' ? undefined : newReminder.relatedLeadId
    }

    setReminders([...reminders, reminder])
    setShowAddReminder(false)
    setNewReminder({
      title: '',
      description: '',
      category: 'task',
      priority: 'medium',
      dueDate: '',
      dueTime: '',
      relatedLeadId: 'none'
    })
  }

  const toggleComplete = (id: string) => {
    setReminders(reminders.map(r => 
      r.id === id ? { ...r, status: r.status === 'completed' ? 'pending' : 'completed' } as Reminder : r
    ))
  }

  const deleteReminder = (id: string) => {
    setReminders(reminders.filter(r => r.id !== id))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden p-0">
        <div className="flex flex-col h-full max-h-[90vh]">
          {/* Header */}
          <div className="p-6 border-b border-border">
            <DialogHeader>
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle className="text-xl flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary" />
                    Reminders & To-Do
                  </DialogTitle>
                  <DialogDescription>
                    Manage your personal tasks and reminders
                  </DialogDescription>
                </div>
                <Button 
                  className="bg-gradient-to-r from-primary to-amber-600"
                  onClick={() => setShowAddReminder(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Reminder
                </Button>
              </div>
            </DialogHeader>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-3 mt-4">
              <div className="p-3 rounded-xl bg-muted/30 text-center">
                <p className="text-2xl font-bold">{pendingReminders.length}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
              <div className="p-3 rounded-xl bg-destructive/10 text-center">
                <p className="text-2xl font-bold text-destructive">{overdueReminders.length}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
              <div className="p-3 rounded-xl bg-success/10 text-center">
                <p className="text-2xl font-bold text-success">{completedReminders.length}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
              <div className="p-3 rounded-xl bg-primary/10 text-center">
                <p className="text-2xl font-bold text-primary">{upcomingReminders.length}</p>
                <p className="text-xs text-muted-foreground">Upcoming</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 min-h-0 flex flex-col">
            <TabsList className="shrink-0 mx-6 mt-4 grid w-auto grid-cols-3 bg-muted/50">
              <TabsTrigger value="pending" className="gap-2">
                <Clock className="w-4 h-4" />
                Pending
                {pendingReminders.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center">
                    {pendingReminders.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="overdue" className="gap-2">
                <AlertCircle className="w-4 h-4" />
                Overdue
                {overdueReminders.length > 0 && (
                  <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center bg-destructive">
                    {overdueReminders.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="completed" className="gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Completed
              </TabsTrigger>
            </TabsList>

            <div className="flex-1 min-h-0 overflow-y-auto scrollbar-luxury px-6 pb-6">
              <TabsContent value="pending" className="mt-4 space-y-3">
                {upcomingReminders.length > 0 ? (
                  upcomingReminders.map((reminder, index) => {
                    const Icon = getCategoryIcon(reminder.category)
                    const relatedLead = reminder.relatedLeadId 
                      ? leads.find(l => l.id === reminder.relatedLeadId)
                      : null
                    return (
                      <motion.div
                        key={reminder.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-start gap-4 p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors group"
                      >
                        <button
                          onClick={() => toggleComplete(reminder.id)}
                          className={cn(
                            "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                            reminder.status === 'completed' 
                              ? "bg-success border-success text-success-foreground"
                              : "border-muted-foreground/30 hover:border-primary"
                          )}
                        >
                          {reminder.status === 'completed' && <CheckCircle2 className="w-4 h-4" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{reminder.title}</span>
                            <Badge 
                              variant="outline" 
                              className={cn("text-[10px]", getPriorityColor(reminder.priority))}
                            >
                              {reminder.priority}
                            </Badge>
                          </div>
                          {reminder.description && (
                            <p className="text-sm text-muted-foreground mb-2">{reminder.description}</p>
                          )}
                          <div className="flex items-center gap-3">
                            <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded text-xs", getCategoryColor(reminder.category))}>
                              <Icon className="w-3 h-3" />
                              {reminder.category.replace('_', ' ')}
                            </div>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatDueDate(reminder.dueDate)}
                            </span>
                            {relatedLead && (
                              <span className="text-xs text-muted-foreground">
                                Lead: {relatedLead.name}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive"
                            onClick={() => deleteReminder(reminder.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </motion.div>
                    )
                  })
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle2 className="w-12 h-12 mx-auto text-success/50 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">All Clear!</h3>
                    <p className="text-muted-foreground">No pending reminders</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="overdue" className="mt-4 space-y-3">
                {overdueReminders.length > 0 ? (
                  overdueReminders.map((reminder, index) => {
                    const Icon = getCategoryIcon(reminder.category)
                    return (
                      <motion.div
                        key={reminder.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-start gap-4 p-4 rounded-xl bg-destructive/5 border border-destructive/20 group"
                      >
                        <button
                          onClick={() => toggleComplete(reminder.id)}
                          className="w-6 h-6 rounded-full border-2 border-destructive/30 flex items-center justify-center shrink-0 mt-0.5 hover:border-destructive"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium">{reminder.title}</span>
                            <Badge className="text-[10px] bg-destructive/10 text-destructive border-0">
                              Overdue
                            </Badge>
                          </div>
                          {reminder.description && (
                            <p className="text-sm text-muted-foreground mb-2">{reminder.description}</p>
                          )}
                          <div className="flex items-center gap-3">
                            <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded text-xs", getCategoryColor(reminder.category))}>
                              <Icon className="w-3 h-3" />
                              {reminder.category.replace('_', ' ')}
                            </div>
                            <span className="text-xs text-destructive flex items-center gap-1">
                              <AlertCircle className="w-3 h-3" />
                              {formatDueDate(reminder.dueDate)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-destructive"
                            onClick={() => deleteReminder(reminder.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </motion.div>
                    )
                  })
                ) : (
                  <div className="text-center py-12">
                    <CheckCircle2 className="w-12 h-12 mx-auto text-success/50 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Overdue Tasks</h3>
                    <p className="text-muted-foreground">Great job staying on top of things!</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="completed" className="mt-4 space-y-3">
                {completedReminders.length > 0 ? (
                  completedReminders.map((reminder, index) => {
                    const Icon = getCategoryIcon(reminder.category)
                    return (
                      <motion.div
                        key={reminder.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-start gap-4 p-4 rounded-xl bg-muted/20 group opacity-60"
                      >
                        <button
                          onClick={() => toggleComplete(reminder.id)}
                          className="w-6 h-6 rounded-full bg-success border-2 border-success flex items-center justify-center shrink-0 mt-0.5"
                        >
                          <CheckCircle2 className="w-4 h-4 text-success-foreground" />
                        </button>
                        <div className="flex-1 min-w-0">
                          <span className="font-medium line-through">{reminder.title}</span>
                          <div className="flex items-center gap-3 mt-1">
                            <div className={cn("flex items-center gap-1 px-2 py-0.5 rounded text-xs", getCategoryColor(reminder.category))}>
                              <Icon className="w-3 h-3" />
                              {reminder.category.replace('_', ' ')}
                            </div>
                          </div>
                        </div>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive"
                          onClick={() => deleteReminder(reminder.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </motion.div>
                    )
                  })
                ) : (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No Completed Tasks</h3>
                    <p className="text-muted-foreground">Complete some tasks to see them here</p>
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </div>

        {/* Add Reminder Modal */}
        <AnimatePresence>
          {showAddReminder && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-6"
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="w-full max-w-md bg-card rounded-xl border border-border shadow-luxury p-6"
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold">New Reminder</h3>
                  <Button variant="ghost" size="icon" onClick={() => setShowAddReminder(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input 
                      placeholder="What do you need to remember?"
                      value={newReminder.title}
                      onChange={(e) => setNewReminder({...newReminder, title: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Description (Optional)</Label>
                    <Textarea 
                      placeholder="Add more details..."
                      value={newReminder.description}
                      onChange={(e) => setNewReminder({...newReminder, description: e.target.value})}
                      className="min-h-[80px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select 
                        value={newReminder.category}
                        onValueChange={(v: Reminder["category"]) => setNewReminder({...newReminder, category: v})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="call">Call</SelectItem>
                          <SelectItem value="meeting">Meeting</SelectItem>
                          <SelectItem value="follow_up">Follow Up</SelectItem>
                          <SelectItem value="task">Task</SelectItem>
                          <SelectItem value="personal">Personal</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Priority</Label>
                      <Select 
                        value={newReminder.priority}
                        onValueChange={(v: Reminder["priority"]) => setNewReminder({...newReminder, priority: v})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Due Date</Label>
                      <Input 
                        type="date"
                        value={newReminder.dueDate}
                        onChange={(e) => setNewReminder({...newReminder, dueDate: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Time</Label>
                      <Input 
                        type="time"
                        value={newReminder.dueTime}
                        onChange={(e) => setNewReminder({...newReminder, dueTime: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Related Lead (Optional)</Label>
                    <Select 
                      value={newReminder.relatedLeadId}
                      onValueChange={(v) => setNewReminder({...newReminder, relatedLeadId: v})}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a lead" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {leads.slice(0, 10).map(lead => (
                          <SelectItem key={lead.id} value={lead.id}>{lead.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" onClick={() => setShowAddReminder(false)}>
                      Cancel
                    </Button>
                    <Button 
                      className="bg-gradient-to-r from-primary to-amber-600"
                      onClick={handleAddReminder}
                      disabled={!newReminder.title || !newReminder.dueDate}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Reminder
                    </Button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  )
}

