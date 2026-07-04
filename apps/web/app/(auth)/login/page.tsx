"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data?.message ?? 'Invalid credentials')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5"
          style={{ background: "radial-gradient(circle, #c2410c 0%, transparent 70%)" }} />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src="/pikorua-icon-mark-square.png" alt="Pikorua" className="w-14 h-14 object-contain mb-3" />
          <h1 className="text-xl font-semibold tracking-wide" style={{ color: "var(--color-primary)" }}>
            PIKORUA
          </h1>
          <p className="text-xs tracking-[0.18em] uppercase mt-0.5" style={{ color: "var(--color-muted-foreground)" }}>
            Realty CRM
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6" style={{
          background: "var(--color-card)",
          border: "1px solid var(--color-border)"
        }}>
          <h2 className="text-[15px] font-semibold mb-1" style={{ color: "var(--color-primary)" }}>
            Sign in
          </h2>
          <p className="text-xs mb-6" style={{ color: "var(--color-muted-foreground)" }}>
            Enter your credentials to access the CRM
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs" style={{ color: "var(--color-foreground)" }}>
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs" style={{ color: "var(--color-foreground)" }}>
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="********"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="h-9 text-sm pr-9"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: "var(--color-muted-foreground)" }}
                >
                  {showPassword
                    ? <EyeOff className="w-4 h-4" />
                    : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs px-3 py-2 rounded-lg" style={{
                background: "rgb(185 28 28 / 0.10)",
                color: "var(--color-destructive)",
                border: "1px solid rgb(185 28 28 / 0.24)"
              }}>
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-9 gold-gradient font-semibold text-sm shadow-gold-sm"
              style={{ color: "var(--color-primary-foreground)" }}
            >
              {loading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...</>
                : "Sign in"}
            </Button>
          </form>
        </div>

        <p className="text-center text-[11px] mt-4" style={{ color: "var(--color-muted-foreground)" }}>
          Contact your admin if you need access
        </p>
      </div>
    </div>
  )
}
