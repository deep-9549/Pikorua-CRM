"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ResetPasswordPage() {
  return <ResetForm />
}

function ResetForm() {
  const [token, setToken] = useState<string | null>(null)
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [changed, setChanged] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const fragment = new URLSearchParams(window.location.hash.slice(1))
      const query = new URLSearchParams(window.location.search)
      const fragmentToken = fragment.get("token")
      const legacyQueryToken = query.get("token")
      setToken(fragmentToken ?? legacyQueryToken ?? "")

      // Remove legacy query-string tokens from browser history immediately.
      if (!fragmentToken && legacyQueryToken) {
        window.history.replaceState(null, "", `${window.location.pathname}#token=${encodeURIComponent(legacyQueryToken)}`)
      }
    } catch {
      setToken("")
    }
  }, [])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    if (!token) return setError("This reset link is invalid. Request a new one.")
    if (password !== confirmation) return setError("Passwords do not match")
    setLoading(true)
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(Array.isArray(data?.message) ? data.message[0] : data?.message ?? "Unable to reset password")
      window.history.replaceState(null, "", window.location.pathname)
      setChanged(true)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to reset password")
    } finally {
      setLoading(false)
    }
  }

  if (changed) return <ResetShell>
    <div className="text-center">
      <CheckCircle2 className="mx-auto mb-4 size-10" style={{ color: "var(--color-success)" }} />
      <h2 className="text-lg font-semibold">Password updated</h2>
      <p className="mt-2 text-xs" style={{ color: "var(--color-muted-foreground)" }}>You can now sign in with your new password.</p>
      <Button asChild className="gold-gradient mt-6 w-full"><Link href="/login">Continue to sign in</Link></Button>
    </div>
  </ResetShell>

  return <ResetShell>
    <h2 className="text-[15px] font-semibold">Choose a new password</h2>
    <p className="mb-6 mt-1 text-xs" style={{ color: "var(--color-muted-foreground)" }}>Use at least 8 characters with uppercase, lowercase, and a number.</p>
    <form onSubmit={submit} className="space-y-4">
      <PasswordField id="password" label="New password" value={password} onChange={setPassword} visible={showPassword} toggle={() => setShowPassword(!showPassword)} />
      <PasswordField id="confirmation" label="Confirm new password" value={confirmation} onChange={setConfirmation} visible={showPassword} />
      {error && <p className="rounded-lg border px-3 py-2 text-xs" style={{ background: "rgb(185 28 28 / 0.10)", color: "var(--color-destructive)", borderColor: "rgb(185 28 28 / 0.24)" }}>{error}</p>}
      <Button type="submit" disabled={loading || token === null || !token} className="gold-gradient w-full font-semibold">{loading ? <><Loader2 className="mr-2 size-4 animate-spin" />Updating...</> : token === null ? "Checking link..." : "Reset password"}</Button>
      {token === "" && <Link href="/forgot-password" className="block text-center text-xs hover:underline" style={{ color: "var(--color-primary)" }}>Request a new reset link</Link>}
    </form>
  </ResetShell>
}

function PasswordField({ id, label, value, onChange, visible, toggle }: { id: string; label: string; value: string; onChange: (value: string) => void; visible: boolean; toggle?: () => void }) {
  return <div className="space-y-1.5"><Label htmlFor={id} className="text-xs">{label}</Label><div className="relative">
    <Input id={id} type={visible ? "text" : "password"} required minLength={8} maxLength={128} autoComplete="new-password" value={value} onChange={(event) => onChange(event.target.value)} className="pr-9" />
    {toggle && <button type="button" onClick={toggle} aria-label={visible ? "Hide password" : "Show password"} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: "var(--color-muted-foreground)" }}>{visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>}
  </div></div>
}

function ResetShell({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center bg-background px-4"><div className="w-full max-w-sm">
    <div className="mb-8 flex flex-col items-center"><img src="/pikorua-icon-mark-square.png" alt="Pikorua" className="mb-3 size-14 object-contain" /><h1 className="text-xl font-semibold tracking-wide" style={{ color: "var(--color-primary)" }}>PIKORUA</h1><p className="mt-0.5 text-xs uppercase tracking-[0.18em]" style={{ color: "var(--color-muted-foreground)" }}>Realty CRM</p></div>
    <div className="rounded-2xl border bg-card p-6">{children}</div>
  </div></main>
}
