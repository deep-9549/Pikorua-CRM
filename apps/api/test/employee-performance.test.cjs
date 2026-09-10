const assert = require('node:assert/strict')
const test = require('node:test')

const {
  DashboardService,
  buildOwnershipIndex,
  buildOwnershipWindows,
  buildTrendRows,
  ownedAt,
} = require('../dist/modules/dashboard/dashboard.service.js')

function activity(overrides) {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    leadId: overrides.leadId,
    actorUserId: overrides.actorUserId ?? null,
    eventType: overrides.eventType,
    changes: overrides.changes ?? null,
    metadata: overrides.metadata ?? null,
    fromUserId: overrides.fromUserId ?? null,
    toUserId: overrides.toUserId ?? null,
    createdAt: new Date(overrides.createdAt),
  }
}

test('indexes transferred ownership without scanning unrelated lead windows', () => {
  const lead = {
    id: 'lead-1',
    assignedTo: 'employee-2',
    receivedAt: new Date('2026-08-01T00:00:00.000Z'),
  }
  const windows = buildOwnershipWindows([lead], [
    activity({
      leadId: lead.id,
      eventType: 'assigned',
      toUserId: 'employee-1',
      createdAt: '2026-08-01T00:00:00.000Z',
    }),
    activity({
      leadId: lead.id,
      eventType: 'transferred',
      fromUserId: 'employee-1',
      toUserId: 'employee-2',
      createdAt: '2026-08-10T00:00:00.000Z',
    }),
  ])
  const index = buildOwnershipIndex(windows)

  assert.equal(ownedAt(index, lead.id, 'employee-1', '2026-08-05T00:00:00.000Z'), true)
  assert.equal(ownedAt(index, lead.id, 'employee-1', '2026-08-11T00:00:00.000Z'), false)
  assert.equal(ownedAt(index, lead.id, 'employee-2', '2026-08-11T00:00:00.000Z'), true)
})

test('builds monthly trend totals in one aggregation pass', () => {
  const employeeId = 'employee-1'
  const lead = {
    id: 'lead-1',
    assignedTo: employeeId,
    status: 'converted',
    receivedAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-10T08:00:00.000Z'),
    crmDetails: {
      callStatus: 'spoken',
      firstCallDate: new Date('2026-08-05T08:00:00.000Z'),
      lastCallDate: new Date('2026-08-05T08:00:00.000Z'),
    },
  }
  const windows = buildOwnershipWindows([lead], [
    activity({
      leadId: lead.id,
      eventType: 'assigned',
      toUserId: employeeId,
      createdAt: '2026-08-01T00:00:00.000Z',
    }),
  ])
  const index = buildOwnershipIndex(windows)
  const trend = buildTrendRows(
    'monthly',
    new Date('2026-08-11T12:00:00.000Z'),
    [lead],
    [{ leadId: lead.id, scheduledDate: new Date('2026-08-06T08:00:00.000Z') }],
    windows,
    index,
    employeeId,
    [],
  )

  assert.equal(trend.reduce((total, row) => total + row.leads, 0), 1)
  assert.equal(trend.reduce((total, row) => total + row.calls, 0), 1)
  assert.equal(trend.reduce((total, row) => total + row.visits, 0), 1)
  assert.equal(trend.reduce((total, row) => total + row.conversions, 0), 1)
})

test('coalesces concurrent identical dashboard requests and caches the result briefly', async () => {
  let employeeQueries = 0
  let activityQueries = 0
  const employee = {
    id: 'employee-1',
    fullName: 'Employee One',
    email: 'employee@example.com',
    phone: null,
    role: 'sales_executive',
    status: 'active',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
  }
  const db = {
    query: {
      userProfiles: {
        findMany: async () => {
          employeeQueries += 1
          await new Promise((resolve) => setTimeout(resolve, 10))
          return [employee]
        },
      },
      leadActivityEvents: {
        findMany: async () => {
          activityQueries += 1
          return []
        },
      },
      metaLeads: { findMany: async () => [] },
      siteVisits: { findMany: async () => [] },
    },
  }
  const service = new DashboardService({ db }, { analyze: async () => null })
  const admin = { id: 'admin-1', role: 'super_admin' }

  const [first, second] = await Promise.all([
    service.getEmployeePerformance(admin, undefined, undefined, undefined, false, 'monthly'),
    service.getEmployeePerformance(admin, undefined, undefined, undefined, false, 'monthly'),
  ])
  const third = await service.getEmployeePerformance(admin, undefined, undefined, undefined, false, 'monthly')

  assert.strictEqual(first, second)
  assert.strictEqual(second, third)
  assert.equal(employeeQueries, 1)
  assert.equal(activityQueries, 1)
})

test('scopes a sales executive to their own performance regardless of the requested employee', async () => {
  const profiles = {
    'employee-1': {
      id: 'employee-1',
      fullName: 'Employee One',
      email: 'one@example.com',
      phone: null,
      role: 'sales_executive',
      status: 'active',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    },
    'employee-2': {
      id: 'employee-2',
      fullName: 'Employee Two',
      email: 'two@example.com',
      phone: null,
      role: 'sales_executive',
      status: 'active',
      createdAt: new Date('2026-01-02T00:00:00.000Z'),
    },
  }
  // The service filters by id for a non-admin caller. Record which id the
  // generated where-clause actually targets by replaying it over the profiles.
  const requestedIds = []
  const db = {
    query: {
      userProfiles: {
        findMany: async ({ where }) => {
          const matched = Object.values(profiles).filter(p => whereMatchesId(where, p.id))
          requestedIds.push(matched.map(p => p.id))
          return matched
        },
      },
      leadActivityEvents: { findMany: async () => [] },
      metaLeads: { findMany: async () => [] },
      siteVisits: { findMany: async () => [] },
    },
  }
  const service = new DashboardService({ db }, { analyze: async () => null })

  // Executive One asks for Executive Two's numbers and gets their own.
  const result = await service.getEmployeePerformance(
    { id: 'employee-1', role: 'sales_executive' },
    'employee-2',
    undefined,
    undefined,
    false,
    'monthly',
  )

  assert.deepEqual(requestedIds[0], ['employee-1'])
  assert.equal(result.selectedEmployee.id, 'employee-1')
  assert.equal(result.employees.length, 1)
  assert.equal(result.employees[0].id, 'employee-1')
})

// Drizzle builds an opaque SQL AST. For the assertion above we only need to
// know which uuid the filter pins, so pull the bound parameters out of it.
function whereMatchesId(where, id) {
  const params = []
  // The AST holds back-references to table objects, so track what we've seen.
  const seen = new WeakSet()
  const walk = (node) => {
    if (!node || typeof node !== 'object') return
    if (seen.has(node)) return
    seen.add(node)
    if (Array.isArray(node)) return node.forEach(walk)
    if (typeof node.value === 'string') params.push(node.value)
    Object.values(node).forEach(walk)
  }
  walk(where)
  return params.includes(id)
}
