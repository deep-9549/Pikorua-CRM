import { BadRequestException, Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import * as XLSX from 'xlsx'
import { DatabaseService } from '../../database/database.service'
import { metaLeads, leadCrmDetails, clients } from '@pikorua/db'
import { ImportResultDto } from './dto/import-result.dto'

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000'

// Accepted column header names — case-insensitive, first match wins
const HEADER_MAP: Record<string, string[]> = {
  full_name:      ['name', 'full name', 'full_name', 'lead name', 'contact name'],
  phone:          ['phone', 'mobile', 'contact', 'phone number', 'mobile number'],
  email:          ['email', 'email address', 'e-mail'],
  city:           ['city', 'location', 'town'],
  campaign_name:  ['source', 'campaign', 'campaign name', 'lead source'],
  received_at:    ['date', 'received', 'received at', 'lead date', 'enquiry date'],
  call_status:    ['call status', 'call_status', 'status'],
  hwc:            ['hwc', 'priority', 'temperature', 'lead quality'],
  budget_range:   ['budget', 'budget range'],
  profession:     ['profession', 'occupation', 'job', 'job title'],
  current_city:   ['current city', 'current location', 'from city'],
  current_area:   ['current area', 'area', 'locality'],
  follow_up_date: ['follow up', 'follow up date', 'followup', 'next follow up'],
  remarks:        ['remarks', 'notes', 'comments', 'additional info'],
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

@Injectable()
export class ImportService {
  constructor(private readonly database: DatabaseService) {}

  private get db() { return this.database.db }

  private buildHeaderIndex(headers: string[]): Record<string, string> {
    const index: Record<string, string> = {}
    for (const header of headers) {
      const lc = header.trim().toLowerCase()
      for (const [field, aliases] of Object.entries(HEADER_MAP)) {
        if (aliases.includes(lc) && !(field in index)) {
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
    // Handle Excel serial date numbers
    const num = Number(v)
    if (!isNaN(num) && num > 1000) {
      const date = XLSX.SSF.parse_date_code(num)
      if (date) return new Date(date.y, date.m - 1, date.d)
    }
    const d = new Date(v)
    return isNaN(d.getTime()) ? null : d
  }

  private normalizePhone(raw: string): string {
    return raw.replace(/[\s\-().+]/g, '')
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

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
      workbook.Sheets[sheetName],
      { defval: null },
    )
    if (rows.length === 0) throw new BadRequestException('File is empty or has no data rows')

    const headers = Object.keys(rows[0])
    const idx = this.buildHeaderIndex(headers)

    if (!idx['phone']) {
      throw new BadRequestException(
        `Could not find a "Phone" column. Detected headers: ${headers.join(', ')}`,
      )
    }

    const result: ImportResultDto = { total: rows.length, inserted: 0, skipped: 0, errors: [] }

    const BATCH = 50
    for (let i = 0; i < rows.length; i += BATCH) {
      const batch = rows.slice(i, i + BATCH)
      for (const [j, row] of batch.entries()) {
        const rowNum = i + j + 2 // +2 for 1-based + header row
        await this.processRow(row, idx, rowNum, result)
      }
    }

    return result
  }

  private async processRow(
    row: Record<string, unknown>,
    idx: Record<string, string>,
    rowNum: number,
    result: ImportResultDto,
  ) {
    const rawPhone = this.cell(row, idx['phone'])
    if (!rawPhone) {
      result.errors.push({ row: rowNum, reason: 'Phone is required' })
      return
    }

    const phone = this.normalizePhone(rawPhone)

    // Duplicate check
    const existing = await this.db.query.metaLeads.findFirst({
      where: eq(metaLeads.phone, phone),
      columns: { id: true },
    })
    if (existing) {
      result.skipped++
      return
    }

    // Build meta lead payload
    const receivedAt = this.parseDate(this.cell(row, idx['received_at'])) ?? new Date()

    let leadId: string
    try {
      const [inserted] = await this.db.insert(metaLeads).values({
        fullName:     this.cell(row, idx['full_name']),
        phone,
        email:        this.cell(row, idx['email']),
        city:         this.cell(row, idx['city']),
        campaignName: this.cell(row, idx['campaign_name']),
        source:       'migrated',
        status:       'unassigned',
        receivedAt,
      }).returning({ id: metaLeads.id })
      leadId = inserted.id
    } catch (err) {
      result.errors.push({ row: rowNum, reason: err instanceof Error ? err.message : 'Insert failed' })
      return
    }

    // Ensure client record exists
    await this.ensureClient({ id: leadId, phone, fullName: this.cell(row, idx['full_name']), email: this.cell(row, idx['email']) })

    // Build CRM details if any CRM columns present
    const callStatusRaw  = this.cell(row, idx['call_status'])
    const hwcRaw         = this.cell(row, idx['hwc'])
    const budgetRange    = this.cell(row, idx['budget_range'])
    const profession     = this.cell(row, idx['profession'])
    const currentCity    = this.cell(row, idx['current_city'])
    const currentArea    = this.cell(row, idx['current_area'])
    const followUpDate   = this.parseDate(this.cell(row, idx['follow_up_date']))
    const remarks        = this.cell(row, idx['remarks'])

    const callStatus = callStatusRaw ? (CALL_STATUS_MAP[callStatusRaw.toLowerCase()] ?? null) : null
    const hwc        = hwcRaw        ? (HWC_MAP[hwcRaw.toLowerCase()] ?? null)        : null

    const hasCrmData = !!(callStatus || hwc || budgetRange || profession || currentCity || currentArea || followUpDate || remarks)
    if (hasCrmData) {
      try {
        await this.db.insert(leadCrmDetails).values({
          leadId,
          ...(callStatus    ? { callStatus: callStatus as 'spoken' | 'not_spoken' | 'call_back_later' } : {}),
          ...(hwc           ? { hwc: hwc as 'hot' | 'warm' | 'cold' } : {}),
          ...(budgetRange   ? { budgetRange }   : {}),
          ...(profession    ? { profession }    : {}),
          ...(currentCity   ? { currentCity }   : {}),
          ...(currentArea   ? { currentArea }   : {}),
          ...(followUpDate  ? { followUpDate }  : {}),
          ...(remarks       ? { remarks }       : {}),
        })
      } catch {
        // CRM details failure is non-fatal — lead is still inserted
      }
    }

    result.inserted++
  }

  private async ensureClient(lead: { id: string; phone: string; fullName: string | null; email: string | null }) {
    const existing = await this.db.query.clients.findFirst({
      where: eq(clients.phone, lead.phone),
      columns: { id: true },
    })
    if (existing) {
      await this.db.update(metaLeads).set({ clientId: existing.id }).where(eq(metaLeads.id, lead.id))
      return
    }
    const [client] = await this.db.insert(clients).values({
      tenantId: DEFAULT_TENANT_ID,
      fullName: lead.fullName,
      phone:    lead.phone,
      email:    lead.email,
    }).returning({ id: clients.id })
    await this.db.update(metaLeads).set({ clientId: client.id }).where(eq(metaLeads.id, lead.id))
  }

  generateMetaLeadsTemplate(): Buffer {
    const headers = [
      'Name', 'Phone', 'Email', 'City', 'Source',
      'Date', 'Call Status', 'HWC', 'Budget', 'Profession',
      'Current City', 'Current Area', 'Follow Up', 'Remarks',
    ]
    const sample = [
      'John Doe', '9876543210', 'john@example.com', 'Mumbai', 'Referral',
      '2024-01-15', 'spoken', 'hot', '50-80L', 'IT Professional',
      'Pune', 'Baner', '2024-02-01', 'Looking for 2BHK near metro',
    ]
    const ws = XLSX.utils.aoa_to_sheet([headers, sample])
    ws['!cols'] = headers.map(() => ({ wch: 18 }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Leads')
    return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
  }
}
