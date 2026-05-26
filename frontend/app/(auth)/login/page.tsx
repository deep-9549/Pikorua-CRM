"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Gem, Eye, EyeOff, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
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

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push("/dashboard")
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5"
          style={{ background: "radial-gradient(circle, oklch(0.700 0.130 75) 0%, transparent 70%)" }} />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center gold-gradient shadow-gold-sm mb-4">
            <Gem className="w-6 h-6" style={{ color: "oklch(0.12 0.010 260)" }} />
          </div>
          <h1 className="text-xl font-semibold tracking-wide" style={{ color: "oklch(0.92 0.006 80)" }}>
            PIKORUA
          </h1>
          <p className="text-xs tracking-[0.18em] uppercase mt-0.5" style={{ color: "oklch(0.700 0.130 75)" }}>
            Realty CRM
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6" style={{
          background: "var(--color-card)",
          border: "1px solid var(--color-border)"
        }}>
          <h2 className="text-[15px] font-semibold mb-1" style={{ color: "oklch(0.92 0.006 80)" }}>
            Sign in
          </h2>
          <p className="text-xs mb-6" style={{ color: "oklch(0.55 0.006 260)" }}>
            Enter your credentials to access the CRM
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs" style={{ color: "oklch(0.70 0.006 260)" }}>
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@pikorua.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs" style={{ color: "oklch(0.70 0.006 260)" }}>
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
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
                  style={{ color: "oklch(0.45 0.008 260)" }}
                >
                  {showPassword
                    ? <EyeOff className="w-4 h-4" />
                    : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs px-3 py-2 rounded-lg" style={{
                background: "oklch(0.35 0.12 20 / 0.15)",
                color: "oklch(0.75 0.12 20)",
                border: "1px solid oklch(0.35 0.12 20 / 0.3)"
              }}>
                {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-9 gold-gradient font-semibold text-sm shadow-gold-sm"
              style={{ color: "oklch(0.10 0.010 260)" }}
            >
              {loading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Signing in...</>
                : "Sign in"}
            </Button>
          </form>
        </div>

        <p className="text-center text-[11px] mt-4" style={{ color: "oklch(0.38 0.008 260)" }}>
          Contact your admin if you need access
        </p>
      </div>
    </div>
  )
}
