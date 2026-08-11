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
