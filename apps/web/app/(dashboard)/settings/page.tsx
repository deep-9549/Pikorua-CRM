"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { getAuthUser } from "@/lib/auth/cookies"
import { 
  Settings,
  User,
  Bell,
  Shield,
  Palette,
  Globe,
  Database,
  Key,
  Mail,
  Smartphone,
  Moon,
  Sun,
  Save,
  ChevronRight,
  Users,
  UserPlus,
  Trash2,
  Edit,
  MoreVertical,
  Eye,
  EyeOff,
  Lock,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Search
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { employeesUI as initialEmployees } from "@/lib/data"

interface ManagedEmployee {
  id: string
  name: string
  email: string
  phone: string
  role: string
  status: "active" | "inactive"
  avatar?: string
  department: string
  joinedDate: string
  lastActive: string
}

const managedEmployees: ManagedEmployee[] = initialEmployees.map((emp, i) => ({
  id: emp.id,
  name: emp.name,
  email: emp.email,
  phone: emp.phone,
  role: emp.role,
  status: emp.status,
  avatar: emp.avatar,
  department: ['Residential Sales', 'Commercial Sales', 'Luxury Properties'][i % 3],
  joinedDate: `202${3 - (i % 2)}-0${(i % 9) + 1}-15`,
  lastActive: emp.status === 'active' ? 'Online Now' : '2 hours ago'
}))

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile")
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)

  // Employee management is restricted to super admins.
  useEffect(() => {
    setIsSuperAdmin(getAuthUser()?.role === "super_admin")
  }, [])
  const [employees, setEmployees] = useState(managedEmployees)
  const [searchQuery, setSearchQuery] = useState("")
  const [showAddEmployee, setShowAddEmployee] = useState(false)
  const [showEditEmployee, setShowEditEmployee] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState<ManagedEmployee | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  
  // Form states
  const [newEmployee, setNewEmployee] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    role: '',
    department: '',
    password: '',
    confirmPassword: ''
  })

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.role.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAddEmployee = () => {
    const newEmp: ManagedEmployee = {
      id: `emp-${Date.now()}`,
      name: `${newEmployee.firstName} ${newEmployee.lastName}`,
      email: newEmployee.email,
      phone: newEmployee.phone,
      role: newEmployee.role,
      status: 'active',
      department: newEmployee.department,
      joinedDate: new Date().toISOString().split('T')[0],
      lastActive: 'Just now'
    }
    setEmployees([...employees, newEmp])
    setShowAddEmployee(false)
    setNewEmployee({ firstName: '', lastName: '', email: '', phone: '', role: '', department: '', password: '', confirmPassword: '' })
  }

  const handleDeleteEmployee = () => {
    if (selectedEmployee) {
      setEmployees(employees.filter(e => e.id !== selectedEmployee.id))
      setShowDeleteConfirm(false)
      setSelectedEmployee(null)
    }
  }

  const handleUpdateEmployee = () => {
    if (selectedEmployee) {
      setEmployees(employees.map(e => e.id === selectedEmployee.id ? selectedEmployee : e))
      setShowEditEmployee(false)
      setSelectedEmployee(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="p-2 rounded-xl bg-gradient-to-br from-primary/20 to-orange-600/20">
          <Settings className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage your account and application preferences</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/50 border border-border/50 p-1">
            <TabsTrigger value="profile" className="data-[state=active]:bg-background">
              <User className="h-4 w-4 mr-2" />
              Profile
            </TabsTrigger>
            {isSuperAdmin && (
              <TabsTrigger value="employees" className="data-[state=active]:bg-background">
                <Users className="h-4 w-4 mr-2" />
                Employees
              </TabsTrigger>
            )}
            <TabsTrigger value="notifications" className="data-[state=active]:bg-background">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="appearance" className="data-[state=active]:bg-background">
              <Palette className="h-4 w-4 mr-2" />
              Appearance
            </TabsTrigger>
            <TabsTrigger value="security" className="data-[state=active]:bg-background">
              <Shield className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger value="integrations" className="data-[state=active]:bg-background">
              <Database className="h-4 w-4 mr-2" />
              Integrations
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <div className="grid gap-6">
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>Update your personal details and profile picture</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center gap-6">
                    <Avatar className="h-20 w-20 border-2 border-primary/20">
                      <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                        --
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <Button variant="outline" size="sm">Change Photo</Button>
                      <p className="text-xs text-muted-foreground mt-2">JPG, PNG or GIF. Max 2MB</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name</Label>
                      <Input placeholder="First name" />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      <Input placeholder="Last name" />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input type="email" placeholder="you@company.com" />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input type="tel" placeholder="Phone number" />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Role</Label>
                      <Input defaultValue="Super Admin" disabled />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button className="bg-gradient-to-r from-primary to-orange-700">
                      <Save className="h-4 w-4 mr-2" />
                      Save Changes
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Employees Tab - Super Admin Panel */}
          {isSuperAdmin && (
          <TabsContent value="employees">
            <div className="grid gap-6">
              {/* Header with Add Button */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Employee Management</h2>
                  <p className="text-muted-foreground">Add, edit, and manage employee accounts</p>
                </div>
                <Button 
                  className="bg-gradient-to-r from-primary to-orange-700"
                  onClick={() => setShowAddEmployee(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Employee
                </Button>
              </div>

              {/* Search */}
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardContent className="p-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search employees by name, email, or role..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Employee List */}
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>All Employees ({filteredEmployees.length})</span>
                    <Badge variant="outline">{employees.filter(e => e.status === 'active').length} Active</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {filteredEmployees.map((employee) => (
                      <div 
                        key={employee.id}
                        className="flex items-center justify-between p-4 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12 border-2 border-primary/20">
                            <AvatarImage src={employee.avatar} />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                              {employee.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold">{employee.name}</h4>
                              <Badge className={
                                employee.status === 'active'
                                  ? "bg-green-500/10 text-green-600 border-0"
                                  : "bg-slate-500/10 text-slate-600 border-0"
                              }>
                                {employee.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{employee.email}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-muted-foreground">{employee.role}</span>
                              <span className="text-xs text-muted-foreground">|</span>
                              <span className="text-xs text-muted-foreground">{employee.department}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground mr-4">{employee.lastActive}</span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => {
                                setSelectedEmployee(employee)
                                setShowEditEmployee(true)
                              }}>
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Details
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                setSelectedEmployee(employee)
                                setShowResetPassword(true)
                              }}>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Reset Password
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => {
                                  setSelectedEmployee(employee)
                                  setShowDeleteConfirm(true)
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Employee
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          )}

          {/* Notifications Tab */}
          <TabsContent value="notifications">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose how you want to receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {[
                  { title: "New Lead Alerts", description: "Get notified when a new lead is assigned", icon: User },
                  { title: "Site Visit Reminders", description: "Reminders before scheduled site visits", icon: Bell },
                  { title: "WhatsApp Messages", description: "Notifications for new WhatsApp messages", icon: Smartphone },
                  { title: "Booking Confirmations", description: "Alerts for confirmed bookings", icon: Mail },
                  { title: "Daily Reports", description: "Daily summary of activities", icon: Database },
                ].map((item) => (
                  <div key={item.title} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-muted">
                        <item.icon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{item.title}</p>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Appearance Settings</CardTitle>
                <CardDescription>Customize the look and feel of your dashboard</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <Label>Theme</Label>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { value: "light", label: "Light", icon: Sun },
                      { value: "dark", label: "Dark", icon: Moon },
                      { value: "system", label: "System", icon: Globe },
                    ].map((theme) => (
                      <Card
                        key={theme.value}
                        className={`cursor-pointer border-2 transition-all ${
                          theme.value === "dark"
                            ? "border-primary bg-primary/5"
                            : "border-border/50 hover:border-primary/30"
                        }`}
                      >
                        <CardContent className="flex flex-col items-center justify-center p-4">
                          <theme.icon className="h-6 w-6 mb-2 text-foreground" />
                          <span className="text-sm font-medium">{theme.label}</span>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label>Language</Label>
                  <SearchableSelect
                    defaultValue="en"
                    options={[
                      { value: "en", label: "English" },
                      { value: "hi", label: "Hindi" },
                      { value: "mr", label: "Marathi" },
                    ]}
                    searchPlaceholder="Search language..."
                    triggerClassName="w-full md:w-[300px]"
                  />
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label>Date Format</Label>
                  <SearchableSelect
                    defaultValue="dd-mm-yyyy"
                    options={[
                      { value: "dd-mm-yyyy", label: "DD-MM-YYYY" },
                      { value: "mm-dd-yyyy", label: "MM-DD-YYYY" },
                      { value: "yyyy-mm-dd", label: "YYYY-MM-DD" },
                    ]}
                    searchPlaceholder="Search date format..."
                    triggerClassName="w-full md:w-[300px]"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <div className="grid gap-6">
              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Change Password</CardTitle>
                  <CardDescription>Update your password regularly for security</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Current Password</Label>
                    <Input type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label>New Password</Label>
                    <Input type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label>Confirm New Password</Label>
                    <Input type="password" />
                  </div>
                  <Button className="bg-gradient-to-r from-primary to-orange-700">
                    Update Password
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle>Two-Factor Authentication</CardTitle>
                  <CardDescription>Add an extra layer of security to your account</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-green-500/10">
                        <Shield className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">2FA Enabled</p>
                        <p className="text-sm text-muted-foreground">Your account is protected</p>
                      </div>
                    </div>
                    <Switch defaultChecked />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Connected Services</CardTitle>
                <CardDescription>Manage your third-party integrations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { name: "WhatsApp Business API", status: "connected", color: "text-green-600" },
                  { name: "Meta Ads Manager", status: "connected", color: "text-green-600" },
                  { name: "Google Calendar", status: "connected", color: "text-green-600" },
                  { name: "Razorpay", status: "pending", color: "text-primary" },
                  { name: "Zoho CRM", status: "disconnected", color: "text-muted-foreground" },
                ].map((integration) => (
                  <div key={integration.name} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                    <div className="flex items-center gap-4">
                      <div className="p-2 rounded-lg bg-muted">
                        <Database className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{integration.name}</p>
                        <p className={`text-sm ${integration.color}`}>
                          {integration.status.charAt(0).toUpperCase() + integration.status.slice(1)}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      {integration.status === "connected" ? "Manage" : "Connect"}
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {/* Add Employee Dialog */}
      <Dialog open={showAddEmployee} onOpenChange={setShowAddEmployee}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add New Employee</DialogTitle>
            <DialogDescription>
              Create a new employee account with login credentials
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input 
                  placeholder="John"
                  value={newEmployee.firstName}
                  onChange={(e) => setNewEmployee({...newEmployee, firstName: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input 
                  placeholder="Doe"
                  value={newEmployee.lastName}
                  onChange={(e) => setNewEmployee({...newEmployee, lastName: e.target.value})}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input 
                type="email" 
                placeholder="user@company.com"
                value={newEmployee.email}
                onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input 
                type="tel" 
                placeholder="Phone number"
                value={newEmployee.phone}
                onChange={(e) => setNewEmployee({...newEmployee, phone: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role</Label>
                <SearchableSelect
                  value={newEmployee.role}
                  onValueChange={(v) => setNewEmployee({...newEmployee, role: v})}
                  options={[
                    { value: "Sales Executive", label: "Sales Executive" },
                    { value: "Senior Consultant", label: "Senior Consultant" },
                    { value: "Team Lead", label: "Team Lead" },
                    { value: "Manager", label: "Manager" },
                  ]}
                  placeholder="Select role"
                  searchPlaceholder="Search role..."
                />
              </div>
              <div className="space-y-2">
                <Label>Department</Label>
                <SearchableSelect
                  value={newEmployee.department}
                  onValueChange={(v) => setNewEmployee({...newEmployee, department: v})}
                  options={[
                    { value: "Residential Sales", label: "Residential Sales" },
                    { value: "Commercial Sales", label: "Commercial Sales" },
                    { value: "Luxury Properties", label: "Luxury Properties" },
                  ]}
                  placeholder="Select department"
                  searchPlaceholder="Search department..."
                />
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              <Label>Login Credentials</Label>
              <p className="text-xs text-muted-foreground">Set initial password for the employee</p>
            </div>
            <div className="space-y-2">
              <Label>Password</Label>
              <div className="relative">
                <Input 
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter password"
                  value={newEmployee.password}
                  onChange={(e) => setNewEmployee({...newEmployee, password: e.target.value})}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Confirm Password</Label>
              <Input 
                type="password"
                placeholder="Confirm password"
                value={newEmployee.confirmPassword}
                onChange={(e) => setNewEmployee({...newEmployee, confirmPassword: e.target.value})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddEmployee(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-gradient-to-r from-primary to-orange-700"
              onClick={handleAddEmployee}
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
      <Dialog open={showEditEmployee} onOpenChange={setShowEditEmployee}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Edit Employee</DialogTitle>
            <DialogDescription>
              Update employee details and information
            </DialogDescription>
          </DialogHeader>
          {selectedEmployee && (
            <div className="grid gap-4 py-4">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30">
                <Avatar className="h-16 w-16 border-2 border-primary/20">
                  <AvatarImage src={selectedEmployee.avatar} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                    {selectedEmployee.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{selectedEmployee.name}</h3>
                  <p className="text-sm text-muted-foreground">Joined {selectedEmployee.joinedDate}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input 
                    value={selectedEmployee.name}
                    onChange={(e) => setSelectedEmployee({...selectedEmployee, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input 
                    type="email"
                    value={selectedEmployee.email}
                    onChange={(e) => setSelectedEmployee({...selectedEmployee, email: e.target.value})}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input 
                    value={selectedEmployee.phone}
                    onChange={(e) => setSelectedEmployee({...selectedEmployee, phone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <SearchableSelect
                    value={selectedEmployee.status}
                    onValueChange={(v) => setSelectedEmployee({...selectedEmployee, status: v as "active" | "inactive"})}
                    options={[
                      { value: "active", label: "Active" },
                      { value: "inactive", label: "Inactive" },
                    ]}
                    searchPlaceholder="Search status..."
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <SearchableSelect
                    value={selectedEmployee.role}
                    onValueChange={(v) => setSelectedEmployee({...selectedEmployee, role: v})}
                    options={[
                      { value: "Sales Executive", label: "Sales Executive" },
                      { value: "Senior Consultant", label: "Senior Consultant" },
                      { value: "Team Lead", label: "Team Lead" },
                      { value: "Manager", label: "Manager" },
                    ]}
                    searchPlaceholder="Search role..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Department</Label>
                  <SearchableSelect
                    value={selectedEmployee.department}
                    onValueChange={(v) => setSelectedEmployee({...selectedEmployee, department: v})}
                    options={[
                      { value: "Residential Sales", label: "Residential Sales" },
                      { value: "Commercial Sales", label: "Commercial Sales" },
                      { value: "Luxury Properties", label: "Luxury Properties" },
                    ]}
                    searchPlaceholder="Search department..."
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditEmployee(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-gradient-to-r from-primary to-orange-700"
              onClick={handleUpdateEmployee}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Dialog */}
      <Dialog open={showResetPassword} onOpenChange={setShowResetPassword}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
            <DialogDescription>
              Set a new password for {selectedEmployee?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>New Password</Label>
              <div className="relative">
                <Input type={showPassword ? "text" : "password"} placeholder="Enter new password" />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Confirm New Password</Label>
              <Input type="password" placeholder="Confirm new password" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetPassword(false)}>
              Cancel
            </Button>
            <Button 
              className="bg-gradient-to-r from-primary to-orange-700"
              onClick={() => setShowResetPassword(false)}
            >
              <Lock className="h-4 w-4 mr-2" />
              Reset Password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedEmployee?.name}? This action cannot be undone.
              All their data, including leads and activities, will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteEmployee}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Employee
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

