const assert = require('node:assert/strict')
const test = require('node:test')
const {
  analyticsDelta,
  buildAiAnalyticsInsightCards,
  buildOwnershipWindows,
  dateInRange,
  ownedAt,
} = require('../dist/modules/dashboard/ai-analytics.service')

function metrics(overrides = {}) {
  return {
    leads: { received: 20, spokenRate: 50, leadStageConverted: 2, ...overrides.leads },
    activity: {
      callsLogged: 10,
      siteVisitsScheduled: 3,
      overdueFollowUps: 0,
      ...overrides.activity,
    },
    business: {
      confirmedBookings: 1,
      confirmedRevenue: 1000000,
      ...overrides.business,
    },
    voice: {
      calls: 4,
      hotAlerts: 0,
      escalations: 0,
      ...overrides.voice,
    },
  }
}

test('AI Analytics date filtering uses event date boundaries', () => {
  const range = {
    from: new Date('2026-07-01T00:00:00.000Z'),
    to: new Date('2026-07-02T00:00:00.000Z'),
  }

  assert.equal(dateInRange('2026-07-01T12:00:00.000Z', range), true)
  assert.equal(dateInRange('2026-07-02T00:00:00.000Z', range), false)
  assert.equal(dateInRange('2026-06-30T23:59:59.000Z', range), false)
})

test('AI Analytics credits transferred lead events to owner at event time', () => {
  const lead = {
    id: 'lead-one',
    assignedTo: 'employee-two',
    assignedAt: new Date('2026-07-02T10:00:00.000Z'),
    receivedAt: new Date('2026-07-01T09:00:00.000Z'),
    createdAt: new Date('2026-07-01T09:00:00.000Z'),
  }
  const windows = buildOwnershipWindows([lead], [
    {
      leadId: 'lead-one',
      eventType: 'assigned',
      toUserId: 'employee-one',
      fromUserId: null,
      createdAt: new Date('2026-07-01T09:00:00.000Z'),
    },
    {
      leadId: 'lead-one',
      eventType: 'transferred',
      fromUserId: 'employee-one',
      toUserId: 'employee-two',
      createdAt: new Date('2026-07-02T10:00:00.000Z'),
    },
  ])

  assert.equal(ownedAt(windows, 'lead-one', 'employee-one', '2026-07-01T12:00:00.000Z'), true)
  assert.equal(ownedAt(windows, 'lead-one', 'employee-one', '2026-07-02T12:00:00.000Z'), false)
  assert.equal(ownedAt(windows, 'lead-one', 'employee-two', '2026-07-02T12:00:00.000Z'), true)
})

test('AI Analytics deltas keep lead-stage and booking conversions separate', () => {
  const leadStage = analyticsDelta(5, 2)
  const booking = analyticsDelta(1, 2)

  assert.deepEqual(leadStage, { current: 5, previous: 2, absolute: 3, percentage: 150 })
  assert.deepEqual(booking, { current: 1, previous: 2, absolute: -1, percentage: -50 })
})

test('AI Analytics insight rules flag drops, overdue follow-ups, and voice alerts', () => {
  const cards = buildAiAnalyticsInsightCards(
    metrics({
      leads: { received: 10 },
      activity: { callsLogged: 4, overdueFollowUps: 12 },
      voice: { hotAlerts: 2, escalations: 1 },
    }),
    metrics({
      leads: { received: 20 },
      activity: { callsLogged: 10 },
    }),
  )

  assert.ok(cards.some((card) => card.title === 'Lead inflow dropped'))
  assert.ok(cards.some((card) => card.title === 'Calling activity may be lagging'))
  assert.ok(cards.some((card) => card.title === 'Follow-up backlog needs attention'))
  assert.ok(cards.some((card) => card.title === 'AI Voice flagged priority conversations'))
})
