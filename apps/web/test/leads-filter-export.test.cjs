/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const Module = require('node:module')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')

require.extensions['.ts'] = function loadTs(module, filename) {
  const source = fs.readFileSync(filename, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 },
    fileName: filename,
  }).outputText
  module._compile(output, filename)
}

function loadTypeScriptModule(relativePath) {
  const filename = path.resolve(__dirname, '..', relativePath)
  const source = fs.readFileSync(filename, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 },
    fileName: filename,
  }).outputText
  const loaded = new Module(filename, module)
  loaded.filename = filename
  loaded.paths = Module._nodeModulePaths(path.dirname(filename))
  loaded._compile(output, filename)
  return loaded.exports
}

const {
  budgetOptions,
  campaignOptions,
  EMPTY_LEAD_FILTERS,
  filterLeadList,
} = loadTypeScriptModule('lib/lead-list-filter.ts')
const { buildLeadsCsv } = loadTypeScriptModule('lib/export-leads.ts')

const leads = [
  {
    full_name: 'Asha', phone: '111', email: 'asha@example.com', city: 'Pune',
    campaign_name: 'Luxury Villas', source: 'meta_ad', status: 'assigned',
    received_at: '2026-07-10T10:00:00Z', client_status: 'hot',
    client_anti_broker: true,
    client_construction_business_owner: true,
    assigned_to_profile: { id: 'exec-1', full_name: 'Executive One' },
    crm: { call_status: 'spoken', budget_range: '5 Cr' },
  },
  {
    full_name: 'Ravi', phone: '222', email: 'ravi@example.com', city: 'Mumbai',
    campaign_name: 'City Apartments', source: 'meta_ad', status: 'assigned',
    received_at: '2026-07-11T10:00:00Z', client_status: 'warm',
    assigned_to_profile: { id: 'exec-2', full_name: 'Executive Two' },
    crm: { call_status: 'not_spoken', budget_range: '2 Cr' },
  },
  {
    full_name: 'Mira', phone: '333', email: 'mira@example.com', city: 'Pune',
    campaign_name: ' Luxury Villas ', source: 'manual', status: 'assigned',
    received_at: '2026-07-12T10:00:00Z', client_status: 'hot',
    assigned_to_profile: { id: 'exec-1', full_name: 'Executive One' },
    crm: { budget_range: ' 5 Cr ' },
  },
]

test('campaign options are trimmed, deduplicated, and sorted', () => {
  assert.deepEqual(campaignOptions(leads), ['City Apartments', 'Luxury Villas'])
})

test('budget options are canonical individual crore buckets', () => {
  assert.deepEqual(budgetOptions(leads), [
    '1 Cr', '2 Cr', '3 Cr', '4 Cr', '5 Cr', '6 Cr', '7 Cr', '8 Cr', '9 Cr', '10 Cr',
    '11 Cr', '12 Cr', '13 Cr', '14 Cr', '15 Cr', '16 Cr', '17 Cr', '18 Cr', '19 Cr', '20 Cr', '21 Cr+',
  ])
})

test('budget filter includes range clients in each matching individual bucket', () => {
  const ranged = [...leads, { ...leads[0], full_name: 'Range client', crm: { budget_range: '₹5 Cr – ₹7 Cr' } }]
  assert.deepEqual(filterLeadList(ranged, '', { ...EMPTY_LEAD_FILTERS, budget: '6 Cr' }).map(lead => lead.full_name), ['Range client'])
  assert.deepEqual(filterLeadList(ranged, '', { ...EMPTY_LEAD_FILTERS, budget: '5 Cr' }).map(lead => lead.full_name), ['Asha', 'Mira', 'Range client'])
})

test('campaign filter composes with the other lead filters', () => {
  const filters = {
    ...EMPTY_LEAD_FILTERS,
    campaign: 'Luxury Villas',
    clientStatus: 'hot',
  }
  assert.deepEqual(filterLeadList(leads, '', filters).map(lead => lead.full_name), ['Asha', 'Mira'])
  assert.deepEqual(filterLeadList(leads, 'mira', filters).map(lead => lead.full_name), ['Mira'])
})

test('budget filter composes with search and other lead filters', () => {
  const filters = {
    ...EMPTY_LEAD_FILTERS,
    budget: '5 Cr',
    clientStatus: 'hot',
  }
  assert.deepEqual(filterLeadList(leads, '', filters).map(lead => lead.full_name), ['Asha', 'Mira'])
  assert.deepEqual(filterLeadList(leads, 'asha', filters).map(lead => lead.full_name), ['Asha'])
})

test('CSV built from the filtered result contains no unfiltered leads', () => {
  const filtered = filterLeadList(leads, '', {
    ...EMPTY_LEAD_FILTERS,
    campaign: 'City Apartments',
  })
  const csv = buildLeadsCsv(filtered)

  assert.match(csv, /Ravi/)
  assert.match(csv, /City Apartments/)
  assert.doesNotMatch(csv, /Asha|Mira|Luxury Villas/)
  assert.equal(csv.trim().split('\n').length, 2)
})

test('CSV exports independent client flags separately from primary client status', () => {
  const csv = buildLeadsCsv([leads[0]])
  const [header, row] = csv.split('\n')
  assert.match(header, /Client Status,Anti-Broker,Construction Business Owner,Client Status Note/)
  assert.match(row, /,Hot,Yes,Yes,/)
})

test('Construction Business Owner filters independently from primary status', () => {
  const filtered = filterLeadList(leads, '', {
    ...EMPTY_LEAD_FILTERS,
    clientStatus: 'construction_business_owner',
  })
  assert.deepEqual(filtered.map(lead => lead.full_name), ['Asha'])
})

test('generated-on filter keeps only leads received on that calendar day', () => {
  const filters = { ...EMPTY_LEAD_FILTERS, receivedOn: '2026-07-11' }
  assert.deepEqual(filterLeadList(leads, '', filters).map(lead => lead.full_name), ['Ravi'])
})

test('generated-on filter resolves the timestamp in local time, not UTC', () => {
  // 20:00 UTC on the 10th is already the 11th in IST. dateKey follows the
  // viewer's clock, so the lead belongs to whichever day they see it as.
  const lateLead = { ...leads[0], full_name: 'Late', received_at: '2026-07-10T20:00:00Z' }
  const localDay = new Date('2026-07-10T20:00:00Z')
  const pad = n => String(n).padStart(2, '0')
  const expectedDay = `${localDay.getFullYear()}-${pad(localDay.getMonth() + 1)}-${pad(localDay.getDate())}`

  const filters = { ...EMPTY_LEAD_FILTERS, receivedOn: expectedDay }
  assert.deepEqual(filterLeadList([lateLead], '', filters).map(lead => lead.full_name), ['Late'])
})

test('generated-on filter composes with the other lead filters', () => {
  const filters = { ...EMPTY_LEAD_FILTERS, receivedOn: '2026-07-10', clientStatus: 'warm' }
  assert.deepEqual(filterLeadList(leads, '', filters), [])
})

test('received range filter matches on calendar days inclusive of both bounds', () => {
  const filters = { ...EMPTY_LEAD_FILTERS, dateFrom: '2026-07-11', dateTo: '2026-07-12' }
  assert.deepEqual(filterLeadList(leads, '', filters).map(lead => lead.full_name), ['Ravi', 'Mira'])
})

test('an empty generated-on filter matches every lead', () => {
  assert.equal(filterLeadList(leads, '', { ...EMPTY_LEAD_FILTERS }).length, leads.length)
})

const CALL_ACTIVITY_NOW = new Date('2026-07-20T09:00:00').getTime()
const callActivityLeads = [
  // Called today through the CRM's own call dates.
  { ...leads[0], full_name: 'Crm today', crm: { call_status: 'spoken', last_call_date: '2026-07-20' } },
  // Called today through a completed follow-up attempt, whatever the CRM says.
  { ...leads[1], full_name: 'Follow-up today', crm: { call_status: 'spoken', last_call_date: '2026-07-18' }, today_follow_up_calls: [{ call_status: 'not_spoken' }] },
  // Spoken to, but not today.
  { ...leads[2], full_name: 'Called earlier', crm: { call_status: 'spoken', first_call_date: '2026-07-18', last_call_date: '2026-07-19' } },
  // Never called at all.
  { ...leads[2], full_name: 'Never called', crm: { budget_range: '5 Cr' }, today_follow_up_calls: [] },
]

test('called-today filter keeps CRM call dates and completed follow-ups from today', () => {
  const filters = { ...EMPTY_LEAD_FILTERS, callActivity: 'called_today' }
  assert.deepEqual(
    filterLeadList(callActivityLeads, '', filters, CALL_ACTIVITY_NOW).map(lead => lead.full_name),
    ['Crm today', 'Follow-up today'],
  )
})

test('not-called-today filter keeps leads called earlier and never called', () => {
  const filters = { ...EMPTY_LEAD_FILTERS, callActivity: 'not_called_today' }
  assert.deepEqual(
    filterLeadList(callActivityLeads, '', filters, CALL_ACTIVITY_NOW).map(lead => lead.full_name),
    ['Called earlier', 'Never called'],
  )
})

test('call activity filter composes with search and the other lead filters', () => {
  const filters = { ...EMPTY_LEAD_FILTERS, callActivity: 'not_called_today', clientStatus: 'hot' }
  assert.deepEqual(
    filterLeadList(callActivityLeads, 'never', filters, CALL_ACTIVITY_NOW).map(lead => lead.full_name),
    ['Never called'],
  )
})

test('an empty call activity filter matches every lead', () => {
  assert.equal(
    filterLeadList(callActivityLeads, '', { ...EMPTY_LEAD_FILTERS }, CALL_ACTIVITY_NOW).length,
    callActivityLeads.length,
  )
})
