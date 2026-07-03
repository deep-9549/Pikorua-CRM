const assert = require('node:assert/strict')
const { test } = require('node:test')
const { clients, leadCrmDetails, metaLeads } = require('@pikorua/db')
const {
  buildMicrositeLeadExternalId,
  mapMicrositeLeadToCrm,
} = require('../dist/modules/microsite-lead-sync/microsite-lead.mapper')
const {
  parseMicrositeLeadSourceConfigs,
} = require('../dist/modules/microsite-lead-sync/microsite-lead-source-config')
const {
  MicrositeLeadSyncService,
} = require('../dist/modules/microsite-lead-sync/microsite-lead-sync.service')

const sourceA = {
  key: 'project-a',
  label: 'Project A',
  supabaseUrl: 'https://project-a.supabase.co',
  serviceRoleKey: 'secret-a',
  enabled: true,
}

const sourceB = {
  key: 'project-b',
  label: 'Project B',
  supabaseUrl: 'https://project-b.supabase.co',
  serviceRoleKey: 'secret-b',
  enabled: true,
}

const lead = {
  id: 1,
  job_id: 'job-1',
  name: null,
  first_name: 'Riya',
  last_name: 'Shah',
  company: 'Buyer Co',
  phone: 'p:+919999999999',
  email: 'riya@example.com',
  requirement: '3 BHK',
  budget: 'inr_1cr_to_2cr',
  message: 'Call tomorrow',
  source: 'otp_gate',
  verified_at: '2026-07-03T10:00:00.000Z',
  created_at: '2026-07-03T09:55:00.000Z',
}

const job = {
  id: 10,
  job_id: 'job-1',
  phone: null,
  property_name: 'Pikorua Heights',
  location: 'Ahmedabad',
  price: '1.5 Cr',
  firm_name: 'Pikorua Realty',
  zip_path: null,
  generated_at: '2026-07-03T09:00:00.000Z',
  compliance_errors: 0,
  compliance_warnings: 0,
  created_at: '2026-07-03T09:00:00.000Z',
}

test('microsite source config parser supports env JSON and disabled sources', () => {
  const sources = parseMicrositeLeadSourceConfigs({
    MICROSITE_LEAD_SOURCES_JSON: JSON.stringify([
      sourceA,
      {
        key: 'disabled-source',
        label: 'Disabled',
        supabase_url: 'https://disabled.supabase.co',
        service_role_key: 'secret-disabled',
        enabled: false,
      },
    ]),
  })

  assert.deepEqual(sources, [sourceA])
  assert.throws(
    () => parseMicrositeLeadSourceConfigs({
      MICROSITE_LEAD_SOURCES_JSON: JSON.stringify([{ key: 'project-a' }]),
    }),
    /missing supabaseUrl/,
  )
})

test('microsite mapper enriches CRM fields from lead and job rows', () => {
  const mapped = mapMicrositeLeadToCrm(sourceA, lead, job)

  assert.equal(mapped.metaLead.externalId, 'project-a:1')
  assert.equal(mapped.metaLead.fullName, 'Riya Shah')
  assert.equal(mapped.metaLead.phone, '+919999999999')
  assert.equal(mapped.metaLead.source, 'microsite')
  assert.equal(mapped.metaLead.campaignName, 'Project A - Pikorua Heights')
  assert.equal(mapped.metaLead.city, 'Ahmedabad')
  assert.equal(mapped.crmDetails.projectName, 'Pikorua Heights')
  assert.equal(mapped.crmDetails.currentArea, 'Ahmedabad')
  assert.equal(mapped.crmDetails.companyName, 'Buyer Co')
  assert.equal(mapped.crmDetails.remarks.includes('Requirement: 3 BHK'), true)
  assert.equal(mapped.metaLead.formData.job.property_name, 'Pikorua Heights')
})

test('microsite mapper keeps numeric ids distinct across source databases', () => {
  assert.equal(buildMicrositeLeadExternalId(sourceA, lead), 'project-a:1')
  assert.equal(buildMicrositeLeadExternalId(sourceB, lead), 'project-b:1')
})

test('microsite importer creates client and lead details once, then acknowledges duplicates', async () => {
  const captured = { clients: [], leads: [], details: [] }
  let returnLeadInserted = true
  const tx = {
    query: {
      clients: {
        findFirst: async () => null,
      },
    },
    insert(table) {
      return {
        values(values) {
          if (table === clients) {
            captured.clients.push(values)
            return { returning: async () => [{ id: 'client-id' }] }
          }
          if (table === metaLeads) {
            captured.leads.push(values)
            return {
              onConflictDoNothing() {
                return { returning: async () => returnLeadInserted ? [{ id: 'crm-lead-id' }] : [] }
              },
            }
          }
          if (table === leadCrmDetails) {
            captured.details.push(values)
            return { onConflictDoNothing: async () => undefined }
          }
          throw new Error('unexpected table')
        },
      }
    },
  }
  const database = { db: { transaction: async (callback) => callback(tx) } }
  const service = new MicrositeLeadSyncService(database)

  assert.equal(await service.importLead(sourceA, lead, job), 'imported')
  assert.equal(captured.clients[0].phone, '+919999999999')
  assert.equal(captured.leads[0].clientId, 'client-id')
  assert.equal(captured.leads[0].externalId, 'project-a:1')
  assert.equal(captured.details[0].leadId, 'crm-lead-id')

  returnLeadInserted = false
  assert.equal(await service.importLead(sourceA, lead, job), 'duplicate')
  assert.equal(captured.details.length, 1)
})
