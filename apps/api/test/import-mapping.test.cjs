const assert = require('node:assert/strict')
const fs = require('node:fs')
const Module = require('node:module')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')

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
  buildImportHeaderIndex,
  normalizeImportHeader,
  parseImportColumnMapping,
} = loadTypeScriptModule('src/modules/import/import-mapping.ts')

test('normalizes punctuation and underscore variations in spreadsheet headers', () => {
  assert.equal(normalizeImportHeader('  Latest_Call-Date  '), 'latest call date')
})

test('auto-maps the supplied Privyr-style legacy export', () => {
  const headers = [
    'name', 'phone', 'current_city', 'campaign', 'lead_source', 'client_status',
    'call_status', 'first_call_date', 'latest_call_date', 'follow_up_date',
    'buying_status', 'visit_status', 'visit_date', 'Visit Confirmation Date',
    'budget', 'configuration_required', 'business_profile', 'job_title', 'company_name',
    'current_location', 'qualitative_remarks', 'date', 'facebook_page',
    'Facebook Ad ID', 'Facebook Form ID', 'Meta Lead ID',
  ]

  const mapping = buildImportHeaderIndex(headers)
  assert.equal(mapping.full_name, 'name')
  assert.equal(mapping.phone, 'phone')
  assert.equal(mapping.city, 'current_city')
  assert.equal(mapping.current_city, 'current_city')
  assert.equal(mapping.campaign_name, 'campaign')
  assert.equal(mapping.platform, 'lead_source')
  assert.equal(mapping.last_call_date, 'latest_call_date')
  assert.equal(mapping.configuration, 'configuration_required')
  assert.equal(mapping.profession, 'job_title')
  assert.equal(mapping.remarks, 'qualitative_remarks')
  assert.equal(mapping.external_id, 'Meta Lead ID')
})

test('accepts user overrides and rejects headers that are not in the file', () => {
  const headers = ['Custom Contact', 'Customer Name']
  const supplied = parseImportColumnMapping(JSON.stringify({
    phone: 'Custom Contact',
    full_name: 'Customer Name',
  }), headers)
  const mapping = buildImportHeaderIndex(headers, supplied)

  assert.equal(mapping.phone, 'Custom Contact')
  assert.equal(mapping.full_name, 'Customer Name')
  assert.throws(
    () => parseImportColumnMapping(JSON.stringify({ phone: 'Missing Header' }), headers),
    /not found/i,
  )
})

test('an explicit Do not import choice disables an otherwise automatic mapping', () => {
  const headers = ['Phone', 'Name']
  const supplied = parseImportColumnMapping(JSON.stringify({ phone: '' }), headers)
  const mapping = buildImportHeaderIndex(headers, supplied)

  assert.equal(mapping.phone, undefined)
  assert.equal(mapping.full_name, 'Name')
})
