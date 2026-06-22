const assert = require('node:assert/strict')
const { afterEach, test } = require('node:test')
const { metaLeads, leadCrmDetails } = require('@pikorua/db')
const {
  MetaGraphError,
  MetaGraphService,
} = require('../dist/modules/meta-lead-sync/meta-graph.service')
const {
  MetaLeadImporterService,
} = require('../dist/modules/meta-lead-sync/meta-lead-importer.service')
const {
  MetaLeadSyncController,
} = require('../dist/modules/meta-lead-sync/meta-lead-sync.controller')

const originalFetch = global.fetch
const originalEnv = {
  META_PAGE_ACCESS_TOKEN: process.env.META_PAGE_ACCESS_TOKEN,
  META_GRAPH_API_VERSION: process.env.META_GRAPH_API_VERSION,
  CRON_SECRET: process.env.CRON_SECRET,
}

afterEach(() => {
  global.fetch = originalFetch
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value
  }
})

test('Graph client sends the token only as a bearer header and reports high usage', async () => {
  process.env.META_PAGE_ACCESS_TOKEN = 'page-secret'
  process.env.META_GRAPH_API_VERSION = 'v25.0'
  let captured
  global.fetch = async (url, options) => {
    captured = { url: String(url), options }
    return new Response(JSON.stringify({ data: [] }), {
      status: 200,
      headers: {
        'content-type': 'application/json',
        'x-app-usage': JSON.stringify({ call_count: 81 }),
      },
    })
  }

  const graph = new MetaGraphService()
  const result = await graph.getEdgePage('page-id/leadgen_forms', { fields: 'id' })

  assert.equal(result.usageHigh, true)
  assert.equal(captured.options.headers.Authorization, 'Bearer page-secret')
  assert.equal(captured.url.includes('page-secret'), false)
})

test('Graph client does not retry a non-retryable Meta permission error', async () => {
  process.env.META_PAGE_ACCESS_TOKEN = 'page-secret'
  process.env.META_GRAPH_API_VERSION = 'v25.0'
  let calls = 0
  global.fetch = async () => {
    calls += 1
    return new Response(JSON.stringify({
      error: { message: 'Missing permission', code: 200 },
    }), { status: 400, headers: { 'content-type': 'application/json' } })
  }

  const graph = new MetaGraphService()
  await assert.rejects(
    graph.getEdgePage('form-id/leads', { fields: 'id' }),
    (error) => error instanceof MetaGraphError && error.code === 200,
  )
  assert.equal(calls, 1)
})

test('Graph client retries a transient server failure', async () => {
  process.env.META_PAGE_ACCESS_TOKEN = 'page-secret'
  process.env.META_GRAPH_API_VERSION = 'v25.0'
  let calls = 0
  global.fetch = async () => {
    calls += 1
    if (calls === 1) {
      return new Response(JSON.stringify({ error: { message: 'Temporary failure' } }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      })
    }
    return new Response(JSON.stringify({ data: [] }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    })
  }

  const graph = new MetaGraphService()
  await graph.getEdgePage('form-id/leads', { fields: 'id' })
  assert.equal(calls, 2)
})

test('shared importer maps lead and CRM fields and remains idempotent', async () => {
  const captured = { leads: [], details: [] }
  let returnInserted = true
  const tx = {
    insert(table) {
      return {
        values(values) {
          if (table === metaLeads) captured.leads.push(values)
          if (table === leadCrmDetails) captured.details.push(values)
          return {
            onConflictDoNothing() {
              if (table === metaLeads) {
                return { returning: async () => returnInserted ? [{ id: 'crm-lead-id' }] : [] }
              }
              return Promise.resolve()
            },
          }
        },
      }
    },
  }
  const database = { db: { transaction: async (callback) => callback(tx) } }
  const importer = new MetaLeadImporterService(database)
  const lead = {
    id: 'meta-lead-id',
    form_id: 'form-id',
    campaign_name: 'campaign_one',
    created_time: '2026-06-21T10:00:00+0000',
    field_data: [
      { name: 'full_name', values: ['Test Person'] },
      { name: 'phone_number', values: ['p:+919999999999'] },
      { name: 'email', values: ['test@example.com'] },
      { name: 'city', values: ['Ahmedabad'] },
      { name: 'job_title', values: ['Founder'] },
      { name: 'company_name', values: ['Example Co'] },
      { name: 'budget_range', values: ['inr_12cr_and_above_'] },
    ],
  }

  assert.equal(await importer.importLead(lead), 'imported')
  assert.equal(captured.leads[0].externalId, 'meta-lead-id')
  assert.equal(captured.leads[0].phone, '+919999999999')
  assert.equal(captured.details[0].profession, 'Founder')
  assert.equal(captured.details[0].companyName, 'Example Co')

  returnInserted = false
  assert.equal(await importer.importLead(lead), 'duplicate')
  assert.equal(captured.details.length, 1)
})

test('internal sync endpoint rejects invalid cron authorization', async () => {
  process.env.CRON_SECRET = 'correct-secret'
  const controller = new MetaLeadSyncController({ sync: async () => ({ ok: true }) })

  assert.throws(() => controller.sync('Bearer wrong-secret'), /Invalid cron authorization/)
  assert.deepEqual(await controller.sync('Bearer correct-secret'), { ok: true })
})
