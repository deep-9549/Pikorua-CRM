import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { and, eq, inArray, isNull, or } from 'drizzle-orm'
import * as XLSX from 'xlsx'
import { DatabaseService } from '../../database/database.service'
import { metaLeads, leadCrmDetails, clients } from '@pikorua/db'
import { ImportResultDto } from './dto/import-result.dto'
import { normalizeMetaBudget, normalizeCampaignName, normalizeMetaPlatform, stripPhonePrefix } from '../../common/utils/meta-format'
import { poolStatusForClientStatus } from '../leads/lead-pools'
import {
  buildImportHeaderIndex,
  IMPORT_FIELDS,
  parseImportColumnMapping,
} from './import-mapping'

const DEFAULT_TENANT_ID = '00000000-0000-0000-0000-000000000000'

const CALL_STATUS_MAP: Record<string, string> = {
  spoken: 'spoken', talked: 'spoken', yes: 'spoken',
  'not spoken': 'not_spoken', 'no answer': 'not_spoken', unanswered: 'not_spoken', no: 'not_spoken',
  'call back': 'call_back_later', callback: 'call_back_later', 'call back later': 'call_back_later',
}

const HWC_MAP: Record<string, string> = {
  hot: 'hot', warm: 'warm', cold: 'cold',
  h: 'hot', w: 'warm', c: 'cold',
}

const BUYING_STATUS_MAP: Record<string, string> = {
  ready: 'ready', exploring: 'exploring', 'still searching': 'exploring',
  'not ready': 'not_ready', not_ready: 'not_ready', interested: 'interested',
}

const SITE_VISIT_STATUS_MAP: Record<string, string> = {
  scheduled: 'scheduled', completed: 'completed', visited: 'completed',
  'not scheduled': 'not_scheduled', not_scheduled: 'not_scheduled', 'yet to visit': 'not_scheduled',
}

interface ParsedRow {
  rowNum: number
  phone: string
  fullName: string | null
  email: string | null
  city: string | null
  campaignName: string | null
  platform: string | null
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
  firstCallDate: Date | null
  lastCallDate: Date | null
  buyingStatus: string | null
  siteVisitStatus: string | null
  visitDate: Date | null
  visitConfirmationDate: Date | null
  configuration: string[] | null
  projectName: string | null
  pageName: string | null
  formId: string | null
  adId: string | null
  externalId: string | null
  rawRow: Record<string, unknown>
}

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name)

  constructor(private readonly database: DatabaseService) {}

  private get db() { return this.database.db }

  private cell(row: Record<string, unknown>, header: string | null | undefined): string | null {
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
    const normalized = v
      .replace(/^(\d{4}-\d{2}-\d{2})\s+-\s+(\d{1,2}:\d{2})$/, '$1T$2:00')
      .replace(/^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2})$/, '$1T$2:00')
    const d = new Date(normalized)
    return isNaN(d.getTime()) ? null : d
  }

  private parseList(v: string | null): string[] | null {
    if (!v) return null
    const values = v.split(/[,;|]/).map(item => item.trim()).filter(Boolean)
    return values.length > 0 ? values : null
  }

  private readRows(file: Express.Multer.File) {
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
    return { sheetName, rawRows, headers: Object.keys(rawRows[0]) }
  }

  previewMetaLeads(file: Express.Multer.File) {
    const { sheetName, rawRows, headers } = this.readRows(file)
    const mapping = buildImportHeaderIndex(headers)
    const sampleValues = Object.fromEntries(headers.map(header => [
      header,
      rawRows.slice(0, 3).map(row => this.cell(row, header)).filter(Boolean),
    ]))

    return {
      sheet_name: sheetName,
      total_rows: rawRows.length,
      headers,
      fields: IMPORT_FIELDS.map(({ key, label, ...field }) => ({ key, label, required: 'required' in field && field.required === true })),
      mapping,
      sample_values: sampleValues,
    }
  }

  private normalizePhone(raw: string): string {
    // Meta CSV exports prefix the number with "p:" — drop it, then strip
    // separators/symbols so dedup compares bare digits.
    return stripPhonePrefix(raw).replace(/[\s\-().+]/g, '')
  }

  private dateKey(date: Date): string {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  private leadIdentityKey(row: Pick<ParsedRow, 'phone' | 'campaignName' | 'receivedAt'>): string {
    return JSON.stringify([
      row.phone,
      (row.campaignName ?? '').trim().toLowerCase(),
      this.dateKey(row.receivedAt),
    ])
  }

  async importMetaLeads(
    file: Express.Multer.File,
    mode: string | undefined = 'normal',
    mappingRaw?: string,
  ): Promise<ImportResultDto> {
    if (mode !== 'normal' && mode !== 'legacy') {
      throw new BadRequestException('Import mode must be either normal or legacy')
    }
    const isLegacy = mode === 'legacy'

    const { sheetName, rawRows, headers } = this.readRows(file)
    const suppliedMapping = parseImportColumnMapping(mappingRaw, headers)
    const idx = buildImportHeaderIndex(headers, suppliedMapping)

    if (!idx['phone']) {
      throw new BadRequestException(
        `Could not find a "Phone" column. Detected headers: ${headers.join(', ')}`,
      )
    }

    const result: ImportResultDto = { total: rawRows.length, inserted: 0, skipped: 0, errors: [] }

    // ── Step 1: Parse all rows in memory (no DB calls) ──────────────────────
    // Repeat leads are kept unless the same phone appears for the same campaign
    // on the same calendar date.
    let parsed: ParsedRow[] = []

    for (const [i, row] of rawRows.entries()) {
      const rowNum = i + 2
      const rawPhone = this.cell(row, idx['phone'])
      if (!rawPhone) {
        result.errors.push({ row: rowNum, reason: 'Phone is required' })
        continue
      }
      const phone = this.normalizePhone(rawPhone)

      const callStatusRaw = this.cell(row, idx.call_status)
      const hwcRaw        = this.cell(row, idx['hwc'])
      const buyingStatusRaw = this.cell(row, idx.buying_status)
      const siteVisitStatusRaw = this.cell(row, idx.site_visit_status)

      parsed.push({
        rowNum,
        phone,
        fullName:     this.cell(row, idx['full_name']),
        email:        this.cell(row, idx['email']),
        city:         this.cell(row, idx['city']),
        campaignName: normalizeCampaignName(this.cell(row, idx['campaign_name'])),
        platform:     normalizeMetaPlatform(this.cell(row, idx['platform'])),
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
        firstCallDate: this.parseDate(this.cell(row, idx.first_call_date)),
        lastCallDate: this.parseDate(this.cell(row, idx.last_call_date)),
        buyingStatus: buyingStatusRaw ? (BUYING_STATUS_MAP[buyingStatusRaw.toLowerCase()] ?? null) : null,
        siteVisitStatus: siteVisitStatusRaw ? (SITE_VISIT_STATUS_MAP[siteVisitStatusRaw.toLowerCase()] ?? null) : null,
        visitDate: this.parseDate(this.cell(row, idx.visit_date)),
        visitConfirmationDate: this.parseDate(this.cell(row, idx.visit_confirmation_date)),
        configuration: this.parseList(this.cell(row, idx.configuration)),
        projectName: this.cell(row, idx.project_name),
        pageName: this.cell(row, idx.page_name),
        formId: this.cell(row, idx.form_id),
        adId: this.cell(row, idx.ad_id),
        externalId: this.cell(row, idx.external_id),
        rawRow: row,
      })
    }

    if (parsed.length === 0) return result

    // Larger chunks = fewer DB round-trips (the dominant cost on serverless,
    // especially if the function and DB are in different regions). Kept well
    // under Postgres's 65535 bind-parameter limit (≈9 cols × 1000 = 9k params).
    const CHUNK = 1000
    const uniquePhones = [...new Set(parsed.map(r => r.phone))]

    // ── Step 2: Omit duplicates ──────────────────────────────────────────────
    // Normal imports preserve historical enquiries by phone + campaign + date.
    // Legacy imports are a one-time CRM backfill, so any live matching phone is
    // already represented and must be skipped.
    const seenLeadKeys = new Set<string>()

    for (const batch of this.chunk(uniquePhones, CHUNK)) {
      const rows = await this.db
        .select({
          phone: metaLeads.phone,
          campaignName: metaLeads.campaignName,
          receivedAt: metaLeads.receivedAt,
        })
        .from(metaLeads)
        .where(and(inArray(metaLeads.phone, batch), isNull(metaLeads.deletedAt)))

      for (const lead of rows) {
        if (!lead.phone) continue
        seenLeadKeys.add(isLegacy
          ? lead.phone
          : this.leadIdentityKey({
              phone: lead.phone,
              campaignName: normalizeCampaignName(lead.campaignName),
              receivedAt: lead.receivedAt,
            }))
      }
    }

    const uniqueParsed: ParsedRow[] = []
    for (const row of parsed) {
      const key = isLegacy ? row.phone : this.leadIdentityKey(row)
      if (seenLeadKeys.has(key)) {
        result.skipped += 1
        continue
      }
      seenLeadKeys.add(key)
      uniqueParsed.push(row)
    }

    parsed = uniqueParsed

    if (parsed.length === 0) return result

    // ── Step 3: Resolve one client per UNIQUE phone (find-or-create) ────────
    // Done BEFORE inserting leads so client_id is written at insert time. This
    // replaces the old per-client UPDATE pass, which fired one query per client
    // and timed out (504) on large files.
    const uniqueImportPhones = [...new Set(parsed.map(r => r.phone))]
    const clientIdByPhone = new Map<string, string>()
    const clientStatusByPhone = new Map<string, string | null>()

    for (const batch of this.chunk(uniqueImportPhones, CHUNK)) {
      const rows = await this.db
        .select({ id: clients.id, phone: clients.phone, status: clients.status })
        .from(clients)
        .where(inArray(clients.phone, batch))
      for (const c of rows) {
        if (!c.phone) continue
        clientIdByPhone.set(c.phone, c.id)
        clientStatusByPhone.set(c.phone, c.status ?? null)
      }
    }

    const rowByPhone = new Map(parsed.map(r => [r.phone, r]))
    const phonesNeedingClient = uniqueImportPhones.filter(p => !clientIdByPhone.has(p))
    for (const batch of this.chunk(phonesNeedingClient, CHUNK)) {
      const inserted = await this.db
        .insert(clients)
        .values(batch.map(phone => {
          const r = rowByPhone.get(phone)!
          return { tenantId: DEFAULT_TENANT_ID, fullName: r.fullName, phone, email: r.email }
        }))
        .returning({ id: clients.id, phone: clients.phone })
      for (const c of inserted) if (c.phone) {
        clientIdByPhone.set(c.phone, c.id)
        clientStatusByPhone.set(c.phone, rowByPhone.get(c.phone)?.hwc ?? 'active')
      }
    }

    const clientStatusPhonesByStatus = new Map<string, string[]>()
    for (const row of rowByPhone.values()) {
      if (!row.hwc) continue
      clientStatusPhonesByStatus.set(row.hwc, [
        ...(clientStatusPhonesByStatus.get(row.hwc) ?? []),
        row.phone,
      ])
    }
    for (const [status, phones] of clientStatusPhonesByStatus.entries()) {
      for (const batch of this.chunk([...new Set(phones)], CHUNK)) {
        await this.db
          .update(clients)
          .set({ status, statusUpdatedAt: new Date(), updatedAt: new Date() })
          .where(and(
            inArray(clients.phone, batch),
            or(isNull(clients.status), eq(clients.status, 'active')),
          ))
      }
    }

    // ── Step 4: Insert leads (client_id already set) — chunked ──────────────
    // Rows go in `parsed` order, so the returned ids stay index-aligned with
    // `parsed` (duplicate phones each keep their own lead id).
    const leadIds: string[] = []
    for (const batch of this.chunk(parsed, CHUNK)) {
      const inserted = await this.db
        .insert(metaLeads)
        .values(batch.map(r => ({
          fullName:     r.fullName,
          phone:        r.phone,
          email:        r.email,
          city:         r.city,
          pageName:     r.pageName,
          formId:       r.formId,
          adId:         r.adId,
          campaignName: r.campaignName,
          platform:     r.platform,
          clientId:     clientIdByPhone.get(r.phone) ?? null,
          source:       isLegacy ? 'legacy_import' : 'migrated',
          legacyImport: isLegacy,
          // Historical spreadsheet activity is audit data. Every legacy row
          // starts protected and unassigned until a user marks it Spoken in CRM.
          legacyTransferProtected: isLegacy,
          externalId:   r.externalId,
          formData: {
            import_mode: isLegacy ? 'legacy' : 'normal',
            source_sheet: sheetName,
            original_row: r.rawRow,
          },
          status:       (isLegacy
            ? 'unassigned'
            : (poolStatusForClientStatus(r.hwc ?? clientStatusByPhone.get(r.phone)) ?? 'unassigned')) as never,
          receivedAt:   r.receivedAt,
        })))
        .returning({ id: metaLeads.id })
      for (const l of inserted) leadIds.push(l.id)
    }

    // ── Step 5: CRM details for rows that have them — chunked ───────────────
    const crmValues = parsed
      .map((r, i) => {
        const leadId = leadIds[i]
        if (!leadId) return null
        const importedCallStatus = isLegacy ? null : r.callStatus
        if (!(importedCallStatus || r.budgetRange || r.profession || r.companyName ||
              r.currentCity || r.currentArea || r.followUpDate || r.remarks ||
              r.firstCallDate || r.lastCallDate || r.buyingStatus || r.siteVisitStatus ||
              r.visitDate || r.visitConfirmationDate || r.configuration || r.projectName)) return null
        return {
          leadId,
          ...(importedCallStatus ? { callStatus: importedCallStatus as 'spoken' | 'not_spoken' | 'call_back_later' } : {}),
          ...(r.budgetRange  ? { budgetRange:  r.budgetRange  } : {}),
          ...(r.profession   ? { profession:   r.profession   } : {}),
          ...(r.companyName  ? { companyName:  r.companyName  } : {}),
          ...(r.currentCity  ? { currentCity:  r.currentCity  } : {}),
          ...(r.currentArea  ? { currentArea:  r.currentArea  } : {}),
          ...(r.followUpDate ? { followUpDate: r.followUpDate } : {}),
          ...(r.remarks      ? { remarks:      r.remarks      } : {}),
          ...(r.firstCallDate ? { firstCallDate: r.firstCallDate } : {}),
          ...(r.lastCallDate ? { lastCallDate: r.lastCallDate } : {}),
          ...(r.buyingStatus ? { buyingStatus: r.buyingStatus as 'ready' | 'exploring' | 'not_ready' | 'interested' } : {}),
          ...(r.siteVisitStatus ? { siteVisitStatus: r.siteVisitStatus as 'scheduled' | 'completed' | 'not_scheduled' } : {}),
          ...(r.visitDate ? { visitDate: r.visitDate } : {}),
          ...(r.visitConfirmationDate ? { visitConfirmationDate: r.visitConfirmationDate } : {}),
          ...(r.configuration ? { configuration: r.configuration } : {}),
          ...(r.projectName ? { projectName: r.projectName } : {}),
        }
      })
      .filter(Boolean) as Record<string, unknown>[]

    for (const batch of this.chunk(crmValues, CHUNK)) {
      await this.db.insert(leadCrmDetails).values(batch as never[]).onConflictDoNothing()
    }

    result.inserted = leadIds.length
    this.logger.log(
      `Import complete: ${result.inserted} inserted, ${result.skipped} skipped, ${result.errors.length} error(s)`,
    )
    return result
  }

  private chunk<T>(arr: T[], size: number): T[][] {
    const out: T[][] = []
    for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
    return out
  }

  generateMetaLeadsTemplate(): Buffer {
    const headers = [
      'Name', 'Phone', 'Email', 'City', 'Campaign', 'Platform', 'Date',
      'Call Status', 'Client Status', 'Budget', 'Profession', 'Company',
      'Current City', 'Current Area', 'Follow Up Date', 'Remarks',
      'First Call Date', 'Latest Call Date', 'Buying Status', 'Visit Status',
      'Visit Date', 'Visit Confirmation Date', 'Configuration Required', 'Project',
      'Facebook Page', 'Facebook Ad ID', 'Facebook Form ID', 'Meta Lead ID',
    ]
    const sample = [
      'John Doe', '9876543210', 'john@example.com', 'Mumbai', 'Meta Campaign', 'facebook',
      '2024-01-15', 'spoken', 'hot', '50-80L', 'IT Professional', 'Acme Corp',
      'Pune', 'Baner', '2024-02-01', 'Looking for 2BHK near metro',
      '2024-01-16', '2024-01-20', 'interested', 'not scheduled', '', '',
      '2BHK, 3BHK', 'Sample Project', 'Sample Facebook Page', '123456', '789012', '345678',
    ]
    const ws = XLSX.utils.aoa_to_sheet([headers, sample])
    ws['!cols'] = headers.map(() => ({ wch: 18 }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Leads')
    return Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }))
  }
}
