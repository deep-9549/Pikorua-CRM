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
  EMPTY_META_ADS_QUEUE_FILTERS,
  filterMetaAdsQueueLeads,
  matchingSelectedMetaAdsQueueLeadIds,
  metaAdsBudgetOptions,
  metaAdsQueueLeadIds,
} = loadTypeScriptModule('lib/meta-ads-queue-filter.ts')

function lead(id, overrides = {}) {
  return {
    id,
    full_name: id,
    phone: null,
    email: null,
    city: 'Pune',
    campaign_name: 'Campaign A',
    platform: 'instagram',
    source: 'meta_ad',
    status: 'assigned',
    received_at: '2026-08-01T10:00:00Z',
    assigned_to_profile: { id: 'exec-1' },
    client_status: null,
    crm: null,
    ...overrides,
  }
}

const leads = [
  lead('spoken', {
    client_status: 'hot',
    client_construction_business_owner: true,
    crm: { call_status: 'spoken', budget_range: '5 Cr' },
  }),
  lead('not-spoken', { client_status: 'warm', crm: { call_status: 'not_spoken', budget_range: '2 Cr' } }),
  lead('callback', { crm: { call_status: 'call_back_later', budget_range: ' 5 Cr ' } }),
  lead('unset-crm'),
  lead('unset-status', { crm: { call_status: null } }),
  lead('other-exec-spoken', {
    assigned_to_profile: { id: 'exec-2' },
    crm: { call_status: 'spoken' },
  }),
  lead('unassigned-spoken', {
    status: 'unassigned',
    assigned_to_profile: null,
    crm: { call_status: 'spoken' },
  }),
  lead('unassigned-manual', {
    source: 'manual',
    status: 'unassigned',
    assigned_to_profile: null,
  }),
]

const assignedFilters = {
  ...EMPTY_META_ADS_QUEUE_FILTERS,
  queueStatus: 'assigned',
}

test('Spoken includes only exactly matching assigned leads', () => {
  const filtered = filterMetaAdsQueueLeads(leads, {
    ...assignedFilters,
    callStatus: 'spoken',
  })

  assert.deepEqual(metaAdsQueueLeadIds(filtered), ['spoken', 'other-exec-spoken'])
})

test('Not Spoken excludes callbacks and unset call statuses', () => {
  const filtered = filterMetaAdsQueueLeads(leads, {
    ...assignedFilters,
    callStatus: 'not_spoken',
  })

  assert.deepEqual(metaAdsQueueLeadIds(filtered), ['not-spoken'])
})

test('Client status includes only exactly matching assigned leads', () => {
  const filtered = filterMetaAdsQueueLeads(leads, {
    ...assignedFilters,
    clientStatus: 'hot',
  })

  assert.deepEqual(metaAdsQueueLeadIds(filtered), ['spoken'])
})

test('Client status excludes leads with no client status', () => {
  const filtered = filterMetaAdsQueueLeads(leads, {
    ...assignedFilters,
    clientStatus: 'warm',
  })

  assert.deepEqual(metaAdsQueueLeadIds(filtered), ['not-spoken'])
})

test('Construction Business Owner filters as an independent flag', () => {
  const filtered = filterMetaAdsQueueLeads(leads, {
    ...assignedFilters,
    clientStatus: 'construction_business_owner',
  })

  assert.deepEqual(metaAdsQueueLeadIds(filtered), ['spoken'])
})

test('Budget options are trimmed, deduplicated, and naturally sorted', () => {
  assert.deepEqual(metaAdsBudgetOptions(leads), ['2 Cr', '5 Cr'])
})

test('Budget filters the queue and composes with assigned status', () => {
  const filtered = filterMetaAdsQueueLeads(leads, {
    ...assignedFilters,
    budget: '5 Cr',
  })

  assert.deepEqual(metaAdsQueueLeadIds(filtered), ['spoken', 'callback'])
})

test('Split shown IDs contain only matching leads from the unassigned queue', () => {
  const filtered = filterMetaAdsQueueLeads(leads, {
    ...EMPTY_META_ADS_QUEUE_FILTERS,
    source: 'meta_ad',
    queueStatus: 'unassigned',
  })

  assert.deepEqual(metaAdsQueueLeadIds(filtered), ['unassigned-spoken'])
})

test('bulk-action IDs contain only assigned leads matching every active filter', () => {
  const filtered = filterMetaAdsQueueLeads(leads, {
    ...assignedFilters,
    executive: 'exec-1',
    callStatus: 'spoken',
  })
  const shownIds = metaAdsQueueLeadIds(filtered)
  const bulkIds = matchingSelectedMetaAdsQueueLeadIds(filtered, [
    'callback',
    'spoken',
    'unassigned-spoken',
    'other-exec-spoken',
  ])

  assert.deepEqual(shownIds, ['spoken'])
  assert.deepEqual(bulkIds, ['spoken'])
})

test('Clear filters restores every loaded lead', () => {
  const filtered = filterMetaAdsQueueLeads(leads, EMPTY_META_ADS_QUEUE_FILTERS)

  assert.deepEqual(metaAdsQueueLeadIds(filtered), metaAdsQueueLeadIds(leads))
})
