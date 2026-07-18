"use client"

import Link from "next/link"
import { useState } from "react"
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data?.message ?? "Unable to send the reset email")
      setSent(true)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to send the reset email")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      {sent ? (
        <div className="text-center">
          <CheckCircle2 className="mx-auto mb-4 size-10" style={{ color: "var(--color-success)" }} />
          <h2 className="text-lg font-semibold">Check your inbox</h2>
          <p className="mt-2 text-xs leading-5" style={{ color: "var(--color-muted-foreground)" }}>
            If an active CRM account exists for <strong>{email}</strong>, we sent a secure reset link. It expires in 30 minutes.
          </p>
          <Button asChild variant="outline" className="mt-6 w-full">
            <Link href="/login"><ArrowLeft className="mr-2 size-4" />Back to sign in</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-6">
            <Mail className="mb-3 size-7" style={{ color: "var(--color-primary)" }} />
            <h2 className="text-[15px] font-semibold">Forgot your password?</h2>
            <p className="mt-1 text-xs" style={{ color: "var(--color-muted-foreground)" }}>Enter your login email and we’ll send you a verification link.</p>
          </div>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs">Email</Label>
              <Input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" />
            </div>
            {error && <ErrorMessage>{error}</ErrorMessage>}
            <Button type="submit" disabled={loading} className="gold-gradient w-full font-semibold">
              {loading ? <><Loader2 className="mr-2 size-4 animate-spin" />Sending...</> : "Send reset link"}
            </Button>
            <Link href="/login" className="flex items-center justify-center text-xs hover:underline" style={{ color: "var(--color-muted-foreground)" }}>
              <ArrowLeft className="mr-1 size-3" />Back to sign in
            </Link>
          </form>
        </>
      )}
    </AuthShell>
  )
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return <main className="flex min-h-screen items-center justify-center bg-background px-4">
    <div className="w-full max-w-sm">
      <div className="mb-8 flex flex-col items-center">
        <img src="/pikorua-icon-mark-square.png" alt="Pikorua" className="mb-3 size-14 object-contain" />
        <h1 className="text-xl font-semibold tracking-wide" style={{ color: "var(--color-primary)" }}>PIKORUA</h1>
        <p className="mt-0.5 text-xs uppercase tracking-[0.18em]" style={{ color: "var(--color-muted-foreground)" }}>Realty CRM</p>
      </div>
      <div className="rounded-2xl border bg-card p-6">{children}</div>
    </div>
  </main>
}

function ErrorMessage({ children }: { children: React.ReactNode }) {
  return <p className="rounded-lg border px-3 py-2 text-xs" style={{ background: "rgb(185 28 28 / 0.10)", color: "var(--color-destructive)", borderColor: "rgb(185 28 28 / 0.24)" }}>{children}</p>
}
