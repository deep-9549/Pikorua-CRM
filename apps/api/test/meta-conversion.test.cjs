const assert = require('node:assert/strict')
const fs = require('node:fs')
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
  buildMetaCrmEvent,
  eventForForwardStatusTransition,
} = require('../src/modules/meta-conversion/meta-conversion-event.ts')

test.after(() => {
  if (originalTsLoader) require.extensions['.ts'] = originalTsLoader
  else delete require.extensions['.ts']
})

test('maps only forward valuable-status transitions', () => {
  assert.deepEqual(eventForForwardStatusTransition(null, 'warm'), {
    clientStatus: 'warm',
    eventName: 'PikoruaWarmLead',
  })
  assert.deepEqual(eventForForwardStatusTransition('warm', 'hot'), {
    clientStatus: 'hot',
    eventName: 'PikoruaHotLead',
  })
  assert.deepEqual(eventForForwardStatusTransition('hot', 'super_hot'), {
    clientStatus: 'super_hot',
    eventName: 'PikoruaSuperHotLead',
  })
  assert.deepEqual(eventForForwardStatusTransition(null, 'super_hot'), {
    clientStatus: 'super_hot',
    eventName: 'PikoruaSuperHotLead',
  })
})

test('does not emit duplicates, downgrades, or unrelated statuses', () => {
  assert.equal(eventForForwardStatusTransition('hot', 'hot'), null)
  assert.equal(eventForForwardStatusTransition('hot', 'warm'), null)
  assert.equal(eventForForwardStatusTransition('super_hot', 'hot'), null)
  assert.equal(eventForForwardStatusTransition('warm', 'cold'), null)
  assert.equal(eventForForwardStatusTransition(null, null), null)
})

test('builds a non-monetary CRM event linked to the original Meta lead', () => {
  const event = buildMetaCrmEvent({
    eventId: 'outbox-row-1',
    eventName: 'PikoruaSuperHotLead',
    eventTime: new Date('2026-09-12T06:30:00.000Z'),
    metaLeadId: '1234567890',
  })

  assert.deepEqual(event, {
    event_id: 'outbox-row-1',
    event_name: 'PikoruaSuperHotLead',
    event_time: 1789194600,
    action_source: 'system_generated',
    user_data: { lead_id: '1234567890' },
    custom_data: {
      event_source: 'crm',
      lead_event_source: 'Pikorua CRM',
    },
  })
  assert.equal('value' in event.custom_data, false)
  assert.equal('currency' in event.custom_data, false)
})
