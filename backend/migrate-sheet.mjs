/**
 * Pikorua CRM — one-time Google Sheets → Supabase migration.
 *
 * USAGE:
 *   1. Export your Google Sheet as .xlsx (File → Download → Microsoft Excel)
 *      or .csv, and place it next to this script.
 *   2. Fill in the MAPPING object below to match YOUR sheet's column headers.
 *   3. Run a dry run first (prints what WOULD be inserted, writes nothing):
 *        node backend/migrate-sheet.mjs ./leads.xlsx --dry
 *   4. When it looks right, run for real:
 *        node backend/migrate-sheet.mjs ./leads.xlsx
 *
 * REQUIREMENTS:
 *   - Run from the project root with the frontend deps available, OR
 *     `npm i xlsx @supabase/supabase-js` in the backend folder.
 *   - Env vars (same values as frontend/.env):
 *        NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *     Set them inline, e.g. (PowerShell):
 *        $env:NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
 *        $env:SUPABASE_SERVICE_ROLE_KEY="eyJ..."
 *        node backend/migrate-sheet.mjs ./leads.xlsx --dry
 *
 * The `link_lead_to_client` DB trigger auto-creates/links the client by phone,
 * so repeat phone numbers collapse into one client automatically.
 */

import * as XLSX from "xlsx"
import { createClient } from "@supabase/supabase-js"

// ─────────────────────────────────────────────────────────────────────────────
// MAPPING — EDIT THIS to match your sheet's exact column header names.
// Left = CRM field, Right = the header text in your sheet (case-sensitive).
// Set to null to skip a field. Send me your headers and I'll finalize this.
// ─────────────────────────────────────────────────────────────────────────────
const MAPPING = {
  // meta_leads columns
  full_name:     "Name",          // e.g. "Client Name"
  phone:         "Phone",         // REQUIRED — used for client dedupe
  email:         "Email",
  city:          "City",
  campaign_name: "Source",        // e.g. project / campaign / where they came from
  received_at:   "Date",          // optional; parsed if present, else now()

  // lead_crm_details columns (optional — leave as null if the sheet lacks them)
  call_status:   null,            // must map to: spoken | not_spoken | call_back_later
  hwc:           null,            // must map to: hot | warm | cold
  budget_range:  null,
  profession:    null,
  current_city:  null,
  current_area:  null,
  follow_up_date: null,
  remarks:       "Remarks",
}

// Optional value translators — convert sheet text to the CRM's allowed values.
const TRANSLATE_CALL_STATUS = (v) => ({
  "spoken": "spoken", "talked": "spoken",
  "not spoken": "not_spoken", "no answer": "not_spoken",
  "call back": "call_back_later", "callback": "call_back_later",
}[String(v).trim().toLowerCase()] ?? null)

const TRANSLATE_HWC = (v) => ({
  "hot": "hot", "warm": "warm", "cold": "cold",
}[String(v).trim().toLowerCase()] ?? null)

// ─────────────────────────────────────────────────────────────────────────────

const file = process.argv[2]
const DRY = process.argv.includes("--dry")

if (!file) {
  console.error("Usage: node backend/migrate-sheet.mjs <file.xlsx|csv> [--dry]")
  process.exit(1)
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!DRY && (!SUPABASE_URL || !SERVICE_KEY)) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.")
  process.exit(1)
}

function cell(row, header) {
  if (!header) return null
  const v = row[header]
  if (v === undefined || v === null || String(v).trim() === "") return null
  return String(v).trim()
}

function parseDate(v) {
  if (!v) return null
  const d = new Date(v)
  return isNaN(d.getTime()) ? null : d.toISOString()
}

async function main() {
  const wb = XLSX.readFile(file)
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: null })

  console.log(`Read ${rows.length} rows from ${file} (sheet "${wb.SheetNames[0]}")`)
  if (rows.length > 0) {
    console.log("Detected headers:", Object.keys(rows[0]).join(" | "))
  }

  const supabase = DRY ? null : createClient(SUPABASE_URL, SERVICE_KEY)

  let inserted = 0, skipped = 0, withCrm = 0

  for (const [i, row] of rows.entries()) {
    const phone = cell(row, MAPPING.phone)
    if (!phone) { skipped++; continue }  // phone is required for dedupe

    const lead = {
      full_name:     cell(row, MAPPING.full_name),
      phone,
      email:         cell(row, MAPPING.email),
      city:          cell(row, MAPPING.city),
      campaign_name: cell(row, MAPPING.campaign_name),
      received_at:   parseDate(cell(row, MAPPING.received_at)) ?? new Date().toISOString(),
      source:        "migrated",
      status:        "unassigned",
    }

    // Optional CRM fields
    const crmRaw = {
      call_status:    MAPPING.call_status ? TRANSLATE_CALL_STATUS(cell(row, MAPPING.call_status)) : null,
      hwc:            MAPPING.hwc ? TRANSLATE_HWC(cell(row, MAPPING.hwc)) : null,
      budget_range:   cell(row, MAPPING.budget_range),
      profession:     cell(row, MAPPING.profession),
      current_city:   cell(row, MAPPING.current_city),
      current_area:   cell(row, MAPPING.current_area),
      follow_up_date: cell(row, MAPPING.follow_up_date),
      remarks:        cell(row, MAPPING.remarks),
    }
    const hasCrm = Object.values(crmRaw).some(Boolean)

    if (DRY) {
      if (i < 5) console.log("WOULD INSERT:", JSON.stringify({ lead, crm: hasCrm ? crmRaw : null }))
      inserted++; if (hasCrm) withCrm++
      continue
    }

    const { data, error } = await supabase.from("meta_leads").insert(lead).select("id").single()
    if (error) { console.error(`Row ${i + 2}: ${error.message}`); skipped++; continue }
    inserted++

    if (hasCrm) {
      const { error: crmErr } = await supabase.from("lead_crm_details").insert({
        meta_lead_id: data.id, ...crmRaw,
      })
      if (crmErr) console.error(`Row ${i + 2} CRM: ${crmErr.message}`)
      else withCrm++
    }
  }

  console.log(`\n${DRY ? "[DRY RUN] " : ""}Done. Inserted: ${inserted}, with CRM: ${withCrm}, skipped (no phone): ${skipped}`)
  if (DRY) console.log("Re-run without --dry to write to the database.")
}

main().catch(e => { console.error(e); process.exit(1) })
