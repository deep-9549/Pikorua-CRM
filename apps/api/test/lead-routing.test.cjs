const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const test = require('node:test')

const {
  META_LEAD_POOL_STATUSES,
  isNonTransferableMetaLeadPoolStatus,
  poolStatusForClientStatus,
} = require('../dist/modules/leads/lead-pools.js')
const { serializeMetaLead } = require('../dist/modules/leads/lead.serializer.js')

test('cold and construction-owner leads remain in the normal queue', () => {
  assert.equal(poolStatusForClientStatus('cold'), null)
  assert.equal(poolStatusForClientStatus('construction_biz_owner'), null)
  assert.equal(isNonTransferableMetaLeadPoolStatus('cold_pool'), false)
  assert.equal(isNonTransferableMetaLeadPoolStatus('construction_biz_owner_pool'), false)
  assert.deepEqual([...META_LEAD_POOL_STATUSES].sort(), [
    'broker_pool',
    'lost_pool',
    'not_interested_pool',
  ])
})

test('terminal client statuses still route to Trash', () => {
  assert.equal(poolStatusForClientStatus('lost'), 'lost_pool')
  assert.equal(poolStatusForClientStatus('not_interested'), 'not_interested_pool')
  assert.equal(poolStatusForClientStatus('broker'), 'broker_pool')
})

test('lead responses expose construction owner independently from client status', () => {
  const serialized = serializeMetaLead({
    id: 'lead-1',
    status: 'assigned',
    source: 'meta_ad',
    receivedAt: new Date('2026-08-11T00:00:00.000Z'),
    clientStatus: 'hot',
    clientAntiBroker: false,
    clientConstructionBusinessOwner: true,
  })

  assert.equal(serialized.client_status, 'hot')
  assert.equal(serialized.client_construction_business_owner, true)
})

test('migration rotates cold leads with not-spoken leads after 48 hours', () => {
  const migration = fs.readFileSync(path.resolve(
    __dirname,
    '../../../db_migrations/20260811_keep_cold_and_construction_owner_active.sql',
  ), 'utf8')

  assert.match(migration, /assigned_at < now\(\) - interval '48 hours'/i)
  assert.match(migration, /call_status IS DISTINCT FROM 'spoken' OR c\.hwc = 'cold'/i)
  assert.doesNotMatch(migration, /SET\s+status\s*=\s*'cold_pool'/i)
})

test('legacy spreadsheet rows start unassigned, protected, and without imported call status', () => {
  const importer = fs.readFileSync(path.resolve(
    __dirname,
    '../src/modules/import/import.service.ts',
  ), 'utf8')

  assert.match(importer, /legacyTransferProtected:\s*isLegacy/i)
  assert.match(importer, /status:\s*\(isLegacy\s*\?\s*'unassigned'/i)
  assert.match(importer, /const importedCallStatus = isLegacy \? null : r\.callStatus/i)
  assert.match(importer, /original_row:\s*r\.rawRow/i)
})
