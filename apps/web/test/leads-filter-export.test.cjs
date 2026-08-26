/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const Module = require('node:module')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')

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

test('budget options are trimmed, deduplicated, and naturally sorted', () => {
  assert.deepEqual(budgetOptions(leads), ['2 Cr', '5 Cr'])
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
