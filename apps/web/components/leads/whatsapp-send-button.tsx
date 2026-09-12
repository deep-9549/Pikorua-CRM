"use client"

import * as React from "react"
import { MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip"
import { hasWhatsappNumber, renderWhatsappTemplate, whatsappHref } from "@/lib/whatsapp"
import { useWhatsappTemplate } from "@/lib/whatsapp-template-store"

interface WhatsappSendButtonProps {
  phone: string | null | undefined
  leadName?: string | null
  /** Icon-only suits dense lead rows; the labelled form suits the detail page. */
  variant?: "icon" | "labelled"
  className?: string
}

/**
 * Opens WhatsApp Web with this lead's chat and the executive's saved thank-you
 * message pre-filled. The executive presses send themselves — we never send on
 * their behalf, so no WhatsApp Business API or message template approval is
 * involved, and the message goes out from whichever number is signed into
 * WhatsApp Web in that browser.
 */
export function WhatsappSendButton({
  phone,
  leadName,
  variant = "icon",
  className,
}: WhatsappSendButtonProps) {
  const template = useWhatsappTemplate()
  const dialable = hasWhatsappNumber(phone)

  const handleClick = (event: React.MouseEvent) => {
    // Lead rows are wrapped in a <Link>; without this the click would navigate
    // to the lead instead of opening WhatsApp.
    event.preventDefault()
    event.stopPropagation()

    if (!template) return

    const message = renderWhatsappTemplate(template.template, {
      leadName,
      senderName: template.sender_name,
      senderPhone: template.sender_phone,
    })
    const href = whatsappHref(phone, message)
    if (href) window.open(href, "_blank", "noopener,noreferrer")
  }

  const disabled = !dialable || !template
  const tooltip = !dialable
    ? "No valid WhatsApp number on this lead"
    : !template
      ? "Loading your message…"
      : "Open WhatsApp with your thank-you message"

  const button = (
    <Button
      type="button"
      variant={variant === "icon" ? "ghost" : "outline"}
      size={variant === "icon" ? "icon-sm" : "sm"}
      disabled={disabled}
      onClick={handleClick}
      aria-label="Send WhatsApp thank-you message"
      className={cn(
        !disabled && "text-[oklch(0.62_0.17_150)] hover:text-[oklch(0.62_0.17_150)]",
        !disabled && "hover:bg-[oklch(0.62_0.17_150_/_0.12)]",
        className,
      )}
    >
      <MessageCircle className={variant === "icon" ? "h-4 w-4" : "h-3.5 w-3.5"} />
      {variant === "labelled" && <span>WhatsApp</span>}
    </Button>
  )

  return (
    <TooltipProvider>
      <Tooltip>
        {/* A disabled button fires no pointer events, so the trigger needs a
            wrapper for the explanatory tooltip to still appear. */}
        <TooltipTrigger asChild>
          <span className="inline-flex">{button}</span>
        </TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
