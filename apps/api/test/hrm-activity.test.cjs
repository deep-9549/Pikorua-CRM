const assert = require('node:assert/strict')
const test = require('node:test')
const { sql } = require('drizzle-orm')
const { PgDialect } = require('drizzle-orm/pg-core')

const {
  MAX_HRM_ACTIVITY_RANGE_DAYS,
  buildHrmActivityRows,
  istActivityDate,
  parseHrmActivityRange,
} = require('../dist/modules/hrm/hrm-activity.service.js')
const { HrmApiKeyGuard } = require('../dist/common/guards/hrm-api-key.guard.js')

function guardContext(headers) {
  return {
    switchToHttp: () => ({ getRequest: () => ({ headers }) }),
  }
}

test('keeps the grouped IST timezone out of bind parameters', () => {
  const query = new PgDialect().sqlToQuery(
    istActivityDate(sql.identifier('created_at')),
  )

  assert.match(query.sql, /timezone\('Asia\/Kolkata', "created_at"\)/)
  assert.deepEqual(query.params, [])
})

test('requires the independent CRM API key and enforces the optional IP list', () => {
  const config = {
    get: (key) => ({
      CRM_API_KEY: 'correct-secret',
      HRM_ALLOWED_IPS: '203.0.113.10, 2001:db8::1',
    })[key],
  }
  const guard = new HrmApiKeyGuard(config)

  assert.equal(guard.canActivate(guardContext({
    authorization: 'Bearer correct-secret',
    'x-hrm-client-ip': '203.0.113.10',
  })), true)
  assert.throws(() => guard.canActivate(guardContext({
    authorization: 'Bearer wrong-secret',
    'x-hrm-client-ip': '203.0.113.10',
  })), /Invalid HRM API authorization/)
  assert.throws(() => guard.canActivate(guardContext({
    authorization: 'Bearer correct-secret',
    'x-hrm-client-ip': '198.51.100.7',
  })), /Invalid HRM API authorization/)
})

test('parses inclusive IST date ranges', () => {
  const range = parseHrmActivityRange('2026-08-07', '2026-08-08')
  assert.deepEqual(range.dates, ['2026-08-07', '2026-08-08'])
  assert.equal(range.start.toISOString(), '2026-08-06T18:30:00.000Z')
  assert.equal(range.endExclusive.toISOString(), '2026-08-08T18:30:00.000Z')
})

test('rejects invalid, reversed, and unbounded date ranges', () => {
  assert.throws(() => parseHrmActivityRange('2026-02-30', '2026-03-01'), /valid calendar date/)
  assert.throws(() => parseHrmActivityRange('2026-08-09', '2026-08-08'), /on or after/)
  const tooLate = new Date('2026-08-01T00:00:00Z')
  tooLate.setUTCDate(tooLate.getUTCDate() + MAX_HRM_ACTIVITY_RANGE_DAYS)
  assert.throws(
    () => parseHrmActivityRange('2026-08-01', tooLate.toISOString().slice(0, 10)),
    /cannot exceed/,
  )
})

test('builds one aggregate-only row per rep per date and fills zeroes', () => {
  const rows = buildHrmActivityRows(
    [{ id: 'rep-1', email: 'rep@pikorua.com', fullName: 'Rep One' }],
    ['2026-08-07', '2026-08-08'],
    [{ employeeId: 'rep-1', date: '2026-08-08', total: 42 }],
    [{ employeeId: 'rep-1', date: '2026-08-08', total: 1 }],
    [],
  )

  assert.deepEqual(rows, [
    {
      email: 'rep@pikorua.com',
      name: 'Rep One',
      date: '2026-08-07',
      callsMade: 0,
      siteVisits: 0,
      bookingsConfirmed: 0,
    },
    {
      email: 'rep@pikorua.com',
      name: 'Rep One',
      date: '2026-08-08',
      callsMade: 42,
      siteVisits: 1,
      bookingsConfirmed: 0,
    },
  ])
})
