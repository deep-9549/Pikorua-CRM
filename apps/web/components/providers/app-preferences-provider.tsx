"use client"

import * as React from "react"

export const REDUCE_MOTION_KEY = "pikorua_reduce_motion"
export const PREFERENCES_CHANGED_EVENT = "pikorua:preferences-changed"
const THEME_KEY = "pikorua_theme"

export type AppTheme = "light" | "dark" | "system"

interface AppPreferencesContextValue {
  theme: AppTheme
  setTheme: (theme: AppTheme) => void
}

const AppPreferencesContext = React.createContext<AppPreferencesContextValue | null>(null)

function applyMotionPreference() {
  const reduceMotion = window.localStorage.getItem(REDUCE_MOTION_KEY) === "true"
  document.documentElement.dataset.reduceMotion = String(reduceMotion)
}

export function AppPreferencesProvider({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const [theme, setThemeState] = React.useState<AppTheme>("system")
  const [systemIsDark, setSystemIsDark] = React.useState(false)

  React.useEffect(() => {
    applyMotionPreference()
    const storedTheme = window.localStorage.getItem(THEME_KEY)
    if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
      setThemeState(storedTheme)
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const syncSystemTheme = () => setSystemIsDark(media.matches)
    syncSystemTheme()
    media.addEventListener("change", syncSystemTheme)
    window.addEventListener(PREFERENCES_CHANGED_EVENT, applyMotionPreference)
    return () => {
      media.removeEventListener("change", syncSystemTheme)
      window.removeEventListener(PREFERENCES_CHANGED_EVENT, applyMotionPreference)
    }
  }, [])

  const setTheme = React.useCallback((nextTheme: AppTheme) => {
    setThemeState(nextTheme)
    window.localStorage.setItem(THEME_KEY, nextTheme)
  }, [])

  const resolvedTheme = theme === "system" ? (systemIsDark ? "dark" : "light") : theme

  React.useEffect(() => {
    const root = document.documentElement
    root.classList.toggle("dark", resolvedTheme === "dark")
    root.style.colorScheme = resolvedTheme
    return () => {
      root.classList.remove("dark")
      root.style.removeProperty("color-scheme")
    }
  }, [resolvedTheme])

  return (
    <AppPreferencesContext.Provider value={{ theme, setTheme }}>
      <style>{`
        html.dark {
          --background: #0f0d0c;
          --foreground: #f7f5f2;

          --card: #191614;
          --card-foreground: #f7f5f2;

          --popover: #211d1a;
          --popover-foreground: #f7f5f2;

          --primary: #fb923c;
          --primary-foreground: #2b1106;

          --secondary: #24201d;
          --secondary-foreground: #f7f5f2;

          --muted: #28231f;
          --muted-foreground: #b9afa8;

          --accent: #332b26;
          --accent-foreground: #fff7ed;

          --destructive: #f87171;
          --destructive-foreground: #2b0b0b;

          --success: #4ade80;
          --success-foreground: #052e16;

          --warning: #fbbf24;
          --warning-foreground: #271500;

          --info: #38bdf8;
          --info-foreground: #082f49;

          --border: #3b342f;
          --input: #49403a;
          --ring: #fb923c;
          --placeholder: rgb(231 229 228 / 0.45);

          --chart-1: #fb923c;
          --chart-2: #fdba74;
          --chart-3: #38bdf8;
          --chart-4: #4ade80;
          --chart-5: #c084fc;

          --sidebar: #120f0d;
          --sidebar-foreground: #f5f5f4;
          --sidebar-primary: #fb923c;
          --sidebar-primary-foreground: #2b1106;
          --sidebar-accent: #29221e;
          --sidebar-accent-foreground: #fff7ed;
          --sidebar-border: #332a25;
          --sidebar-ring: #fb923c;

          --gold: #fb923c;
          --gold-light: #fdba74;
          --gold-dim: #ea580c;
          --obsidian: #0f0d0c;
          --platinum: #d6d3d1;
          --ivory: #fafaf9;
          --champagne: #292524;
        }

        html[data-reduce-motion="true"] *,
        html[data-reduce-motion="true"] *::before,
        html[data-reduce-motion="true"] *::after {
          scroll-behavior: auto !important;
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
        }
      `}</style>
      <div className={className} style={{ colorScheme: resolvedTheme }}>
        {children}
      </div>
    </AppPreferencesContext.Provider>
  )
}

export function useAppPreferences() {
  const context = React.useContext(AppPreferencesContext)
  if (!context) throw new Error("useAppPreferences must be used within AppPreferencesProvider")
  return context
}
