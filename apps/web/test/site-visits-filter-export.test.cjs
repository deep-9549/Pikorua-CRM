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
  EMPTY_SITE_VISIT_FILTERS,
  employeeOptions,
  filterSiteVisits,
  isOverdue,
  isToday,
  projectOptions,
} = loadTypeScriptModule('lib/site-visits-filter.ts')
const { buildSiteVisitsCsv } = loadTypeScriptModule('lib/export-site-visits.ts')

const NOW = new Date('2026-09-10T09:00:00Z').getTime()

function dayOffset(days) {
  const d = new Date(NOW)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

function dayKey(days) {
  const d = new Date(NOW)
  d.setDate(d.getDate() + days)
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function visit(id, overrides = {}) {
  const { lead: leadOverrides, crm: crmOverrides, ...rest } = overrides
  return {
    id,
    site_visit_status: 'visit_date_confirmed',
    visit_date: dayOffset(1),
    visit_confirmation_date: null,
    status: 'scheduled',
    outcome: null,
    cancellation_reason: null,
    follow_up_date: null,
    feedback: null,
    rating: null,
    notes: null,
    created_at: dayOffset(-5),
    scheduled_by_profile: { id: 'exec-1', full_name: 'Executive One' },
    lead: {
      full_name: id,
      phone: '9990001111',
      email: `${id}@example.com`,
      city: 'Pune',
      campaign_name: 'Campaign A',
      source: 'meta_ad',
      assigned_to_profile: { id: 'exec-1', full_name: 'Executive One' },
      crm: { project_name: 'Skyline Towers', budget_range: '5 Cr', hwc: 'hot', call_status: 'spoken', ...crmOverrides },
      ...leadOverrides,
    },
    ...rest,
  }
}

const visits = [
  visit('tomorrow-scheduled'),
  visit('today-scheduled', { visit_date: dayOffset(0) }),
  visit('overdue-scheduled', { visit_date: dayOffset(-2) }),
  visit('completed', {
    site_visit_status: 'visited',
    status: 'completed',
    outcome: 'visit_done',
    visit_date: dayOffset(-3),
    crm: { project_name: 'Riverside Homes' },
  }),
  visit('cancelled', {
    site_visit_status: 'yet_to_visit',
    status: 'cancelled',
    outcome: 'visit_cancelled',
    visit_date: dayOffset(4),
    scheduled_by_profile: { id: 'exec-2', full_name: 'Executive Two' },
  }),
]

const ids = result => result.map(v => v.id)

test('project options are trimmed, deduplicated and sorted', () => {
  assert.deepEqual(projectOptions(visits), ['Riverside Homes', 'Skyline Towers'])
})

test('employee options are deduplicated by id and sorted by name', () => {
  assert.deepEqual(employeeOptions(visits), [
    { id: 'exec-1', name: 'Executive One' },
    { id: 'exec-2', name: 'Executive Two' },
  ])
})

test('an empty filter set returns every visit', () => {
  assert.equal(filterSiteVisits(visits, '', EMPTY_SITE_VISIT_FILTERS, NOW).length, visits.length)
})

test('search spans client name, phone, project and the scheduling employee', () => {
  assert.deepEqual(ids(filterSiteVisits(visits, 'completed', EMPTY_SITE_VISIT_FILTERS, NOW)), ['completed'])
  assert.deepEqual(ids(filterSiteVisits(visits, 'riverside', EMPTY_SITE_VISIT_FILTERS, NOW)), ['completed'])
  assert.deepEqual(ids(filterSiteVisits(visits, 'executive two', EMPTY_SITE_VISIT_FILTERS, NOW)), ['cancelled'])
  assert.equal(filterSiteVisits(visits, '9990001111', EMPTY_SITE_VISIT_FILTERS, NOW).length, visits.length)
})

test('status filter matches the underlying visit status', () => {
  const filtered = filterSiteVisits(visits, '', { ...EMPTY_SITE_VISIT_FILTERS, status: 'scheduled' }, NOW)
  assert.deepEqual(ids(filtered), ['tomorrow-scheduled', 'today-scheduled', 'overdue-scheduled'])
})

test('outcome filter matches recorded outcomes only', () => {
  assert.deepEqual(
    ids(filterSiteVisits(visits, '', { ...EMPTY_SITE_VISIT_FILTERS, outcome: 'visit_done' }, NOW)),
    ['completed'],
  )
})

test('employee filter scopes to who scheduled the visit', () => {
  assert.deepEqual(
    ids(filterSiteVisits(visits, '', { ...EMPTY_SITE_VISIT_FILTERS, employee: 'exec-2' }, NOW)),
    ['cancelled'],
  )
})

test('project filter matches the lead CRM project name', () => {
  assert.deepEqual(
    ids(filterSiteVisits(visits, '', { ...EMPTY_SITE_VISIT_FILTERS, project: 'Riverside Homes' }, NOW)),
    ['completed'],
  )
})

test('timing filter separates today, tomorrow, the next week and overdue', () => {
  const timed = timing => ids(filterSiteVisits(visits, '', { ...EMPTY_SITE_VISIT_FILTERS, timing }, NOW))
  assert.deepEqual(timed('today'), ['today-scheduled'])
  assert.deepEqual(timed('tomorrow'), ['tomorrow-scheduled'])
  assert.deepEqual(timed('this_week'), ['tomorrow-scheduled', 'today-scheduled', 'cancelled'])
  assert.deepEqual(timed('overdue'), ['overdue-scheduled'])
})

test('overdue means a confirmed slot that passed without an outcome', () => {
  assert.equal(isOverdue(visits[2], NOW), true)
  assert.equal(isOverdue(visits[1], NOW), false)
  // A completed visit in the past is history, not overdue.
  assert.equal(isOverdue(visits[3], NOW), false)
})

test('isToday follows the viewer calendar day', () => {
  assert.equal(isToday(dayOffset(0), NOW), true)
  assert.equal(isToday(dayOffset(1), NOW), false)
  assert.equal(isToday(null, NOW), false)
})

test('date-on filter keeps only visits scheduled on that calendar day', () => {
  assert.deepEqual(
    ids(filterSiteVisits(visits, '', { ...EMPTY_SITE_VISIT_FILTERS, dateOn: dayKey(0) }, NOW)),
    ['today-scheduled'],
  )
})

test('date range filter is inclusive of both bounds', () => {
  const filtered = filterSiteVisits(visits, '', {
    ...EMPTY_SITE_VISIT_FILTERS,
    dateFrom: dayKey(0),
    dateTo: dayKey(1),
  }, NOW)
  assert.deepEqual(ids(filtered), ['tomorrow-scheduled', 'today-scheduled'])
})

test('filters compose rather than override each other', () => {
  const filtered = filterSiteVisits(visits, '', {
    ...EMPTY_SITE_VISIT_FILTERS,
    status: 'scheduled',
    employee: 'exec-1',
    timing: 'overdue',
  }, NOW)
  assert.deepEqual(ids(filtered), ['overdue-scheduled'])
})

test('CSV built from the filtered result contains no unfiltered visits', () => {
  const filtered = filterSiteVisits(visits, '', { ...EMPTY_SITE_VISIT_FILTERS, outcome: 'visit_done' }, NOW)
  const csv = buildSiteVisitsCsv(filtered)

  assert.match(csv, /completed/)
  assert.match(csv, /Riverside Homes/)
  assert.doesNotMatch(csv, /overdue-scheduled|cancelled/)
  assert.equal(csv.trim().split('\n').length, 2)
})

test('CSV escapes commas and quotes so columns stay aligned', () => {
  const csv = buildSiteVisitsCsv([visit('tricky', {
    notes: 'Called, then said "maybe"',
    lead: { full_name: 'Sharma, Anita' },
  })])
  const [, row] = csv.split('\n')
  assert.match(row, /"Sharma, Anita"/)
  assert.match(row, /"Called, then said ""maybe"""/)
})

// en-IN datetimes contain a comma, so cells must be counted with quoting honoured.
function parseCsvRow(row) {
  const cells = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < row.length; i += 1) {
    const char = row[i]
    if (quoted) {
      if (char === '"' && row[i + 1] === '"') { cell += '"'; i += 1 }
      else if (char === '"') quoted = false
      else cell += char
    } else if (char === '"') quoted = true
    else if (char === ',') { cells.push(cell); cell = '' }
    else cell += char
  }
  cells.push(cell)
  return cells
}

test('CSV renders empty cells for missing optional values', () => {
  const csv = buildSiteVisitsCsv([visit('sparse', {
    outcome: null,
    rating: null,
    feedback: null,
    follow_up_date: null,
  })])
  const [header, row] = csv.split('\n')
  const cells = parseCsvRow(row)
  assert.equal(parseCsvRow(header).length, cells.length)
  assert.doesNotMatch(row, /null|undefined/)
  // Outcome, Follow-up Date, Feedback and Rating all land as empty strings.
  assert.equal(cells.filter(c => c === '').length >= 4, true)
})

test('CSV keeps a zero rating rather than blanking it', () => {
  const csv = buildSiteVisitsCsv([visit('rated', { rating: 0 })])
  assert.match(csv.split('\n')[1], /,0,/)
})
