"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
  ArrowUpRight,
  BadgeCheck,
  Check,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  LogOut,
  Mail,
  Monitor,
  Moon,
  Palette,
  Phone,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  Sun,
  UserRound,
  Users,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { getAuthUser, updateAuthUser } from "@/lib/auth/cookies"
import {
  PREFERENCES_CHANGED_EVENT,
  REDUCE_MOTION_KEY,
  useAppPreferences,
} from "@/components/providers/app-preferences-provider"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

type Section = "account" | "appearance" | "security"

interface Profile {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  role: string
}

interface FeedbackState {
  type: "success" | "error"
  message: string
}

const navigation = [
  { id: "account" as const, label: "My account", description: "Identity and contact details", icon: UserRound },
  { id: "appearance" as const, label: "Appearance", description: "Theme and accessibility", icon: Palette },
  { id: "security" as const, label: "Security", description: "Password and active session", icon: ShieldCheck },
]

const themes = [
  { id: "light", label: "Light", description: "Bright and clear", icon: Sun },
  { id: "dark", label: "Dark", description: "Low-light comfort", icon: Moon },
  { id: "system", label: "System", description: "Match this device", icon: Monitor },
]

function initials(name: string | null | undefined) {
  if (!name) return "PR"
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map(part => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

function roleLabel(role: string | undefined) {
  if (role === "super_admin") return "Super Admin"
  if (role === "sales_executive") return "Sales Executive"
  return role?.replaceAll("_", " ") || "CRM User"
}

function apiError(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback
  const value = (payload as { message?: string | string[]; error?: string }).message
    ?? (payload as { error?: string }).error
  return Array.isArray(value) ? value[0] : value || fallback
}

function Feedback({ state }: { state: FeedbackState | null }) {
  if (!state) return null
  return (
    <div
      role={state.type === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-sm",
        state.type === "success"
          ? "border-emerald-600/20 bg-emerald-600/8 text-emerald-700 dark:text-emerald-300"
          : "border-destructive/20 bg-destructive/8 text-destructive",
      )}
    >
      {state.type === "success"
        ? <Check className="mt-0.5 h-4 w-4 shrink-0" />
        : <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />}
      <span>{state.message}</span>
    </div>
  )
}

function PasswordInput({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: string
}) {
  const [visible, setVisible] = React.useState(false)

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={event => onChange(event.target.value)}
          autoComplete={autoComplete}
          className="h-11 pr-11"
          required
        />
        <button
          type="button"
          onClick={() => setVisible(current => !current)}
          className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
          aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const router = useRouter()
  const { theme, setTheme } = useAppPreferences()
  const [mounted, setMounted] = React.useState(false)
  const [activeSection, setActiveSection] = React.useState<Section>("account")
  const [profile, setProfile] = React.useState<Profile | null>(null)
  const [fullName, setFullName] = React.useState("")
  const [phone, setPhone] = React.useState("")
  const [profileLoading, setProfileLoading] = React.useState(true)
  const [profileSaving, setProfileSaving] = React.useState(false)
  const [profileFeedback, setProfileFeedback] = React.useState<FeedbackState | null>(null)
  const [reduceMotion, setReduceMotion] = React.useState(false)
  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [passwordSaving, setPasswordSaving] = React.useState(false)
  const [passwordFeedback, setPasswordFeedback] = React.useState<FeedbackState | null>(null)

  React.useEffect(() => {
    setMounted(true)
    setReduceMotion(window.localStorage.getItem(REDUCE_MOTION_KEY) === "true")

    async function loadProfile() {
      try {
        const response = await fetch("/api/auth/me", { cache: "no-store" })
        const payload = await response.json().catch(() => null)
        if (!response.ok) throw new Error(apiError(payload, "Could not load your account"))
        const nextProfile = payload as Profile
        setProfile(nextProfile)
        setFullName(nextProfile.name ?? "")
        setPhone(nextProfile.phone ?? "")
      } catch (error) {
        const cached = getAuthUser()
        if (cached) {
          setProfile({ ...cached, phone: null })
          setFullName(cached.name ?? "")
        }
        setProfileFeedback({
          type: "error",
          message: error instanceof Error ? error.message : "Could not load your account",
        })
      } finally {
        setProfileLoading(false)
      }
    }

    void loadProfile()
  }, [])

  const profileChanged = Boolean(profile)
    && (fullName.trim() !== (profile?.name ?? "") || phone.trim() !== (profile?.phone ?? ""))

  const passwordChecks = [
    { label: "8 or more characters", valid: newPassword.length >= 8 },
    { label: "An uppercase and lowercase letter", valid: /[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) },
    { label: "At least one number", valid: /\d/.test(newPassword) },
  ]
  const passwordValid = passwordChecks.every(check => check.valid)

  async function saveProfile(event: React.FormEvent) {
    event.preventDefault()
    setProfileFeedback(null)

    if (fullName.trim().length < 2) {
      setProfileFeedback({ type: "error", message: "Enter a full name with at least 2 characters." })
      return
    }

    setProfileSaving(true)
    try {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName.trim(), phone: phone.trim() || undefined }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(apiError(payload, "Could not save your profile"))

      const updated = payload.user as Profile
      setProfile(updated)
      setFullName(updated.name ?? "")
      setPhone(updated.phone ?? "")
      updateAuthUser({
        id: updated.id,
        name: updated.name,
        email: updated.email,
        role: updated.role,
      })
      setProfileFeedback({ type: "success", message: "Your account details have been updated." })
    } catch (error) {
      setProfileFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Could not save your profile",
      })
    } finally {
      setProfileSaving(false)
    }
  }

  function updateReduceMotion(enabled: boolean) {
    setReduceMotion(enabled)
    window.localStorage.setItem(REDUCE_MOTION_KEY, String(enabled))
    window.dispatchEvent(new Event(PREFERENCES_CHANGED_EVENT))
  }

  async function changePassword(event: React.FormEvent) {
    event.preventDefault()
    setPasswordFeedback(null)

    if (!passwordValid) {
      setPasswordFeedback({ type: "error", message: "Your new password does not meet the requirements." })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordFeedback({ type: "error", message: "The new passwords do not match." })
      return
    }

    setPasswordSaving(true)
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(apiError(payload, "Could not update your password"))

      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setPasswordFeedback({ type: "success", message: "Password updated successfully." })
    } catch (error) {
      setPasswordFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Could not update your password",
      })
    } finally {
      setPasswordSaving(false)
    }
  }

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/login")
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-10">
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl border border-border/70 bg-card px-5 py-6 shadow-luxury sm:px-7"
      >
        <div className="absolute inset-y-0 right-0 hidden w-2/5 bg-[radial-gradient(circle_at_center,rgba(194,65,12,0.16),transparent_68%)] lg:block" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="gold-gradient flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-gold-sm">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-[28px]">Settings</h1>
                <Badge variant="outline" className="border-primary/20 bg-primary/5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                  Personal workspace
                </Badge>
              </div>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Keep your account accurate, tailor the interface, and protect your CRM access.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/60 px-3.5 py-3">
            <Avatar className="h-10 w-10 border border-primary/20">
              <AvatarFallback className="gold-gradient text-xs font-bold text-white">
                {initials(profile?.name)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="max-w-48 truncate text-sm font-semibold">{profile?.name || "Loading account..."}</p>
              <p className="text-xs text-muted-foreground">{roleLabel(profile?.role)}</p>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <motion.aside
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.05 }}
          className="space-y-4 lg:sticky lg:top-20 lg:self-start"
        >
          <Card className="border-border/70 shadow-sm">
            <CardContent className="p-2">
              <nav className="grid gap-1 sm:grid-cols-3 lg:grid-cols-1" aria-label="Settings sections">
                {navigation.map(item => {
                  const Icon = item.icon
                  const active = activeSection === item.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveSection(item.id)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors",
                        active ? "bg-primary text-primary-foreground shadow-gold-sm" : "hover:bg-muted/70",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">{item.label}</span>
                        <span className={cn("hidden truncate text-[11px] lg:block", active ? "text-white/75" : "text-muted-foreground")}>
                          {item.description}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </nav>
            </CardContent>
          </Card>

          {profile?.role === "super_admin" && (
            <Card className="overflow-hidden border-primary/20 bg-primary/[0.04] shadow-sm">
              <CardContent className="p-4">
                <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Users className="h-4 w-4" />
                </div>
                <p className="text-sm font-semibold">Managing your team?</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  User accounts and roles live in the dedicated Employees workspace.
                </p>
                <Button variant="outline" size="sm" className="mt-4 w-full justify-between" onClick={() => router.push("/employees")}>
                  Team management
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Button>
              </CardContent>
            </Card>
          )}
        </motion.aside>

        <motion.main
          key={activeSection}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="min-w-0"
        >
          {activeSection === "account" && (
            <div className="space-y-5">
              <Card className="border-border/70 shadow-sm">
                <CardHeader className="border-b border-border/60 bg-muted/20">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <UserRound className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Account details</CardTitle>
                      <CardDescription>Used across lead ownership, activity history, and team views.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-5 sm:p-6">
                  {profileLoading ? (
                    <div className="flex min-h-56 items-center justify-center text-sm text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading your account...
                    </div>
                  ) : (
                    <form onSubmit={saveProfile} className="space-y-6">
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div className="space-y-2 sm:col-span-2">
                          <Label htmlFor="full-name">Full name</Label>
                          <Input
                            id="full-name"
                            value={fullName}
                            onChange={event => setFullName(event.target.value)}
                            className="h-11"
                            maxLength={100}
                            autoComplete="name"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="account-email">Email address</Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                            <Input id="account-email" value={profile?.email ?? ""} className="h-11 bg-muted/40 pl-10" disabled />
                          </div>
                          <p className="text-[11px] leading-relaxed text-muted-foreground">Your login email is managed by an administrator.</p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone number</Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              id="phone"
                              type="tel"
                              value={phone}
                              onChange={event => setPhone(event.target.value)}
                              placeholder="+91 98765 43210"
                              className="h-11 pl-10"
                              maxLength={30}
                              autoComplete="tel"
                            />
                          </div>
                          <p className="text-[11px] leading-relaxed text-muted-foreground">Optional, and visible only in internal team contexts.</p>
                        </div>
                      </div>

                      <div className="rounded-xl border border-border/70 bg-muted/25 p-4">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <BadgeCheck className="h-5 w-5 text-primary" />
                            <div>
                              <p className="text-sm font-medium">Account role</p>
                              <p className="text-xs text-muted-foreground">Controls CRM permissions and data access.</p>
                            </div>
                          </div>
                          <Badge className="border-0 bg-primary/10 text-primary hover:bg-primary/10">{roleLabel(profile?.role)}</Badge>
                        </div>
                      </div>

                      <Feedback state={profileFeedback} />

                      <div className="flex justify-end">
                        <Button type="submit" disabled={!profileChanged || profileSaving} className="gold-gradient min-w-36 font-semibold text-white shadow-gold-sm">
                          {profileSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                          {profileSaving ? "Saving..." : "Save changes"}
                        </Button>
                      </div>
                    </form>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {activeSection === "appearance" && (
            <Card className="border-border/70 shadow-sm">
              <CardHeader className="border-b border-border/60 bg-muted/20">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Palette className="h-4 w-4" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Appearance & accessibility</CardTitle>
                    <CardDescription>Saved on this browser and applied across the CRM.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-8 p-5 sm:p-6">
                <section className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold">Colour theme</p>
                    <p className="text-xs text-muted-foreground">Choose how the interface appears on this device.</p>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {themes.map(option => {
                      const Icon = option.icon
                      const selected = mounted && theme === option.id
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setTheme(option.id as "light" | "dark" | "system")}
                          className={cn(
                            "relative rounded-xl border p-4 text-left transition-all",
                            selected
                              ? "border-primary bg-primary/[0.06] shadow-sm ring-1 ring-primary/20"
                              : "border-border/70 bg-card hover:border-primary/40 hover:bg-muted/30",
                          )}
                        >
                          <div className={cn("mb-5 flex h-9 w-9 items-center justify-center rounded-lg", selected ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <p className="text-sm font-semibold">{option.label}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">{option.description}</p>
                          {selected && <Check className="absolute right-3 top-3 h-4 w-4 text-primary" />}
                        </button>
                      )
                    })}
                  </div>
                </section>

                <section className="border-t border-border/60 pt-6">
                  <div className="flex items-center justify-between gap-5 rounded-xl border border-border/70 bg-muted/20 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <Sparkles className="h-4 w-4" />
                      </div>
                      <div>
                        <Label htmlFor="reduce-motion" className="text-sm font-semibold">Reduce interface motion</Label>
                        <p className="mt-1 max-w-lg text-xs leading-relaxed text-muted-foreground">
                          Minimises page transitions and animated effects for a calmer experience.
                        </p>
                      </div>
                    </div>
                    <Switch id="reduce-motion" checked={reduceMotion} onCheckedChange={updateReduceMotion} />
                  </div>
                </section>
              </CardContent>
            </Card>
          )}

          {activeSection === "security" && (
            <div className="space-y-5">
              <Card className="border-border/70 shadow-sm">
                <CardHeader className="border-b border-border/60 bg-muted/20">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <KeyRound className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Change password</CardTitle>
                      <CardDescription>Your current password is required before a new one can be set.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-5 sm:p-6">
                  <form onSubmit={changePassword} className="space-y-5">
                    <PasswordInput id="current-password" label="Current password" value={currentPassword} onChange={setCurrentPassword} autoComplete="current-password" />
                    <div className="grid gap-5 sm:grid-cols-2">
                      <PasswordInput id="new-password" label="New password" value={newPassword} onChange={setNewPassword} autoComplete="new-password" />
                      <PasswordInput id="confirm-password" label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" />
                    </div>

                    <div className="grid gap-2 rounded-xl border border-border/70 bg-muted/25 p-4 sm:grid-cols-3">
                      {passwordChecks.map(check => (
                        <div key={check.label} className={cn("flex items-center gap-2 text-xs", check.valid ? "text-emerald-700 dark:text-emerald-300" : "text-muted-foreground")}>
                          <span className={cn("flex h-4 w-4 items-center justify-center rounded-full border", check.valid && "border-emerald-600 bg-emerald-600 text-white")}>
                            {check.valid && <Check className="h-2.5 w-2.5" />}
                          </span>
                          {check.label}
                        </div>
                      ))}
                    </div>

                    <Feedback state={passwordFeedback} />

                    <div className="flex justify-end">
                      <Button type="submit" disabled={passwordSaving || !currentPassword || !newPassword || !confirmPassword} className="gold-gradient min-w-40 font-semibold text-white shadow-gold-sm">
                        {passwordSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                        {passwordSaving ? "Updating..." : "Update password"}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              <Card className="border-border/70 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-base">Current session</CardTitle>
                  <CardDescription>Control access on this browser.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-4 rounded-xl border border-border/70 bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="relative flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600/10 text-emerald-700 dark:text-emerald-300">
                        <Monitor className="h-4 w-4" />
                        <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-500" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">This browser</p>
                        <p className="text-xs text-muted-foreground">Active now · {profile?.email || "Signed-in account"}</p>
                      </div>
                    </div>
                    <Button type="button" variant="outline" onClick={signOut} className="border-destructive/25 text-destructive hover:bg-destructive/10 hover:text-destructive">
                      <LogOut className="mr-2 h-4 w-4" /> Sign out
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </motion.main>
      </div>
    </div>
  )
}
