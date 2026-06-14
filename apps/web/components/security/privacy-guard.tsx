"use client"

import * as React from "react"
import { ShieldAlert } from "lucide-react"

const OVERLAY_MS = 1400

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(target.closest("input, textarea, select, [contenteditable='true'], [contenteditable='']"))
}

export function PrivacyGuard() {
  const [visible, setVisible] = React.useState(false)
  const timerRef = React.useRef<number | null>(null)

  const showTemporarily = React.useCallback(() => {
    setVisible(true)
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => setVisible(false), OVERLAY_MS)
  }, [])

  React.useEffect(() => {
    function blockShortcut(event: KeyboardEvent) {
      const key = event.key.toLowerCase()
      const protectedShortcut = (event.ctrlKey || event.metaKey) && (key === "p" || key === "s")
      const printScreen = key === "printscreen"

      if (!protectedShortcut && !printScreen) return
      event.preventDefault()
      event.stopPropagation()
      showTemporarily()
    }

    function blockContextMenu(event: MouseEvent) {
      if (isEditableTarget(event.target)) return
      event.preventDefault()
      showTemporarily()
    }

    function blockSelection(event: Event) {
      if (isEditableTarget(event.target)) return
      event.preventDefault()
    }

    function blockDrag(event: DragEvent) {
      if (isEditableTarget(event.target)) return
      event.preventDefault()
    }

    function showWhileBlurred() {
      if (timerRef.current) window.clearTimeout(timerRef.current)
      setVisible(true)
    }

    function hideOnFocus() {
      if (timerRef.current) window.clearTimeout(timerRef.current)
      setVisible(false)
    }

    function beforePrint(event: Event) {
      event.preventDefault()
      showTemporarily()
    }

    document.addEventListener("keydown", blockShortcut, true)
    document.addEventListener("contextmenu", blockContextMenu, true)
    document.addEventListener("selectstart", blockSelection, true)
    document.addEventListener("dragstart", blockDrag, true)
    window.addEventListener("blur", showWhileBlurred)
    window.addEventListener("focus", hideOnFocus)
    window.addEventListener("beforeprint", beforePrint)

    return () => {
      document.removeEventListener("keydown", blockShortcut, true)
      document.removeEventListener("contextmenu", blockContextMenu, true)
      document.removeEventListener("selectstart", blockSelection, true)
      document.removeEventListener("dragstart", blockDrag, true)
      window.removeEventListener("blur", showWhileBlurred)
      window.removeEventListener("focus", hideOnFocus)
      window.removeEventListener("beforeprint", beforePrint)
      if (timerRef.current) window.clearTimeout(timerRef.current)
    }
  }, [showTemporarily])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/95 backdrop-blur-md"
      aria-live="polite"
      role="alert"
    >
      <div
        className="mx-4 flex max-w-sm flex-col items-center gap-3 rounded-lg px-6 py-5 text-center shadow-lg"
        style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}
      >
        <span
          className="flex h-11 w-11 items-center justify-center rounded-lg"
          style={{ background: "rgb(194 65 12 / 0.12)", color: "var(--color-primary)" }}
        >
          <ShieldAlert className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--color-foreground)" }}>
            CRM privacy protection is active
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--color-muted-foreground)" }}>
            Exporting, printing, screenshots, and copying protected data are restricted.
          </p>
        </div>
      </div>
    </div>
  )
}
