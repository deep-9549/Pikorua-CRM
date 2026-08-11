import * as React from "react"

import { cn } from "@/lib/utils"

function WorkspacePage({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("min-w-0 space-y-5 sm:space-y-6", className)} {...props} />
}

function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <header className={cn("flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && <div className="mb-1.5 text-xs font-semibold tracking-[0.12em] text-muted-foreground">{eyebrow}</div>}
        <h1 className="text-balance text-[1.7rem] font-semibold leading-tight tracking-[-0.035em] text-foreground sm:text-[2rem]">{title}</h1>
        {description && <p className="mt-1.5 max-w-[68ch] text-sm leading-6 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex w-full flex-wrap items-center gap-2 lg:w-auto lg:justify-end">{actions}</div>}
    </header>
  )
}

function MetricGroup({ className, ...props }: React.ComponentProps<"section">) {
  return (
    <section
      className={cn("grid min-w-0 overflow-hidden rounded-xl border border-border bg-card shadow-card sm:grid-cols-2 lg:grid-cols-4", className)}
      {...props}
    />
  )
}

function MetricItem({
  label,
  value,
  detail,
  icon: Icon,
  tone = "default",
  className,
}: {
  label: React.ReactNode
  value: React.ReactNode
  detail?: React.ReactNode
  icon?: React.ElementType
  tone?: "default" | "primary" | "success" | "warning" | "destructive" | "info"
  className?: string
}) {
  const toneClass = {
    default: "text-foreground bg-muted",
    primary: "text-primary bg-primary/10",
    success: "text-success bg-success/10",
    warning: "text-warning bg-warning/10",
    destructive: "text-destructive bg-destructive/10",
    info: "text-info bg-info/10",
  }[tone]

  return (
    <div className={cn("relative min-w-0 border-b border-border p-4 last:border-b-0 sm:[&:nth-child(odd)]:border-r lg:border-b-0 lg:border-r lg:last:border-r-0 lg:[&:nth-child(odd)]:border-r", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="mt-2 tabular-nums text-2xl font-semibold tracking-[-0.03em] text-foreground">{value}</p>
        </div>
        {Icon && <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", toneClass)}><Icon className="h-4 w-4" strokeWidth={1.8} /></span>}
      </div>
      {detail && <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{detail}</p>}
    </div>
  )
}

function SectionPanel({ className, ...props }: React.ComponentProps<"section">) {
  return <section className={cn("min-w-0 rounded-xl border border-border bg-card shadow-card", className)} {...props} />
}

function SectionHeader({
  title,
  description,
  action,
  className,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex min-w-0 items-start justify-between gap-4 border-b border-border px-4 py-3.5 sm:px-5", className)}>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-foreground sm:text-[15px]">{title}</h2>
        {description && <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

export { WorkspacePage, PageHeader, MetricGroup, MetricItem, SectionPanel, SectionHeader }
