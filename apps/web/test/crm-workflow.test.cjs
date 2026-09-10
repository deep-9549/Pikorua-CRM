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
  CLIENT_STATUS_INPUT_VALUES,
  CLIENT_STATUS_VALUES,
  missingSpokenLeadFields,
  isAntiBrokerCompatibleStatus,
} = require('../../../packages/shared/src/lead-crm.ts')
const { EMPTY_LEAD_FILTERS, filterLeadList } = require('../lib/lead-list-filter.ts')
const { getLeadDisplaySections, isFreshlyAssignedLead } = require('../lib/lead-display-order.ts')

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

test('freshly assigned leads move out after the assignment is visited', () => {
  assert.equal(isFreshlyAssignedLead({
    id: 'new',
    assigned_at: '2026-08-05T09:00:00Z',
    assignment_viewed_at: null,
  }), true)
  assert.equal(isFreshlyAssignedLead({
    id: 'transferred',
    assigned_at: '2026-08-05T09:00:00Z',
    assignment_viewed_at: '2026-08-04T09:00:00Z',
  }), true)
  assert.equal(isFreshlyAssignedLead({
    id: 'visited',
    assigned_at: '2026-08-04T09:00:00Z',
    assignment_viewed_at: '2026-08-05T09:00:00Z',
  }), false)
  assert.equal(isFreshlyAssignedLead({ id: 'unassigned', assigned_at: null, assignment_viewed_at: null }), false)
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

test('Construction Business Owner is no longer a primary client status', () => {
  assert.equal(CLIENT_STATUS_VALUES.includes('construction_biz_owner'), false)
  assert.equal(CLIENT_STATUS_INPUT_VALUES.includes('construction_biz_owner'), true)
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

// Lead ordering: the follow-up bucketing and the uncontacted-first rule drive
// the work queue, so date ordering may only break ties inside those groups.
const NOW = new Date('2026-09-10T09:00:00Z').getTime()
const today = (() => {
  const d = new Date(NOW)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
})()
const yesterday = (() => {
  const d = new Date(NOW)
  d.setDate(d.getDate() - 1)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
})()

function orderLead(id, received_at, crm) {
  return { id, received_at, crm }
}

test('lead display sections stay mutually exclusive and ordered dueToday, overdue, rest', () => {
  const leads = [
    orderLead('due', '2026-09-01T00:00:00Z', { follow_up_date: today }),
    orderLead('late', '2026-09-02T00:00:00Z', { follow_up_date: yesterday }),
    orderLead('none', '2026-09-03T00:00:00Z', null),
  ]
  const { dueToday, overdue, rest, ordered } = getLeadDisplaySections(leads, NOW)

  assert.deepEqual(dueToday.map(l => l.id), ['due'])
  assert.deepEqual(overdue.map(l => l.id), ['late'])
  assert.deepEqual(rest.map(l => l.id), ['none'])
  assert.deepEqual(ordered.map(l => l.id), ['due', 'late', 'none'])
  assert.equal(dueToday.length + overdue.length + rest.length, leads.length)
})

test('uncontacted leads still outrank contacted ones regardless of date', () => {
  const leads = [
    orderLead('contacted-newest', '2026-09-09T00:00:00Z', { call_status: 'spoken' }),
    orderLead('uncontacted-oldest', '2026-01-01T00:00:00Z', null),
  ]
  const { rest } = getLeadDisplaySections(leads, NOW)
  assert.deepEqual(rest.map(l => l.id), ['uncontacted-oldest', 'contacted-newest'])
})

test('newest lead comes first among leads with the same contacted status', () => {
  const leads = [
    orderLead('old', '2026-09-01T00:00:00Z', null),
    orderLead('newest', '2026-09-09T00:00:00Z', null),
    orderLead('middle', '2026-09-05T00:00:00Z', null),
  ]
  const { rest } = getLeadDisplaySections(leads, NOW)
  assert.deepEqual(rest.map(l => l.id), ['newest', 'middle', 'old'])
})

test('leads missing a received date sort last instead of breaking the order', () => {
  const leads = [
    orderLead('undated', null, null),
    orderLead('dated', '2026-09-05T00:00:00Z', null),
  ]
  const { rest } = getLeadDisplaySections(leads, NOW)
  assert.deepEqual(rest.map(l => l.id), ['dated', 'undated'])
})
