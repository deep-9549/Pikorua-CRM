/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')

const originalTsLoader = require.extensions['.ts']
require.extensions['.ts'] = (module, filename) => {
  const source = fs.readFileSync(filename, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2021 },
    fileName: filename,
  }).outputText
  module._compile(output, filename)
}

const {
  DEFAULT_LEAD_LIST_VIEW_STATE,
  parseLeadListViewState,
  parseLeadQueueSnapshot,
} = require('../lib/lead-list-state.ts')
const {
  calculateComparableLeadGrowth,
  comparableLeadGrowthLabel,
  comparableMonthRanges,
} = require('../lib/dashboard-lead-growth.ts')
const {
  NOT_PROVIDED_BY_CLIENT,
  missingSpokenLeadFields,
  isAntiBrokerCompatibleStatus,
} = require('../../../packages/shared/src/lead-crm.ts')
const { EMPTY_LEAD_FILTERS, filterLeadList } = require('../lib/lead-list-filter.ts')

test.after(() => {
  if (originalTsLoader) require.extensions['.ts'] = originalTsLoader
  else delete require.extensions['.ts']
})

test('lead view state restores valid state and rejects malformed data', () => {
  const valid = {
    version: 1,
    search: 'Pune',
    filters: { ...EMPTY_LEAD_FILTERS, clientStatus: 'hot' },
    showFilters: true,
    activeTab: 'follow-ups',
  }
  assert.deepEqual(parseLeadListViewState(JSON.stringify(valid)), valid)
  assert.deepEqual(parseLeadListViewState('{bad-json'), DEFAULT_LEAD_LIST_VIEW_STATE)
  assert.deepEqual(
    parseLeadListViewState(JSON.stringify({ ...valid, activeTab: 'unknown' })),
    DEFAULT_LEAD_LIST_VIEW_STATE,
  )
})

test('lead queue snapshot accepts only versioned string id arrays', () => {
  const snapshot = { version: 1, source: 'lead-list', ids: ['a', 'b'], createdAt: 42 }
  assert.deepEqual(parseLeadQueueSnapshot(JSON.stringify(snapshot)), snapshot)
  assert.equal(parseLeadQueueSnapshot(JSON.stringify({ ...snapshot, ids: ['a', 3] })), null)
})

test('spoken leads require four client qualification fields', () => {
  assert.deepEqual(missingSpokenLeadFields({ call_status: 'not_spoken' }), [])
  assert.deepEqual(missingSpokenLeadFields({ call_status: 'spoken' }), [
    'budget_range', 'profession', 'current_city', 'current_area',
  ])
  assert.deepEqual(missingSpokenLeadFields({
    call_status: 'spoken',
    budget_range: '2 Cr',
    profession: NOT_PROVIDED_BY_CLIENT,
    current_city: NOT_PROVIDED_BY_CLIENT,
    current_area: NOT_PROVIDED_BY_CLIENT,
  }), [])
})

test('Anti-Broker is compatible only with heat statuses and filters independently', () => {
  assert.equal(isAntiBrokerCompatibleStatus('hot'), true)
  assert.equal(isAntiBrokerCompatibleStatus('cold'), true)
  assert.equal(isAntiBrokerCompatibleStatus('postponed'), false)

  const leads = [
    { full_name: 'A', phone: null, email: null, city: null, campaign_name: null, source: 'meta_ad', received_at: '2026-08-01', client_status: 'hot', client_anti_broker: true },
    { full_name: 'B', phone: null, email: null, city: null, campaign_name: null, source: 'meta_ad', received_at: '2026-08-01', client_status: 'hot', client_anti_broker: false },
  ]
  assert.deepEqual(filterLeadList(leads, '', { ...EMPTY_LEAD_FILTERS, clientStatus: 'anti_broker' }).map(lead => lead.full_name), ['A'])
})

test('equal-progress comparison normalizes 28, 29, 30, and 31 day months', () => {
  assert.equal(comparableMonthRanges(new Date('2026-02-14T12:00:00+05:30')).previousCutoffDay, 16)
  assert.equal(comparableMonthRanges(new Date('2028-02-14T12:00:00+05:30')).previousCutoffDay, 15)
  assert.equal(comparableMonthRanges(new Date('2026-04-30T12:00:00+05:30')).previousCutoffDay, 31)
  assert.equal(comparableMonthRanges(new Date('2026-08-31T12:00:00+05:30')).previousCutoffDay, 31)
})

test('dashboard comparison uses IST boundaries and a zero-baseline label', () => {
  const now = new Date('2026-02-14T12:00:00+05:30')
  const growth = calculateComparableLeadGrowth([
    '2026-02-01T00:00:00+05:30',
    '2026-02-14T23:59:59+05:30',
    '2026-01-16T23:59:59+05:30',
    '2026-01-17T00:00:00+05:30',
  ], now)
  assert.equal(growth.currentCount, 2)
  assert.equal(growth.previousCount, 1)
  assert.equal(growth.percentChange, 100)

  const zeroBaseline = calculateComparableLeadGrowth(['2026-02-01T00:00:00+05:30'], now)
  assert.equal(comparableLeadGrowthLabel(zeroBaseline), 'New vs 0 in the comparable period last month')
})
