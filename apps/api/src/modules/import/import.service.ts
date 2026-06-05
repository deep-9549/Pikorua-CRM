import { BadRequestException, Injectable } from '@nestjs/common'
import { inArray } from 'drizzle-orm'
import * as XLSX from 'xlsx'
import { DatabaseService } from '../../database/database.service'
import { metaLeads, leadCrmDetails, clients } from '@pikorua/db'
import { ImportResultDto } from './dto/import-result.dto'
import { normalizeMetaBudget, normalizeCampaignName, stripPhonePrefix } from '../../common/utils/meta-format'

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000'

// Exact-match aliases (header is lower-cased & trimmed before comparison).
// Includes Meta's underscore_separated lead-form export headers.
const HEADER_MAP: Record<string, string[]> = {
  full_name:      ['name', 'full name', 'full_name', 'lead name', 'contact name'],
  phone:          ['phone', 'mobile', 'contact', 'phone number', 'phone_number', 'mobile number'],
  email:          ['email', 'email address', 'e-mail'],
  city:           ['city', 'location', 'town'],
  campaign_name:  ['source', 'campaign', 'campaign name', 'campaign_name', 'lead source'],
  received_at:    ['date', 'received', 'received at', 'created', 'created_time', 'created time', 'lead date', 'enquiry date'],
  call_status:    ['call status', 'call_status', 'status'],
  hwc:            ['hwc', 'priority', 'temperature', 'lead quality'],
  budget_range:   ['budget', 'budget range', 'budget_range'],
  profession:     ['profession', 'occupation', 'job', 'job title', 'job_title'],
  company_name:   ['company', 'company name', 'company_name', 'organisation', 'organization'],
  current_city:   ['current city', 'current location', 'from city'],
  current_area:   ['current area', 'area', 'locality'],
  follow_up_date: ['follow up', 'follow up date', 'followup', 'next follow up'],
  remarks:        ['remarks', 'notes', 'comments', 'additional info'],
}

// Fallback substring rules for Meta's free-text question headers, e.g.
// "what_budget_are_you_comfortable_with". Applied only to fields not already
// matched exactly above. Order is irrelevant — each field is filled once.
const HEADER_CONTAINS_MAP: Record<string, string[]> = {
  budget_range:  ['budget'],
  company_name:  ['company', 'organis', 'organiz'],
  profession:    ['job', 'profession', 'occupation', 'designation'],
}

const CALL_STATUS_MAP: Record<string, string> = {
  spoken: 'spoken', talked: 'spoken', yes: 'spoken',
  'not spoken': 'not_spoken', 'no answer': 'not_spoken', unanswered: 'not_spoken', no: 'not_spoken',
  'call back': 'call_back_later', callback: 'call_back_later', 'call back later': 'call_back_later',
}

const HWC_MAP: Record<string, string> = {
  hot: 'hot', warm: 'warm', cold: 'cold',
  h: 'hot', w: 'warm', c: 'cold',
}

interface ParsedRow {
  rowNum: number
  phone: string
  fullName: string | null
  email: string | null
  city: string | null
  campaignName: string | null
  receivedAt: Date
  callStatus: string | null
  hwc: string | null
  budgetRange: string | null
  profession: string | null
  companyName: string | null
  currentCity: string | null
  currentArea: string | null
  followUpDate: Date | null
  remarks: string | null
}

@Injectable()
export class ImportService {
  constructor(private readonly database: DatabaseService) {}

  private get db() { return this.database.db }

  private buildHeaderIndex(headers: string[]): Record<string, string> {
    const index: Record<string, string> = {}

    // Pass 1 — exact alias match (most precise).
    for (const header of headers) {
      const lc = header.trim().toLowerCase()
      for (const [field, aliases] of Object.entries(HEADER_MAP)) {
        if (aliases.includes(lc) && !(field in index)) {
          index[field] = header
        }
      }
    }

    // Pass 2 — substring fallback for verbose Meta question headers,
    // only for fields still unmatched.
    for (const header of headers) {
      const lc = header.trim().toLowerCase()
      for (const [field, needles] of Object.entries(HEADER_CONTAINS_MAP)) {
        if (field in index) continue
        if (needles.some(n => lc.includes(n)) && !Object.values(index).includes(header)) {
          index[field] = header
        }
      }
    }

    return index
  }

  private cell(row: Record<string, unknown>, header: string | undefined): string | null {
    if (!header) return null
    const v = row[header]
    if (v === undefined || v === null || String(v).trim() === '') return null
    return String(v).trim()
  }

  private parseDate(v: string | null): Date | null {
    if (!v) return null
    const num = Number(v)
    if (!isNaN(num) && num > 1000) {
      const date = XLSX.SSF.parse_date_code(num)
      if (date) return new Date(date.y, date.m - 1, date.d)
    }
    const d = new Date(v)
    return isNaN(d.getTime()) ? null : d
  }

  private normalizePhone(raw: string): string {
    // Meta CSV exports prefix the number with "p:" — drop it, then strip
    // separators/symbols so dedup compares bare digits.
    return stripPhonePrefix(raw).replace(/[\s\-().+]/g, '')
  }

  async importMetaLeads(file: Express.Multer.File): Promise<ImportResultDto> {
    if (!file) throw new BadRequestException('No file uploaded')

    let workbook: XLSX.WorkBook
    try {
      workbook = XLSX.read(file.buffer, { type: 'buffer', cellDates: false })
    } catch {
      throw new BadRequestException('Could not parse file — ensure it is a valid .xlsx or .csv')
    }

    const sheetName = workbook.SheetNames[0]
    if (!sheetName) throw new BadRequestException('File has no sheets')

    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets[sheetName],
      { defval: null },
    )
    if (rawRows.length === 0) throw new BadRequestException('File is empty or has no data rows')

    const headers = Object.keys(rawRows[0])
    const idx = this.buildHeaderIndex(headers)

    if (!idx['phone']) {
      throw new BadRequestException(
        `Could not find a "Phone" column. Detected headers: ${headers.join(', ')}`,
      )
    }

    const result: ImportResultDto = { total: rawRows.length, inserted: 0, skipped: 0, errors: [] }

    // ── Step 1: Parse all rows in memory (no DB calls) ──────────────────────
    const parsed: ParsedRow[] = []
    const seenPhones = new Set<string>() // catch within-file duplicates

    for (const [i, row] of rawRows.entries()) {
      const rowNum = i + 2
      const rawPhone = this.cell(row, idx['phone'])
      if (!rawPhone) {
        result.errors.push({ row: rowNum, reason: 'Phone is required' })
        continue
      }
      const phone = this.normalizePhone(rawPhone)
      if (seenPhones.has(phone)) {
        result.skipped++
        continue
      }
      seenPhones.add(phone)

      const callStatusRaw = this.cell(row, idx['call_status'])
      const hwcRaw        = this.cell(row, idx['hwc'])

      parsed.push({
        rowNum,
        phone,
        fullName:     this.cell(row, idx['full_name']),
        email:        this.cell(row, idx['email']),
        city:         this.cell(row, idx['city']),
        campaignName: normalizeCampaignName(this.cell(row, idx['campaign_name'])),
        receivedAt:   this.parseDate(this.cell(row, idx['received_at'])) ?? new Date(),
        callStatus:   callStatusRaw ? (CALL_STATUS_MAP[callStatusRaw.toLowerCase()] ?? null) : null,
        hwc:          hwcRaw        ? (HWC_MAP[hwcRaw.toLowerCase()] ?? null)        : null,
        budgetRange:  normalizeMetaBudget(this.cell(row, idx['budget_range'])),
        profession:   this.cell(row, idx['profession']),
        companyName:  this.cell(row, idx['company_name']),
        currentCity:  this.cell(row, idx['current_city']),
        currentArea:  this.cell(row, idx['current_area']),
        followUpDate: this.parseDate(this.cell(row, idx['follow_up_date'])),
        remarks:      this.cell(row, idx['remarks']),
      })
    }

    if (parsed.length === 0) return result

    // ── Step 2: Bulk duplicate check — 1 query ───────────────────────────────
    const allPhones = parsed.map(r => r.phone)
    const existingLeads = await this.db
      .select({ phone: metaLeads.phone })
      .from(metaLeads)
      .where(inArray(metaLeads.phone, allPhones))

    const existingPhoneSet = new Set(existingLeads.map(r => r.phone).filter(Boolean) as string[])
    const newRows = parsed.filter(r => {
      if (existingPhoneSet.has(r.phone)) { result.skipped++; return false }
      return true
    })

    if (newRows.length === 0) return result

    // ── Step 3: Bulk fetch existing clients by phone — 1 query ──────────────
    const newPhones = newRows.map(r => r.phone)
    const existingClients = await this.db
      .select({ id: clients.id, phone: clients.phone })
      .from(clients)
      .where(inArray(clients.phone, newPhones))

    const existingClientMap = new Map(existingClients.map(c => [c.phone, c.id]))

    // ── Step 4: Bulk insert meta leads — 1 query ─────────────────────────────
    const insertedLeads = await this.db
      .insert(metaLeads)
      .values(newRows.map(r => ({
        fullName:     r.fullName,
        phone:        r.phone,
        email:        r.email,
        city:         r.city,
        campaignName: r.campaignName,
        source:       'migrated',
        status:       'unassigned' as const,
        receivedAt:   r.receivedAt,
      })))
      .returning({ id: metaLeads.id, phone: metaLeads.phone })

    // Map phone → lead id for subsequent steps
    const leadIdByPhone = new Map(insertedLeads.map(l => [l.phone, l.id]))

    // ── Step 5: Bulk insert new clients (phones not already in clients) — 1 query
    const phonesNeedingClient = newPhones.filter(p => !existingClientMap.has(p))
    if (phonesNeedingClient.length > 0) {
      const rowsByPhone = new Map(newRows.map(r => [r.phone, r]))
      const insertedClients = await this.db
        .insert(clients)
        .values(phonesNeedingClient.map(phone => {
          const r = rowsByPhone.get(phone)!
          return { tenantId: DEFAULT_TENANT_ID, fullName: r.fullName, phone, email: r.email }
        }))
        .returning({ id: clients.id, phone: clients.phone })

      for (const c of insertedClients) {
        if (c.phone) existingClientMap.set(c.phone, c.id)
      }
    }

    // ── Step 6: Bulk update clientId on all inserted leads — 1 query ─────────
    // Group leads by clientId to minimise updates (one update per unique client)
    const clientIdToLeadIds = new Map<string, string[]>()
    for (const r of newRows) {
      const clientId = existingClientMap.get(r.phone)
      const leadId   = leadIdByPhone.get(r.phone)
      if (!clientId || !leadId) continue
      const list = clientIdToLeadIds.get(clientId) ?? []
      list.push(leadId)
      clientIdToLeadIds.set(clientId, list)
    }
    // One update per distinct clientId (usually same count as new clients)
    await Promise.all(
      [...clientIdToLeadIds.entries()].map(([clientId, leadIds]) =>
        this.db
          .update(metaLeads)
          .set({ clientId })
          .where(inArray(metaLeads.id, leadIds))
      )
    )

    // ── Step 7: Bulk insert CRM details for rows that have them — 1 query ───
    const crmValues = newRows
      .filter(r => r.callStatus || r.hwc || r.budgetRange || r.profession || r.companyName ||
                   r.currentCity || r.currentArea || r.followUpDate || r.remarks)
      .map(r => {
        const leadId = leadIdByPhone.get(r.phone)
        if (!leadId) return null
        return {
          leadId,
          ...(r.callStatus   ? { callStatus:   r.callStatus   as 'spoken' | 'not_spoken' | 'call_back_later' } : {}),
          ...(r.hwc          ? { hwc:          r.hwc          as 'hot' | 'warm' | 'cold' } : {}),
          ...(r.budgetRange  ? { budgetRange:  r.budgetRange  } : {}),
          ...(r.profession   ? { profession:   r.profession   } : {}),
          ...(r.companyName  ? { companyName:  r.companyName  } : {}),
          ...(r.currentCity  ? { currentCity:  r.currentCity  } : {}),
          ...(r.currentArea  ? { currentArea:  r.currentArea  } : {}),
          ...(r.followUpDate ? { followUpDate: r.followUpDate } : {}),
          ...(r.remarks      ? { remarks:      r.remarks      } : {}),
        }
      })
      .filter(Boolean) as Record<string, unknown>[]

    if (crmValues.length > 0) {
      await this.db.insert(leadCrmDetails).values(crmValues as never[]).onConflictDoNothing()
    }

    result.inserted = insertedLeads.length
    return result
  }

  generateMetaLeadsTemplate(): Buffer {
    const headers = [
      'Name', 'Phone', 'Email', 'City', 'Source',
      'Date', 'Call Status', 'HWC', 'Budget', 'Profession', 'Company',
      'Current City', 'Current Area', 'Follow Up', 'Remarks',
    ]
    const sample = [
      'John Doe', '9876543210', 'john@example.com', 'Mumbai', 'Referral',
      '2024-01-15', 'spoken', 'hot', '50-80L', 'IT Professional', 'Acme Corp',
      'Pune', 'Baner', '2024-02-01', 'Looking for 2BHK near metro',
    ]
    const ws = XLSX.utils.aoa_to_sheet([headers, sample])
    ws['!cols'] = headers.map(() => ({ wch: 18 }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Leads')
    return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
  }
}
