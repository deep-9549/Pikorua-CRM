"use client"

import * as React from "react"
import { cn, formatPhone, phoneHref } from "@/lib/utils"

type ProtectedPhoneProps = {
  value: string | null | undefined
  asLink?: boolean
  children?: React.ReactNode
} & Omit<React.ComponentPropsWithoutRef<"span">, "children">

function stopCopy(event: React.SyntheticEvent) {
  event.preventDefault()
  event.stopPropagation()
}

export function ProtectedPhone({
  value,
  asLink = false,
  children,
  className,
  ...props
}: ProtectedPhoneProps) {
  if (!value) return null

  const content = children ?? formatPhone(value)
  const sharedProps = {
    className: cn("protected-phone", className),
    onCopy: stopCopy,
    onCut: stopCopy,
    onContextMenu: stopCopy,
    onDragStart: stopCopy,
    draggable: false,
    "data-protected-phone": "true",
  }

  if (asLink) {
    return (
      <a
        href={phoneHref(value)}
        {...sharedProps}
        {...(props as React.ComponentPropsWithoutRef<"a">)}
      >
        {content}
      </a>
    )
  }

  return (
    <span {...sharedProps} {...props}>
      {content}
    </span>
  )
}
