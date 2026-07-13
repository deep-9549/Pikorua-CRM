export interface ReportSummary {
  totalLeads: number
  activeLeads: number
  convertedLeads: number
  rejectedLeads: number
  coldPoolLeads: number
  callsLogged: number
  spokenCalls: number
  notSpokenCalls: number
  callbackCalls: number
  followUpsDue: number
  siteVisitsScheduled: number
  siteVisitsCompleted: number
  hotLeads: number
  warmLeads: number
  coldLeads: number
  conversionRate: number
}

export interface ReportRatios {
  callbackRate: number
  contactRate: number
  visitCompletionRate: number
  conversionRate: number
  callsPerLead: number
  callsPerConversion: number
}

export interface ReportTrendRow {
  label: string
  leads: number
  calls: number
  visits: number
  conversions: number
}

export interface CustomEmployeeReport {
  range: { startDate: string; endDate: string; days: number }
  summary: ReportSummary
  previousSummary: ReportSummary
  ratios: ReportRatios
  previousRatios: ReportRatios
  trend: ReportTrendRow[]
  insights: { source: "openrouter" | "calculated"; items: string[]; actions: string[] }
}

export interface EmployeePerformanceReportInput {
  employee: { full_name: string | null; email: string | null }
  report: CustomEmployeeReport
  generatedAt: string
}

type Color = [number, number, number]

const NAVY: Color = [20, 32, 50]
const ORANGE: Color = [238, 115, 45]
const BLUE: Color = [54, 112, 198]
const GREEN: Color = [40, 164, 112]
const PURPLE: Color = [128, 90, 190]
const RED: Color = [210, 72, 72]
const INK: Color = [34, 41, 53]
const MUTED: Color = [105, 115, 130]
const GRID: Color = [224, 228, 235]
const PAPER: Color = [248, 249, 251]
const WHITE: Color = [255, 255, 255]

function rgb(color: Color) {
  return color.map(value => (value / 255).toFixed(3)).join(" ")
}

function safeText(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "-")
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)")
}

function wrapWords(value: string, maxCharacters: number) {
  return value.split(/\s+/).reduce<string[]>((lines, word) => {
    const last = lines.at(-1)
    if (!last || `${last} ${word}`.length > maxCharacters) lines.push(word)
    else lines[lines.length - 1] = `${last} ${word}`
    return lines
  }, [])
}

class Canvas {
  private commands: string[] = []

  rect(x: number, y: number, width: number, height: number, fill: Color, stroke?: Color) {
    this.commands.push(`${rgb(fill)} rg ${x} ${y} ${width} ${height} re f`)
    if (stroke) this.commands.push(`${rgb(stroke)} RG 0.8 w ${x} ${y} ${width} ${height} re S`)
  }

  line(x1: number, y1: number, x2: number, y2: number, color: Color, width = 1) {
    this.commands.push(`${rgb(color)} RG ${width} w ${x1} ${y1} m ${x2} ${y2} l S`)
  }

  polyline(points: Array<[number, number]>, color: Color, width = 1.7) {
    if (points.length < 2) return
    const [first, ...rest] = points
    this.commands.push(`${rgb(color)} RG ${width} w ${first[0]} ${first[1]} m ${rest.map(([x, y]) => `${x} ${y} l`).join(" ")} S`)
  }

  circle(x: number, y: number, radius: number, fill: Color) {
    const c = radius * 0.5522848
    this.commands.push(
      `${rgb(fill)} rg ${x + radius} ${y} m ${x + radius} ${y + c} ${x + c} ${y + radius} ${x} ${y + radius} c ` +
      `${x - c} ${y + radius} ${x - radius} ${y + c} ${x - radius} ${y} c ` +
      `${x - radius} ${y - c} ${x - c} ${y - radius} ${x} ${y - radius} c ` +
      `${x + c} ${y - radius} ${x + radius} ${y - c} ${x + radius} ${y} c f`,
    )
  }

  text(value: string, x: number, y: number, size = 10, color: Color = INK, bold = false) {
    this.commands.push(`BT /${bold ? "F2" : "F1"} ${size} Tf ${rgb(color)} rg 1 0 0 1 ${x} ${y} Tm (${safeText(value)}) Tj ET`)
  }

  output() {
    return this.commands.join("\n")
  }
}

function shortDate(value: string) {
  const [year, month, day] = value.split("-")
  return `${day}/${month}/${year}`
}

function delta(current: number, previous: number) {
  if (previous === 0) return current === 0 ? "0%" : "new"
  const value = ((current - previous) / previous) * 100
  return `${value >= 0 ? "+" : ""}${value.toFixed(0)}%`
}

function metricCard(canvas: Canvas, x: number, y: number, label: string, value: string, change: string, accent: Color) {
  canvas.rect(x, y, 184, 74, WHITE, GRID)
  canvas.rect(x, y, 5, 74, accent)
  canvas.text(label.toUpperCase(), x + 17, y + 52, 8, MUTED, true)
  canvas.text(value, x + 17, y + 24, 23, INK, true)
  canvas.text(change, x + 128, y + 27, 9, change.startsWith("-") ? RED : GREEN, true)
}

function lineChart(canvas: Canvas, x: number, y: number, width: number, height: number, rows: ReportTrendRow[]) {
  canvas.rect(x, y, width, height, WHITE, GRID)
  canvas.text("ACTIVITY TREND", x + 18, y + height - 25, 10, INK, true)
  if (!rows.length) {
    canvas.text("No activity in this range", x + 18, y + height / 2, 10, MUTED)
    return
  }
  const plotX = x + 42
  const plotY = y + 34
  const plotW = width - 62
  const plotH = height - 76
  const max = Math.max(1, ...rows.flatMap(row => [row.leads, row.calls, row.visits, row.conversions]))

  for (let index = 0; index <= 4; index += 1) {
    const gridY = plotY + (plotH * index) / 4
    canvas.line(plotX, gridY, plotX + plotW, gridY, GRID, 0.6)
    canvas.text(String(Math.round((max * index) / 4)), x + 13, gridY - 3, 7, MUTED)
  }

  const series: Array<{ key: keyof ReportTrendRow; color: Color; label: string }> = [
    { key: "calls", color: ORANGE, label: "Calls" },
    { key: "leads", color: BLUE, label: "Leads" },
    { key: "visits", color: PURPLE, label: "Visits" },
    { key: "conversions", color: GREEN, label: "Conversions" },
  ]
  series.forEach((item, seriesIndex) => {
    const points = rows.map((row, index) => [
      plotX + (rows.length === 1 ? plotW / 2 : (plotW * index) / (rows.length - 1)),
      plotY + (Number(row[item.key]) / max) * plotH,
    ] as [number, number])
    canvas.polyline(points, item.color)
    points.forEach(([pointX, pointY]) => canvas.circle(pointX, pointY, 2.1, item.color))
    const legendX = x + width - 235 + seriesIndex * 55
    canvas.circle(legendX, y + height - 22, 3, item.color)
    canvas.text(item.label, legendX + 6, y + height - 25, 7, MUTED)
  })

  const labelIndexes = [...new Set([0, Math.floor((rows.length - 1) / 2), rows.length - 1])]
  labelIndexes.forEach(index => {
    const labelX = plotX + (rows.length === 1 ? plotW / 2 : (plotW * index) / (rows.length - 1))
    canvas.text(rows[index].label.slice(0, 10), labelX - 12, y + 16, 7, MUTED)
  })
}

function horizontalRate(canvas: Canvas, x: number, y: number, width: number, label: string, value: number, color: Color) {
  const bounded = Math.max(0, Math.min(100, value))
  canvas.text(label, x, y + 14, 9, MUTED, true)
  canvas.text(`${value.toFixed(1)}%`, x + width - 35, y + 14, 9, INK, true)
  canvas.rect(x, y, width, 7, GRID)
  canvas.rect(x, y, (width * bounded) / 100, 7, color)
}

function comparisonChart(canvas: Canvas, x: number, y: number, width: number, height: number, report: CustomEmployeeReport) {
  canvas.rect(x, y, width, height, WHITE, GRID)
  canvas.text("CURRENT VS PREVIOUS PERIOD", x + 18, y + height - 25, 10, INK, true)
  const metrics: Array<[string, keyof ReportSummary]> = [
    ["Leads", "totalLeads"],
    ["Calls", "callsLogged"],
    ["Visits", "siteVisitsCompleted"],
    ["Conversions", "convertedLeads"],
  ]
  const max = Math.max(1, ...metrics.flatMap(([, key]) => [report.summary[key], report.previousSummary[key]]))
  const baseY = y + 36
  const chartHeight = height - 80
  metrics.forEach(([label, key], index) => {
    const groupX = x + 42 + index * ((width - 72) / metrics.length)
    const currentHeight = (Number(report.summary[key]) / max) * chartHeight
    const previousHeight = (Number(report.previousSummary[key]) / max) * chartHeight
    canvas.rect(groupX, baseY, 24, currentHeight, ORANGE)
    canvas.rect(groupX + 28, baseY, 24, previousHeight, [188, 197, 210])
    canvas.text(String(report.summary[key]), groupX + 5, baseY + currentHeight + 5, 8, INK, true)
    canvas.text(label, groupX - 2, y + 17, 7, MUTED)
  })
  canvas.rect(x + width - 135, y + height - 28, 8, 8, ORANGE)
  canvas.text("Current", x + width - 123, y + height - 27, 7, MUTED)
  canvas.rect(x + width - 75, y + height - 28, 8, 8, [188, 197, 210])
  canvas.text("Previous", x + width - 63, y + height - 27, 7, MUTED)
}

function header(canvas: Canvas, employee: string, report: CustomEmployeeReport, page: number) {
  canvas.rect(0, 535, 842, 60, NAVY)
  canvas.text("PIKORUA CRM", 32, 570, 9, ORANGE, true)
  canvas.text("EMPLOYEE PERFORMANCE REPORT", 32, 548, 18, WHITE, true)
  canvas.text(employee, 580, 570, 11, WHITE, true)
  canvas.text(`${shortDate(report.range.startDate)} - ${shortDate(report.range.endDate)}`, 580, 551, 9, [205, 213, 224])
  canvas.text(`PAGE ${page}/2`, 775, 18, 7, MUTED, true)
}

function buildPages(input: EmployeePerformanceReportInput) {
  const { report } = input
  const employee = input.employee.full_name || input.employee.email || "Employee"
  const first = new Canvas()
  first.rect(0, 0, 842, 595, PAPER)
  header(first, employee, report, 1)
  metricCard(first, 32, 438, "Assigned leads", report.summary.totalLeads.toLocaleString("en-IN"), delta(report.summary.totalLeads, report.previousSummary.totalLeads), BLUE)
  metricCard(first, 224, 438, "Calls logged", report.summary.callsLogged.toLocaleString("en-IN"), delta(report.summary.callsLogged, report.previousSummary.callsLogged), ORANGE)
  metricCard(first, 416, 438, "Conversions", report.summary.convertedLeads.toLocaleString("en-IN"), delta(report.summary.convertedLeads, report.previousSummary.convertedLeads), GREEN)
  metricCard(first, 608, 438, "Conversion rate", `${report.summary.conversionRate.toFixed(1)}%`, `${(report.summary.conversionRate - report.previousSummary.conversionRate) >= 0 ? "+" : ""}${(report.summary.conversionRate - report.previousSummary.conversionRate).toFixed(1)} pt`, PURPLE)
  lineChart(first, 32, 165, 778, 248, report.trend)
  first.text("KEY SIGNALS", 32, 137, 9, INK, true)
  report.insights.items.slice(0, 3).forEach((insight, index) => {
    const x = 32 + index * 260
    const lines = wrapWords(insight, 47).slice(0, 2)
    first.rect(x, 65, 246, 54, WHITE, GRID)
    first.circle(x + 19, 92, 5, [index === 0 ? 54 : index === 1 ? 238 : 40, index === 0 ? 112 : index === 1 ? 115 : 164, index === 0 ? 198 : index === 1 ? 45 : 112])
    first.text(lines[0] ?? "", x + 33, lines.length > 1 ? 94 : 87, 8, INK, true)
    if (lines[1]) first.text(lines[1], x + 33, 80, 8, INK)
  })

  const second = new Canvas()
  second.rect(0, 0, 842, 595, PAPER)
  header(second, employee, report, 2)
  comparisonChart(second, 32, 304, 482, 205, report)
  second.rect(530, 304, 280, 205, WHITE, GRID)
  second.text("EFFICIENCY RATIOS", 548, 484, 10, INK, true)
  horizontalRate(second, 548, 439, 238, "Callback share", report.ratios.callbackRate, BLUE)
  horizontalRate(second, 548, 397, 238, "Contact rate", report.ratios.contactRate, ORANGE)
  horizontalRate(second, 548, 355, 238, "Visit completion", report.ratios.visitCompletionRate, PURPLE)
  horizontalRate(second, 548, 313, 238, "Conversion", report.ratios.conversionRate, GREEN)

  second.rect(32, 73, 380, 207, WHITE, GRID)
  second.text("CALL OUTCOMES", 50, 254, 10, INK, true)
  const outcomes: Array<[string, number, Color]> = [
    ["Spoken", report.summary.spokenCalls, GREEN],
    ["Not spoken", report.summary.notSpokenCalls, RED],
    ["Callback", report.summary.callbackCalls, ORANGE],
  ]
  const outcomeMax = Math.max(1, ...outcomes.map(([, value]) => value))
  outcomes.forEach(([label, value, color], index) => {
    const rowY = 208 - index * 47
    second.text(label, 50, rowY + 11, 9, MUTED, true)
    second.rect(135, rowY, 235, 12, GRID)
    second.rect(135, rowY, (235 * value) / outcomeMax, 12, color)
    second.text(String(value), 375, rowY + 2, 9, INK, true)
  })

  second.rect(428, 73, 382, 207, WHITE, GRID)
  second.text("RECOMMENDED ACTIONS", 446, 254, 10, INK, true)
  report.insights.actions.slice(0, 3).forEach((action, index) => {
    const rowY = 211 - index * 52
    const lines = wrapWords(action, 49).slice(0, 2)
    second.circle(453, rowY + 5, 5, [index === 0 ? 54 : index === 1 ? 238 : 40, index === 0 ? 112 : index === 1 ? 115 : 164, index === 0 ? 198 : index === 1 ? 45 : 112])
    second.text(lines[0] ?? "", 468, rowY + 8, 8, INK, true)
    if (lines[1]) second.text(lines[1], 468, rowY - 6, 8, MUTED)
    if (index < 2) second.line(446, rowY - 22, 786, rowY - 22, GRID, 0.5)
  })
  second.text("Transfer-safe attribution - activities remain with the employee who owned the lead at that time.", 32, 42, 8, MUTED)
  second.text(`Generated ${new Date(input.generatedAt).toLocaleString("en-IN")}`, 596, 42, 8, MUTED)
  return [first.output(), second.output()]
}

function createPdf(contents: string[]) {
  const objects: string[] = []
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>"
  objects[2] = "<< /Type /Pages /Kids [5 0 R 7 0 R] /Count 2 >>"
  objects[3] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"
  objects[4] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"
  objects[5] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents 6 0 R >>"
  objects[6] = `<< /Length ${contents[0].length} >>\nstream\n${contents[0]}\nendstream`
  objects[7] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents 8 0 R >>"
  objects[8] = `<< /Length ${contents[1].length} >>\nstream\n${contents[1]}\nendstream`

  let pdf = "%PDF-1.4\n% Pikorua CRM\n"
  const offsets = [0]
  for (let index = 1; index <= 8; index += 1) {
    offsets[index] = pdf.length
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`
  }
  const xref = pdf.length
  pdf += `xref\n0 9\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\n`
  pdf += `trailer\n<< /Size 9 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`
  return new TextEncoder().encode(pdf)
}

export function buildEmployeePerformancePdf(input: EmployeePerformanceReportInput) {
  return createPdf(buildPages(input))
}

export function downloadEmployeePerformancePdf(input: EmployeePerformanceReportInput) {
  const bytes = buildEmployeePerformancePdf(input)
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  const employee = (input.employee.full_name || "employee").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
  anchor.href = url
  anchor.download = `employee-performance-${employee || "report"}-${input.report.range.startDate}-${input.report.range.endDate}.pdf`
  anchor.click()
  URL.revokeObjectURL(url)
}
